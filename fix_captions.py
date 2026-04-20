#!/usr/bin/env python3
# /// script
# dependencies = ["beautifulsoup4"]
# ///
"""
fix_captions.py — Move video description paragraphs below their videos
and add caption styling class.
"""

from pathlib import Path
from bs4 import BeautifulSoup, NavigableString

TIMELINE_PATH = Path(__file__).parent / "timeline.html"


def is_video_caption(p_tag) -> bool:
    """Heuristic: a paragraph is a video caption if it doesn't start
    with a quotation mark (which would indicate oral history content)."""
    text = p_tag.get_text(strip=True)
    if not text:
        return False
    # Oral history quotes start with " or "
    if text[0] in ('"', '\u201c', '\u201d'):
        return False
    # If it contains [Advice or [Trigger — it's content, not caption
    if text.startswith("["):
        return False
    return True


def main() -> None:
    html = TIMELINE_PATH.read_text(encoding="utf-8")
    soup = BeautifulSoup(html, "html.parser")

    moved = 0
    for card in soup.find_all("div", class_="card"):
        videos = card.find_all("div", class_="video-wrapper")
        for video in videos:
            # Find the previous sibling that's a tag (skip whitespace)
            prev = video.previous_sibling
            while prev and isinstance(prev, NavigableString) and not prev.strip():
                prev = prev.previous_sibling

            if prev and prev.name == "p" and is_video_caption(prev):
                # Move the paragraph to right after the video
                p_tag = prev.extract()
                p_tag["class"] = p_tag.get("class", []) + ["video-caption"]
                video.insert_after(p_tag)
                moved += 1

    print(f"Moved {moved} caption paragraphs below their videos")
    TIMELINE_PATH.write_text(str(soup), encoding="utf-8")
    print(f"Updated {TIMELINE_PATH}")


if __name__ == "__main__":
    main()
