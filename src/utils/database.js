import * as SQLite from 'expo-sqlite';

let db;

export async function getDB() {
  if (!db) {
    db = await SQLite.openDatabaseAsync('notesync.db');
    await initSchema(db);
  }
  return db;
}

async function initSchema(db) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS notebooks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT DEFAULT '📓',
      color TEXT DEFAULT '#4F7CFF',
      created_at INTEGER DEFAULT (strftime('%s','now') * 1000),
      updated_at INTEGER DEFAULT (strftime('%s','now') * 1000)
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      notebook_id TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT 'Untitled',
      content TEXT DEFAULT '',
      pinned INTEGER DEFAULT 0,
      tags TEXT DEFAULT '[]',
      created_at INTEGER DEFAULT (strftime('%s','now') * 1000),
      updated_at INTEGER DEFAULT (strftime('%s','now') * 1000),
      FOREIGN KEY (notebook_id) REFERENCES notebooks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      note_id TEXT,
      task_id TEXT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      uri TEXT NOT NULL,
      size INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (strftime('%s','now') * 1000)
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      due_date TEXT DEFAULT '',
      due_time TEXT DEFAULT '',
      priority TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'pending',
      repeat TEXT DEFAULT 'none',
      tags TEXT DEFAULT '[]',
      notification_id TEXT DEFAULT '',
      created_at INTEGER DEFAULT (strftime('%s','now') * 1000),
      updated_at INTEGER DEFAULT (strftime('%s','now') * 1000)
    );

    CREATE TABLE IF NOT EXISTS task_comments (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s','now') * 1000),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // Seed default notebooks if empty
  const count = await db.getFirstAsync('SELECT COUNT(*) as c FROM notebooks');
  if (count.c === 0) {
    const now = Date.now();
    await db.runAsync(
      `INSERT INTO notebooks (id, name, icon, color, created_at, updated_at) VALUES
       ('nb1','Personal','📓','#4F7CFF',?,?),
       ('nb2','Work','💼','#FF6B6B',?,?),
       ('nb3','Ideas','💡','#00D2A0',?,?)`,
      [now, now, now, now, now, now]
    );
    await db.runAsync(
      `INSERT INTO notes (id, notebook_id, title, content, pinned, tags, created_at, updated_at) VALUES
       ('n1','nb1','Welcome to NoteSync','Start writing your notes here. Embed images and PDFs, set reminders, and sync across devices!',1,'["welcome"]',?,?)`,
      [now, now]
    );
  }
}

// ── NOTEBOOKS ──────────────────────────────────────────────
export async function getAllNotebooks() {
  const db = await getDB();
  return db.getAllAsync('SELECT * FROM notebooks ORDER BY created_at ASC');
}

export async function createNotebook({ id, name, icon, color }) {
  const db = await getDB();
  const now = Date.now();
  await db.runAsync(
    'INSERT INTO notebooks (id,name,icon,color,created_at,updated_at) VALUES (?,?,?,?,?,?)',
    [id, name, icon, color, now, now]
  );
}

export async function updateNotebook({ id, name, icon, color }) {
  const db = await getDB();
  await db.runAsync(
    'UPDATE notebooks SET name=?,icon=?,color=?,updated_at=? WHERE id=?',
    [name, icon, color, Date.now(), id]
  );
}

export async function deleteNotebook(id) {
  const db = await getDB();
  await db.runAsync('DELETE FROM notebooks WHERE id=?', [id]);
}

// ── NOTES ──────────────────────────────────────────────────
export async function getNotesByNotebook(notebookId) {
  const db = await getDB();
  if (notebookId === 'all') {
    return db.getAllAsync('SELECT * FROM notes ORDER BY pinned DESC, updated_at DESC');
  }
  return db.getAllAsync(
    'SELECT * FROM notes WHERE notebook_id=? ORDER BY pinned DESC, updated_at DESC',
    [notebookId]
  );
}

export async function getNoteById(id) {
  const db = await getDB();
  return db.getFirstAsync('SELECT * FROM notes WHERE id=?', [id]);
}

export async function createNote({ id, notebookId, title, content = '', tags = [] }) {
  const db = await getDB();
  const now = Date.now();
  await db.runAsync(
    'INSERT INTO notes (id,notebook_id,title,content,pinned,tags,created_at,updated_at) VALUES (?,?,?,?,0,?,?,?)',
    [id, notebookId, title, content, JSON.stringify(tags), now, now]
  );
}

export async function updateNote({ id, title, content, pinned, tags, notebookId }) {
  const db = await getDB();
  await db.runAsync(
    'UPDATE notes SET title=?,content=?,pinned=?,tags=?,notebook_id=?,updated_at=? WHERE id=?',
    [title, content, pinned ? 1 : 0, JSON.stringify(tags), notebookId, Date.now(), id]
  );
}

export async function deleteNote(id) {
  const db = await getDB();
  await db.runAsync('DELETE FROM notes WHERE id=?', [id]);
  await db.runAsync('DELETE FROM attachments WHERE note_id=?', [id]);
}

export async function searchNotes(query) {
  const db = await getDB();
  return db.getAllAsync(
    "SELECT * FROM notes WHERE title LIKE ? OR content LIKE ? ORDER BY updated_at DESC",
    [`%${query}%`, `%${query}%`]
  );
}

// ── ATTACHMENTS ────────────────────────────────────────────
export async function getAttachments({ noteId, taskId }) {
  const db = await getDB();
  if (noteId) return db.getAllAsync('SELECT * FROM attachments WHERE note_id=?', [noteId]);
  if (taskId) return db.getAllAsync('SELECT * FROM attachments WHERE task_id=?', [taskId]);
  return [];
}

export async function addAttachment({ id, noteId, taskId, name, type, uri, size }) {
  const db = await getDB();
  await db.runAsync(
    'INSERT INTO attachments (id,note_id,task_id,name,type,uri,size) VALUES (?,?,?,?,?,?,?)',
    [id, noteId || null, taskId || null, name, type, uri, size || 0]
  );
}

export async function deleteAttachment(id) {
  const db = await getDB();
  await db.runAsync('DELETE FROM attachments WHERE id=?', [id]);
}

// ── TASKS ──────────────────────────────────────────────────
export async function getAllTasks() {
  const db = await getDB();
  return db.getAllAsync('SELECT * FROM tasks ORDER BY due_date ASC, created_at DESC');
}

export async function createTask({ id, title, description, dueDate, dueTime, priority, status, repeat, tags }) {
  const db = await getDB();
  const now = Date.now();
  await db.runAsync(
    'INSERT INTO tasks (id,title,description,due_date,due_time,priority,status,repeat,tags,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
    [id, title, description, dueDate, dueTime, priority, status, repeat, JSON.stringify(tags), now, now]
  );
}

export async function updateTask({ id, title, description, dueDate, dueTime, priority, status, repeat, tags, notificationId }) {
  const db = await getDB();
  await db.runAsync(
    'UPDATE tasks SET title=?,description=?,due_date=?,due_time=?,priority=?,status=?,repeat=?,tags=?,notification_id=?,updated_at=? WHERE id=?',
    [title, description, dueDate, dueTime, priority, status, repeat, JSON.stringify(tags), notificationId || '', Date.now(), id]
  );
}

export async function deleteTask(id) {
  const db = await getDB();
  await db.runAsync('DELETE FROM tasks WHERE id=?', [id]);
  await db.runAsync('DELETE FROM task_comments WHERE task_id=?', [id]);
  await db.runAsync('DELETE FROM attachments WHERE task_id=?', [id]);
}

// ── TASK COMMENTS ──────────────────────────────────────────
export async function getComments(taskId) {
  const db = await getDB();
  return db.getAllAsync('SELECT * FROM task_comments WHERE task_id=? ORDER BY created_at ASC', [taskId]);
}

export async function addComment({ id, taskId, text }) {
  const db = await getDB();
  await db.runAsync(
    'INSERT INTO task_comments (id,task_id,text) VALUES (?,?,?)',
    [id, taskId, text]
  );
}

export async function deleteComment(id) {
  const db = await getDB();
  await db.runAsync('DELETE FROM task_comments WHERE id=?', [id]);
}

// ── SETTINGS ───────────────────────────────────────────────
export async function getSetting(key) {
  const db = await getDB();
  const row = await db.getFirstAsync('SELECT value FROM settings WHERE key=?', [key]);
  return row ? row.value : null;
}

export async function setSetting(key, value) {
  const db = await getDB();
  await db.runAsync(
    'INSERT OR REPLACE INTO settings (key,value) VALUES (?,?)',
    [key, value]
  );
}
