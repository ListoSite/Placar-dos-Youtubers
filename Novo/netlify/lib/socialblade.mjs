// Importação dos dados recolhidos pelo marcador (bookmarklet) do Social Blade.

import { getJSON, setJSON } from "./storage.mjs";
import { todayLisbon } from "./util.mjs";

/** Valida e limpa o que vem do marcador. */
export function cleanPayload(payload) {
  if (!payload || typeof payload !== "object") throw new Error("Dados do Social Blade inválidos.");
  const monthly = [];
  for (const m of payload.monthly || []) {
    const month = String(m.month || "").slice(0, 7);
    const views = Math.round(Number(m.views));
    if (/^\d{4}-\d{2}$/.test(month) && Number.isFinite(views) && views >= 0) monthly.push({ month, views });
  }
  const daily = [];
  for (const d of payload.daily || []) {
    const date = String(d.date || "").slice(0, 10);
    const views = Math.round(Number(d.views));
    if (/^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(views) && views > 0) {
      daily.push({ date, views, subs: Number(d.subs) || null, videos: Number(d.videos) || null });
    }
  }
  daily.sort((a, b) => a.date.localeCompare(b.date));
  return {
    channelId: /^UC[a-zA-Z0-9_-]{22}$/.test(payload.channelId || "") ? payload.channelId : "",
    handle: String(payload.handle || "").replace(/^@/, "").trim(),
    title: String(payload.title || "").slice(0, 200),
    url: String(payload.url || "").slice(0, 300),
    monthly,
    daily,
  };
}

/** Procura o canal na base de dados pelo ID ou pelo @handle. */
export function findChannel(db, stats, data) {
  if (data.channelId && db.channels[data.channelId]) return data.channelId;
  if (data.handle) {
    const h = data.handle.toLowerCase();
    for (const link of Object.values(db.channels)) {
      const hh = (stats[link.id]?.handle || link.handle || "").replace(/^@/, "").toLowerCase();
      if (hh && hh === h) return link.id;
    }
  }
  return "";
}

/**
 * Grava os meses no canal (ou na pessoa, se ainda não tem canal ligado)
 * e usa os totais diários como ponto de partida da recolha do mês atual.
 */
export async function applyImport(db, data, { channelId, personId }) {
  const curM = todayLisbon().slice(0, 7);
  const target = channelId ? db.channels[channelId] : db.people[personId];
  if (!target) throw new Error("Escolhe o canal ou a pessoa para estes dados.");
  target.monthly ||= {};
  let months = 0;
  for (const { month, views } of data.monthly) {
    if (month >= curM) continue; // o mês atual ainda não acabou
    if (target.monthly[month]?.lock) continue;
    target.monthly[month] = { v: views, src: "socialblade" };
    months++;
  }
  let days = 0;
  if (channelId && data.daily.length) {
    const ytstart = await getJSON("ytstart", {});
    const byMonth = {};
    for (const d of data.daily) (byMonth[d.date.slice(0, 7)] ||= []).push(d);
    for (const [M, list] of Object.entries(byMonth)) {
      const snap = await getJSON("snap/" + M, {});
      const ch = (snap[channelId] ||= {});
      const st = ((ytstart[channelId] ||= {})[M] ||= { v: list[0].views, d: Number(list[0].date.slice(8)) });
      for (const d of list) {
        const day = Number(d.date.slice(8));
        if (!ch[day]) {
          ch[day] = [d.views, d.subs, d.videos];
          days++;
        }
        if (day < st.d) {
          st.v = d.views;
          st.d = day;
        }
        if (!st.ed || day > st.ed) {
          st.ev = d.views;
          st.ed = day;
        }
      }
      await setJSON("snap/" + M, snap);
    }
    await setJSON("ytstart", ytstart);
  }
  return { months, days };
}
