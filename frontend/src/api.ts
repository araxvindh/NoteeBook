export type Source = {
  document_id: string;
  filename: string;
  chunk_index: number;
  text: string;
  score?: number | null;
};
export type DocumentItem = {
  id: string;
  filename: string;
  content_type: string;
  chunk_count: number;
  created_at: string;
};
export type ChatItem = {
  id: number;
  question: string;
  answer: string;
  sources: Source[];
  created_at: string;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

export function getToken() {
  return localStorage.getItem("notebook_token");
}
export function setToken(value: string | null) {
  if (value) localStorage.setItem("notebook_token", value);
  else localStorage.removeItem("notebook_token");
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail || `Request failed (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  register: (email: string, password: string) =>
    request<{ id: number; email: string }>("/auth/register", {
      method: "POST", body: JSON.stringify({ email, password })
    }),
  login: (email: string, password: string) =>
    request<{ access_token: string; token_type: string }>("/auth/login", {
      method: "POST", body: JSON.stringify({ email, password })
    }),
  me: () => request<{ id: number; email: string }>("/auth/me"),
  documents: () => request<DocumentItem[]>("/documents"),
  upload: (file: File) => {
    const data = new FormData();
    data.append("file", file);
    return request<DocumentItem>("/documents", { method: "POST", body: data });
  },
  deleteDocument: (id: string) =>
    request<void>(`/documents/${encodeURIComponent(id)}`, { method: "DELETE" }),
  chat: (question: string) =>
    request<{ answer: string; sources: Source[] }>("/chat", {
      method: "POST", body: JSON.stringify({ question, top_k: 5 })
    }),
  history: () => request<ChatItem[]>("/chat/history")
};
