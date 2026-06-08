#!/usr/bin/env python3
"""Download Splatoon 3 weapon render PNGs from Inkipedia's MediaWiki API.

The images are Nintendo-owned game renders mirrored by Inkipedia. This script is
for a non-commercial fan-tool setup; do not hotlink, and check rights before
reusing these assets elsewhere.
"""
from __future__ import annotations

import json
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = PROJECT_ROOT / "assets" / "weapons"
MANIFEST_PATH = ASSET_DIR / "official-image-manifest.json"
API_URL = "https://splatoonwiki.org/w/api.php"
USER_AGENT = "Hermes local Splatoon3 roulette asset downloader/1.0"

# Ordered to match CATEGORY_DEFINITIONS / buildWeapons() stable ids.
CATEGORY_FILE_NAMES = {
    "shooter": [
        "Splattershot Jr.", "Splattershot", "N-ZAP '85", "Custom Splattershot Jr.",
        "Splattershot Nova", "Sploosh-o-matic", "Splattershot Pro", "Tentatek Splattershot",
        ".52 Gal", "N-ZAP '89", "Annaki Splattershot Nova", "L-3 Nozzlenose",
        "Neo Sploosh-o-matic", ".52 Gal Deco", "Jet Squelcher", "Splash-o-matic",
        ".96 Gal", "Aerospray MG", "Aerospray RG", "Squeezer",
        "L-3 Nozzlenose D", "Custom Jet Squelcher", "Forge Splattershot Pro", "Neo Splash-o-matic",
        ".96 Gal Deco", "H-3 Nozzlenose", "Foil Squeezer", "H-3 Nozzlenose D",
        "Order Shot Replica", "Clawz .96 Gal", "Hero Shot Replica", "Jet Squelcher COB-R",
        "Octo Shot Replica", "Splattershot Pro FRZ-N", "Colorz Aerospray", "Splash-o-matic GCK-O",
        "Glamorz Splattershot", "H-3 Nozzlenose VIP-R", "Glitterz L-3 Nozzlenose",
    ],
    "roller": [
        "Splat Roller", "Carbon Roller", "Krak-On Splat Roller", "Dynamo Roller",
        "Big Swig Roller", "Gold Dynamo Roller", "Big Swig Roller Express", "Flingza Roller",
        "Carbon Roller Deco", "Foil Flingza Roller", "Order Roller Replica", "Carbon Roller ANG-L",
        "Starz Dynamo Roller", "Planetz Big Swig Roller",
    ],
    "charger": [
        "Splat Charger", "Classic Squiffer", "Z+F Splat Charger", "Splatterscope",
        "New Squiffer", "Snipewriter 5H", "Z+F Splatterscope", "E-liter 4K",
        "Snipewriter 5B", "Custom E-liter 4K", "Bamboozler 14 Mk I", "Goo Tuber",
        "Bamboozler 14 Mk II", "E-liter 4K Scope", "Custom Goo Tuber", "Custom E-liter 4K Scope",
        "Order Charger Replica", "Splat Charger CAM-O", "Splatterscope CAM-O",
    ],
    "slosher": [
        "Slosher", "Tri-Slosher", "Slosher Deco", "Sloshing Machine",
        "Dread Wringer", "Tri-Slosher Nouveau", "Dread Wringer D", "Bloblobber",
        "Sloshing Machine Neo", "Bloblobber Deco", "Explosher", "Custom Explosher",
        "Order Slosher Replica", "Tri-Slosher ASH-N", "Hornz Dread Wringer",
    ],
    "splatling": [
        "Heavy Splatling", "Mini Splatling", "Heavy Edit Splatling", "Heavy Splatling Deco",
        "Heavy Edit Splatling Nouveau", "Hydra Splatling", "Custom Hydra Splatling", "Zink Mini Splatling",
        "Nautilus 47", "Nautilus 79", "Ballpoint Splatling", "Ballpoint Splatling Nouveau",
        "Order Splatling Replica", "Torrentz Hydra Splatling", "Mini Splatling RTL-R",
    ],
    "dualies": [
        "Splat Dualies", "Dualie Squelchers", "Enperry Splat Dualies", "Dapple Dualies",
        "Custom Dualie Squelchers", "Dark Tetra Dualies", "Glooga Dualies", "Douser Dualies FF",
        "Light Tetra Dualies", "Dapple Dualies Nouveau", "Glooga Dualies Deco", "Custom Douser Dualies FF",
        "Order Dualie Replicas", "Hoofz Dualie Squelchers", "Twinklez Splat Dualies", "Dapple Dualies NOC-T",
    ],
    "brella": [
        "Splat Brella", "Recycled Brella 24 Mk I", "Tenta Brella", "Undercover Brella",
        "Sorella Brella", "Recycled Brella 24 Mk II", "Tenta Sorella Brella", "Undercover Sorella Brella",
        "Order Brella Replica", "Tenta Brella CRE-M", "Patternz Undercover Brella",
    ],
    "blaster": [
        "Blaster", "Rapid Blaster", "Custom Blaster", "Rapid Blaster Deco",
        "Range Blaster", "Luna Blaster", "Custom Range Blaster", "S-BLAST '92",
        "Clash Blaster", "Luna Blaster Neo", "Clash Blaster Neo", "Rapid Blaster Pro",
        "S-BLAST '91", "Rapid Blaster Pro Deco", "Order Blaster Replica", "Gleamz Blaster",
        "Rapid Blaster Pro WNT-R",
    ],
    "brush": [
        "Octobrush", "Inkbrush", "Octobrush Nouveau", "Painbrush",
        "Inkbrush Nouveau", "Painbrush Nouveau", "Orderbrush Replica", "Painbrush BRN-Z",
        "Cometz Octobrush",
    ],
    "stringer": [
        "Tri-Stringer", "REEF-LUX 450", "Inkline Tri-Stringer", "REEF-LUX 450 Deco",
        "Wellstring V", "Custom Wellstring V", "Order Stringer Replica", "REEF-LUX 450 MIL-K",
        "Bulbz Tri-Stringer",
    ],
    "splatana": [
        "Splatana Wiper", "Splatana Wiper Deco", "Splatana Stamper", "Splatana Stamper Nouveau",
        "Mint Decavitator", "Charcoal Decavitator", "Order Splatana Replica", "Splatana Wiper RUS-T",
        "Stickerz Splatana Stamper",
    ],
}


def file_title(display_name: str) -> str:
    return f"File:S3 Weapon Main {display_name} 2D Current.png"


def api_query(titles: list[str]) -> dict:
    params = {
        "action": "query",
        "format": "json",
        "prop": "imageinfo",
        "iiprop": "url|size|mime",
        "titles": "|".join(titles),
    }
    url = f"{API_URL}?{urllib.parse.urlencode(params)}"
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=45) as response:
        return json.loads(response.read().decode("utf-8"))


def download(url: str, target: Path) -> None:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=60) as response:
        target.write_bytes(response.read())


def main() -> int:
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    entries = []
    for slug, names in CATEGORY_FILE_NAMES.items():
        for index, name in enumerate(names):
            entries.append({
                "id": f"{slug}-{index}",
                "displayNameEn": name,
                "title": file_title(name),
                "path": str((ASSET_DIR / f"{slug}-{index}.png").relative_to(PROJECT_ROOT)).replace("\\", "/"),
            })

    missing = []
    downloaded = []
    for offset in range(0, len(entries), 40):
        batch = entries[offset:offset + 40]
        data = api_query([entry["title"] for entry in batch])
        pages = data.get("query", {}).get("pages", {})
        title_to_page = {page.get("title"): page for page in pages.values()}
        for entry in batch:
            page = title_to_page.get(entry["title"])
            if not page or "missing" in page or not page.get("imageinfo"):
                missing.append(entry)
                continue
            imageinfo = page["imageinfo"][0]
            target = PROJECT_ROOT / entry["path"]
            download(imageinfo["url"], target)
            entry.update({
                "sourceUrl": imageinfo["url"],
                "width": imageinfo.get("width"),
                "height": imageinfo.get("height"),
                "mime": imageinfo.get("mime"),
            })
            downloaded.append(entry)
            print(f"downloaded {entry['id']:>13} <- {entry['title']}")
            time.sleep(0.04)

    manifest = {
        "source": "Inkipedia MediaWiki API / S3 Weapon Main * 2D Current.png",
        "apiUrl": API_URL,
        "retrievedAt": datetime.now(timezone.utc).isoformat(),
        "rightsNote": "Images are Nintendo-owned Splatoon 3 weapon renders mirrored by Inkipedia. This repository publishes them for a non-commercial fan tool at the user's request.",
        "downloadedCount": len(downloaded),
        "missingCount": len(missing),
        "items": downloaded,
        "missing": missing,
    }
    MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"manifest: {MANIFEST_PATH}")
    if missing:
        print("Missing image titles:", file=sys.stderr)
        for entry in missing:
            print(f"- {entry['id']}: {entry['title']}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
