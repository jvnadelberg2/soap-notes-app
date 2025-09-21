import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FILE = path.resolve(__dirname, "../../data/todo.json");

function loadTodo(){
  try { return JSON.parse(fs.readFileSync(FILE,"utf8")); } catch { return { updatedAt: new Date().toISOString(), items: [] }; }
}
function saveTodo(doc){
  doc.updatedAt = new Date().toISOString();
  fs.writeFileSync(FILE, JSON.stringify(doc, null, 2));
  return doc;
}
function slugId(s){
  return String(s||"item").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"").slice(0,50) || "item";
}

router.get("/todo", (req, res) => {
  const doc = loadTodo();
  res.json(doc);
});

router.post("/todo", (req, res) => {
  try{
    const { action = "add", id = "", text = "", done = null, items = null } = req.body || {};
    let doc = loadTodo();
    if (action === "replace" && Array.isArray(items)) {
      doc.items = items.map(x => ({ id: x.id || slugId(x.text), text: String(x.text||""), done: !!x.done }));
      return res.json(saveTodo(doc));
    }
    if (action === "add" && text.trim()) {
      const nid = id || slugId(text);
      if (!doc.items.find(i => i.id === nid)) doc.items.push({ id: nid, text: text.trim(), done: false });
      return res.json(saveTodo(doc));
    }
    if (action === "toggle" && id) {
      const it = doc.items.find(i => i.id === id);
      if (it) it.done = done==null ? !it.done : !!done;
      return res.json(saveTodo(doc));
    }
    if (action === "remove" && id) {
      doc.items = doc.items.filter(i => i.id !== id);
      return res.json(saveTodo(doc));
    }
    return res.status(400).json({ error: "Bad request" });
  } catch {
    return res.status(500).json({ error: "Failed" });
  }
});

export default router;
