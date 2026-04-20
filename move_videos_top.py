#!/usr/bin/env python3
# /// script
# dependencies = ["beautifulsoup4"]
# ///
"""Move all video-wrappers (and their caption <p> siblings) to the top of each card."""

from pathlib import Path
from bs4 import BeautifulSoup, NavigableString

TIMELINE_PATH = Path(__file__).parent / "timeline.html"


def main():
    html = TIMELINE_PATH.read_text(encoding="utf-8")
    soup = BeautifulSoup(html, "html.parser")

    moved = 0
    for card in soup.find_all("div", class_="card"):
        # Collect video-wrappers and any immediately following caption <p>
        video_groups = []
        for video in card.find_all("div", class_="video-wrapper"):
            group = [video.extract()]
            # Check if next sibling is a caption <p> (has inline style with italic)
            nxt = video.next_sibling
            while nxt and isinstance(nxt, NavigableString) and not nxt.strip():
                nxt = nxt.next_sibling
            if nxt and nxt.name == "p" and nxt.get("style") and "italic" in nxt.get("style", ""):
                group.append(nxt.extract())
            video_groups.append(group)

        if not video_groups:
            continue

        # Insert at the top of the card (before first child)
        first_child = card.contents[0] if card.contents else None
        for group in reversed(video_groups):
            for el in reversed(group):
                if first_child:
                    first_child.insert_before(el)
                else:
                    card.append(el)
            moved += 1

    print(f"Moved {moved} video groups to top of their cards")
    TIMELINE_PATH.write_text(str(soup), encoding="utf-8")
    print(f"Updated {TIMELINE_PATH}")


if __name__ == "__main__":
    main()
