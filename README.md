# NoteeBook

Starter folder structure for a personal notes RAG application.

## Planned stack
- Frontend: React + TypeScript + Vite + Tailwind CSS
- Backend: FastAPI
- RAG: LlamaIndex
- Embeddings: BAAI/bge-small-en-v1.5
- Vector database: Qdrant
- Relational database: PostgreSQL
- LLM: Gemini API
- Object storage: Amazon S3
- Testing: Pytest, HTTPX, Playwright, Ragas
- Security testing: Promptfoo, Gitleaks, Trivy
- Deployment: Docker, Nginx, GitHub Actions, AWS EC2/ECR

## Status
This ZIP contains the proposed directory layout and placeholder files only. It is not a fully implemented application yet.

## Getting started
1. Review `.env.example` and create local environment files as needed.
2. Implement the backend and frontend in their respective directories.
3. Use `docker-compose.yml` for local development after adding service definitions.
4. Add CI/CD secrets and AWS OIDC configuration before enabling deployment.
