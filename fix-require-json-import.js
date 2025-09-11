const fs = require('fs');
const p = 'routes/notes-api.js';
if (!fs.existsSync(p)) { console.error(`[error] ${p} not found`); process.exit(1); }
let s = fs.readFileSync(p, 'utf8');
if (!s.includes("require('../middleware/require-json')")) {
  // Try to place it after 'use strict' if present; otherwise, prepend.
  if (/^\s*'use strict';?\s*\n/.test(s)) {
    s = s.replace(/^\s*'use strict';?\s*\n/, m => m + "const requireJSON = require('../middleware/require-json');\n");
  } else {
    s = "const requireJSON = require('../middleware/require-json');\n" + s;
  }
  fs.writeFileSync(p, s);
  console.log('[patched] inserted requireJSON import in routes/notes-api.js');
} else {
  console.log('[skip] requireJSON already imported');
}
