#!/usr/bin/env python3
# /// script
# dependencies = ["beautifulsoup4"]
# ///
"""Add data-i18n attributes to all translatable elements in story/index.html."""

import re
from pathlib import Path
from bs4 import BeautifulSoup

FILE = Path(__file__).parent / "story" / "index.html"

# Map text content -> i18n key
TEXT_MAP = {
    "Let's start with a few basics about you.": "prompt-basic",
    "What is your age?": "label-age",
    "What is your gender?": "label-gender",
    "How would you describe your race or ethnicity?": "label-ethnicity",
    "What languages do you speak?": "label-languages",
    "Years in the United States?": "label-years-us",
    "Years in your current city/town?": "label-years-city",
    "What can you tell me about the culture of the country where you grew up?": "prompt-early",
    "How did that compare to your own personal experiences in your neighborhood growing up?": "sub-early",
    "Can you tell me about one of the first times you got involved in helping others or making a difference?": "prompt-helping",
    "What motivated you at the time (personal experiences, family, culture, or social/political influences)?": "sub-helping",
    "Who or what influenced how you think about your role in society and contributing to others?": "prompt-influences",
    "How old were you when these influences became important? Has your understanding of your role in contributing to society changed over time? If so, how?": "sub-influences",
    "Can you share an experience in your life that changed how you contribute to your community or society?": "prompt-turning",
    "How did that experience affect you emotionally, and what changed in your actions or perspective?": "sub-turning",
    "Thinking about your identity (age, race/ethnicity, gender, language, or health), can you describe a time when these aspects shaped your participation in a community or civic activity?": "prompt-identity",
    "Were there times when your identity encouraged you or led others to call on you to get involved? Were there also times when your identity made it harder to participate or made you feel excluded?": "sub-identity",
    "In the past year or so, what community involvement or contribution has been most meaningful to you?": "prompt-meaningful",
    "What made that experience stand out, and how did it make you feel?": "sub-meaningful",
    "What does civic participation mean to you personally?": "prompt-reflections",
    "What advice would you give others about the importance of contributing to the community beyond family and work?": "sub-reflections",
    "What kinds of support do you think are needed to help people, especially older adults, stay involved in their communities?": "prompt-support",
    "What would make it easier for more people to participate?": "sub-support",
}

SECTION_LABELS = {
    "Basic Information": "sec-basic",
    "Early Life": "sec-early",
    "First Experiences with Helping Others": "sec-helping",
    "Influences and Motivations": "sec-influences",
    "Life Transitions & Turning Points": "sec-turning",
    "Identity & Civic Participation": "sec-identity",
    "Meaningful Contributions": "sec-meaningful",
    "Reflections": "sec-reflections",
    "Community Support & Future Participation": "sec-support",
}

BUTTON_MAP = {
    "Next": "btn-next",
    "Skip": "btn-skip",
    "Back": "btn-back",
    "Submit Your Story": "btn-submit",
}

def main():
    html = FILE.read_text(encoding="utf-8")
    soup = BeautifulSoup(html, "html.parser")
    tagged = 0

    # Section labels
    for div in soup.find_all("div", class_="section-label"):
        text = div.get_text(strip=True)
        if text in SECTION_LABELS:
            div["data-i18n"] = SECTION_LABELS[text]
            tagged += 1

    # Prompt texts and sub-prompts
    for div in soup.find_all("div", class_=["prompt-text", "prompt-sub"]):
        text = div.get_text(strip=True)
        if text in TEXT_MAP:
            div["data-i18n"] = TEXT_MAP[text]
            tagged += 1

    # Labels in basic-field
    for label in soup.find_all("label"):
        text = label.get_text(strip=True)
        if text in TEXT_MAP:
            label["data-i18n"] = TEXT_MAP[text]
            tagged += 1

    # Buttons
    for btn in soup.find_all("button", class_="btn"):
        text = btn.get_text(strip=True)
        if text in BUTTON_MAP:
            btn["data-i18n"] = BUTTON_MAP[text]
            tagged += 1

    # Record buttons (btn-label spans)
    for span in soup.find_all("span", class_="btn-label"):
        text = span.get_text(strip=True)
        if text == "Record your answer":
            span["data-i18n"] = "btn-record"
            tagged += 1

    # Textareas - add data-i18n-placeholder
    for ta in soup.find_all("textarea", class_="answer-area"):
        ta["data-i18n-placeholder"] = "placeholder-answer"
        tagged += 1

    # Input placeholders
    placeholder_map = {
        "e.g. 65": "ph-age",
        "e.g. Female": "ph-gender",
        "e.g. African American, Puerto Rican, etc.": "ph-ethnicity",
        "e.g. English, Spanish": "ph-languages",
        "e.g. 40": "ph-years-us",
        "e.g. 20": "ph-years-city",
    }
    for inp in soup.find_all("input"):
        ph = inp.get("placeholder", "")
        if ph in placeholder_map:
            inp["data-i18n-placeholder"] = placeholder_map[ph]
            tagged += 1

    # "or" dividers
    for div in soup.find_all("div", class_="or-divider"):
        if div.get_text(strip=True) == "or":
            div["data-i18n"] = "divider-or"
            tagged += 1

    # Completion screen
    completion = soup.find("div", class_="completion")
    if completion:
        h2 = completion.find("h2")
        if h2:
            h2["data-i18n"] = "completion-title"
            tagged += 1
        p = completion.find("p")
        if p:
            p["data-i18n"] = "completion-desc"
            tagged += 1

    print(f"Tagged {tagged} elements with data-i18n")
    FILE.write_text(str(soup), encoding="utf-8")

if __name__ == "__main__":
    main()
