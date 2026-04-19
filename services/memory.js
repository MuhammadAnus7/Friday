import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.resolve(__dirname, '../data/conversations.json');
const MAX_STORED_MESSAGES_PER_USER = 50;
const CONTEXT_WINDOW_SIZE = 5;

async function ensureDbFile() {
  try {
    await fs.access(DB_PATH);
  } catch {
    await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
    await fs.writeFile(DB_PATH, JSON.stringify({}, null, 2), 'utf8');
  }
}

async function readDb() {
  await ensureDbFile();
  const raw = await fs.readFile(DB_PATH, 'utf8');

  try {
    return JSON.parse(raw || '{}');
  } catch {
    return {};
  }
}

async function writeDb(data) {
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

export async function getConversationHistory(userId) {
  if (!userId) return [];

  const db = await readDb();
  const history = db[userId] || [];

  return history.slice(-CONTEXT_WINDOW_SIZE).map((item) => ({
    role: item.role,
    content: item.message
  }));
}

export async function saveMessage(userId, message, role) {
  if (!userId || !message || !role) {
    throw new Error('userId, message, and role are required to save conversation memory.');
  }

  const db = await readDb();
  const existing = db[userId] || [];

  existing.push({
    role,
    message,
    createdAt: new Date().toISOString()
  });

  db[userId] = existing.slice(-MAX_STORED_MESSAGES_PER_USER);
  await writeDb(db);
}
