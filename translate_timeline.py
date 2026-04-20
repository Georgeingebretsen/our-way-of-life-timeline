#!/usr/bin/env python3
# /// script
# dependencies = ["anthropic", "beautifulsoup4"]
# ///
"""
translate_timeline.py — One-time build script for bilingual EN/ES timeline.

Parses timeline.html, translates all text blocks using Claude API,
and generates a new timeline.html with both language versions embedded.
Toggle switches between them via CSS class on <body>.

Usage:
    ANTHROPIC_API_KEY=sk-... uv run translate_timeline.py
"""

import os
import re
import shutil
import sys
import time
from pathlib import Path

import anthropic
from bs4 import BeautifulSoup

TIMELINE_PATH = Path(__file__).parent / "timeline.html"
BACKUP_PATH = TIMELINE_PATH.with_suffix(".html.bak")
BATCH_SIZE = 12


def detect_language(text: str) -> str:
    """Detect Spanish vs English using simple heuristics."""
    spanish_chars = set("áéíóúñü¿¡")
    spanish_words = [
        " de ", " la ", " el ", " los ", " las ", " en ", " que ",
        " por ", " del ", " con ", " para ", " una ", " como ",
        " yo ", " mi ", " nos ", " cuando ", " porque ", " también ",
        " fue ", " era ", " están ", " está ", " muy ", " pero ",
        " luego ", " puede ", " tienen ", " había ", " donde ",
    ]
    lower = text.lower()
    char_hits = sum(1 for c in lower if c in spanish_chars)
    word_hits = sum(1 for w in spanish_words if w in lower)
    return "es" if char_hits >= 2 or word_hits >= 3 else "en"


def translate_batch(
    client: anthropic.Anthropic,
    items: list[str],
    source_lang: str,
    target_lang: str,
) -> list[str]:
    """Translate a numbered batch of HTML snippets via Claude Haiku."""
    names = {"en": "English", "es": "Spanish"}
    numbered = "\n\n".join(f"[{i}]\n{html}" for i, html in enumerate(items))

    resp = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=8192,
        messages=[
            {
                "role": "user",
                "content": (
                    f"Translate each numbered HTML snippet below from "
                    f"{names[source_lang]} to {names[target_lang]}.\n\n"
                    "RULES:\n"
                    "- Preserve ALL HTML tags exactly (<br>, <strong>, <a href=\"...\">, etc.)\n"
                    "- Speaker codes like \"MGNJ |\", \"SENJ6 |\", \"RBNY7 |\" etc. "
                    "must be kept exactly as-is. Only translate the text after the \"|\".\n"
                    "- Translate naturally and accurately. These are oral histories — "
                    "preserve the personal, conversational tone.\n"
                    "- Keep quotation marks around quoted speech.\n"
                    "- Return ONLY the numbered translations in [N] format. "
                    "No commentary, no explanation.\n\n"
                    f"{numbered}"
                ),
            }
        ],
    )

    result = resp.content[0].text

    # Parse [N] markers line-by-line for robustness
    translations: dict[int, str] = {}
    current_idx: int | None = None
    current_lines: list[str] = []

    for line in result.split("\n"):
        m = re.match(r"^\[(\d+)\]\s*(.*)", line)
        if m:
            if current_idx is not None:
                translations[current_idx] = "\n".join(current_lines).strip()
            current_idx = int(m.group(1))
            current_lines = [m.group(2)] if m.group(2) else []
        else:
            current_lines.append(line)

    if current_idx is not None:
        translations[current_idx] = "\n".join(current_lines).strip()

    return [translations.get(i, items[i]) for i in range(len(items))]


def main() -> None:
    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("Error: ANTHROPIC_API_KEY environment variable not set.")
        sys.exit(1)

    client = anthropic.Anthropic()

    # Back up original
    print(f"Backing up original to {BACKUP_PATH}")
    shutil.copy2(TIMELINE_PATH, BACKUP_PATH)

    html = TIMELINE_PATH.read_text(encoding="utf-8")
    soup = BeautifulSoup(html, "html.parser")

    # ── Collect translatable elements ──────────────────────────
    elements: list = []

    title = soup.find("h1", class_="timeline-title")
    if title:
        elements.append(title)

    subtitle = soup.find("p", class_="timeline-subtitle")
    if subtitle:
        elements.append(subtitle)

    for h3 in soup.find_all("h3", class_="timeline-heading"):
        elements.append(h3)

    for card in soup.find_all("div", class_="card"):
        for el in card.find_all(["h4", "p", "li"], recursive=True):
            # Skip elements that live inside a link-preview anchor
            if el.find_parent("a", class_="link-preview"):
                continue
            elements.append(el)

    # Link-preview titles and descriptions (not domains)
    for el in soup.find_all("div", class_="link-preview-title"):
        elements.append(el)
    for el in soup.find_all("div", class_="link-preview-desc"):
        elements.append(el)

    # Drop empties
    elements = [el for el in elements if el.get_text(strip=True)]
    print(f"Found {len(elements)} translatable elements")

    # ── Group by language ──────────────────────────────────────
    en_items: list[tuple] = []  # (element, inner_html_str)
    es_items: list[tuple] = []

    for el in elements:
        inner = el.decode_contents()
        lang = detect_language(el.get_text())
        (es_items if lang == "es" else en_items).append((el, inner))

    print(f"  English blocks: {len(en_items)}")
    print(f"  Spanish blocks: {len(es_items)}")

    # ── Translate EN → ES ──────────────────────────────────────
    total_en = (len(en_items) + BATCH_SIZE - 1) // BATCH_SIZE
    for start in range(0, len(en_items), BATCH_SIZE):
        batch = en_items[start : start + BATCH_SIZE]
        htmls = [h for _, h in batch]
        n = start // BATCH_SIZE + 1
        print(f"Translating EN→ES  batch {n}/{total_en} ...")
        translations = translate_batch(client, htmls, "en", "es")

        for (el, orig), trans in zip(batch, translations):
            combined = (
                f'<span class="lang-en">{orig}</span>'
                f'<span class="lang-es">{trans}</span>'
            )
            el.clear()
            parsed = BeautifulSoup(combined, "html.parser")
            for child in list(parsed.children):
                el.append(child.extract())

        time.sleep(0.3)

    # ── Translate ES → EN ──────────────────────────────────────
    total_es = (len(es_items) + BATCH_SIZE - 1) // BATCH_SIZE
    for start in range(0, len(es_items), BATCH_SIZE):
        batch = es_items[start : start + BATCH_SIZE]
        htmls = [h for _, h in batch]
        n = start // BATCH_SIZE + 1
        print(f"Translating ES→EN  batch {n}/{total_es} ...")
        translations = translate_batch(client, htmls, "es", "en")

        for (el, orig), trans in zip(batch, translations):
            combined = (
                f'<span class="lang-en">{trans}</span>'
                f'<span class="lang-es">{orig}</span>'
            )
            el.clear()
            parsed = BeautifulSoup(combined, "html.parser")
            for child in list(parsed.children):
                el.append(child.extract())

        time.sleep(0.3)

    # ── Inject toggle CSS ──────────────────────────────────────
    style = soup.find("style")
    toggle_css = """
      /* ============================================
         LANGUAGE TOGGLE
         ============================================ */
      body.lang-en .lang-es { display: none; }
      body.lang-es .lang-en { display: none; }

      .lang-toggle {
        display: flex;
        justify-content: center;
        gap: 0;
        margin-bottom: 1.5rem;
      }

      .lang-toggle button {
        font-family: "Libre Franklin", sans-serif;
        font-size: 0.85rem;
        font-weight: 600;
        letter-spacing: 0.05em;
        padding: 0.45rem 1.4rem;
        border: 2px solid #daa520;
        background: transparent;
        color: #8b7355;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .lang-toggle button:first-child {
        border-radius: 4px 0 0 4px;
        border-right: 1px solid #daa520;
      }

      .lang-toggle button:last-child {
        border-radius: 0 4px 4px 0;
        border-left: 1px solid #daa520;
      }

      .lang-toggle button.active {
        background: #daa520;
        color: #fff;
      }

      .lang-toggle button:hover:not(.active) {
        background: rgba(218, 165, 32, 0.1);
      }
"""
    style.string = style.string + toggle_css

    # ── Inject toggle button ──────────────────────────────────
    subtitle_el = soup.find("p", class_="timeline-subtitle")
    toggle_div = soup.new_tag("div")
    toggle_div["class"] = "lang-toggle"

    btn_en = soup.new_tag("button", onclick="setLang('en')")
    btn_en["class"] = ["active"]
    btn_en.string = "EN"

    btn_es = soup.new_tag("button", onclick="setLang('es')")
    btn_es.string = "ES"

    toggle_div.append(btn_en)
    toggle_div.append(btn_es)
    subtitle_el.insert_after(toggle_div)

    # ── Set default body class ────────────────────────────────
    body = soup.find("body")
    existing = body.get("class", [])
    if "lang-en" not in existing:
        body["class"] = existing + ["lang-en"]

    # ── Inject toggle JS ──────────────────────────────────────
    script = soup.find("script")
    toggle_js = """
      function setLang(lang) {
        document.body.classList.remove('lang-en', 'lang-es');
        document.body.classList.add('lang-' + lang);
        document.querySelectorAll('.lang-toggle button').forEach(function(btn) {
          btn.classList.toggle('active',
            btn.textContent.trim().toLowerCase() === lang);
        });
      }
"""
    script.string = toggle_js + "\n" + script.string

    # ── Write output ──────────────────────────────────────────
    TIMELINE_PATH.write_text(str(soup), encoding="utf-8")
    print(f"\n{'='*50}")
    print(f"Bilingual timeline written to {TIMELINE_PATH}")
    print(f"Backup saved at {BACKUP_PATH}")
    print("Open timeline.html in a browser and use the EN | ES toggle!")


if __name__ == "__main__":
    main()
