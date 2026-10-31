from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_name: str = "NoteBook"
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/notes_db"
    qdrant_url: str = "http://localhost:6333"
    qdrant_api_key: str | None = None
    qdrant_collection: str = "personal_notes"
    embedding_model: str = "BAAI/bge-small-en-v1.5"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.5-flash-lite"       
    jwt_secret_key: str = "CHANGE_ME_TO_A_LONG_RANDOM_SECRET"
    jwt_expire_minutes: int = 1440
    max_upload_mb: int = 15
    cors_origins_csv: str = "http://localhost:5173,http://localhost:3000"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    @property
    def cors_origins(self): return [x.strip() for x in self.cors_origins_csv.split(",") if x.strip()]

settings = Settings()
