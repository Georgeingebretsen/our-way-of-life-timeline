#!/usr/bin/env python3
# /// script
# dependencies = ["beautifulsoup4"]
# ///
"""
fix_timeline.py — One-time script to:
1. Move all videos to the bottom of each card (quotes first)
2. Make participant h4 headings into hyperlinks
3. Add participant avatar images next to h4 headings
"""

import re
from pathlib import Path
from bs4 import BeautifulSoup

TIMELINE_PATH = Path(__file__).parent / "timeline.html"
BASE_URL = "https://www.ourwayoflifearchive.com"

# Participant code → image path (relative paths get BASE_URL prepended)
IMAGE_MAP = {
    "MGNJ": "/uploads/b/4d4f27a254ad409573c7c4eb443d718ebb65ef79eb130e662c91851895189621/d66856d2-8a6c-4202-81cd-8662560ffaec_1620661041.JPG",
    "MLNJ": "/uploads/b/4d4f27a254ad409573c7c4eb443d718ebb65ef79eb130e662c91851895189621/2021-05-10_11-27-04_1620660411.png",
    "SENJ": "/uploads/b/4d4f27a254ad409573c7c4eb443d718ebb65ef79eb130e662c91851895189621/2024-11-10_20-56-42_1731301015.jpg",
    "WPNY": "/uploads/b/4d4f27a254ad409573c7c4eb443d718ebb65ef79eb130e662c91851895189621/2024-11-10_20-46-17_1731300393.jpg",
    "FRNJ": "/uploads/b/4d4f27a254ad409573c7c4eb443d718ebb65ef79eb130e662c91851895189621/2021-05-10_11-51-29_1620661857.png",
    "EBNJ": "/uploads/b/4d4f27a254ad409573c7c4eb443d718ebb65ef79eb130e662c91851895189621/un%20granito%20de%20arena_1626740217.jpg",
    "RBNY": "/uploads/b/4d4f27a254ad409573c7c4eb443d718ebb65ef79eb130e662c91851895189621/2024-11-10_20-52-31_1731300819.jpg",
    "BMNJ": "/uploads/b/4d4f27a254ad409573c7c4eb443d718ebb65ef79eb130e662c91851895189621/image_1620663833.jpg",
    "HSNJ": "/uploads/b/4d4f27a254ad409573c7c4eb443d718ebb65ef79eb130e662c91851895189621/jean%20baptiste_1626739279.jpg",
    "ETNY": "/uploads/b/4d4f27a254ad409573c7c4eb443d718ebb65ef79eb130e662c91851895189621/2021-07-19_19-55-12_1626738877.jpg",
    "EMNJ": "/uploads/b/4d4f27a254ad409573c7c4eb443d718ebb65ef79eb130e662c91851895189621/2021-05-10_12-06-35_1620662777.jpg",
    "LRNJ": "https://images.unsplash.com/photo-1615897570582-285ffe259530?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=Mnw0NjE4NHwwfDF8c2VhcmNofDJ8fGZvb2QlMjBwYW50cnl8ZW58MHx8fHwxNjI2NzQwNjUx&ixlib=rb-1.2.1&q=80&w=1080",
    "NCNJ": "/uploads/b/4d4f27a254ad409573c7c4eb443d718ebb65ef79eb130e662c91851895189621/Resized_Resized_20210308_132735003001_1620660343.jpg",
}

# Pattern to match participant codes in h4 text
CODE_PATTERN = re.compile(r"^([A-Z]{2,4}(?:NJ|NY|WE)\d*)")


def get_base_code(code: str) -> str:
    """Strip trailing digits to get base participant code for image lookup."""
    return re.sub(r"\d+$", "", code)


def get_image_url(code: str) -> str | None:
    """Get full image URL for a participant code."""
    base = get_base_code(code)
    path = IMAGE_MAP.get(base)
    if not path:
        return None
    if path.startswith("http"):
        return path
    return BASE_URL + path


def get_story_url(code: str) -> str:
    """Get story page URL for a participant code."""
    return f"{BASE_URL}/s/stories/{code.lower()}"


def main() -> None:
    html = TIMELINE_PATH.read_text(encoding="utf-8")
    soup = BeautifulSoup(html, "html.parser")

    # ── 1. Move videos to bottom of each card ─────────────────
    cards = soup.find_all("div", class_="card")
    videos_moved = 0
    for card in cards:
        videos = card.find_all("div", class_="video-wrapper")
        if not videos:
            continue
        # Detach all videos, then re-append at end
        detached = [v.extract() for v in videos]
        for v in detached:
            card.append(v)
            videos_moved += 1

    print(f"Moved {videos_moved} videos to bottom of their cards")

    # ── 2 & 3. Add links and avatars to participant h4s ───────
    h4s_linked = 0
    for h4 in soup.find_all("h4"):
        text = h4.get_text(strip=True)
        m = CODE_PATTERN.match(text)
        if not m:
            continue

        code = m.group(1)
        story_url = get_story_url(code)
        image_url = get_image_url(code)

        # Wrap existing h4 contents in an <a> tag
        link = soup.new_tag("a", href=story_url, target="_blank", rel="noopener")
        link["class"] = "participant-link"

        # Add avatar image if available
        if image_url:
            img = soup.new_tag("img",
                src=image_url,
                alt=code,
                loading="lazy",
            )
            img["class"] = "participant-avatar"
            link.append(img)

        # Move existing children (lang spans) into the link
        for child in list(h4.children):
            link.append(child.extract())

        h4.append(link)
        h4s_linked += 1

    print(f"Linked {h4s_linked} participant headings")

    # ── Write output ──────────────────────────────────────────
    TIMELINE_PATH.write_text(str(soup), encoding="utf-8")
    print(f"Updated {TIMELINE_PATH}")


if __name__ == "__main__":
    main()
