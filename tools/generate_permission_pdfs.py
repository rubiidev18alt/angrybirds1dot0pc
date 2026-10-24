#!/usr/bin/env python3
"""Generate simple PDF versions of the draft permission documents.

This is a formatting helper only. The PDFs are drafts and do not grant rights.
"""

from __future__ import annotations

import re
from pathlib import Path

from fpdf import FPDF

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

FILES = [
    ("PERMISSION_AGREEMENT_DRAFT.md", "PERMISSION_AGREEMENT_DRAFT.pdf"),
    ("OWNER_RIGHTS_ATTESTATION.md", "OWNER_RIGHTS_ATTESTATION.pdf"),
    ("PERMISSION_REQUEST_TEMPLATE.md", "PERMISSION_REQUEST_TEMPLATE.pdf"),
    ("PERMISSION_DOCUMENTS_INDEX.md", "PERMISSION_DOCUMENTS_INDEX.pdf"),
]


class DocPDF(FPDF):
    def __init__(self) -> None:
        super().__init__(orientation="P", unit="mm", format="A4")
        self.set_auto_page_break(auto=True, margin=18)
        self.set_margins(18, 18, 18)
        self.add_font("DejaVu", "", FONT)
        self.add_font("DejaVu", "B", FONT_BOLD)
        self.set_font("DejaVu", "", 10)

    def header(self) -> None:
        self.set_font("DejaVu", "B", 8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 6, "DRAFT - NOT EXECUTED - NO RIGHTS GRANTED", align="R")
        self.ln(8)
        self.set_text_color(0, 0, 0)

    def footer(self) -> None:
        self.set_y(-15)
        self.set_font("DejaVu", "", 8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 6, f"Page {self.page_no()}", align="C")
        self.set_text_color(0, 0, 0)


def clean_inline(text: str) -> str:
    text = text.replace("☐", "[ ]")
    text = text.replace("**", "")
    text = text.replace("`", "")
    text = re.sub(r"\[([^\]]+)\]\([^\)]+\)", r"\1", text)
    return text.rstrip()


def add_line(pdf: DocPDF, raw: str) -> None:
    pdf.set_x(pdf.l_margin)
    line = clean_inline(raw)
    if not line:
        pdf.ln(4)
        return

    if line.startswith("| "):
        pdf.set_font("DejaVu", "", 8)
        pdf.multi_cell(0, 5, line)
        pdf.set_font("DejaVu", "", 10)
        return

    if line.startswith("# "):
        pdf.set_font("DejaVu", "B", 16)
        pdf.multi_cell(0, 8, line[2:])
        pdf.ln(2)
        pdf.set_font("DejaVu", "", 10)
        return

    if line.startswith("## "):
        pdf.ln(2)
        pdf.set_font("DejaVu", "B", 13)
        pdf.multi_cell(0, 7, line[3:])
        pdf.ln(1)
        pdf.set_font("DejaVu", "", 10)
        return

    if line.startswith("### "):
        pdf.set_font("DejaVu", "B", 11)
        pdf.multi_cell(0, 6, line[4:])
        pdf.set_font("DejaVu", "", 10)
        return

    if line.startswith("> "):
        pdf.set_font("DejaVu", "B", 10)
        pdf.multi_cell(0, 6, line[2:])
        pdf.set_font("DejaVu", "", 10)
        return

    if line.startswith("---"):
        pdf.ln(2)
        pdf.cell(0, 2, "", border="T")
        pdf.ln(4)
        return

    if line.startswith("```"):
        return

    pdf.multi_cell(0, 6, line)


def build(md_name: str, pdf_name: str) -> Path:
    md_path = DOCS / md_name
    pdf_path = DOCS / pdf_name
    pdf = DocPDF()
    pdf.add_page()
    for line in md_path.read_text(encoding="utf-8").splitlines():
        add_line(pdf, line)
    pdf.output(str(pdf_path))
    return pdf_path


def main() -> int:
    for md_name, pdf_name in FILES:
        path = build(md_name, pdf_name)
        print(f"Wrote {path} ({path.stat().st_size} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
