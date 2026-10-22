// Servidor local para testar o site sem o Netlify.
// Uso:
//   ADMIN_PASSWORD=teste YT_MOCK=1 node scripts/dev-server.mjs
//   (ou YOUTUBE_API_KEY=... para usar a API real)
// Os dados ficam na pasta .localdata (podes apagá-la para recomeçar).

import http from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.env.PLACAR_LOCAL_DIR ||= path.join(root, ".localdata");
const PORT = Number(process.env.PORT || 8888);

const { default: api } = await import("../netlify/functions/api.mjs");
const { default: daily } = await import("../netlify/functions/collect-daily.mjs");
const { default: hourly } = await import("../netlify/functions/collect-hourly.mjs");
process.env.URL = `http://localhost:${PORT}`;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json",
  ".txt": "text/plain; charset=utf-8",
};

async function toRequest(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const bodyBuf = Buffer.concat(chunks);
  return new Request(`http://localhost:${PORT}${req.url}`, {
    method: req.method,
    headers: req.headers,
    body: ["GET", "HEAD"].includes(req.method) ? undefined : bodyBuf,
  });
}

async function send(res, response) {
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
}

http
  .createServer(async (req, res) => {
    try {
      const u = new URL(req.url, "http://x");
      if (u.pathname.startsWith("/api/")) return send(res, await api(await toRequest(req)));
      if (u.pathname === "/__cron/daily") return send(res, await daily());
      if (u.pathname === "/__cron/hourly") return send(res, await hourly());
      let file = path.join(root, "public", decodeURIComponent(u.pathname));
      if (!file.startsWith(path.join(root, "public"))) throw new Error("bad path");
      let stat = await fs.stat(file).catch(() => null);
      if (stat?.isDirectory()) {
        file = path.join(file, "index.html");
        stat = await fs.stat(file).catch(() => null);
      }
      if (!stat) {
        res.writeHead(404, { "content-type": "text/plain" });
        return res.end("404");
      }
      res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream", "cache-control": "no-store" });
      res.end(await fs.readFile(file));
    } catch (e) {
      console.error(e);
      res.writeHead(500);
      res.end(String(e.message));
    }
  })
  .listen(PORT, () => console.log(`Placar local em http://localhost:${PORT}`));
