import gzip

def compress_text(text: str) -> bytes:
    return gzip.compress(text.encode("utf-8"))

def decompress_text(compressed: bytes) -> str:
    return gzip.decompress(compressed).decode("utf-8")