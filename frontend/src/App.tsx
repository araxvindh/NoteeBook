import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Activity, ArrowRight, ArrowUpRight, BookOpen, Check, CheckCheck, Command,
  Copy, FileText, FolderOpen, History, Home, LogOut, Menu, MessageSquare,
  MoreHorizontal, Plus, Search, Send, Settings, ShieldCheck, Sparkles,
  Trash2, UploadCloud, UserRound, X, CircleHelp
} from "lucide-react";
import { api, getToken, setToken } from "./api";
import type { ChatItem, DocumentItem, Source } from "./api";

type Message = { id: string; role: "user" | "assistant"; content: string; sources?: Source[] };
type View = "chat" | "documents" | "history" | "settings";
const prompts = [
  { icon: "✳", title: "Summarize my notes", sub: "Get the key ideas in seconds" },
  { icon: "↗", title: "Explain a concept", sub: "Make difficult topics simple" },
  { icon: "⌘", title: "Prepare for an exam", sub: "Create revision questions" }
];
const formatDate = (value: string) => {
  try { return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" }); }
  catch { return ""; }
};

export default function App() {
  const [token, setTokenState] = useState<string | null>(getToken());
  const [email, setEmail] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [view, setView] = useState<View>("chat");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [history, setHistory] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [chatTitle, setChatTitle] = useState("Your notes, understood");
  const [sources, setSources] = useState<Source[]>([]);
  const [showSources, setShowSources] = useState(true);
  const [copied, setCopied] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) return;
    api.me().then(user => setEmail(user.email)).catch(() => {
      setToken(null);
      setTokenState(null);
    });
  }, [token]);

  useEffect(() => { if (token) void refreshData(); }, [token]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  async function refreshData() {
    try {
      const [docs, chats] = await Promise.all([api.documents(), api.history()]);
      setDocuments(docs);
      setHistory(chats);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load your data");
    }
  }

  async function authenticate(event: FormEvent) {
    event.preventDefault();
    setAuthBusy(true);
    setAuthError("");
    try {
      if (authMode === "register") await api.register(authEmail.trim(), password);
      const result = await api.login(authEmail.trim(), password);
      setToken(result.access_token);
      setTokenState(result.access_token);
      setEmail(authEmail.trim());
      setPassword("");
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : "Authentication failed");
    } finally {
      setAuthBusy(false);
    }
  }

  function logout() {
    setToken(null);
    setTokenState(null);
    setEmail("");
    setMessages([]);
    setDocuments([]);
    setHistory([]);
  }

  function newChat() {
    setMessages([]);
    setSources([]);
    setChatTitle("Your notes, understood");
    setInput("");
    setView("chat");
    setMobileOpen(false);
    setError("");
    setNotice("");
    inputRef.current?.focus();
  }

  async function sendMessage(raw?: string) {
    const question = (raw ?? input).trim();
    if (!question || loading) return;
    setMessages(previous => [...previous, { id: crypto.randomUUID(), role: "user", content: question }]);
    setInput("");
    setLoading(true);
    setError("");
    setNotice("");
    setView("chat");
    if (chatTitle === "Your notes, understood") {
      setChatTitle(question.length > 36 ? question.slice(0, 36) + "…" : question);
    }
    try {
      const result = await api.chat(question);
      setMessages(previous => [...previous, {
        id: crypto.randomUUID(), role: "assistant", content: result.answer, sources: result.sources
      }]);
      setSources(result.sources || []);
      await refreshData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chat request failed");
      setMessages(previous => [...previous, {
        id: crypto.randomUUID(), role: "assistant",
        content: "I couldn't complete that request. Check that FastAPI, Qdrant, PostgreSQL, and your Gemini API configuration are running, then try again."
      }]);
    } finally {
      setLoading(false);
    }
  }

  async function uploadFile(file?: File) {
    if (!file) return;
    setUploading(true);
    setError("");
    setNotice("");
    try {
      const document = await api.upload(file);
      setDocuments(previous => [document, ...previous.filter(item => item.id !== document.id)]);
      setNotice(`${document.filename} is ready to use in chat.`);
      setView("documents");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function deleteDocument(document: DocumentItem) {
    if (!window.confirm(`Delete "${document.filename}" and its indexed chunks?`)) return;
    try {
      await api.deleteDocument(document.id);
      setDocuments(previous => previous.filter(item => item.id !== document.id));
      setSources(previous => previous.filter(source => source.document_id !== document.id));
      setNotice("Document deleted.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  }

  async function copyText(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      window.setTimeout(() => setCopied(""), 1400);
    } catch {
      setError("Clipboard access is unavailable in this browser.");
    }
  }

  function openHistory(item: ChatItem) {
    setChatTitle(item.question.length > 36 ? item.question.slice(0, 36) + "…" : item.question);
    setMessages([
      { id: `user-${item.id}`, role: "user", content: item.question },
      { id: `assistant-${item.id}`, role: "assistant", content: item.answer, sources: item.sources }
    ]);
    setSources(item.sources || []);
    setView("chat");
    setMobileOpen(false);
  }

  if (!token) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <div className="brand-mark brand-large"><BookOpen size={24} /></div>
          <h1>Notebook</h1>
          <p className="auth-subtitle">A quieter space for everything you learn.</p>
          <div className="auth-tabs">
            <button className={authMode === "login" ? "active" : ""} onClick={() => { setAuthMode("login"); setAuthError(""); }}>Sign in</button>
            <button className={authMode === "register" ? "active" : ""} onClick={() => { setAuthMode("register"); setAuthError(""); }}>Create account</button>
          </div>
          <form className="auth-form" onSubmit={authenticate}>
            <label>Email address</label>
            <input type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required />
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" minLength={8} autoComplete={authMode === "login" ? "current-password" : "new-password"} required />
            {authError && <div className="error-box">{authError}</div>}
            <button className="primary-button full-width" disabled={authBusy}>{authBusy ? "Please wait…" : authMode === "login" ? "Sign in" : "Create account"} <ArrowRight size={16} /></button>
          </form>
          <div className="auth-privacy"><ShieldCheck size={15} /> Your workspace is private to your account</div>
          <p className="auth-footnote">Start your FastAPI backend on port 8000 before signing in.</p>
        </div>
      </div>
    );
  }

  const filteredDocuments = documents.filter(item => item.filename.toLowerCase().includes(search.toLowerCase()));
  const filteredHistory = history.filter(item => item.question.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="app-shell">
      {mobileOpen && <button className="mobile-scrim" onClick={() => setMobileOpen(false)} aria-label="Close menu" />}
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="brand-row"><div className="brand-mark"><BookOpen size={19} /></div><span className="brand-name">Notebook</span><button className="icon-button mobile-only" onClick={() => setMobileOpen(false)} aria-label="Close menu"><X size={18} /></button></div>
        <button className="new-chat" onClick={newChat}><Plus size={18} /><span>New chat</span><kbd>⌘ K</kbd></button>
        <nav className="navigation">
          <button className={view === "chat" ? "nav-link selected" : "nav-link"} onClick={() => { setView("chat"); setMobileOpen(false); }}><Home size={18} />Home</button>
          <button className={view === "documents" ? "nav-link selected" : "nav-link"} onClick={() => { setView("documents"); setMobileOpen(false); }}><FolderOpen size={18} />Documents<span className="nav-count">{documents.length || ""}</span></button>
          <button className={view === "history" ? "nav-link selected" : "nav-link"} onClick={() => { setView("history"); setMobileOpen(false); }}><History size={18} />Chat history</button>
          <button className={view === "settings" ? "nav-link selected" : "nav-link"} onClick={() => { setView("settings"); setMobileOpen(false); }}><Settings size={18} />Settings</button>
        </nav>
        <div className="side-divider" />
        <div className="section-heading">RECENT CHATS<button className="icon-button tiny" title="Refresh" onClick={() => void refreshData()}><Activity size={14} /></button></div>
        <div className="recent-list">{history.slice(0, 12).map(item => <button key={item.id} className="recent-link" onClick={() => openHistory(item)} title={item.question}><MessageSquare size={15} /><span>{item.question}</span></button>)}{history.length === 0 && <p className="recent-empty">Your conversations will appear here.</p>}</div>
        <div className="sidebar-bottom">
          <div className="workspace-card"><div className="workspace-icon"><Sparkles size={15} /></div><div><strong>Your knowledge space</strong><span>{documents.length} {documents.length === 1 ? "document" : "documents"} indexed</span></div><i className="online-dot" /><div className="meter"><span style={{ width: `${Math.min(100, documents.length * 10)}%` }} /></div></div>
          <button className="account-link" onClick={() => setView("settings")}><div className="avatar">{(email || "U").slice(0, 1).toUpperCase()}</div><div><strong>{email || "My account"}</strong><span>Personal workspace</span></div><MoreHorizontal size={18} /></button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left"><button className="icon-button mobile-only" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu size={19} /></button><div className="search-box"><Search size={16} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search your documents and chats…" /><kbd><Command size={10} /> K</kbd></div></div>
          <div className="topbar-right"><span className="private-pill"><i className="online-dot" /> Private workspace</span><button className="icon-button" title="Help" onClick={() => setNotice("Ask questions about notes you have uploaded. Answers include source references when available.")}><CircleHelp size={18} /></button><div className="avatar">{(email || "U").slice(0, 1).toUpperCase()}</div></div>
        </header>
        {(error || notice) && <div className={`toast ${error ? "toast-error" : ""}`}><span>{error || notice}</span><button onClick={() => { setError(""); setNotice(""); }} aria-label="Dismiss"><X size={15} /></button></div>}

        <div className="workspace">
          <section className="content-panel">
            {view === "chat" && <>
              <div className="chat-header"><div><div className="eyebrow"><i /> YOUR PERSONAL AI</div><h2>{chatTitle}</h2><div className="metadata"><span><Sparkles size={13} /> Notebook AI</span><span><FileText size={13} /> {documents.length} notes indexed</span></div></div><div className="header-actions">{messages.length > 0 && <button className="secondary-button" onClick={() => void copyText("all", messages.map(m => `${m.role}: ${m.content}`).join("\n\n"))}>{copied === "all" ? <Check size={15} /> : <Copy size={15} />} Copy chat</button>}<button className="primary-button" onClick={newChat}><Plus size={16} /> New chat</button></div></div>
              {messages.length === 0 ? <div className="welcome">
                <div className="hero-icon"><Sparkles size={27} /></div><div className="welcome-label">YOUR PERSONAL KNOWLEDGE SPACE</div><h1>Your notes, <span>understood.</span></h1><p>Ask anything about what you’ve learned. Notebook finds the relevant details and turns them into clear, useful answers.</p>
                <div className="prompt-grid">{prompts.map((p, i) => <button className="prompt-card" key={p.title} onClick={() => void sendMessage(["Summarize my uploaded notes", "Explain the most important concept in my notes in simple terms", "Create revision questions from my notes"][i])}><span className="prompt-symbol">{p.icon}</span><strong>{p.title}</strong><small>{p.sub}</small><ArrowUpRight size={15} className="prompt-arrow" /></button>)}</div>
                {documents.length === 0 ? <button className="upload-callout" onClick={() => fileRef.current?.click()}><span className="upload-symbol"><UploadCloud size={20} /></span><span><strong>Start with your first note</strong><small>Upload a PDF, DOCX, TXT or Markdown file</small></span><ArrowRight size={17} /></button> : <div className="recent-docs"><span>YOUR RECENT NOTES</span><div>{documents.slice(0, 3).map(d => <button key={d.id} onClick={() => setView("documents")}><FileText size={14} />{d.filename}</button>)}</div></div>}
              </div> : <div className="messages">{messages.map(m => <article className={`message ${m.role}`} key={m.id}><div className={`message-avatar ${m.role}`}>{m.role === "assistant" ? <Sparkles size={16} /> : <UserRound size={16} />}</div><div className="message-body"><div className="message-name">{m.role === "assistant" ? "Notebook" : "You"}<small>{m.role === "assistant" ? "AI assistant" : "Just now"}</small></div><div className="message-content">{m.content.split("\n").map((line, i) => <p key={i}>{line || " "}</p>)}</div>{m.role === "assistant" && m.sources && m.sources.length > 0 && <div className="source-chips"><span><FileText size={13} /> {m.sources.length} sources</span>{m.sources.slice(0, 3).map((s, i) => <button key={i} title={s.text} onClick={() => { setSources(m.sources || []); setShowSources(true); }}>{s.filename}</button>)}</div>}{m.role === "assistant" && <div className="message-tools"><button title="Copy answer" onClick={() => void copyText(m.id, m.content)}>{copied === m.id ? <CheckCheck size={15} /> : <Copy size={15} />}</button><button title="Show sources" onClick={() => { setSources(m.sources || []); setShowSources(true); }}><BookOpen size={15} /></button></div>}</div></article>)}{loading && <article className="message assistant"><div className="message-avatar assistant"><Sparkles size={16} /></div><div className="message-body"><div className="message-name">Notebook<small>Searching your notes</small></div><div className="typing"><i /><i /><i /></div></div></article>}<div ref={bottomRef} /></div>}
              <div className="composer-area"><div className="composer"><button className="attach-button" title="Upload a note" onClick={() => fileRef.current?.click()}><Plus size={20} /></button><textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} placeholder="Message Notebook…" rows={1} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }} /><div className="composer-actions"><span><Sparkles size={13} /> Notebook AI</span><button className="send-button" disabled={!input.trim() || loading} onClick={() => void sendMessage()} title="Send"><Send size={17} /></button></div></div><div className="composer-caption"><span><ShieldCheck size={12} /> Grounded in your uploaded notes</span><span>Enter to send · Shift + Enter for new line</span></div></div>
            </>}

            {view === "documents" && <div className="page"><div className="page-title"><div><div className="eyebrow"><i /> YOUR KNOWLEDGE BASE</div><h1>Documents</h1><p>All your notes, organized and ready to explore.</p></div><button className="primary-button" disabled={uploading} onClick={() => fileRef.current?.click()}>{uploading ? "Uploading…" : <><UploadCloud size={16} /> Upload note</>}</button></div><div className="storage-card"><div className="storage-icon"><FolderOpen size={20} /></div><div><strong>{documents.length} documents</strong><span>Indexed and searchable in your private workspace</span></div><span className="index-status"><i className="online-dot" /> RAG index ready</span></div><div className="list-toolbar"><span>ALL DOCUMENTS <b>{filteredDocuments.length}</b></span><div className="filter-box"><Search size={14} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter documents" /></div></div>{filteredDocuments.length === 0 ? <div className="empty-state"><div><FileText size={24} /></div><h3>{documents.length ? "No matching documents" : "Your notes start here"}</h3><p>{documents.length ? "Try another search." : "Upload a document and Notebook will make it searchable."}</p><button className="secondary-button" onClick={() => fileRef.current?.click()}><Plus size={15} /> Upload your first note</button></div> : <div className="document-grid">{filteredDocuments.map(d => <article className="document-card" key={d.id}><div className="file-icon"><FileText size={21} /></div><button className="delete-button" title="Delete document" onClick={() => void deleteDocument(d)}><Trash2 size={15} /></button><h3 title={d.filename}>{d.filename}</h3><p>{d.chunk_count} chunks · {formatDate(d.created_at)}</p><div className="document-footer"><span><Check size={12} /> Indexed</span><button onClick={() => { setInput(`Summarize ${d.filename}`); setView("chat"); }}>Ask Notebook <ArrowRight size={13} /></button></div></article>)}</div>}<div className="dropzone" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); void uploadFile(e.dataTransfer.files?.[0]); }}><UploadCloud size={20} /><div><strong>Add more notes</strong><span>Drag a file here or <button onClick={() => fileRef.current?.click()}>browse files</button></span></div><small>PDF, DOCX, TXT, MD</small></div></div>}

            {view === "history" && <div className="page"><div className="page-title"><div><div className="eyebrow"><i /> YOUR ACTIVITY</div><h1>Chat history</h1><p>Pick up where you left off.</p></div><button className="primary-button" onClick={newChat}><Plus size={16} /> New chat</button></div>{filteredHistory.length === 0 ? <div className="empty-state"><div><History size={24} /></div><h3>No conversations yet</h3><p>Ask Notebook a question to start your first conversation.</p><button className="secondary-button" onClick={newChat}>Start a conversation <ArrowRight size={15} /></button></div> : <div className="history-list">{filteredHistory.map(h => <button className="history-card" key={h.id} onClick={() => openHistory(h)}><div className="history-icon"><MessageSquare size={18} /></div><div><strong>{h.question}</strong><span>{h.answer.slice(0, 140)}…</span><small>{formatDate(h.created_at)} · {h.sources?.length || 0} sources</small></div><ArrowUpRight size={16} /></button>)}</div>}</div>}

            {view === "settings" && <div className="page"><div className="page-title"><div><div className="eyebrow"><i /> PREFERENCES</div><h1>Settings</h1><p>Manage your Notebook workspace.</p></div></div><div className="settings-card"><div className="settings-icon"><UserRound size={19} /></div><div className="settings-body"><h3>Account</h3><p>Your signed-in account and personal workspace.</p><span className="setting-value">{email}</span></div><button className="secondary-button" onClick={logout}><LogOut size={15} /> Sign out</button></div><div className="settings-card"><div className="settings-icon"><Sparkles size={19} /></div><div className="settings-body"><h3>AI configuration</h3><p>Notebook uses FastAPI for retrieval and answer generation.</p><span className="setting-value">API endpoint: {import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api"}</span></div><span className="tag">Local API</span></div><div className="settings-card"><div className="settings-icon green"><ShieldCheck size={19} /></div><div className="settings-body"><h3>Privacy & security</h3><p>Requests are authenticated. Keep API keys on the server, never in the frontend.</p></div><span className="tag green">Protected</span></div></div>}
          </section>

          {view === "chat" && showSources && sources.length > 0 && <aside className="sources-panel"><div className="sources-heading"><div><div className="eyebrow">RETRIEVAL CONTEXT</div><h3>Sources <span>{sources.length}</span></h3></div><button className="icon-button" onClick={() => setShowSources(false)} title="Hide sources"><X size={17} /></button></div>{sources.map((s, i) => <article className="source-card" key={`${s.document_id}-${i}`}><div className="source-top"><div className="source-file"><FileText size={16} /></div><div><strong title={s.filename}>{s.filename}</strong><small>Chunk {s.chunk_index + 1}{s.score != null ? ` · ${(s.score * 100).toFixed(0)}% match` : ""}</small></div></div><p>{s.text.length > 300 ? s.text.slice(0, 300) + "…" : s.text}</p><button className="copy-source" onClick={() => void copyText(`source-${i}`, s.text)}>{copied === `source-${i}` ? <Check size={13} /> : <Copy size={13} />}{copied === `source-${i}` ? "Copied" : "Copy excerpt"}</button></article>)}<div className="source-disclaimer"><ShieldCheck size={14} /> Verify important details against your original notes.</div></aside>}
        </div>
      </main>
      <input ref={fileRef} type="file" accept=".pdf,.docx,.txt,.md" hidden onChange={e => { void uploadFile(e.target.files?.[0]); e.target.value = ""; }} />
    </div>
  );
}
