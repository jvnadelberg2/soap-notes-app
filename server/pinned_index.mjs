import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// absolute path to ./public
const pub = path.resolve(__dirname, "../public");

// serve everything in public/ (HTML, JS, JSON, etc.)
app.use(express.static(pub, { fallthrough: false }));

// default route -> index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(pub, "index.html"));
});

const port = 3002;
app.listen(port, "127.0.0.1", () => {
  console.log(`SOAP Notes app ready at http://127.0.0.1:${port}`);
});
