'use strict';

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'data');
const NOTES_FILE = path.join(DATA_DIR, 'notes.json');

async function ensureStore() {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  try {
    await fsp.access(NOTES_FILE, fs.constants.F_OK);
  } catch {
    await writeAll([]);
  }
}

async function readAll() {
  await ensureStore();
  try {
    const raw = await fsp.readFile(NOTES_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    const arr = Array.isArray(parsed) ? parsed :
                Array.isArray(parsed?.notes) ? parsed.notes : [];
    return arr;
  } catch {
    return [];
  }
}

async function writeAll(list) {
  const payload = JSON.stringify({ notes: list }, null, 2);
  const tmp = NOTES_FILE + '.tmp';
  await fsp.writeFile(tmp, payload, 'utf8');
  await fsp.rename(tmp, NOTES_FILE);
}

function newId() {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}
function nowISO() { return new Date().toISOString(); }

async function saveNote(data) {
  const list = await readAll();
  const id = newId();
  const createdAt = nowISO();
  const updatedAt = createdAt;
  const note = { id, createdAt, updatedAt, ...data };
  list.unshift(note);
  await writeAll(list);
  return note;
}

async function updateNote(id, data) {
  const list = await readAll();
  const idx = list.findIndex(n => n.id === id);
  if (idx === -1) return null;
  const updated = { ...list[idx], ...data, id, updatedAt: nowISO() };
  list[idx] = updated;
  await writeAll(list);
  return updated;
}

async function getNoteById(id) {
  const list = await readAll();
  return list.find(n => n.id === id) || null;
}

async function listNotes() {
  const list = await readAll();
  list.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  return list;
}

async function deleteNote(id) {
  const list = await readAll();
  const next = list.filter(n => n.id !== id);
  if (next.length === list.length) return false;
  await writeAll(next);
  return true;
}

async function deleteAllNotes() {
  await writeAll([]);
  return true;
}

module.exports = {
  saveNote,
  updateNote,
  getNoteById,
  listNotes,
  deleteNote,
  deleteAllNotes
};
