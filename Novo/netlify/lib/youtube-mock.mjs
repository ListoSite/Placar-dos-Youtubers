// Respostas falsas da API do YouTube, só para testes locais (YT_MOCK=1).
// Os números são determinísticos e crescem com o tempo, para simular a recolha diária.

function hash(str) {
  let h = 2166136261;
  for (const c of String(str)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

function rng(seed) {
  let s = hash(seed) || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

const DAY = 86400000;
const OFFSET = Number(process.env.YT_MOCK_DAY_OFFSET || 0);

function idFrom(seed) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";
  const r = rng("id" + seed);
  let s = "UC";
  for (let i = 0; i < 22; i++) s += chars[Math.floor(r() * 64)];
  return s;
}

const byId = new Map();

function makeChannel(seed, title) {
  const id = seed.startsWith("UC") && seed.length === 24 ? seed : idFrom(seed);
  if (byId.has(id)) return byId.get(id);
  const r = rng(id);
  const subs = Math.floor(Math.pow(10, 3.5 + r() * 3));
  const daily = Math.floor(subs * (0.05 + r() * 1.5));
  const t0 = Date.UTC(2026, 0, 1);
  const days = (Date.now() + OFFSET * DAY - t0) / DAY;
  const views = Math.floor(subs * (80 + r() * 300) + days * daily);
  const name = title || seed.replace(/^@/, "");
  const item = {
    id,
    snippet: {
      title: name,
      customUrl: "@" + name.toLowerCase().replace(/[^a-z0-9]/g, ""),
      description: `Canal de testes (${name}). Vídeos em português de Portugal.`,
      publishedAt: new Date(Date.UTC(2010 + Math.floor(r() * 14), Math.floor(r() * 12), 1 + Math.floor(r() * 27))).toISOString(),
      country: r() > 0.15 ? "PT" : "BR",
      thumbnails: { high: { url: `https://picsum.photos/seed/${id}/240/240` } },
    },
    statistics: {
      subscriberCount: String(subs),
      viewCount: String(views),
      videoCount: String(Math.floor(50 + r() * 900)),
      hiddenSubscriberCount: false,
    },
    contentDetails: { relatedPlaylists: { uploads: "UU" + id.slice(2) } },
    brandingSettings: { image: { bannerExternalUrl: `https://picsum.photos/seed/b${id}/1280/320` }, channel: {} },
  };
  byId.set(id, item);
  return item;
}

function makeVideo(id, channelId, i) {
  const r = rng(id);
  const ageDays = i * (1 + r() * 6);
  const isShort = r() < 0.35;
  const v = Math.floor(Math.pow(10, 3 + r() * 3));
  return {
    id,
    snippet: {
      // Alguns títulos e descrições com cara de notícia, para testar o Radar do Caso
      title: [`RESPOSTA ao drama com o Wuant`, `Fizemos uma COLAB com a Inês Rochina`, `Chegámos a 1 MILHÃO!`, `Vou fazer uma pausa no canal`][i % 13] || `Vídeo de teste #${i + 1}`,
      description: i % 13 === 0 ? "Tinha de esclarecer tudo. A verdade sobre o que aconteceu." : i % 13 === 1 ? "Obrigado @inesrochina pelo convite!" : "Descrição de teste.",
      tags: i % 13 === 0 ? ["polémica", "resposta"] : [],
      channelId,
      publishedAt: new Date(Date.now() - ageDays * DAY).toISOString(),
      thumbnails: { high: { url: `https://picsum.photos/seed/v${id}/480/270` } },
    },
    contentDetails: { duration: isShort ? `PT${20 + Math.floor(r() * 40)}S` : `PT${4 + Math.floor(r() * 30)}M${Math.floor(r() * 59)}S` },
    statistics: { viewCount: String(v), likeCount: String(Math.floor(v * (0.02 + r() * 0.05))), commentCount: String(Math.floor(v * 0.004)) },
  };
}

export async function mockCall(endpoint, p) {
  if (endpoint === "channels") {
    if (p.id) return { items: p.id.split(",").map((id) => makeChannel(id)) };
    const h = p.forHandle || p.forUsername;
    if (h && hash(h) % 3 === 0) return { items: [] };
    return { items: [makeChannel(h, h.replace(/^@/, ""))] };
  }
  if (endpoint === "search") {
    const items = [];
    for (let i = 0; i < Math.min(10, p.maxResults || 10); i++) {
      const c = makeChannel(`${p.q}-${i}`, `${p.q} ${i === 0 ? "" : i}`.trim());
      items.push({ id: { channelId: c.id } });
    }
    return { items };
  }
  if (endpoint === "channelSections") {
    return { items: [{ contentDetails: { channels: [0, 1, 2].map((i) => makeChannel(`${p.channelId}-amigo-${i}`, `Amigo ${i + 1} de teste`).id) } }] };
  }
  if (endpoint === "playlistItems") {
    const n = p.playlistId.startsWith("UUSH") ? 15 : 50;
    const base = p.playlistId.replace(/^UUSH|^UU/, "");
    return { items: Array.from({ length: n }, (_, i) => ({ contentDetails: { videoId: (base + "v" + i).slice(-11).padStart(11, "x") } })) };
  }
  if (endpoint === "videos") {
    return { items: p.id.split(",").map((id, i) => makeVideo(id, "UC" + id, i)) };
  }
  if (endpoint === "commentThreads") {
    const textos = ["Isto vai dar polémica 🍿", "O Wuant vai responder de certeza", "Que treta", "Grande vídeo!"];
    return { items: textos.map((t) => ({ snippet: { topLevelComment: { snippet: { textDisplay: t } } } })) };
  }
  if (endpoint === "playlists") {
    return { items: [{ id: p.id, snippet: { title: "Série de teste " + p.id.slice(-4), channelId: "", thumbnails: {} }, contentDetails: { itemCount: 12 } }] };
  }
  return { items: [] };
}
