'use strict';

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'data');
const NOTES_FILE = path.join(DATA_DIR, 'notes.json');

function ensure() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(NOTES_FILE)) fs.writeFileSync(NOTES_FILE, JSON.stringify({}), 'utf8');
}
function readAll() {
  ensure();
  const raw = fs.readFileSync(NOTES_FILE, 'utf8') || '{}';
  try { return JSON.parse(raw); } catch { return {}; }
}
function writeAll(obj) {
  ensure();
  const tmp = NOTES_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8');
  fs.renameSync(tmp, NOTES_FILE);
}
function genId() {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 8);
  return `N_${t}_${r}`;
}

async function saveNote(note) {
  const all = readAll();
  const id = genId();
  const now = new Date().toISOString();
  all[id] = { id, createdAt: now, updatedAt: now, ...note };
  writeAll(all);
  return all[id];
}

async function updateNote(id, patch) {
  const all = readAll();
  if (!all[id]) return null;
  const now = new Date().toISOString();
  all[id] = { ...all[id], ...patch, id, updatedAt: now };
  writeAll(all);
  return all[id];
}

async function getNoteById(id) {
  const all = readAll();
  return all[id] || null;
}

async function listNotes() {
  const all = readAll();
  return Object.values(all).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
}

module.exports = { saveNote, updateNote, getNoteById, listNotes };
