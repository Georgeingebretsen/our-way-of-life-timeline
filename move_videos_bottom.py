#!/usr/bin/env python3
# /// script
# dependencies = ["beautifulsoup4"]
# ///
"""Move all video-wrappers (and any adjacent caption <p>) back to bottom of each card."""

from pathlib import Path
from bs4 import BeautifulSoup, NavigableString

TIMELINE_PATH = Path(__file__).parent / "timeline.html"


def main():
    html = TIMELINE_PATH.read_text(encoding="utf-8")
    soup = BeautifulSoup(html, "html.parser")

    moved = 0
    for card in soup.find_all("div", class_="card"):
        # Collect video-wrappers and any adjacent captions
        groups = []
        seen = set()
        for video in card.find_all("div", class_="video-wrapper"):
            if id(video) in seen:
                continue
            seen.add(id(video))
            group = []

            # Check for caption BEFORE the video
            prev = video.previous_sibling
            while prev and isinstance(prev, NavigableString) and not prev.strip():
                prev = prev.previous_sibling
            # Don't grab preceding captions — they might belong elsewhere

            group.append(video)

            # Check for caption AFTER the video
            nxt = video.next_sibling
            while nxt and isinstance(nxt, NavigableString) and not nxt.strip():
                nxt = nxt.next_sibling
            if nxt and nxt.name == "p" and nxt.get("style") and "italic" in nxt.get("style", ""):
                group.append(nxt)

            groups.append(group)

        if not groups:
            continue

        for group in groups:
            for el in group:
                el.extract()
                card.append(el)
            moved += 1

    print(f"Moved {moved} video groups to bottom of their cards")
    TIMELINE_PATH.write_text(str(soup), encoding="utf-8")

if __name__ == "__main__":
    main()
