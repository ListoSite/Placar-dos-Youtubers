// Armazenamento de dados.
//
// Há três sítios onde os dados podem viver:
//   - Supabase (base de dados Postgres): quando SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY estão
//     definidas no Netlify e os dados já foram copiados para lá (botão em Editar, Definições).
//     As pessoas, canais e projetos ficam em tabelas próprias (fáceis de ver e editar no Supabase);
//     o resto (estatísticas, registos diários, definições) fica na tabela "documentos".
//   - Netlify Blobs: o armazenamento de origem, usado até os dados passarem para o Supabase.
//   - Ficheiros numa pasta (variável PLACAR_LOCAL_DIR), para testes locais.
//
// Para o resto do código é igual: getJSON, setJSON, remove, listKeys e, para listas que só crescem
// (resultados do Palco), adicionarLinhas e lerLinhas.

import { promises as fs } from "node:fs";
import path from "node:path";

const LOCAL_DIR = process.env.PLACAR_LOCAL_DIR;
/** O endereço do projeto (aceita também o que vem com /rest/v1 ou /auth/v1 no fim, copiado do Supabase). */
export function urlSupabase() {
  return (process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "").replace(/\/(rest|auth)\/v1$/, "");
}
const SB_URL = urlSupabase();
const SB_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
export const supabaseConfigurado = () => Boolean(SB_URL && SB_KEY);

// ---------- Ficheiros locais ----------
const local = {
  nome: "local",
  caminho(key) {
    const safe = key.replace(/[^a-zA-Z0-9/_\-.]/g, "_");
    return path.join(LOCAL_DIR, safe + ".json");
  },
  async get(key) {
    try {
      return JSON.parse(await fs.readFile(this.caminho(key), "utf8"));
    } catch {
      return null;
    }
  },
  async set(key, value) {
    const p = this.caminho(key);
    await fs.mkdir(path.dirname(p), { recursive: true });
    await fs.writeFile(p, JSON.stringify(value));
  },
  async remove(key) {
    await fs.rm(this.caminho(key), { force: true });
  },
  async list(prefix) {
    const base = path.join(LOCAL_DIR, prefix);
    const dir = prefix.endsWith("/") || !prefix ? base : path.dirname(base);
    const out = [];
    const andar = async (d, rel) => {
      let itens = [];
      try {
        itens = await fs.readdir(d, { withFileTypes: true });
      } catch {
        return;
      }
      for (const it of itens) {
        if (it.isDirectory()) await andar(path.join(d, it.name), rel + it.name + "/");
        else if (it.name.endsWith(".json")) out.push(rel + it.name.slice(0, -5));
      }
    };
    await andar(dir, path.relative(LOCAL_DIR, dir) ? path.relative(LOCAL_DIR, dir).split(path.sep).join("/") + "/" : "");
    return out.filter((k) => k.startsWith(prefix));
  },
};

// ---------- Netlify Blobs ----------
// O acesso ao Blobs vem com um token que o Netlify dá a cada pedido e que expira. A função fica
// "acordada" entre pedidos, por isso o store é criado de novo em cada uso (é barato): guardá-lo
// fazia o site falhar com "Failed to decode token: Token expired" depois de algum tempo.
let modBlobs = null;
const blobs = {
  nome: "netlify",
  async store() {
    modBlobs ||= await import("@netlify/blobs");
    return modBlobs.getStore({ name: "placar", consistency: "strong" });
  },
  async get(key) {
    return (await (await this.store()).get(key, { type: "json" })) ?? null;
  },
  async set(key, value) {
    await (await this.store()).setJSON(key, value);
  },
  async remove(key) {
    await (await this.store()).delete(key);
  },
  async list(prefix) {
    const { blobs: lista } = await (await this.store()).list({ prefix });
    return lista.map((b) => b.key);
  },
};

// ---------- Supabase (PostgREST) ----------
export async function pedidoSupabase(caminho, opcoes) {
  return sb(caminho, opcoes);
}
async function sb(caminho, { metodo = "GET", corpo, prefer, intervalo } = {}) {
  const res = await fetch(`${SB_URL}/rest/v1/${caminho}`, {
    method: metodo,
    headers: {
      apikey: SB_KEY,
      // As chaves antigas (service_role, um JWT) também vão no Authorization; as novas (sb_secret_…) só no apikey
      ...(SB_KEY.startsWith("eyJ") ? { authorization: `Bearer ${SB_KEY}` } : {}),
      "content-type": "application/json",
      ...(prefer ? { prefer } : {}),
      ...(intervalo ? { range: intervalo, "range-unit": "items" } : {}),
    },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Supabase ${metodo} ${caminho.split("?")[0]}: ${res.status} ${t.slice(0, 200)}`);
  }
  if (res.status === 204) return null;
  const t = await res.text();
  return t ? JSON.parse(t) : null;
}
/** Lê todas as linhas, de 1000 em 1000. */
async function todas(caminho) {
  const out = [];
  for (let i = 0; ; i += 1000) {
    const parte = (await sb(caminho, { intervalo: `${i}-${i + 999}` })) || [];
    out.push(...parte);
    if (parte.length < 1000) return out;
  }
}
async function upsert(tabela, linhas, chave = "id") {
  for (let i = 0; i < linhas.length; i += 400) {
    await sb(`${tabela}?on_conflict=${chave}`, { metodo: "POST", corpo: linhas.slice(i, i + 400), prefer: "resolution=merge-duplicates,return=minimal" });
  }
}
async function apagar(tabela, ids, chave = "id") {
  for (let i = 0; i < ids.length; i += 150) {
    const lista = ids.slice(i, i + 150).map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",");
    await sb(`${tabela}?${chave}=in.(${encodeURIComponent(lista)})`, { metodo: "DELETE", prefer: "return=minimal" });
  }
}

// O documento "db" é dividido em tabelas: cada pessoa, canal e projeto é uma linha.
const TABELAS_DB = {
  people: { tabela: "pessoas", linha: (p, agora) => ({ id: p.id, nome: p.name || "", categoria: p.category || "", estado: p.status || "", escondido: Boolean(p.hidden), dados: p, atualizado: agora }) },
  channels: { tabela: "canais", linha: (c, agora) => ({ id: c.id, pessoa_id: c.personId || null, titulo: c.title || "", papel: c.role || "", dados: c, atualizado: agora }) },
  projects: { tabela: "projetos", linha: (p, agora) => ({ id: p.id, nome: p.name || "", pessoa_id: p.personId || null, dados: p, atualizado: agora }) },
};
// Última versão lida de cada linha, para só gravar o que mudou
const lidas = { people: null, channels: null, projects: null };

const supa = {
  nome: "supabase",
  async get(key) {
    if (key === "db") return this.lerDb();
    const r = await sb(`documentos?chave=eq.${encodeURIComponent(key)}&select=dados`);
    return r?.[0]?.dados ?? null;
  },
  async set(key, value) {
    if (key === "db") return this.gravarDb(value);
    await upsert("documentos", [{ chave: key, dados: value, atualizado: new Date().toISOString() }], "chave");
  },
  async remove(key) {
    await apagar("documentos", [key], "chave");
  },
  async list(prefix) {
    const r = await todas(`documentos?select=chave&chave=like.${encodeURIComponent(prefix.replace(/[%_*]/g, "") + "*")}&order=chave`);
    return r.map((x) => x.chave);
  },
  async lerDb() {
    const [doc, ...listas] = await Promise.all([sb(`documentos?chave=eq.db&select=dados`), ...Object.values(TABELAS_DB).map((t) => todas(`${t.tabela}?select=id,dados`))]);
    const resto = doc?.[0]?.dados;
    if (!resto && listas.every((l) => !l.length)) return null;
    const db = { ...(resto || {}) };
    Object.keys(TABELAS_DB).forEach((k, i) => {
      db[k] = {};
      lidas[k] = new Map();
      for (const r of listas[i]) {
        db[k][r.id] = r.dados;
        lidas[k].set(r.id, JSON.stringify(r.dados));
      }
    });
    return db;
  },
  async gravarDb(db) {
    const agora = new Date().toISOString();
    const resto = { ...db };
    for (const k of Object.keys(TABELAS_DB)) delete resto[k];
    for (const [k, t] of Object.entries(TABELAS_DB)) {
      const novos = Object.values(db[k] || {});
      let antes = lidas[k];
      if (!antes) {
        antes = new Map((await todas(`${t.tabela}?select=id`)).map((r) => [r.id, null]));
      }
      const mudados = novos.filter((x) => antes.get(x.id) !== JSON.stringify(x));
      const ids = new Set(novos.map((x) => x.id));
      const saiu = [...antes.keys()].filter((id) => !ids.has(id));
      if (mudados.length) await upsert(t.tabela, mudados.map((x) => t.linha(x, agora)));
      if (saiu.length) await apagar(t.tabela, saiu);
      lidas[k] = new Map(novos.map((x) => [x.id, JSON.stringify(x)]));
    }
    await upsert("documentos", [{ chave: "db", dados: resto, atualizado: agora }], "chave");
  },
  async adicionar(colecao, linhas) {
    await sb(colecao, { metodo: "POST", corpo: linhas, prefer: "return=minimal" });
  },
  async lerLinhas(colecao) {
    return todas(`${colecao}?select=*&order=id`);
  },
};

// ---------- Escolha do armazenamento ----------
// O Supabase só passa a ser usado depois de os dados serem copiados para lá (marca "_migracao"),
// para o site nunca abrir vazio só porque as variáveis foram definidas.
let escolhido = null;
async function backend() {
  if (escolhido) return escolhido;
  if (LOCAL_DIR && !supabaseConfigurado()) return (escolhido = local);
  const origem = LOCAL_DIR ? local : blobs;
  if (supabaseConfigurado()) {
    try {
      const marca = await sb(`documentos?chave=eq._migracao&select=dados`);
      if (marca?.length) return (escolhido = supa);
    } catch (e) {
      console.error("Supabase indisponível, a usar", origem.nome, e.message);
      return origem; // sem guardar a escolha: tenta outra vez no próximo pedido
    }
  }
  return (escolhido = origem);
}
export async function armazenamentoAtual() {
  return (await backend()).nome;
}

export async function getJSON(key, fallback = null) {
  const v = await (await backend()).get(key);
  return v ?? fallback;
}
export async function setJSON(key, value) {
  await (await backend()).set(key, value);
}
export async function remove(key) {
  await (await backend()).remove(key);
}
export async function listKeys(prefix) {
  return (await backend()).list(prefix);
}

/** Acrescenta linhas a uma lista que só cresce (no Supabase é uma tabela própria). */
export async function adicionarLinhas(colecao, linhas) {
  const b = await backend();
  if (b === supa) return supa.adicionar(colecao, linhas);
  const atual = (await b.get(`col/${colecao}`)) || [];
  let id = atual.length ? atual[atual.length - 1].id : 0;
  for (const l of linhas) atual.push({ id: ++id, criado: new Date().toISOString(), ...l });
  await b.set(`col/${colecao}`, atual);
}
/** Muda campos de uma linha (pelo id). */
export async function atualizarLinha(colecao, id, campos) {
  const b = await backend();
  if (b === supa) return sb(`${colecao}?id=eq.${encodeURIComponent(id)}`, { metodo: "PATCH", corpo: campos, prefer: "return=minimal" });
  const atual = (await b.get(`col/${colecao}`)) || [];
  const l = atual.find((x) => String(x.id) === String(id));
  if (l) Object.assign(l, campos);
  await b.set(`col/${colecao}`, atual);
}
/** Apaga uma linha (pelo id). */
export async function apagarLinha(colecao, id) {
  const b = await backend();
  if (b === supa) return apagar(colecao, [id]);
  const atual = (await b.get(`col/${colecao}`)) || [];
  await b.set(`col/${colecao}`, atual.filter((x) => String(x.id) !== String(id)));
}
export async function lerLinhas(colecao) {
  const b = await backend();
  if (b === supa) return supa.lerLinhas(colecao);
  return (await b.get(`col/${colecao}`)) || [];
}

/**
 * Copia tudo do armazenamento de origem (Netlify Blobs, ou a pasta local nos testes) para o Supabase
 * e, no fim, deixa a marca que faz o site passar a usar o Supabase.
 * Trabalha por partes (cada pedido tem pouco tempo): devolve { continuar, seguinte } até acabar.
 */
export async function migrarParaSupabase({ colecoes = [], inicio = 0, tempo = 7000 } = {}) {
  if (!supabaseConfigurado()) throw new Error("Faltam as variáveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no Netlify.");
  const t0 = Date.now();
  const origem = LOCAL_DIR ? local : blobs;
  const chaves = (await origem.list("")).filter((k) => !k.startsWith("col/") && k !== "_migracao").sort((x, y) => (x === "db" ? -1 : y === "db" ? 1 : x.localeCompare(y)));
  let i = inicio;
  while (i < chaves.length && Date.now() - t0 < tempo) {
    if (chaves[i] === "db") {
      const v = await origem.get("db");
      if (v) await supa.set("db", v);
      i++;
      continue;
    }
    // 20 documentos de cada vez: lidos em paralelo e gravados num só pedido
    const parte = chaves.slice(i, i + 20);
    const valores = await Promise.all(parte.map((k) => origem.get(k)));
    const agora = new Date().toISOString();
    const linhas = parte.map((k, j) => ({ chave: k, dados: valores[j], atualizado: agora })).filter((l) => l.dados !== null);
    if (linhas.length) await upsert("documentos", linhas, "chave");
    i += parte.length;
  }
  if (i < chaves.length) return { continuar: true, seguinte: i, total: chaves.length };
  const linhas = {};
  for (const c of colecoes) {
    const ja = await supa.lerLinhas(c).catch(() => []);
    const lista = (await origem.get(`col/${c}`)) || [];
    if (!ja.length) {
      const sem = lista.map(({ id, ...resto }) => resto);
      for (let j = 0; j < sem.length; j += 400) await supa.adicionar(c, sem.slice(j, j + 400));
    }
    linhas[c] = lista.length;
  }
  const db = await supa.lerDb();
  const resumo = { at: new Date().toISOString(), de: origem.nome, documentos: chaves.length, pessoas: Object.keys(db?.people || {}).length, canais: Object.keys(db?.channels || {}).length, projetos: Object.keys(db?.projects || {}).length, linhas };
  await supa.set("_migracao", resumo);
  escolhido = supa;
  return resumo;
}

/** Contagens no Supabase (para a página de definições). */
export async function estadoSupabase() {
  if (!supabaseConfigurado()) return { configurado: false };
  try {
    const marca = await sb(`documentos?chave=eq._migracao&select=dados`);
    return { configurado: true, ligado: true, migrado: marca?.[0]?.dados || null, usado: (await backend()) === supa };
  } catch (e) {
    return { configurado: true, ligado: false, erro: e.message };
  }
}
