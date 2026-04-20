#!/usr/bin/env python3
# /// script
# dependencies = ["beautifulsoup4"]
# ///
"""Undo: move video-caption paragraphs back above their videos, remove class."""

from pathlib import Path
from bs4 import BeautifulSoup, NavigableString

TIMELINE_PATH = Path(__file__).parent / "timeline.html"

def main():
    html = TIMELINE_PATH.read_text(encoding="utf-8")
    soup = BeautifulSoup(html, "html.parser")

    moved = 0
    for p in soup.find_all("p", class_="video-caption"):
        # Find preceding video-wrapper
        prev = p.previous_sibling
        while prev and isinstance(prev, NavigableString) and not prev.strip():
            prev = prev.previous_sibling
        if prev and prev.name == "div" and "video-wrapper" in prev.get("class", []):
            p_tag = p.extract()
            p_tag["class"] = [c for c in p_tag.get("class", []) if c != "video-caption"]
            if not p_tag.get("class"):
                del p_tag["class"]
            prev.insert_before(p_tag)
            moved += 1

    print(f"Moved {moved} paragraphs back above their videos")
    TIMELINE_PATH.write_text(str(soup), encoding="utf-8")

if __name__ == "__main__":
    main()
