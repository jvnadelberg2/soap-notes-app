export function apiAuth(req, res, next) {
  const user = process.env.BASIC_AUTH_USER || "";
  const pass = process.env.BASIC_AUTH_PASS || "";
  const openGet = req.method === "GET" && ["/health","/specialties","/models","/providers"].includes(req.path);
  if (openGet || !user || !pass) return next();
  const h = req.headers.authorization || "";
  if (!h.startsWith("Basic ")) { res.set("WWW-Authenticate","Basic realm=\"soap-notes\""); return res.status(401).end("Auth required"); }
  const decoded = Buffer.from(h.slice(6), "base64").toString();
  if (decoded === `${user}:${pass}`) return next();
  res.set("WWW-Authenticate","Basic realm=\"soap-notes\""); return res.status(401).end("Auth required");
}
