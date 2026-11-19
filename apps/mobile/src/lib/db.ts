import * as SQLite from 'expo-sqlite';
import { getDbKey } from './device';

export interface ConversationRow {
  id: string;
  title: string;
  model: string;
  updated_at: number;
  /** Sohbetin son kullanılan modu; eski kayıtlarda null. */
  mode: string | null;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  reasoning: string | null;
  thought_ms: number | null;
  model: string | null;
  error: string | null;
  created_at: number;
}

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/** Sohbetler yalnızca cihazda, SQLCipher ile şifreli saklanır. */
export function db(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const d = await SQLite.openDatabaseAsync('gur.db');
      const key = await getDbKey();
      // Anahtar 64 hex karakter; SQLCipher'a ham anahtar olarak verilir.
      await d.execAsync(`PRAGMA key = "x'${key}'";`);
      await d.execAsync(`
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;
        CREATE TABLE IF NOT EXISTS conversations (
          id TEXT PRIMARY KEY NOT NULL,
          title TEXT NOT NULL,
          model TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY NOT NULL,
          conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
          role TEXT NOT NULL,
          content TEXT NOT NULL,
          reasoning TEXT,
          thought_ms INTEGER,
          model TEXT,
          error TEXT,
          created_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, created_at);
      `);
      // Geçiş: Faz 1 veritabanlarında "mode" sütunu yok.
      const cols = await d.getAllAsync<{ name: string }>('PRAGMA table_info(conversations)');
      if (!cols.some((c) => c.name === 'mode')) {
        await d.execAsync('ALTER TABLE conversations ADD COLUMN mode TEXT');
      }
      return d;
    })();
  }
  return dbPromise;
}

export async function listConversations(): Promise<ConversationRow[]> {
  return (await db()).getAllAsync<ConversationRow>(
    'SELECT * FROM conversations ORDER BY updated_at DESC LIMIT 200',
  );
}

export async function getMessages(conversationId: string): Promise<MessageRow[]> {
  return (await db()).getAllAsync<MessageRow>(
    'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
    conversationId,
  );
}

export async function upsertConversation(c: ConversationRow): Promise<void> {
  await (await db()).runAsync(
    `INSERT INTO conversations (id, title, model, updated_at, mode) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET title = excluded.title, model = excluded.model,
       updated_at = excluded.updated_at, mode = excluded.mode`,
    c.id, c.title, c.model, c.updated_at, c.mode,
  );
}

export async function saveMessage(m: MessageRow): Promise<void> {
  await (await db()).runAsync(
    `INSERT INTO messages (id, conversation_id, role, content, reasoning, thought_ms, model, error, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET content = excluded.content, reasoning = excluded.reasoning,
       thought_ms = excluded.thought_ms, error = excluded.error`,
    m.id, m.conversation_id, m.role, m.content, m.reasoning, m.thought_ms, m.model, m.error, m.created_at,
  );
}

export async function deleteConversation(id: string): Promise<void> {
  await (await db()).runAsync('DELETE FROM conversations WHERE id = ?', id);
}

export async function deleteMessages(ids: string[]): Promise<void> {
  if (!ids.length) return;
  await (await db()).runAsync(`DELETE FROM messages WHERE id IN (${ids.map(() => '?').join(',')})`, ...ids);
}
