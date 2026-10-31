from qdrant_client import QdrantClient, models
from app.core.config import settings
_client = None
def get_qdrant():
    global _client
    if _client is None:
        kw = {"url": settings.qdrant_url}
        if settings.qdrant_api_key: kw["api_key"] = settings.qdrant_api_key
        _client = QdrantClient(**kw)
    return _client
def ensure_collection(size=384):
    c = get_qdrant()
    if not c.collection_exists(settings.qdrant_collection):
        c.create_collection(collection_name=settings.qdrant_collection, vectors_config=models.VectorParams(size=size, distance=models.Distance.COSINE))
    for field in ("user_id", "document_id"):
        try: c.create_payload_index(collection_name=settings.qdrant_collection, field_name=field, field_schema=models.PayloadSchemaType.KEYWORD)
        except Exception: pass
