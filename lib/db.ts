import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "past-tense.db");
const db = new Database(dbPath);

// Initialize schema on startup
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    persona_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(session_id) REFERENCES sessions(id)
  );
`);

export interface StoredMessage {
  id: number;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export function getOrCreateSession(sessionId: string, personaId: string) {
  const stmt = db.prepare("INSERT OR IGNORE INTO sessions (id, persona_id) VALUES (?, ?)");
  stmt.run(sessionId, personaId);
}

export function getMessages(sessionId: string): StoredMessage[] {
  const stmt = db.prepare("SELECT * FROM messages WHERE session_id = ? ORDER BY id ASC");
  return stmt.all(sessionId) as StoredMessage[];
}

export function insertMessage(sessionId: string, role: "user" | "assistant", content: string) {
  const stmt = db.prepare("INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)");
  stmt.run(sessionId, role, content);
}

export function clearSessionMessages(sessionId: string) {
  const stmt = db.prepare("DELETE FROM messages WHERE session_id = ?");
  stmt.run(sessionId);
}