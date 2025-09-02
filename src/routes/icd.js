import express from "express";

const router = express.Router();
});
  res.json({ count: idx.length });
});
    if (!entries.length) return res.status(400).json({ error: "No valid rows" });

    if (mode === "append"){
      const current = loadIndex();
      const seen = new Set(current.map(e => e.code));
      const merged = [...current];
      for (const e of entries) if (!seen.has(e.code)) merged.push(e);
      writeICDIndex(merged);
      return res.json({ ok: true, mode: "append", added: entries.length, total: merged.length });
    } else {
      writeICDIndex(entries);
      return res.json({ ok: true, mode: "replace", total: entries.length });
    }
  } catch (e){
    return res.status(500).json({ error: "Import failed" });
  }
});

export default router;
