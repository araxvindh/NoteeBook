import io
from pathlib import Path
from pypdf import PdfReader
from docx import Document as DocxDocument
SUPPORTED_EXTENSIONS = {".pdf", ".txt", ".md", ".docx"}
def extract_text(filename: str, data: bytes) -> str:
    ext = Path(filename).suffix.lower()
    if ext == ".pdf":
        reader = PdfReader(io.BytesIO(data), strict=False)
        parts = [f"[Page {i}]\n{p.extract_text() or ''}" for i, p in enumerate(reader.pages, 1)]
        result = "\n\n".join(parts)
    elif ext in {".txt", ".md"}: result = data.decode("utf-8", errors="replace")
    elif ext == ".docx":
        doc = DocxDocument(io.BytesIO(data)); result = "\n".join(p.text for p in doc.paragraphs if p.text.strip())
        for table in doc.tables:
            for row in table.rows: result += "\n" + " | ".join(cell.text for cell in row.cells)
    else: raise ValueError("Supported formats: PDF, DOCX, TXT, MD")
    result = result.replace("\x00", "").strip()
    if not result: raise ValueError("No readable text found. Scanned PDFs require OCR, not enabled yet.")
    return result
def chunk_text(text: str, chunk_size=1000, overlap=150) -> list[str]:
    if chunk_size <= overlap: raise ValueError("chunk_size must be greater than overlap")
    chunks, start = [], 0
    while start < len(text):
        end = min(len(text), start + chunk_size); chunk = text[start:end].strip()
        if chunk: chunks.append(chunk)
        if end == len(text): break
        start = end - overlap
    return chunks
