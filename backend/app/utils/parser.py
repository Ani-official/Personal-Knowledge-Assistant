import logging
from pdfminer.high_level import extract_pages
from pdfminer.layout import LTTextContainer
from html.parser import HTMLParser

logger = logging.getLogger(__name__)

# Non-paginated formats are split into fixed-size sections so the reader can
# page through them the same way it pages through a PDF. Kept generous so a
# section is a meaningful unit of reading, not a scroll of fragments.
SECTION_SIZE = 2500


def parse_pdf_pages(file_path: str) -> list[str]:
    """
    Extract the PDF one page at a time, preserving page boundaries so chunks
    can be attributed to a page and the reader can show the page they came from.
    """
    try:
        pages: list[str] = []
        for layout in extract_pages(file_path):
            # Separate text blocks by a blank line, as pdfminer's own
            # extract_text does — without it every block runs together and the
            # reader pane becomes a wall of text.
            parts = [
                element.get_text().rstrip("\n")
                for element in layout
                if isinstance(element, LTTextContainer)
            ]
            pages.append("\n\n".join(part for part in parts if part.strip()))

        if not any(page.strip() for page in pages):
            logger.warning(
                f"pdfminer returned no text for {file_path} — may be a scanned/image PDF"
            )
        return pages
    except Exception as e:
        logger.exception(f"PDF parsing failed for {file_path}: {e}")
        raise


def paginate_text(text: str, section_size: int = SECTION_SIZE) -> list[str]:
    """
    Split flat text into reader-sized sections, breaking on a paragraph or line
    boundary near the limit so a section rarely starts mid-sentence.
    """
    if not text.strip():
        return []

    sections: list[str] = []
    start = 0
    while start < len(text):
        end = min(start + section_size, len(text))
        if end < len(text):
            window_start = start + int(section_size * 0.6)
            boundary = text.rfind("\n\n", window_start, end)
            if boundary == -1:
                boundary = text.rfind("\n", window_start, end)
            if boundary != -1:
                end = boundary
        sections.append(text[start:end])
        start = end
    return sections


def parse_markdown(file_bytes: bytes) -> str:
    return file_bytes.decode("utf-8", errors="ignore")


def parse_text(file_bytes: bytes) -> str:
    for encoding in ("utf-8", "latin-1", "cp1252"):
        try:
            return file_bytes.decode(encoding)
        except UnicodeDecodeError:
            continue
    return file_bytes.decode("utf-8", errors="ignore")


class _HTMLTextExtractor(HTMLParser):
    SKIP_TAGS = {"script", "style", "head", "meta", "link"}

    def __init__(self):
        super().__init__()
        self._parts: list[str] = []
        self._skip = False
        self._skip_depth = 0

    def handle_starttag(self, tag, _attrs):
        if tag in self.SKIP_TAGS:
            self._skip = True
            self._skip_depth += 1

    def handle_endtag(self, tag):
        if tag in self.SKIP_TAGS and self._skip_depth > 0:
            self._skip_depth -= 1
            if self._skip_depth == 0:
                self._skip = False

    def handle_data(self, data):
        if not self._skip:
            stripped = data.strip()
            if stripped:
                self._parts.append(stripped)

    def get_text(self) -> str:
        return "\n".join(self._parts)


def parse_html(file_bytes: bytes) -> str:
    raw = file_bytes.decode("utf-8", errors="ignore")
    extractor = _HTMLTextExtractor()
    extractor.feed(raw)
    return extractor.get_text()
