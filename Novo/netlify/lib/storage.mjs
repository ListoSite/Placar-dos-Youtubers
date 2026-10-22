// Armazenamento de dados.
// Em produção usa o Netlify Blobs (grátis, incluído no Netlify).
// Em testes locais (variável PLACAR_LOCAL_DIR) usa ficheiros numa pasta.

import { promises as fs } from "node:fs";
import path from "node:path";

const LOCAL_DIR = process.env.PLACAR_LOCAL_DIR;
let blobStore = null;

async function store() {
  if (blobStore) return blobStore;
  const { getStore } = await import("@netlify/blobs");
  blobStore = getStore({ name: "placar", consistency: "strong" });
  return blobStore;
}

function localPath(key) {
  const safe = key.replace(/[^a-zA-Z0-9/_\-.]/g, "_");
  return path.join(LOCAL_DIR, safe + ".json");
}

export async function getJSON(key, fallback = null) {
  if (LOCAL_DIR) {
    try {
      return JSON.parse(await fs.readFile(localPath(key), "utf8"));
    } catch {
      return fallback;
    }
  }
  const s = await store();
  const v = await s.get(key, { type: "json" });
  return v ?? fallback;
}

export async function setJSON(key, value) {
  if (LOCAL_DIR) {
    const p = localPath(key);
    await fs.mkdir(path.dirname(p), { recursive: true });
    await fs.writeFile(p, JSON.stringify(value));
    return;
  }
  const s = await store();
  await s.setJSON(key, value);
}

export async function remove(key) {
  if (LOCAL_DIR) {
    await fs.rm(localPath(key), { force: true });
    return;
  }
  const s = await store();
  await s.delete(key);
}

export async function listKeys(prefix) {
  if (LOCAL_DIR) {
    const dir = path.join(LOCAL_DIR, prefix);
    try {
      const files = await fs.readdir(dir);
      return files.filter((f) => f.endsWith(".json")).map((f) => prefix + f.slice(0, -5));
    } catch {
      return [];
    }
  }
  const s = await store();
  const { blobs } = await s.list({ prefix });
  return blobs.map((b) => b.key);
}
