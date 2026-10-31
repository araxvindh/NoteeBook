import pytest
from app.services.document_service import chunk_text, extract_text

def test_chunk_text():
    chunks = chunk_text("a" * 2500, chunk_size=1000, overlap=100)
    assert len(chunks) == 3
    assert all(chunks)

def test_reject_unsupported_file():
    with pytest.raises(ValueError): extract_text("bad.exe", b"content")
