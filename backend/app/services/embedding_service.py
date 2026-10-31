from functools import lru_cache
from sentence_transformers import SentenceTransformer
from app.core.config import settings
@lru_cache(maxsize=1)
def get_model(): return SentenceTransformer(settings.embedding_model)
def embed_texts(texts: list[str]) -> list[list[float]]:
    return get_model().encode(texts, normalize_embeddings=True, convert_to_numpy=True, show_progress_bar=False).tolist()
def embedding_dimension():
    return int(get_model().get_embedding_dimension())