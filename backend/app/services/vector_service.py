from uuid import uuid5, NAMESPACE_URL
from qdrant_client import models
from app.core.config import settings
from app.db.qdrant import get_qdrant, ensure_collection
from app.services.embedding_service import embed_texts, embedding_dimension
def upsert_chunks(user_id, document_id, filename, chunks):
    ensure_collection(embedding_dimension()); vectors = embed_texts(chunks); points = []
    for i, (chunk, vector) in enumerate(zip(chunks, vectors)):
        points.append(models.PointStruct(id=str(uuid5(NAMESPACE_URL, f"{user_id}:{document_id}:{i}")), vector=vector, payload={"user_id": str(user_id), "document_id": document_id, "filename": filename, "chunk_index": i, "text": chunk}))
    get_qdrant().upsert(collection_name=settings.qdrant_collection, points=points, wait=True)
def search_chunks(user_id, question, top_k=5):
    ensure_collection(embedding_dimension()); vector = embed_texts([question])[0]
    result = get_qdrant().query_points(collection_name=settings.qdrant_collection, query=vector, query_filter=models.Filter(must=[models.FieldCondition(key="user_id", match=models.MatchValue(value=str(user_id)))]), limit=top_k, with_payload=True).points
    return [{"document_id": str(p.payload.get("document_id", "")), "filename": str(p.payload.get("filename", "")), "chunk_index": int(p.payload.get("chunk_index", 0)), "text": str(p.payload.get("text", "")), "score": float(p.score) if p.score is not None else None} for p in result]
def delete_document_vectors(user_id, document_id):
    get_qdrant().delete(collection_name=settings.qdrant_collection, points_selector=models.FilterSelector(filter=models.Filter(must=[models.FieldCondition(key="user_id", match=models.MatchValue(value=str(user_id))), models.FieldCondition(key="document_id", match=models.MatchValue(value=document_id))])), wait=True)
