from __future__ import annotations

import argparse
import base64
import json
import math
import re
from pathlib import Path

import cv2
import numpy as np
import pytesseract
from pytesseract import Output

MAP_SCALE = 1e-5


def detect_plan_bounds(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    dark = cv2.threshold(gray, 120, 255, cv2.THRESH_BINARY_INV)[1]
    h = cv2.morphologyEx(
        dark,
        cv2.MORPH_OPEN,
        cv2.getStructuringElement(
            cv2.MORPH_RECT, (max(50, image.shape[1] // 25), 1)
        ),
    )
    v = cv2.morphologyEx(
        dark,
        cv2.MORPH_OPEN,
        cv2.getStructuringElement(
            cv2.MORPH_RECT, (1, max(50, image.shape[0] // 14))
        ),
    )
    structure = cv2.bitwise_or(h, v)
    ys, xs = np.where(structure > 0)

    if len(xs) < 100:
        return 0, 0, image.shape[1] - 1, image.shape[0] - 1

    keep = ys < int(image.shape[0] * 0.90)
    xs, ys = xs[keep], ys[keep]
    x0, x1 = np.percentile(xs, [0.2, 99.8]).astype(int)
    y0, y1 = np.percentile(ys, [0.2, 99.8]).astype(int)
    pad = 10

    return (
        max(0, int(x0) - pad),
        max(0, int(y0) - pad),
        min(image.shape[1] - 1, int(x1) + pad),
        min(int(image.shape[0] * 0.90), int(y1) + pad),
    )


def detect_corridor_mask(crop):
    rgb = crop[:, :, ::-1].astype(np.int16)
    spread = rgb.max(axis=2) - rgb.min(axis=2)
    brightness = rgb.mean(axis=2)

    mask = (
        ((spread <= 14) & (brightness >= 185) & (brightness <= 242)).astype(np.uint8)
        * 255
    )

    mask = cv2.morphologyEx(
        mask,
        cv2.MORPH_CLOSE,
        cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)),
        iterations=2,
    )
    mask = cv2.morphologyEx(
        mask,
        cv2.MORPH_OPEN,
        cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)),
        iterations=1,
    )

    count, labels, stats, _ = cv2.connectedComponentsWithStats(
        (mask > 0).astype(np.uint8), 8
    )
    if count <= 1:
        return mask

    largest = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    return (labels == largest).astype(np.uint8) * 255


def build_grid(mask, cell_size):
    height, width = mask.shape
    rows = math.ceil(height / cell_size)
    cols = math.ceil(width / cell_size)
    grid = []

    for row in range(rows):
        values = []
        for col in range(cols):
            y0, y1 = row * cell_size, min(height, (row + 1) * cell_size)
            x0, x1 = col * cell_size, min(width, (col + 1) * cell_size)
            patch = mask[y0:y1, x0:x1]
            values.append(
                1 if patch.size and float((patch > 0).mean()) > 0.20 else 0
            )
        grid.append(values)

    return grid


def read_ocr_lines(crop):
    scale = 2.2
    up = cv2.resize(crop, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
    gray = cv2.cvtColor(up, cv2.COLOR_BGR2GRAY)
    data = pytesseract.image_to_data(
        gray, output_type=Output.DATAFRAME, config="--psm 11"
    )
    data = data[(data.conf > 35) & data.text.notna()].copy()
    if data.empty:
        return []

    data["text"] = data.text.astype(str).str.strip()
    data = data[data.text != ""]
    lines = []

    for _, group in data.groupby(["block_num", "par_num", "line_num"]):
        group = group.sort_values("left")
        text = " ".join(group.text.tolist()).strip()
        if not text:
            continue

        left = int(group.left.min() / scale)
        top = int(group.top.min() / scale)
        right = int((group.left + group.width).max() / scale)
        bottom = int((group.top + group.height).max() / scale)

        lines.append(
            {
                "text": text,
                "left": left,
                "top": top,
                "right": right,
                "bottom": bottom,
                "cx": (left + right) / 2,
                "cy": (top + bottom) / 2,
                "confidence": round(float(group.conf.mean()), 1),
            }
        )

    return sorted(lines, key=lambda item: (item["top"], item["left"]))


def classify(name):
    value = name.lower()

    if any(
        word in value for word in ["conference", "meeting", "boardroom", "quiet room"]
    ):
        return "meeting"

    if any(
        word in value
        for word in [
            "toilet",
            "kitchen",
            "eating",
            "cafe",
            "café",
            "storage",
            "server",
            "copy",
            "print",
            "booth",
            "rest",
        ]
    ):
        return "facility"

    return "office"


def clean_text(value):
    value = re.sub(r"[^A-Za-z0-9 /&()\-.,éÉ]+", " ", value)
    value = re.sub(r"\s+", " ", value).strip()
    corrections = {
        "Ppex Logistics": "Apex Logistics",
        "Small Copy Statiins": "Small Copy Stations",
        "Small Conferece": "Small Conference",
        "Quhet Room": "Quiet Room",
        "Storge": "Storage",
    }
    return corrections.get(value, value)


def extract_locations(crop):
    lines = read_ocr_lines(crop)
    height, width = crop.shape[:2]
    locations = []
    room_pattern = re.compile(
        r"\bR(?:oo|o)[nm]\s*([0-9OIl¢$]{1,3})\b", re.I
    )

    for line in lines:
        match = room_pattern.search(line["text"])
        if not match:
            continue

        room_number = (
            match.group(1)
            .upper()
            .replace("O", "0")
            .replace("I", "1")
            .replace("L", "1")
            .replace("¢", "0")
            .replace("$", "5")
        )
        room_number = re.sub(r"\D", "", room_number)
        candidates = []

        for previous in lines:
            if previous is line:
                continue

            dy = line["top"] - previous["bottom"]
            dx = abs(previous["cx"] - line["cx"])
            text = previous["text"].strip(" |_-")

            if not (-5 <= dy <= 65 and dx <= 105):
                continue
            if not text or re.fullmatch(r"[\d\W_]+", text):
                continue
            if room_pattern.fullmatch(text):
                continue

            candidates.append(previous)

        candidates = sorted(candidates, key=lambda item: item["top"])[-3:]
        name = " ".join(clean_text(item["text"]) for item in candidates).strip()
        name = name or f"Room {room_number}"

        location = {
            "id": f"R{len(locations) + 1:03d}",
            "name": name,
            "room": room_number,
            "type": classify(name),
            "pixel": [round(line["cx"], 1), round(line["cy"], 1)],
            "aliases": [f"Room {room_number}", room_number, name],
        }

        if any(
            abs(location["pixel"][0] - old["pixel"][0]) < 18
            and abs(location["pixel"][1] - old["pixel"][1]) < 18
            for old in locations
        ):
            continue

        locations.append(location)

    keywords = [
        "Toilets",
        "Storage",
        "Eating Area",
        "Boardroom",
        "Conference Room",
        "Server Room",
        "Phone Booth",
        "Print Room",
        "Kitchen",
    ]

    for line in lines:
        text = clean_text(line["text"])
        if not any(keyword.lower() in text.lower() for keyword in keywords):
            continue
        if line["cx"] > width * 0.82 and line["cy"] > height * 0.72:
            continue
        if any(
            math.hypot(
                line["cx"] - old["pixel"][0],
                line["cy"] - old["pixel"][1],
            )
            < 45
            for old in locations
        ):
            continue

        locations.append(
            {
                "id": f"P{len(locations) + 1:03d}",
                "name": text,
                "room": None,
                "type": classify(text),
                "pixel": [round(line["cx"], 1), round(line["cy"], 1)],
                "aliases": [text],
            }
        )

    # Add high-confidence OCR labels that were not paired with a Room-number line.
    # This makes company names and facilities searchable even when the tiny
    # "Room NN" caption was missed by OCR.
    for line in lines:
        text = clean_text(line["text"])
        if line.get("confidence", 0) < 78:
            continue
        if len(re.sub(r"[^A-Za-z]", "", text)) < 4:
            continue
        if room_pattern.search(text):
            continue
        if line["cx"] > width * 0.84 and line["cy"] > height * 0.78:
            continue
        if any(
            math.hypot(
                line["cx"] - old["pixel"][0],
                line["cy"] - old["pixel"][1],
            ) < 42
            for old in locations
        ):
            continue

        locations.append(
            {
                "id": f"P{len(locations) + 1:03d}",
                "name": text,
                "room": None,
                "type": classify(text),
                "pixel": [round(line["cx"], 1), round(line["cy"], 1)],
                "aliases": [text],
            }
        )

    hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
    green = cv2.inRange(
        hsv,
        np.array([35, 70, 60], dtype=np.uint8),
        np.array([95, 255, 255], dtype=np.uint8),
    )
    contours, _ = cv2.findContours(green, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    exit_number = 1

    for contour in contours:
        x, y, w, h = cv2.boundingRect(contour)
        area = w * h
        if area < 120 or area > 4000:
            continue

        cx, cy = x + w / 2, y + h / 2
        if cx > width * 0.82 and cy > height * 0.72:
            continue

        locations.append(
            {
                "id": f"EXIT-{exit_number}",
                "name": f"Fire Exit {exit_number}",
                "room": None,
                "type": "emergency",
                "pixel": [round(cx, 1), round(cy, 1)],
                "aliases": ["Fire Exit", "Exit", f"Exit {exit_number}"],
            }
        )
        exit_number += 1

    return locations


def add_demo_transport(locations, width, height):
    # Temporary symbol hints for the supplied Level-24 demo image.
    hints = [
        ("LIFT-A", "Lift A", "lift", 0.445, 0.295),
        ("LIFT-B", "Lift B", "lift", 0.505, 0.295),
        ("STAIR-A", "Stairs A", "stairs", 0.535, 0.31),
        ("STAIR-B", "Stairs B", "stairs", 0.455, 0.59),
    ]

    for location_id, name, kind, rx, ry in hints:
        locations.append(
            {
                "id": location_id,
                "name": name,
                "room": None,
                "type": kind,
                "pixel": [round(width * rx, 1), round(height * ry, 1)],
                "aliases": [name, kind.title()],
            }
        )


def nearest_walkable(grid, x, y, cell_size, max_radius=32):
    rows, cols = len(grid), len(grid[0])
    source_col, source_row = int(x // cell_size), int(y // cell_size)

    for radius in range(max_radius + 1):
        best = None

        for dr in range(-radius, radius + 1):
            for dc in range(-radius, radius + 1):
                if radius and abs(dr) != radius and abs(dc) != radius:
                    continue

                row, col = source_row + dr, source_col + dc
                if not (0 <= row < rows and 0 <= col < cols):
                    continue
                if not grid[row][col]:
                    continue

                distance = dc * dc + dr * dr
                if best is None or distance < best[0]:
                    best = (distance, [col, row])

        if best:
            return best[1]

    return None


def pixel_to_coordinate(x, y, height):
    return [round(x * MAP_SCALE, 7), round((height - y) * MAP_SCALE, 7)]


def main():
    parser = argparse.ArgumentParser(
        description="Turn a floor-plan image into IndoorMap navigation data."
    )
    parser.add_argument("--image", required=True)
    parser.add_argument("--floor", required=True, type=int)
    parser.add_argument("--name")
    parser.add_argument(
        "--repo-root", default=str(Path(__file__).resolve().parents[1])
    )
    parser.add_argument("--cell-size", type=int, default=14)
    parser.add_argument("--tesseract-cmd")
    parser.add_argument("--demo-vertical-transport", action="store_true")
    args = parser.parse_args()

    if args.tesseract_cmd:
        pytesseract.pytesseract.tesseract_cmd = args.tesseract_cmd

    repo_root = Path(args.repo_root).resolve()
    image_path = Path(args.image).resolve()
    image = cv2.imread(str(image_path))

    if image is None:
        raise SystemExit(f"Could not read image: {image_path}")

    x0, y0, x1, y1 = detect_plan_bounds(image)
    crop = image[y0 : y1 + 1, x0 : x1 + 1]
    height, width = crop.shape[:2]

    corridor_mask = detect_corridor_mask(crop)
    grid = build_grid(corridor_mask, args.cell_size)
    locations = extract_locations(crop)

    if args.demo_vertical_transport:
        add_demo_transport(locations, width, height)

    for location in locations:
        x, y = location["pixel"]
        location["grid"] = nearest_walkable(grid, x, y, args.cell_size)

        if location["grid"]:
            col, row = location["grid"]
            entrance_x = (col + 0.5) * args.cell_size
            entrance_y = (row + 0.5) * args.cell_size
            location["entranceCoordinate"] = pixel_to_coordinate(
                entrance_x, entrance_y, height
            )
        else:
            location["entranceCoordinate"] = None

        location["labelCoordinate"] = pixel_to_coordinate(x, y, height)

    locations = [location for location in locations if location["grid"]]

    floors_dir = repo_root / "public" / "floors"
    floors_dir.mkdir(parents=True, exist_ok=True)

    image_output = floors_dir / f"floor{args.floor}.webp"
    data_output = floors_dir / f"floor{args.floor}.json"
    manifest_output = floors_dir / "manifest.json"

    cv2.imwrite(
        str(image_output),
        crop,
        [cv2.IMWRITE_WEBP_QUALITY, 96],
    )

    bitset = np.packbits(np.array(grid, dtype=np.uint8).reshape(-1)).tobytes()

    payload = {
        "version": 2,
        "floor": args.floor,
        "name": args.name or f"Floor {args.floor}",
        "image": f"/floors/{image_output.name}",
        "imageSize": {"width": width, "height": height},
        "mapBounds": {
            "west": 0,
            "south": 0,
            "east": round(width * MAP_SCALE, 7),
            "north": round(height * MAP_SCALE, 7),
        },
        "grid": {
            "cellSize": args.cell_size,
            "cols": len(grid[0]),
            "rows": len(grid),
            "encoding": "bitset-base64",
            "walkableB64": base64.b64encode(bitset).decode("ascii"),
        },
        "locations": locations,
        "import": {
            "source": image_path.name,
            "crop": [int(x0), int(y0), int(x1), int(y1)],
            "detectedLocations": len(locations),
            "mode": "enhanced OCR + corridor segmentation + grid routing",
            "warning": (
                "Generated navigation data is a draft. Verify entrances, lifts, "
                "stairs and emergency exits before production use."
            ),
        },
    }

    data_output.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    manifest = {"floors": []}
    if manifest_output.exists():
        try:
            manifest = json.loads(manifest_output.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            pass

    floors = [
        floor
        for floor in manifest.get("floors", [])
        if int(floor.get("floor", -1)) != args.floor
    ]
    floors.append(
        {
            "floor": args.floor,
            "name": payload["name"],
            "data": f"/floors/{data_output.name}",
        }
    )
    floors.sort(key=lambda floor: int(floor["floor"]))
    manifest_output.write_text(
        json.dumps({"floors": floors}, indent=2),
        encoding="utf-8",
    )

    print(
        json.dumps(
            {
                "floor": args.floor,
                "image": str(image_output.relative_to(repo_root)),
                "data": str(data_output.relative_to(repo_root)),
                "locations": len(locations),
                "grid": [len(grid[0]), len(grid)],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
