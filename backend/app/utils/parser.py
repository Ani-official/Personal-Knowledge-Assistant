from pdfminer.high_level import extract_text as extract_pdf_text
import markdown


def parse_pdf(file_path: str) -> str:
    return extract_pdf_text(file_path)


def parse_markdown(file_bytes: bytes) -> str:
    md_content = file_bytes.decode("utf-8")
    return markdown.markdown(md_content)
