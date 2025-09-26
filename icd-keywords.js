const express = require("express");

function icdKeywordsRouter() {
  const router = express.Router();

  router.post("/keywords", (req, res) => {
    const noteText = String(req.body?.text || "").trim();
    const limit = Math.min(Number(req.body?.limit || 8), 12);

    if (!noteText) {
      return res.json({ keywords: ["general"] });
    }

    const stopwords = new Set([
      "the","and","with","without","from","this","that","these","those",
      "patient","patients","pt","male","female","years","old","year","history"
    ]);

    const words = noteText
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")      // remove punctuation
      .replace(/(patient){2,}/g, "patient") // collapse "patientpatient"
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopwords.has(w));

    let unique = [...new Set(words)].slice(0, limit);

    if (!unique.length) {
      unique = ["general"];
    }

    res.json({ keywords: unique });
  });

  return router;
}

module.exports = { icdKeywordsRouter };