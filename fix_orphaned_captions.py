#!/usr/bin/env python3
# /// script
# dependencies = ["beautifulsoup4"]
# ///
"""Move orphaned caption <p> elements to right after the video-wrappers at the top."""

from pathlib import Path
from bs4 import BeautifulSoup

TIMELINE_PATH = Path(__file__).parent / "timeline.html"


def main():
    html = TIMELINE_PATH.read_text(encoding="utf-8")
    soup = BeautifulSoup(html, "html.parser")

    moved = 0
    for card in soup.find_all("div", class_="card"):
        # Find all caption <p> elements (ones with inline italic style)
        captions = [p for p in card.find_all("p")
                    if p.get("style") and "italic" in p.get("style", "")]
        if not captions:
            continue

        # Find the last video-wrapper in this card
        videos = card.find_all("div", class_="video-wrapper")
        if not videos:
            continue

        last_video = videos[-1]

        # Move each caption to right after the last video
        for cap in captions:
            cap.extract()
            last_video.insert_after(cap)
            moved += 1

    print(f"Moved {moved} orphaned captions next to their videos")
    TIMELINE_PATH.write_text(str(soup), encoding="utf-8")

if __name__ == "__main__":
    main()
