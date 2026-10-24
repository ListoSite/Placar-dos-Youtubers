// Base de dados principal (um único documento "db" no armazenamento).
// Separado do "db" ficam os dados que a recolha automática escreve:
//   stats         -> números atuais de cada canal (subs, views, vídeos, foto, nome)
//   snap/AAAA-MM  -> registo diário de cada canal nesse mês
//   ytstart       -> views de cada canal no primeiro registo de cada mês
//   videos/<id>   -> últimos vídeos de cada canal
//   videosummary  -> resumo dos últimos vídeos de cada canal
//   projvids      -> vídeos dos projetos
// Assim a recolha automática nunca apaga alterações feitas à mão.

import { getJSON, setJSON } from "./storage.mjs";
import { slugify, uniqueId } from "./util.mjs";

export const DEFAULT_SETTINGS = {
  siteTitle: "Placar dos Youtubers",
  // Pesos do Índice de Influência (somam 100)
  weights: { alcance: 35, constancia: 20, atividade: 15, momento: 10, historico: 15, envolvimento: 5 },
  // Escala do alcance: views por mês que valem a nota máxima
  alcanceTopo: 10000000,
  // O que se mede: "youtuber" (todos os canais juntos) ou "principal" (só o canal principal)
  medir: "youtuber",
  // Bónus no Índice por cada canal a mais que conta (em %), até 3 canais a mais
  bonusCanais: 5,
  roles: ["principal", "secundário", "clips", "gaming", "podcast", "shorts", "música", "outro"],
  // Divulgação do canal no fim dos espetáculos do Palco
  canal: { nome: "Placar dos Youtubers", youtube: "@placardosyoutubers", tiktok: "", instagram: "", hashtags: "#placardosyoutubers #youtubersportugueses #youtubeportugal" },
};

function emptyDB() {
  return {
    version: 2,
    createdAt: new Date().toISOString(),
    people: {},
    channels: {},
    projects: {},
    rejected: {},
    suggestions: {},
    settings: structuredClone(DEFAULT_SETTINGS),
  };
}

export function newPerson(fields, taken) {
  const id = uniqueId(slugify(fields.name), taken);
  return {
    id,
    name: fields.name || "Sem nome",
    realName: "",
    bio: "",
    category: fields.category || "",
    tags: [],
    status: "ativo",
    hidden: false,
    photo: "",
    location: "",
    mainChannelId: "",
    channels: [],
    socials: {},
    monthly: {},
    legacy: {},
    notes: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...fields,
    id,
  };
}

export async function loadDB(origin) {
  let db = await getJSON("db");
  if (db) {
    db.settings = { ...structuredClone(DEFAULT_SETTINGS), ...(db.settings || {}) };
    db.settings.weights = { ...DEFAULT_SETTINGS.weights, ...(db.settings.weights || {}) };
    db.suggestions ||= {};
    db.rejected ||= {};
    return db;
  }
  db = emptyDB();
  if (origin) {
    try {
      // O seed vai dentro da função (não é um ficheiro público do site)
      const { default: seed } = await import("../data/seed-dados.mjs");
      {
        const taken = new Set();
        for (const p of seed.people || []) {
          const person = newPerson({ name: p.name, category: p.category, monthly: p.monthly || {}, legacy: p.legacy || {} }, taken);
          taken.add(person.id);
          db.people[person.id] = person;
        }
        db.seededFrom = seed.source || "seed";
      }
    } catch (e) {
      console.error("Não foi possível carregar o seed:", e.message);
    }
  }
  await setJSON("db", db);
  return db;
}

export async function saveDB(db) {
  db.updatedAt = new Date().toISOString();
  await setJSON("db", db);
}

/** Liga um canal (já lido da API) a uma pessoa. */
export function attachChannel(db, personId, ch, role = "principal") {
  const person = db.people[personId];
  if (!person) throw new Error("Pessoa não encontrada.");
  const existing = db.channels[ch.id];
  if (existing && existing.personId && existing.personId !== personId) {
    const owner = db.people[existing.personId];
    throw new Error(`Este canal já está ligado a "${owner?.name || existing.personId}".`);
  }
  db.channels[ch.id] = {
    // Os dados escritos no painel (categoria, descrição, "Acerca de"…) ficam
    ...(existing || {}),
    id: ch.id,
    personId,
    role,
    count: role !== "clips",
    title: ch.title,
    thumb: ch.thumb,
    handle: ch.handle,
    monthly: existing?.monthly || {},
    addedAt: existing?.addedAt || new Date().toISOString(),
  };
  if (!person.channels.includes(ch.id)) person.channels.push(ch.id);
  if (role === "principal") {
    const old = person.mainChannelId;
    if (old && old !== ch.id && db.channels[old]?.role === "principal") db.channels[old].role = "secundário";
    person.mainChannelId = ch.id;
  } else if (!person.mainChannelId) {
    person.mainChannelId = ch.id;
  }
  delete db.suggestions[personId];
  delete db.rejected[ch.id];
  person.updatedAt = new Date().toISOString();
  return db.channels[ch.id];
}

export function detachChannel(db, channelId) {
  const link = db.channels[channelId];
  if (!link) return;
  const person = db.people[link.personId];
  if (person) {
    person.channels = person.channels.filter((c) => c !== channelId);
    if (person.mainChannelId === channelId) person.mainChannelId = person.channels[0] || "";
  }
  delete db.channels[channelId];
}

/** Junta a pessoa "fromId" na pessoa "intoId" (canais, meses, projetos). */
export function mergePeople(db, fromId, intoId) {
  const from = db.people[fromId];
  const into = db.people[intoId];
  if (!from || !into || fromId === intoId) throw new Error("Pessoas inválidas para juntar.");
  for (const chId of from.channels) {
    if (db.channels[chId]) {
      db.channels[chId].personId = intoId;
      if (db.channels[chId].role === "principal" && into.mainChannelId) db.channels[chId].role = "secundário";
    }
    if (!into.channels.includes(chId)) into.channels.push(chId);
  }
  if (!into.mainChannelId) into.mainChannelId = from.mainChannelId;
  // Meses: soma os valores da folha/manuais das duas pessoas (eram canais separados)
  for (const [m, val] of Object.entries(from.monthly || {})) {
    const cur = into.monthly[m];
    into.monthly[m] = cur ? { ...cur, v: (cur.v || 0) + (val.v || 0) } : { ...val };
  }
  for (const k of ["instagram", "tiktok", "twitch", "x", "kick", "site"]) {
    if (!into.socials?.[k] && from.socials?.[k]) {
      into.socials ||= {};
      into.socials[k] = from.socials[k];
    }
  }
  for (const pr of Object.values(db.projects)) {
    if (pr.personId === fromId) pr.personId = intoId;
    pr.guests = [...new Set((pr.guests || []).map((g) => (g === fromId ? intoId : g)))].filter((g) => g !== pr.personId);
  }
  into.updatedAt = new Date().toISOString();
  delete db.people[fromId];
  delete db.suggestions[fromId];
}

export function deletePerson(db, id) {
  const p = db.people[id];
  if (!p) return;
  for (const chId of p.channels) delete db.channels[chId];
  for (const pr of Object.values(db.projects)) {
    if (pr.personId === id) pr.personId = "";
    pr.guests = (pr.guests || []).filter((g) => g !== id);
  }
  delete db.people[id];
  delete db.suggestions[id];
}

/** Campos que podem ser alterados na edição de uma pessoa. */
export const PERSON_FIELDS = [
  "name", "realName", "bio", "category", "tags", "status", "hidden", "photo", "location",
  "mainChannelId", "socials", "notes", "birthYear", "startedYear", "languageNote", "noMatch", "medir",
];
