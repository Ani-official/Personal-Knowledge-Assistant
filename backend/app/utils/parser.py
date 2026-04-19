import logging
from pdfminer.high_level import extract_text as extract_pdf_text
from html.parser import HTMLParser

logger = logging.getLogger(__name__)


def parse_pdf(file_path: str) -> str:
    try:
        text = extract_pdf_text(file_path) or ""
        if not text.strip():
            logger.warning(f"pdfminer returned empty text for {file_path} — may be a scanned/image PDF")
        return text
    except Exception as e:
        logger.exception(f"PDF parsing failed for {file_path}: {e}")
        raise


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
