// Curiosidades: episódios com um tema (Lembras-te deles?, Separados à nascença, Quase lá!…), feitos
// dos números de todos os Youtubers. Cada vez que corre é diferente:
//   - o tema é sorteado (ou escolhido nas opções), evitando os últimos que saíram;
//   - de cada tema saem muitos factos possíveis, e a escolha é sorteada com peso (os mais
//     impressionantes saem mais vezes), evitando os que saíram nas últimas vezes e repetir pessoas;
//   - as frases e a maneira de mostrar cada facto também variam.
// O plano inteiro (factos, textos, números e fotos) fica guardado com o espetáculo: um exclusivo
// mostra exatamente o mesmo, mesmo que no site não estejam todos os Youtubers.
//
// Os textos levam **negrito** em vez de HTML: no fim tudo é escapado.

import { estado, pessoa, views, seguidoresRede, rankingMes } from "../data.js";
import { esc, curto, inteiro, mesNome } from "../format.js";
import { contar, ICONES } from "../ui.js";
import { avatarPalco } from "./stage.js";
import { aleatorio } from "./sorte.js";
import { animar } from "./grafico.js";
import { curiosidadesRedes } from "./cartao.js";
import { TEMAS_CURIOSIDADES, temaCuriosidades } from "./curiosidades-temas.js";

const DIA = 864e5;
const MEMORIA = "palco-curiosidades";

// ---------- Ajudas ----------
const snap = (p) => ({ id: p.id, name: String(p.name || "").trim(), photo: p.photo || "", category: p.category || "" });
const subs = (p) => p.totals?.subs || 0;
const vtot = (p) => p.totals?.views || 0;
const nvid = (p) => p.totals?.videos || 0;
const anoDe = (p) => (p.since ? new Date(p.since).getFullYear() : null);
const escolher = (lista) => lista[Math.floor(aleatorio() * lista.length)];
const dec = (x, casas = 1) => (Math.round(x * 10 ** casas) / 10 ** casas).toLocaleString("pt-PT", { maximumFractionDigits: casas });
const vezes = (k) => (k >= 10 ? inteiro(Math.round(k)) : dec(k, 1));
const GENERICAS = new Set(["", "youtuber", "outra", "outros", "outro", "geral"]);
const categoria = (p) => (GENERICAS.has(String(p.category || "").trim().toLowerCase()) ? "" : p.category);
const semAsteriscos = (s) => String(s || "").replace(/\*/g, "∗");
const lista3 = (xs) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} e ${xs.at(-1)}`);
const mediana = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : 0;
};

/** "3 meses", "2 anos e 4 meses", "18 dias". */
export function tempo(dias) {
  const d = Math.max(0, Math.round(dias));
  if (d < 45) return `${d} ${d === 1 ? "dia" : "dias"}`;
  if (d < 365) {
    const m = Math.round(d / 30.44);
    return `${m} ${m === 1 ? "mês" : "meses"}`;
  }
  const a = Math.floor(d / 365.25);
  const m = Math.round((d - a * 365.25) / 30.44);
  return `${a} ${a === 1 ? "ano" : "anos"}${m >= 2 && m < 12 ? ` e ${m} meses` : ""}`;
}

/** 1 milhão, 2 milhões, 100 mil, mil milhões. */
function marco(n) {
  if (n >= 1e9) return n === 1e9 ? "mil milhões" : `${dec(n / 1e9)} mil milhões`;
  if (n >= 1e6) return n === 1e6 ? "1 milhão" : `${dec(n / 1e6)} milhões`;
  return curto(n);
}

const N = (v, f = "curto", extra = {}) => ({ v, f, ...extra });
/** Um número formatado pelo seu tipo (guardado como texto, para o plano poder ser guardado). */
function fmt(v, f = "curto") {
  if (!Number.isFinite(v)) return "–";
  if (f === "inteiro") return inteiro(Math.round(v));
  if (f === "dec") return dec(v, v >= 100 ? 0 : 1);
  if (f === "x") return `${vezes(v)}×`;
  if (f === "anos") return `${Math.round(v)} ${Math.round(v) === 1 ? "ano" : "anos"}`;
  if (f === "dias") return inteiro(Math.round(v));
  if (f === "ano") return String(Math.round(v));
  if (f === "tempo") return tempo(v);
  if (f === "dolares") return `${curto(Math.round(v))} $`;
  return curto(v);
}

/** Texto com **negrito**: escapa tudo e só depois põe o negrito. */
const rico = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
/** O HTML das curiosidades das redes (cartao.js) em texto com **negrito**. */
const desHtml = (h) =>
  String(h)
    .replace(/<\/?b>/g, "**")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

const ic = (x) => (ICONES[x] ? `<span class="cu-ic svg">${ICONES[x]}</span>` : `<span class="cu-ic">${esc(x || "")}</span>`);

// Acontecimentos para a linha do tempo dos veteranos ("antes do…")
const EVENTOS = [
  { ano: 2005, ic: "▶️", t: "Nasce o YouTube", antes: "do próprio YouTube fazer um ano" },
  { ano: 2007, ic: "📱", t: "Primeiro iPhone", antes: "do primeiro iPhone" },
  { ano: 2009, ic: "⛏️", t: "Sai o Minecraft", antes: "do Minecraft" },
  { ano: 2010, ic: "📸", t: "Nasce o Instagram", antes: "do Instagram" },
  { ano: 2011, ic: "🟣", t: "Nasce a Twitch", antes: "da Twitch" },
  { ano: 2012, ic: "🕺", t: "Gangnam Style", antes: "do Gangnam Style" },
  { ano: 2013, ic: "🚗", t: "Sai o GTA V", antes: "do GTA V" },
  { ano: 2016, ic: "🏆", t: "Portugal campeão da Europa", antes: "de Portugal ser campeão da Europa" },
  { ano: 2017, ic: "🪂", t: "Sai o Fortnite", antes: "do Fortnite" },
  { ano: 2018, ic: "🎵", t: "O TikTok chega ao mundo", antes: "do TikTok" },
  { ano: 2020, ic: "😷", t: "A pandemia", antes: "da pandemia" },
  { ano: 2022, ic: "🤖", t: "Chega o ChatGPT", antes: "do ChatGPT" },
];
// Para a matemática do dia a dia
const PORTUGUESES = 10.6e6;
const ESTADIO_LUZ = 65000;
const LISBOA = 545000;

function melhorPior(p, meses) {
  let max = null;
  let min = null;
  for (const m of meses) {
    const v = views(p, m);
    if (v === null || v <= 0) continue;
    if (!max || v > max.v) max = { m, v };
    if (!min || v < min.v) min = { m, v };
  }
  return { max, min };
}

// ---------- Os factos de cada tema ----------
// Cada facto: { k (chave única), tema, peso (quanto impressiona), vis (a cena), pessoas, titulo,
// texto, num, dados (o que a cena precisa) }. p é o id do Youtuber principal (para as bocas).

const GERADORES = {
  lembras(c) {
    const out = [];
    for (const p of c.gente) {
      const s = subs(p);
      if (s < 30000 || !p.vid?.last) continue;
      const dias = (c.agora - Date.parse(p.vid.last)) / DIA;
      if (!(dias >= 120)) continue;
      const { max } = melhorPior(p, c.meses);
      const agoraV = views(p, c.ref);
      const pistas = [["👥", `${curto(s)} subscritores`], categoria(p) ? ["🎬", categoria(p)] : null, anoDe(p) ? ["📅", `No YouTube desde ${anoDe(p)}`] : null, ["⏳", `Último vídeo há ${tempo(dias)}`]].filter(Boolean);
      let extra = "";
      if (agoraV > 1000) extra = escolher([` Mesmo parado, os vídeos antigos ainda fizeram **${curto(agoraV)}** views em ${mesNome(c.ref, { ano: false })}.`, ` Sem publicar nada, ainda teve **${curto(agoraV)}** views em ${mesNome(c.ref, { ano: false })}.`]);
      else if (max && max.v > 50000) extra = ` No melhor mês (${mesNome(max.m)}) chegou às **${curto(max.v)}** views.`;
      out.push({
        k: `lembras:${p.id}`,
        peso: Math.log10(s) + Math.min(4, dias / 200),
        vis: aleatorio() < 0.6 ? "revela" : "fantasma",
        p: p.id,
        pessoas: [snap(p)],
        titulo: escolher([`Lembras-te de **${p.name}**?`, `O que é feito de **${p.name}**?`, `**${p.name}** desapareceu?`]),
        texto:
          escolher([`Tem **${curto(s)}** subscritores, mas o último vídeo foi há **${tempo(dias)}**.`, `**${curto(s)}** subscritores à espera de um vídeo novo há **${tempo(dias)}**.`, `O último vídeo saiu há **${tempo(dias)}**… e os **${curto(s)}** subscritores continuam lá.`]) + extra,
        num: N(Math.round(dias), "dias"),
        q: { t: `Há quanto tempo não há um vídeo novo de **${p.name}**?`, v: dias, f: "tempo" },
        dados: { pistas, stats: [{ rot: "Subscritores", v: s }, vtot(p) ? { rot: "Views totais", v: vtot(p) } : null, max ? { rot: `Melhor mês (${mesNome(max.m, { curto: true })})`, v: max.v } : null].filter(Boolean) },
      });
    }
    return out;
  },

  adormecidos(c) {
    const out = [];
    const mes = mesNome(c.ref, { ano: false });
    for (const p of c.gente) {
      const s = subs(p);
      const v = views(p, c.ref);
      if (s < 100000 || !(v > 0)) continue;
      if (p.vid?.last && (c.agora - Date.parse(p.vid.last)) / DIA >= 120) continue; // esses são do "Lembras-te"
      const r = v / s;
      if (r >= 0.05) continue;
      const por100 = r * 100;
      out.push({
        k: `adormecidos:${p.id}`,
        peso: Math.log10(s) * 1.2 + (0.05 - r) * 40,
        vis: "comparar",
        p: p.id,
        pessoas: [snap(p)],
        titulo: escolher([`**${p.name}**: muitos subscritores, poucas views`, `Onde estão os subscritores de **${p.name}**?`, `Gigante adormecido: **${p.name}**`]),
        texto: `Tem **${curto(s)}** subscritores, mas em ${mes} fez **${curto(v)}** views: ${por100 < 1 ? "menos de **1 view** por cada 100 subscritores" : `**${dec(por100)} views** por cada 100 subscritores`}.`,
        num: N(por100, "dec"),
        q: { t: `Quantas views fez **${p.name}** em ${mes}?`, v, f: "curto" },
        dados: { a: { rot: "Subscritores", v: s, ic: "👥" }, b: { rot: `Views em ${mes}`, v, ic: "👁" } },
      });
    }
    return out;
  },

  veteranos(c) {
    const out = [];
    const anoAgora = new Date(c.agora).getFullYear();
    for (const p of c.gente) {
      const a = anoDe(p);
      if (!a || a > 2012 || subs(p) < 5000) continue;
      const depois = EVENTOS.filter((e) => e.ano > a);
      if (depois.length < 3) continue;
      const anos = anoAgora - a;
      const tres = depois.slice(0, 3).map((e) => e.antes);
      out.push({
        k: `veteranos:${p.id}`,
        peso: (2013 - a) * 0.8 + Math.log10(subs(p) + 1) * 0.6,
        // Às vezes com "Quem é?" (as pistas), outras na linha do tempo
        vis: aleatorio() < 0.3 ? "revela" : "tempo",
        p: p.id,
        pessoas: [snap(p)],
        titulo: anos >= 18 ? escolher([`O canal de **${p.name}** já é maior de idade`, `**${anos} anos**: o canal de **${p.name}** já podia tirar a carta`]) : escolher([`**${p.name}** está cá desde **${a}**`, `**${anos} anos** de YouTube`, `**${p.name}** é do tempo em que…`]),
        texto: anos >= 18 ? `O canal nasceu em **${a}** e já tem **${anos} anos**: é mais velho do que muitos dos seus subscritores. Chegou antes ${lista3(tres)}.` : escolher([`Criou o canal em **${a}**: antes ${lista3(tres)}.`, `Está no YouTube há **${anos} anos**, desde antes ${lista3(tres)}.`]),
        num: N(anos, "anos"),
        q: { t: `Em que ano nasceu o canal de **${p.name}**?`, v: a, f: "ano" },
        dados: {
          pistas: [["📅", `No YouTube desde ${a}`], ["👥", `${curto(subs(p))} subscritores`], categoria(p) ? ["🎬", categoria(p)] : null, nvid(p) ? ["▶️", `${inteiro(nvid(p))} vídeos`] : null].filter(Boolean),
          ano: a,
          fim: anoAgora,
          eventos: EVENTOS.filter((e) => e.ano >= Math.max(2005, a - 4) && Math.abs(e.ano - a) >= 2).slice(0, 7).map(({ ano, ic: i, t }) => ({ ano, ic: i, t })),
        },
      });
    }
    return out;
  },

  foguetoes(c) {
    const out = [];
    const anoAgora = new Date(c.agora).getFullYear();
    const velhos = c.gente.filter((p) => anoDe(p) && anoDe(p) <= 2015 && subs(p) > 0);
    for (const p of c.gente) {
      const a = anoDe(p);
      if (!a || anoAgora - a > 4 || subs(p) < 30000) continue;
      const q = velhos.filter((x) => subs(x) < subs(p)).sort((x, y) => subs(y) - subs(x))[0];
      if (!q) continue;
      const anosP = Math.max(1, anoAgora - a);
      out.push({
        k: `foguetoes:${p.id}`,
        peso: Math.log10(subs(p)) + (a - anoDe(q)) * 0.3 + (subs(p) / subs(q) > 2 ? 1 : 0),
        vis: "duelo",
        p: p.id,
        pessoas: [snap(q), snap(p)],
        titulo: escolher([`**${p.name}** chegou em **${a}**…`, `Do zero ao topo em ${anosP === 1 ? "1 ano" : `${anosP} anos`}`, `Foguetão: **${p.name}**`]),
        texto: `Criou o canal em **${a}** e já tem mais subscritores do que **${q.name}**, que está no YouTube desde **${anoDe(q)}**.`,
        num: N(subs(p)),
        dados: { a: snap(q), b: snap(p), linhas: [{ rot: "No YouTube desde", ic: "📅", va: anoDe(q), vb: a, f: "ano", semBarra: true }, { rot: "Subscritores", ic: "👥", va: subs(q), vb: subs(p), twist: true }] },
      });
    }
    return out;
  },

  maquinas(c) {
    const out = [];
    for (const p of c.gente) {
      const n = nvid(p);
      if (n >= 800) {
        const anos = n / 365.25;
        out.push({
          k: `maquinas:total:${p.id}`,
          peso: Math.log10(n) * 1.5,
          vis: "contador",
          p: p.id,
          pessoas: [snap(p)],
          titulo: escolher([`Máquina de vídeos: **${p.name}**`, `**${p.name}** não pára de publicar`, `Quantos vídeos tem **${p.name}**?`]),
          texto: escolher([`Se visses um vídeo por dia, demoravas **${dec(anos)} anos** a ver todos.`, `Um por dia, sem falhar: eram precisos **${dec(anos)} anos** para os ver todos.`]),
          num: N(n, "inteiro"),
          q: { t: `Quantos vídeos tem **${p.name}**?`, v: n, f: "inteiro" },
          dados: { icone: "🎬", n: Math.max(1, Math.min(60, Math.round(n / 100))), legenda: "cada 🎬 são 100 vídeos" },
        });
      }
      const up30 = p.vid?.up30 || 0;
      if (up30 >= 25)
        out.push({
          k: `maquinas:mes:${p.id}`,
          peso: up30 / 12 + 1,
          vis: "calendario",
          p: p.id,
          pessoas: [snap(p)],
          titulo: escolher([`**${up30} vídeos** em 30 dias`, `**${p.name}** não pára`]),
          texto: `**${p.name}** publicou **${up30}** vídeos nos últimos 30 dias: ${up30 >= 31 ? "mais de um por dia" : "quase um por dia"}.`,
          num: N(up30, "inteiro"),
          dados: { porDia: up30 / 30 },
        });
    }
    return out;
  },

  poucosbons(c) {
    const out = [];
    for (const p of c.gente) {
      const n = nvid(p);
      const v = vtot(p);
      if (n < 5 || n > 250 || v < 3e6) continue;
      const vpv = v / n;
      const q = c.gente.filter((x) => x.id !== p.id && nvid(x) >= n * 5 && vtot(x) >= v * 0.4 && vtot(x) <= v * 1.3).sort((a, b) => nvid(b) - nvid(a))[0];
      out.push({
        k: `poucosbons:${p.id}`,
        peso: Math.log10(vpv) * 1.3,
        vis: q ? "duelo" : "contador",
        p: p.id,
        pessoas: q ? [snap(q), snap(p)] : [snap(p)],
        titulo: escolher([`Só **${inteiro(n)} vídeos**…`, `**${p.name}**: poucos vídeos, muitas views`]),
        texto: q ? `**${p.name}** tem **${inteiro(n)}** vídeos e **${curto(v)}** views. **${q.name}** precisou de **${inteiro(nvid(q))}** vídeos para chegar às **${curto(vtot(q))}**.` : `**${inteiro(n)}** vídeos e **${curto(v)}** views: **${curto(vpv)}** views por vídeo, em média.`,
        num: N(vpv),
        dados: q
          ? { a: snap(q), b: snap(p), linhas: [{ rot: "Vídeos", ic: "🎬", va: nvid(q), vb: n, f: "inteiro" }, { rot: "Views totais", ic: "👁", va: vtot(q), vb: v }, { rot: "Views por vídeo", ic: "💎", va: vtot(q) / nvid(q), vb: vpv, twist: true }] }
          : { icone: "💎", n: Math.max(1, Math.min(40, Math.round(vpv / 50000))), legenda: "cada 💎 são 50 mil views por vídeo" },
      });
    }
    return out;
  },

  gemeos(c) {
    const out = [];
    const mes = mesNome(c.ref, { ano: false });
    const lista = c.gente.filter((p) => subs(p) >= 20000).sort((a, b) => subs(a) - subs(b));
    for (let i = 0; i < lista.length; i++) {
      for (let j = i + 1; j < lista.length && subs(lista[j]) <= subs(lista[i]) * 1.03; j++) {
        const [a, b] = [lista[i], lista[j]];
        const dims = [
          ["views totais", "Views totais", "👁", vtot(a), vtot(b), "curto"],
          ["vídeos", "Vídeos", "🎬", nvid(a), nvid(b), "inteiro"],
          [`views em ${mes}`, `Views em ${mes}`, "📈", views(a, c.ref), views(b, c.ref), "curto"],
        ]
          .filter((d) => d[3] > 0 && d[4] > 0)
          .map((d) => ({ d, r: Math.max(d[3], d[4]) / Math.min(d[3], d[4]) }))
          .sort((x, y) => y.r - x.r);
        const melhor = dims[0];
        const anosDif = anoDe(a) && anoDe(b) ? Math.abs(anoDe(a) - anoDe(b)) : 0;
        if ((!melhor || melhor.r < 3) && anosDif < 7) continue;
        const usarAnos = !melhor || melhor.r < 3;
        const base = `**${a.name}** e **${b.name}** têm quase os mesmos subscritores (**${curto(subs(a))}** e **${curto(subs(b))}**)…`;
        let texto;
        let twist;
        if (usarAnos) {
          const [velho, novo] = anoDe(a) < anoDe(b) ? [a, b] : [b, a];
          texto = `${base} mas **${velho.name}** chegou ao YouTube em **${anoDe(velho)}** e **${novo.name}** só em **${anoDe(novo)}**.`;
          twist = { rot: "No YouTube desde", ic: "📅", va: anoDe(a), vb: anoDe(b), f: "ano", semBarra: true, twist: true };
        } else {
          const [nome, rot, i2, va, vb, f] = melhor.d;
          const maior = va > vb ? a : b;
          texto = `${base} mas **${maior.name}** tem **${vezes(melhor.r)}×** mais ${nome}.`;
          twist = { rot, ic: i2, va, vb, f, twist: true };
        }
        out.push({
          k: `gemeos:${[a.id, b.id].sort().join(":")}`,
          peso: (usarAnos ? anosDif / 3 : Math.log2(melhor.r)) + Math.log10(subs(a)) * 0.5,
          vis: "duelo",
          p: b.id,
          pessoas: [snap(a), snap(b)],
          titulo: escolher([`**${a.name}** e **${b.name}**: separados à nascença`, `Gémeos nos subscritores, opostos no resto`]),
          texto,
          num: N(subs(b)),
          dados: { a: snap(a), b: snap(b), linhas: [{ rot: "Subscritores", ic: "👥", va: subs(a), vb: subs(b) }, twist] },
        });
      }
    }
    return out;
  },

  david(c) {
    const out = [];
    const mes = mesNome(c.ref, { ano: false });
    const grandes = c.gente.filter((p) => subs(p) >= 100000 && views(p, c.ref) > 0);
    for (const p of c.gente) {
      const v = views(p, c.ref);
      if (!(v > 20000) || !subs(p)) continue;
      const q = grandes.filter((x) => subs(x) >= subs(p) * 5 && views(x, c.ref) < v).sort((a, b) => subs(b) - subs(a))[0];
      if (!q) continue;
      const k = subs(q) / subs(p);
      out.push({
        k: `david:${p.id}:${c.ref}`,
        peso: Math.log2(k) + Math.log10(v) * 0.4,
        vis: "duelo",
        p: p.id,
        pessoas: [snap(q), snap(p)],
        titulo: escolher([`**${p.name}** contra **${q.name}**`, `O pequeno que bateu o gigante`, `David (**${p.name}**) contra Golias (**${q.name}**)`]),
        texto: `**${q.name}** tem **${vezes(k)}×** mais subscritores do que **${p.name}**… mas em ${mes}, quem teve mais views foi **${p.name}** (**${curto(v)}** contra **${curto(views(q, c.ref))}**).`,
        num: N(v),
        q: { t: `Quantas vezes mais subscritores tem **${q.name}** do que **${p.name}**?`, v: k, f: "x" },
        dados: { a: snap(q), b: snap(p), linhas: [{ rot: "Subscritores", ic: "👥", va: subs(q), vb: subs(p) }, { rot: `Views em ${mes}`, ic: "👁", va: views(q, c.ref), vb: v, twist: true }] },
      });
    }
    return out;
  },

  redes(c) {
    const out = [];
    for (const p of c.gente) {
      if (!["instagram", "tiktok", "twitch"].some((r) => seguidoresRede(p, r) >= 1000)) continue;
      for (const x of curiosidadesRedes(p, c.ds.people, c.ref)) {
        const r = x.rede;
        const seg = (q) => seguidoresRede(q, r.id) || 0;
        out.push({
          k: `redes:${p.id}:${x.tipo}:${r.id}`,
          peso: x.peso,
          vis: x.duelo ? "duelo" : "comparar",
          p: p.id,
          pessoas: x.duelo ? [snap(x.duelo.a), snap(x.duelo.b)] : [snap(p)],
          titulo: escolher([`**${p.name}** ${r.no}`, `E ${r.no}?`, `**${p.name}** fora do YouTube`]),
          texto: desHtml(x.texto),
          num: N(seg(p)),
          dados: x.duelo
            ? { a: snap(x.duelo.a), b: snap(x.duelo.b), linhas: [{ rot: "YouTube", ic: "youtube", va: subs(x.duelo.a), vb: subs(x.duelo.b) }, { rot: r.nome, ic: r.id, va: seg(x.duelo.a), vb: seg(x.duelo.b), twist: true }] }
            : { a: { rot: "Subscritores no YouTube", v: subs(p), ic: "youtube" }, b: { rot: `Seguidores ${r.no}`, v: seg(p), ic: r.id } },
        });
      }
    }
    return out;
  },

  quasela(c) {
    const out = [];
    const MARCOS = [1e4, 2.5e4, 5e4, 1e5, 2.5e5, 5e5, 1e6, 2e6, 5e6, 1e7];
    const MARCOS_V = [1e6, 1e7, 2.5e7, 5e7, 1e8, 2.5e8, 5e8, 1e9, 2e9];
    for (const p of c.gente) {
      const s = subs(p);
      const alvo = MARCOS.find((m) => m > s);
      if (s && alvo && (alvo - s) / alvo <= 0.06) {
        const falta = alvo - s;
        const ganhos = Object.values(p.sb?.s || {}).slice(-3).filter((x) => x > 0);
        const porMes = ganhos.length ? ganhos.reduce((a, b) => a + b, 0) / ganhos.length : 0;
        const dias = porMes > 0 ? falta / (porMes / 30.44) : null;
        out.push({
          k: `quasela:subs:${p.id}:${alvo}`,
          peso: Math.log10(alvo) * 1.2 + (0.06 - falta / alvo) * 30,
          vis: "progresso",
          p: p.id,
          pessoas: [snap(p)],
          titulo: escolher([`**${p.name}** está quase nos **${marco(alvo)}**`, `Faltam **${curto(falta)}** para os **${marco(alvo)}**`]),
          texto: `Tem **${curto(s)}** subscritores: faltam só **${inteiro(falta)}** para os **${marco(alvo)}**.${dias ? ` Ao ritmo dos últimos meses, chega lá em cerca de **${tempo(dias)}**.` : ""}`,
          num: N(falta, "inteiro"),
          q: { t: `Quantos subscritores faltam a **${p.name}** para os ${marco(alvo)}?`, v: falta, f: "inteiro" },
          dados: { atual: s, alvo, base: MARCOS[MARCOS.indexOf(alvo) - 1] || 0, falta, dias, unidade: "subscritores" },
        });
      }
      const v = vtot(p);
      const alvoV = MARCOS_V.find((m) => m > v);
      if (v && alvoV && (alvoV - v) / alvoV <= 0.03) {
        const porMes = views(p, c.ref) || 0;
        const dias = porMes > 0 ? (alvoV - v) / (porMes / 30.44) : null;
        out.push({
          k: `quasela:views:${p.id}:${alvoV}`,
          peso: Math.log10(alvoV) + (0.03 - (alvoV - v) / alvoV) * 40,
          vis: "progresso",
          p: p.id,
          pessoas: [snap(p)],
          titulo: escolher([`**${p.name}** quase nos **${marco(alvoV)}** de views`, `A caminho dos **${marco(alvoV)}** de views`]),
          texto: `O canal já vai em **${curto(v)}** views: faltam **${curto(alvoV - v)}** para os **${marco(alvoV)}**.${dias ? ` Ao ritmo de ${mesNome(c.ref, { ano: false })}, chega lá em cerca de **${tempo(dias)}**.` : ""}`,
          num: N(alvoV - v),
          dados: { atual: v, alvo: alvoV, base: MARCOS_V[MARCOS_V.indexOf(alvoV) - 1] || 0, falta: alvoV - v, dias, unidade: "views" },
        });
      }
    }
    return out;
  },

  montanha(c) {
    const out = [];
    for (const p of c.gente) {
      const serie = c.meses.map((m) => ({ m, v: views(p, m) })).filter((x) => x.v !== null && x.v > 0);
      if (serie.length < 6) continue;
      const max = serie.reduce((a, b) => (b.v > a.v ? b : a));
      const min = serie.reduce((a, b) => (b.v < a.v ? b : a));
      const r = max.v / min.v;
      if (r < 6 || max.v < 50000) continue;
      const janela = serie.length <= 24 ? serie : serie.slice(-24).some((x) => x === max) && serie.slice(-24).some((x) => x === min) ? serie.slice(-24) : serie.slice(-36);
      out.push({
        k: `montanha:${p.id}`,
        peso: Math.log2(r) + Math.log10(max.v) * 0.4,
        vis: "serie",
        p: p.id,
        pessoas: [snap(p)],
        titulo: escolher([`A montanha-russa de **${p.name}**`, `Do céu ao chão: **${p.name}**`, `Os altos e baixos de **${p.name}**`]),
        texto: `No melhor mês (**${mesNome(max.m)}**) fez **${curto(max.v)}** views. No pior (**${mesNome(min.m)}**), só **${curto(min.v)}**: **${vezes(r)}×** menos.`,
        num: N(r, "x"),
        q: { t: `Quantas vezes menos fez **${p.name}** no pior mês, em comparação com o melhor?`, v: r, f: "x" },
        dados: { pontos: janela.map(({ m, v }) => ({ m, v })), marcas: [janela.indexOf(max), janela.indexOf(min)].filter((i) => i >= 0) },
      });
    }
    return out;
  },

  antesagora(c) {
    const out = [];
    const i = c.ds.months.indexOf(c.ref);
    const ant = i >= 12 ? c.ds.months[i - 12] : null;
    if (!ant) return out;
    for (const p of c.gente) {
      const a = views(p, ant);
      const b = views(p, c.ref);
      if (!(a >= 10000 && b >= 10000)) continue;
      const r = b / a;
      if (r < 3 && r > 1 / 3) continue;
      const sobe = r > 1;
      const pontos = c.ds.months.slice(i - 12, i + 1).map((m) => ({ m, v: views(p, m) || 0 }));
      out.push({
        k: `antesagora:${p.id}:${c.ref}`,
        peso: Math.abs(Math.log2(r)) + Math.log10(Math.max(a, b)) * 0.4,
        vis: "serie",
        p: p.id,
        pessoas: [snap(p)],
        titulo: sobe ? escolher([`**${p.name}** disparou num ano`, `O ano de ouro de **${p.name}**`]) : escolher([`O que aconteceu a **${p.name}**?`, `Um ano difícil para **${p.name}**`]),
        texto: sobe ? `Em ${mesNome(ant)} fez **${curto(a)}** views. Em ${mesNome(c.ref)}, **${curto(b)}**: **${vezes(r)}×** mais.` : `Em ${mesNome(ant)} fez **${curto(a)}** views. Em ${mesNome(c.ref)}, só **${curto(b)}**: **${vezes(1 / r)}×** menos.`,
        num: N(sobe ? r : 1 / r, "x"),
        dados: { pontos, marcas: [0, pontos.length - 1] },
      });
    }
    return out;
  },

  ritmo(c) {
    const out = [];
    for (const p of c.gente) {
      const gap = p.vid?.gap;
      if (!Number.isFinite(gap) || !p.vid?.last || (c.agora - Date.parse(p.vid.last)) / DIA > 60) continue;
      if (gap <= 1.2 && (p.vid.up30 || 0) >= 20)
        out.push({
          k: `ritmo:rapido:${p.id}`,
          peso: 2 + (1.2 - gap) * 2 + Math.log10(subs(p) + 1) / 3,
          vis: "calendario",
          p: p.id,
          pessoas: [snap(p)],
          titulo: escolher([`**${p.name}** publica todos os dias`, `Um vídeo por dia, no mínimo`]),
          texto: gap < 1 ? `Entre um vídeo e o seguinte de **${p.name}** passam, em média, **${dec(gap * 24, 0)} horas**.` : `**${p.name}** publica, em média, **um vídeo por dia**. Nos últimos 30 dias foram **${p.vid.up30}**.`,
          num: N(p.vid.up30, "inteiro"),
          dados: { porDia: Math.min(4, 1 / Math.max(0.25, gap)) },
        });
      if (gap >= 14 && subs(p) >= 50000)
        out.push({
          k: `ritmo:lento:${p.id}`,
          peso: Math.log10(subs(p)) + gap / 15,
          vis: "calendario",
          p: p.id,
          pessoas: [snap(p)],
          titulo: escolher([`Um vídeo a cada **${Math.round(gap)} dias**`, `**${p.name}** faz-se esperar`]),
          texto: `**${p.name}** publica, em média, de **${Math.round(gap)} em ${Math.round(gap)} dias**… e mesmo assim tem **${curto(subs(p))}** subscritores.`,
          num: N(gap, "dec"),
          dados: { porDia: 1 / gap },
        });
    }
    return out;
  },

  shorts(c) {
    const out = [];
    for (const p of c.gente) {
      const ms = p.vid?.medShort;
      const ml = p.vid?.medLong;
      if (!(ms > 500 && ml > 500)) continue;
      const r = ms / ml;
      if (r < 3 && r > 1 / 3) continue;
      out.push({
        k: `shorts:${p.id}`,
        peso: Math.abs(Math.log2(r)) + Math.log10(Math.max(ms, ml)) * 0.4,
        vis: "comparar",
        p: p.id,
        pessoas: [snap(p)],
        titulo: r > 1 ? escolher([`Os Shorts de **${p.name}** rebentam`, `**${p.name}** manda nos Shorts`]) : escolher([`**${p.name}** é dos vídeos longos`, `Shorts? **${p.name}** prefere os longos`]),
        texto: r > 1 ? `Um Short normal de **${p.name}** faz **${curto(ms)}** views. Um vídeo longo, **${curto(ml)}**: os Shorts fazem **${vezes(r)}×** mais.` : `Um vídeo longo normal de **${p.name}** faz **${curto(ml)}** views. Um Short, só **${curto(ms)}**: os longos fazem **${vezes(1 / r)}×** mais.`,
        num: N(r > 1 ? r : 1 / r, "x"),
        q: { t: `Quantas views faz um Short normal de **${p.name}**?`, v: ms, f: "curto" },
        dados: { a: { rot: "Um Short normal", v: ms, ic: "📲" }, b: { rot: "Um vídeo longo normal", v: ml, ic: "🎬" } },
      });
    }
    return out;
  },

  videao(c) {
    const out = [];
    for (const p of c.gente) {
      const t = p.vid?.top?.[0];
      const med = p.vid?.med || p.vid?.medLong;
      if (!t || !med || t.v < 50000) continue;
      const r = t.v / med;
      if (r < 6) continue;
      const q = c.gente.filter((x) => x.id !== p.id && vtot(x) > 0 && vtot(x) < t.v).sort((a, b) => vtot(b) - vtot(a))[0];
      out.push({
        k: `videao:${t.id}`,
        peso: Math.log2(r) + Math.log10(t.v) * 0.5,
        vis: "video",
        p: p.id,
        pessoas: [snap(p)],
        titulo: escolher([`O vídeo que rebentou a escala de **${p.name}**`, `**${vezes(r)}×** mais do que o normal`]),
        texto: `"${semAsteriscos(t.t)}" fez **${curto(t.v)}** views, quando um vídeo normal de **${p.name}** faz **${curto(med)}**.${q ? ` Só esse vídeo tem mais views do que o canal inteiro de **${q.name}**.` : ""}`,
        num: N(t.v),
        q: { t: `Quantas views fez o vídeo mais forte de **${p.name}**?`, v: t.v, f: "curto" },
        dados: { id: t.id, th: t.th || "", t: String(t.t || "").slice(0, 120), v: t.v, med, s: Boolean(t.s) },
      });
    }
    return out;
  },

  matematica(c) {
    const out = [];
    const mes = mesNome(c.ref);
    const [y, m] = c.ref.split("-").map(Number);
    const minutos = new Date(Date.UTC(y, m, 0)).getUTCDate() * 24 * 60;
    const soma = c.gente.reduce((a, p) => a + (views(p, c.ref) || 0), 0);
    if (soma > PORTUGUESES)
      out.push({
        k: `matematica:portugueses:${c.ref}`,
        peso: 3.5,
        vis: "contador",
        pessoas: [],
        titulo: escolher([`Quantas views por português?`, `As views de um mês, divididas por Portugal`]),
        texto: `Em ${mes}, os Youtubers do Placar juntaram **${curto(soma)}** views: **${dec(soma / PORTUGUESES)}** por cada pessoa que vive em Portugal.`,
        num: N(soma / PORTUGUESES, "dec"),
        q: { t: `Quantas views por cada português fizeram os Youtubers do Placar em ${mes}?`, v: soma / PORTUGUESES, f: "dec" },
        dados: { icone: "🧍", n: Math.max(1, Math.min(50, Math.round(soma / PORTUGUESES))), legenda: "views por cada português (10,6 milhões)" },
      });
    const porSubs = [...c.gente].sort((a, b) => subs(b) - subs(a)).slice(0, 5);
    for (const p of porSubs) {
      const s = subs(p);
      if (s / ESTADIO_LUZ >= 2)
        out.push({
          k: `matematica:luz:${p.id}`,
          peso: 2.5 + Math.log10(s / ESTADIO_LUZ),
          vis: "contador",
          p: p.id,
          pessoas: [snap(p)],
          titulo: escolher([`Os subscritores de **${p.name}** num estádio`, `Quantos Estádios da Luz enchem os subscritores de **${p.name}**?`]),
          texto: `Os **${curto(s)}** subscritores de **${p.name}** enchiam o Estádio da Luz **${inteiro(Math.round(s / ESTADIO_LUZ))} vezes**.`,
          num: N(Math.round(s / ESTADIO_LUZ), "inteiro", { suf: "×" }),
          q: { t: `Quantas vezes enchiam o Estádio da Luz os subscritores de **${p.name}**?`, v: Math.round(s / ESTADIO_LUZ), f: "inteiro" },
          dados: { icone: "🏟️", n: Math.max(1, Math.min(40, Math.round(s / ESTADIO_LUZ))), legenda: "cada 🏟️ é um Estádio da Luz cheio (65 mil pessoas)" },
        });
      if (s > LISBOA)
        out.push({
          k: `matematica:lisboa:${p.id}`,
          peso: 2.2 + s / LISBOA / 4,
          vis: "contador",
          p: p.id,
          pessoas: [snap(p)],
          titulo: `Mais subscritores do que Lisboa tem habitantes`,
          texto: `**${p.name}** tem **${curto(s)}** subscritores. Lisboa tem cerca de 545 mil habitantes: **${dec(s / LISBOA)}×** menos.`,
          num: N(s / LISBOA, "dec", { suf: "×" }),
          dados: { icone: "🏙️", n: Math.max(1, Math.min(30, Math.round(s / LISBOA))), legenda: "cada 🏙️ é uma Lisboa (545 mil habitantes)" },
        });
    }
    const topMes = [...c.gente].filter((p) => views(p, c.ref) > 0).sort((a, b) => views(b, c.ref) - views(a, c.ref)).slice(0, 3);
    for (const p of topMes) {
      const porMin = views(p, c.ref) / minutos;
      if (porMin < 5) continue;
      out.push({
        k: `matematica:minuto:${p.id}:${c.ref}`,
        peso: 2.5 + Math.log10(porMin) * 0.6,
        vis: "contador",
        p: p.id,
        pessoas: [snap(p)],
        titulo: escolher([`**${p.name}** a cada minuto`, `Quantas views por minuto faz **${p.name}**?`]),
        texto: `Em ${mes}, **${p.name}** fez **${inteiro(Math.round(porMin))} views por minuto**, de dia e de noite, durante o mês inteiro.`,
        num: N(porMin, "inteiro"),
        dados: { icone: "⏱️", n: Math.max(1, Math.min(40, Math.round(porMin / (porMin > 400 ? 50 : porMin > 40 ? 10 : 1)))), legenda: porMin > 400 ? "cada ⏱️ são 50 views por minuto" : porMin > 40 ? "cada ⏱️ são 10 views por minuto" : "cada ⏱️ é 1 view por minuto" },
      });
    }
    const totalViews = c.gente.reduce((a, p) => a + vtot(p), 0);
    if (totalViews > 1e8) {
      const anos = totalViews / (3600 * 24 * 365.25);
      out.push({
        k: `matematica:segundos`,
        peso: 3,
        vis: "contador",
        pessoas: [],
        titulo: `Uma view, um segundo`,
        texto: `Se cada view durasse um segundo, as **${curto(totalViews)}** views de todos os Youtubers do Placar davam **${inteiro(Math.round(anos))} anos** seguidos.`,
        num: N(anos, "inteiro", { suf: " anos" }),
        dados: { icone: "⏳", n: Math.max(1, Math.min(50, Math.round(anos / 10))), legenda: "cada ⏳ são 10 anos" },
      });
    }
    const totalVideos = c.gente.reduce((a, p) => a + nvid(p), 0);
    if (totalVideos > 5000)
      out.push({
        k: `matematica:videos`,
        peso: 2.6,
        vis: "contador",
        pessoas: [],
        titulo: escolher([`Todos os vídeos do Placar`, `Quantos vídeos há no Placar?`]),
        texto: `Juntos, os Youtubers do Placar já publicaram **${inteiro(totalVideos)} vídeos**. Um por dia, eram precisos **${inteiro(Math.round(totalVideos / 365.25))} anos** para os ver todos.`,
        num: N(totalVideos, "inteiro"),
        dados: { icone: "🎬", n: Math.max(1, Math.min(50, Math.round(totalVideos / 1000))), legenda: "cada 🎬 são mil vídeos" },
      });
    return out;
  },

  // 2016 vs. 2026: "2026 é o novo 2016" (a tendência de nostalgia)
  nostalgia(c) {
    const out = [];
    const anoAgora = new Date(c.agora).getFullYear();
    const mes = mesNome(c.ref, { ano: false });
    const top = [...c.gente].filter((p) => subs(p) > 0).sort((a, b) => subs(b) - subs(a)).slice(0, 20);
    const ja = top.filter((p) => anoDe(p) && anoDe(p) <= 2016);
    if (top.length >= 10 && ja.length)
      out.push({
        k: `nostalgia:top:${ja.length}`,
        peso: 3,
        vis: "contador",
        pessoas: ja.slice(0, 1).map(snap),
        titulo: escolher([`Os maiores de hoje já cá estavam em 2016?`, `2016 vs. 2026: quem já cá estava?`]),
        texto: `Dos **${top.length}** canais com mais subscritores, **${ja.length}** já existiam em 2016${ja.length >= top.length / 2 ? ": os grandes continuam a ser os de sempre." : ". A maior parte chegou depois."}`,
        num: N(ja.length, "inteiro", { suf: ` de ${top.length}` }),
        q: { t: `Quantos dos ${top.length} canais com mais subscritores já existiam em 2016?`, v: ja.length, f: "inteiro", max: top.length },
        dados: { icone: "📼", n: ja.length, legenda: "cada 📼 é um canal que já existia em 2016" },
      });
    const novo = top.filter((p) => anoDe(p) > 2016).sort((a, b) => subs(b) - subs(a))[0];
    if (novo)
      out.push({
        k: `nostalgia:novo:${novo.id}`,
        peso: 3.5,
        vis: "revela",
        p: novo.id,
        pessoas: [snap(novo)],
        titulo: `**${novo.name}** nem existia em 2016`,
        texto: `O canal nasceu em **${anoDe(novo)}** e hoje tem **${curto(subs(novo))}** subscritores: é o maior que ainda não existia em 2016.`,
        num: N(subs(novo)),
        dados: { pistas: [["📅", `Criado em ${anoDe(novo)}`], ["👥", `${curto(subs(novo))} subscritores`], categoria(novo) ? ["🎬", categoria(novo)] : null].filter(Boolean) },
      });
    for (const x of rankingMes(c.ref, { categoria: c.cat }).slice(0, 10).filter((y) => anoDe(y.p) && anoDe(y.p) <= 2016).slice(0, 4))
      out.push({
        k: `nostalgia:resiste:${x.p.id}:${c.ref}`,
        peso: 2.5 + (2016 - anoDe(x.p)) * 0.2 + (11 - x.pos) * 0.1,
        vis: "tempo",
        p: x.p.id,
        pessoas: [snap(x.p)],
        titulo: escolher([`**${x.p.name}**: de 2016 até hoje`, `Já cá estava em 2016 e continua lá em cima`]),
        texto: `**${x.p.name}** já publicava em **${anoDe(x.p)}** e em ${mes} ficou em **${x.pos}.º** nas views.`,
        num: N(x.pos, "inteiro", { suf: ".º" }),
        dados: { ano: anoDe(x.p), fim: anoAgora, eventos: EVENTOS.filter((e) => e.ano >= Math.max(2005, anoDe(x.p) - 4) && Math.abs(e.ano - anoDe(x.p)) >= 2).slice(0, 7).map(({ ano, ic: i, t }) => ({ ano, ic: i, t })) },
      });
    return out;
  },

  // Quanto pode ganhar (só quando se escolhe: é uma estimativa muito larga)
  ganhos(c) {
    const mes = mesNome(c.ref, { ano: false });
    return rankingMes(c.ref, { categoria: c.cat })
      .slice(0, 15)
      .filter((x) => x.v >= 50000)
      .map((x) => {
        const min = (x.v / 1000) * 0.25;
        const max = (x.v / 1000) * 4;
        return {
          k: `ganhos:${x.p.id}:${c.ref}`,
          peso: Math.log10(x.v),
          vis: "intervalo",
          p: x.p.id,
          pessoas: [snap(x.p)],
          titulo: escolher([`Quanto pode ter ganho **${x.p.name}** em ${mes}?`, `**${x.p.name}**: as contas de ${mes}`]),
          texto: `Com **${curto(x.v)}** views em ${mes}, os anúncios podem ter dado entre **${fmt(min, "dolares")}** e **${fmt(max, "dolares")}**. Não conta os patrocínios.`,
          num: N(max, "dolares"),
          dados: { min, max, v: x.v },
        };
      });
  },

  fieis(c) {
    const out = [];
    const engs = c.gente.map((p) => p.vid?.eng).filter((e) => e > 0);
    const med = mediana(engs);
    if (!med) return out;
    for (const p of c.gente) {
      const e = p.vid?.eng;
      if (!(e > 0) || (p.vid.views90 || 0) < 100000 || e < med * 1.8) continue;
      out.push({
        k: `fieis:${p.id}`,
        peso: e / med + Math.log10(p.vid.views90) * 0.3,
        vis: "comparar",
        p: p.id,
        pessoas: [snap(p)],
        titulo: escolher([`O público de **${p.name}** não fica calado`, `O público mais fiel: **${p.name}**`]),
        texto: `Por cada 100 views, **${p.name}** recebe **${dec(e * 100)}** gostos e comentários. O normal no Placar são **${dec(med * 100)}**.`,
        num: N(e * 100, "dec"),
        dados: { f: "dec", a: { rot: `Gostos e comentários por 100 views`, v: e * 100, ic: "❤️" }, b: { rot: "O normal no Placar", v: med * 100, ic: "📊" } },
      });
    }
    return out;
  },
};

// Os que entram no "Ao acaso" e na mistura (os ganhos só quando se escolhem)
export const TEMAS_COM_FACTOS = Object.keys(GERADORES).filter((id) => id !== "ganhos");

// ---------- Episódios com forma própria ----------

// A escala real ("True Scale"): os subscritores em sítios e cidades de verdade, do mais pequeno ao maior
const ANCORAS = [
  { n: 20000, nome: "Altice Arena", tipo: "lotacao", ic: "🎤", t: "a Altice Arena" },
  { n: 50000, nome: "Estádio do Dragão", tipo: "lotacao", ic: "🏟️", t: "o Estádio do Dragão" },
  { n: 65000, nome: "Estádio da Luz", tipo: "lotacao", ic: "🏟️", t: "o Estádio da Luz" },
  { n: 140000, nome: "Coimbra", tipo: "cidade", ic: "🎓", de: "de Coimbra", em: "em Coimbra" },
  { n: 193000, nome: "Braga", tipo: "cidade", ic: "⛪", de: "de Braga", em: "em Braga" },
  { n: 232000, nome: "Porto", tipo: "cidade", ic: "🌉", de: "do Porto", em: "no Porto" },
  { n: 545000, nome: "Lisboa", tipo: "cidade", ic: "🏛️", de: "de Lisboa", em: "em Lisboa" },
  { n: 10.6e6, nome: "Portugal", tipo: "cidade", ic: "🇵🇹", de: "de Portugal", em: "em Portugal" },
];
function planoEscala(c, n) {
  const gente = c.gente.filter((p) => subs(p) >= 15000).sort((a, b) => subs(a) - subs(b));
  if (gente.length < 3) return [];
  const lo = Math.log10(subs(gente[0]));
  const hi = Math.log10(subs(gente.at(-1)));
  const escolhidos = [];
  for (let i = 0; i < n - 1 && escolhidos.length < gente.length - 1; i++) {
    const alvo = lo + ((hi - lo) * (i + 0.15 + aleatorio() * 0.7)) / n;
    const perto = gente.filter((p) => !escolhidos.includes(p) && p !== gente.at(-1)).sort((a, b) => Math.abs(Math.log10(subs(a)) - alvo) - Math.abs(Math.log10(subs(b)) - alvo)).slice(0, 4);
    if (perto.length) escolhidos.push(escolher(perto));
  }
  // O maior fica sempre para o fim
  const lista = [...new Set(escolhidos)].sort((a, b) => subs(a) - subs(b)).concat(gente.at(-1));
  return lista.map((p, i) => {
    const s = subs(p);
    const abaixo = ANCORAS.filter((a) => a.n <= s).at(-1);
    const acima = ANCORAS.find((a) => a.n > s);
    const anc = abaixo || acima;
    const k = s / anc.n;
    let texto;
    if (!abaixo) texto = `Os **${curto(s)}** subscritores de **${p.name}** ainda não enchiam ${anc.t}: são **${dec(k * 100, 0)}%** da lotação.`;
    else if (anc.tipo === "lotacao") texto = `Os **${curto(s)}** subscritores de **${p.name}** enchiam ${anc.t} ${k >= 2 ? `**${inteiro(Math.floor(k))} vezes**` : "e ainda sobrava gente"}.`;
    else texto = k >= 2 ? `Os **${curto(s)}** subscritores de **${p.name}** são **${dec(k)}×** a população ${anc.de}.` : `**${p.name}** tem **${curto(s)}** subscritores: mais do que toda a gente que vive ${anc.em} (cerca de ${curto(anc.n)}).`;
    return {
      k: `escala:${p.id}`,
      tema: "escala",
      peso: i + 1,
      vis: "escala",
      p: p.id,
      pessoas: [snap(p)],
      titulo: i === lista.length - 1 ? `E o maior de todos: **${p.name}**` : escolher([`**${p.name}** em pessoas de verdade`, `Os subscritores de **${p.name}** num sítio só`]),
      texto,
      num: N(s),
      dados: { v: s, ancora: { nome: anc.nome, ic: anc.ic, n: anc.n }, antes: lista.slice(0, i).map((q) => ({ ...snap(q), v: subs(q) })) },
    };
  });
}

// O iceberg: do que toda a gente sabe (os gigantes) ao que quase ninguém sabe (os canais pequenos)
export const NIVEIS_ICEBERG = [
  { min: 1e6, nome: "À superfície", sub: "O que toda a gente sabe" },
  { min: 1e5, nome: "Debaixo de água", sub: "Só quem segue o YouTube português" },
  { min: 1e4, nome: "Nas profundezas", sub: "Poucos sabem isto" },
  { min: 0, nome: "O fundo do mar", sub: "Quase ninguém sabe isto" },
];
function planoIceberg(c, n, vistos, factosDe) {
  const subsDe = new Map(c.gente.map((p) => [p.id, subs(p)]));
  const pool = TEMAS_COM_FACTOS.filter((id) => id !== "matematica").flatMap(factosDe).filter((f) => f.vis !== "revela" && f.pessoas.length);
  const nivelDe = (f) => {
    const s = subsDe.get(f.p || f.pessoas.at(-1).id) || 0;
    return NIVEIS_ICEBERG.findIndex((x) => s >= x.min);
  };
  const porNivel = NIVEIS_ICEBERG.map((_, i) => pool.filter((f) => nivelDe(f) === i));
  const comFactos = porNivel.filter((l) => l.length).length;
  if (comFactos < 2) return [];
  const cada = Math.max(1, Math.ceil(n / comFactos));
  const out = [];
  porNivel.forEach((l, i) => {
    for (const f of escolherFactos(l, cada, vistos)) out.push({ ...f, nivel: i });
  });
  return out.slice(0, Math.max(n, comFactos)).sort((a, b) => a.nivel - b.nivel);
}

// Todos os n.º 1: o catálogo completo, mês a mês, e os recordes de quem lá chegou
function planoReis(c) {
  const meses = (estado.cobertura || []).filter((x) => x.n >= 20 && x.m < c.ds.currentMonth && x.m <= c.ref).map((x) => x.m).slice(-24);
  const lista = meses.map((m) => ({ m, x: rankingMes(m, { categoria: c.cat })[0] })).filter((y) => y.x).map(({ m, x }) => ({ m, p: x.p, v: x.v }));
  if (lista.length < 3) return [];
  const conta = new Map();
  for (const x of lista) conta.set(x.p.id, (conta.get(x.p.id) || 0) + 1);
  const diferentes = conta.size;
  const out = [
    {
      k: `reis:catalogo:${lista.at(-1).m}`,
      tema: "reis",
      peso: 1,
      vis: "catalogo",
      pessoas: [...new Map(lista.map((x) => [x.p.id, snap(x.p)])).values()].slice(0, 8),
      titulo: `Todos os n.º 1, mês a mês`,
      texto: `De ${mesNome(lista[0].m)} a ${mesNome(lista.at(-1).m)}, **${diferentes}** ${diferentes === 1 ? "Youtuber chegou" : "Youtubers diferentes chegaram"} ao 1.º lugar das views.`,
      num: N(diferentes, "inteiro"),
      dados: { meses: lista.map((x) => ({ m: x.m, ...snap(x.p), v: x.v })) },
    },
  ];
  const [idMais, nMais] = [...conta.entries()].sort((a, b) => b[1] - a[1])[0];
  const pMais = lista.find((x) => x.p.id === idMais).p;
  if (nMais >= 2)
    out.push({
      k: `reis:mais:${idMais}`,
      tema: "reis",
      peso: 3,
      vis: "contador",
      p: idMais,
      pessoas: [snap(pMais)],
      titulo: `Quem foi mais vezes n.º 1?`,
      texto: `**${pMais.name}** foi o mais visto em **${nMais}** dos ${lista.length} meses.`,
      num: N(nMais, "inteiro", { suf: ` de ${lista.length}` }),
      q: { t: `Em quantos dos ${lista.length} meses foi **${pMais.name}** o n.º 1?`, v: nMais, f: "inteiro", max: lista.length },
      dados: { icone: "👑", n: nMais, legenda: "cada 👑 é um mês em 1.º lugar" },
    });
  // O reinado mais longo (meses seguidos)
  let melhor = null;
  for (let i = 0; i < lista.length; ) {
    let j = i;
    while (j + 1 < lista.length && lista[j + 1].p.id === lista[i].p.id) j++;
    if (!melhor || j - i + 1 > melhor.n) melhor = { p: lista[i].p, n: j - i + 1, de: lista[i].m, ate: lista[j].m };
    i = j + 1;
  }
  if (melhor && melhor.n >= 2)
    out.push({
      k: `reis:reinado:${melhor.p.id}:${melhor.de}`,
      tema: "reis",
      peso: 3.5,
      vis: "contador",
      p: melhor.p.id,
      pessoas: [snap(melhor.p)],
      titulo: `O reinado mais longo`,
      texto: `**${melhor.p.name}** esteve em 1.º **${melhor.n} meses seguidos**, de ${mesNome(melhor.de)} a ${mesNome(melhor.ate)}.`,
      num: N(melhor.n, "inteiro", { suf: " meses" }),
      dados: { icone: "👑", n: melhor.n, legenda: "cada 👑 é um mês seguido em 1.º lugar" },
    });
  // O n.º 1 mais improvável: o que tinha menos subscritores
  const improvavel = lista.filter((x) => subs(x.p) > 0).sort((a, b) => subs(a.p) - subs(b.p))[0];
  const medSubs = mediana(lista.map((x) => subs(x.p)).filter(Boolean));
  if (improvavel && subs(improvavel.p) < medSubs / 2)
    out.push({
      k: `reis:improvavel:${improvavel.p.id}:${improvavel.m}`,
      tema: "reis",
      peso: 3.2,
      vis: "comparar",
      p: improvavel.p.id,
      pessoas: [snap(improvavel.p)],
      titulo: `O n.º 1 mais improvável`,
      texto: `Em ${mesNome(improvavel.m)}, o n.º 1 foi **${improvavel.p.name}**, com só **${curto(subs(improvavel.p))}** subscritores, contra os **${curto(medSubs)}** de um n.º 1 normal.`,
      num: N(subs(improvavel.p)),
      dados: { a: { rot: "Subscritores", v: subs(improvavel.p), ic: "👥" }, b: { rot: `Views em ${mesNome(improvavel.m, { ano: false })}`, v: improvavel.v, ic: "👁" } },
    });
  // O mês mais forte de um n.º 1
  const forte = [...lista].sort((a, b) => b.v - a.v)[0];
  out.push({
    k: `reis:forte:${forte.p.id}:${forte.m}`,
    tema: "reis",
    peso: 2.5,
    vis: "contador",
    p: forte.p.id,
    pessoas: [snap(forte.p)],
    titulo: `O mês mais forte de um n.º 1`,
    texto: `Em ${mesNome(forte.m)}, **${forte.p.name}** fez **${curto(forte.v)}** views: nenhum n.º 1 fez tanto nestes ${lista.length} meses.`,
    num: N(forte.v),
    q: { t: `Quantas views fez **${forte.p.name}** em ${mesNome(forte.m)}?`, v: forte.v, f: "curto" },
    dados: { icone: "🔥", n: Math.max(1, Math.min(40, Math.round(forte.v / 1e5))), legenda: "cada 🔥 são 100 mil views" },
  });
  // O catálogo primeiro; os outros do menos ao mais impressionante
  return [out[0], ...out.slice(1).sort((a, b) => a.peso - b.peso)];
}

const ESPECIAIS = { escala: planoEscala, iceberg: planoIceberg, reis: planoReis };

/** Uma pergunta de escolha múltipla ("Consegues adivinhar?") com a resposta certa e duas erradas. */
function criarPergunta({ t, v, f, max = Infinity }, anoAgora) {
  const certa = fmt(v, f);
  const ks = baralharSorte(f === "ano" ? [-7, -4, 3, 5] : Number.isFinite(max) ? [0.3, 0.5, 1.5, 2, 0.75, 1.25] : [0.3, 0.45, 2.2, 3.4]);
  const erradas = [];
  for (const k of ks) {
    const x = f === "ano" ? v + k : v * k;
    if (f === "ano" && (x < 2005 || x > anoAgora)) continue;
    if (x > max) continue;
    const t2 = fmt(f === "inteiro" || f === "ano" ? Math.max(1, Math.round(x)) : x, f);
    if (t2 !== certa && !erradas.includes(t2)) erradas.push(t2);
    if (erradas.length === 2) break;
  }
  if (erradas.length < 2) return null;
  const opcoes = baralharSorte([certa, ...erradas]);
  return { t, opcoes, certa: opcoes.indexOf(certa) };
}
function baralharSorte(lista) {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------- O plano ----------

function lerMemoria() {
  try {
    return JSON.parse(localStorage.getItem(MEMORIA) || "{}") || {};
  } catch {
    return {};
  }
}
function guardarMemoria(plano) {
  try {
    const m = lerMemoria();
    const agora = Date.now();
    const vistos = [...(m.vistos || []).filter((x) => !plano.factos.some((f) => f.k === x.k)), ...plano.factos.map((f) => ({ k: f.k, t: agora }))].slice(-200);
    localStorage.setItem(MEMORIA, JSON.stringify({ vistos, temas: [...(m.temas || []), plano.tema].slice(-8) }));
  } catch {
    /* sem memória: continua a ser sorteado */
  }
}

/** Sorteia um elemento com peso. */
function sortear(lista, peso) {
  const ws = lista.map(peso);
  const total = ws.reduce((a, b) => a + b, 0);
  if (!(total > 0)) return lista[0];
  let r = aleatorio() * total;
  for (let i = 0; i < lista.length; i++) {
    r -= ws[i];
    if (r <= 0) return lista[i];
  }
  return lista.at(-1);
}

/** Escolhe n factos: com peso, a evitar os já vistos, a mesma pessoa duas vezes e (na mistura) mais de 2 do mesmo tema. */
function escolherFactos(cands, n, vistos, { mistura = false } = {}) {
  let pool = cands.map((f) => ({ f, w: Math.max(0.05, f.peso) * (vistos.has(f.k) ? 0.06 : 1) * (0.55 + aleatorio()) }));
  const out = [];
  const pessoas = new Map();
  const temas = new Map();
  while (out.length < n && pool.length) {
    const x = sortear(pool, (y) => y.w ** 1.6);
    pool = pool.filter((y) => y !== x);
    const ids = x.f.pessoas.map((s) => s.id);
    const sobram = pool.length + out.length >= n;
    if (sobram && ids.some((id) => pessoas.get(id))) continue;
    if (mistura && (temas.get(x.f.tema) || 0) >= 2 && sobram) continue;
    out.push(x.f);
    for (const id of ids) pessoas.set(id, (pessoas.get(id) || 0) + 1);
    temas.set(x.f.tema, (temas.get(x.f.tema) || 0) + 1);
  }
  // Do menos ao mais impressionante: o melhor fica para o fim
  return out.sort((a, b) => a.peso - b.peso);
}

/** O plano de um episódio: o tema e os factos (tudo o que é preciso para o mostrar). */
export function planear(opts = {}, memoria = {}) {
  const ds = estado.ds;
  const ref = opts.m || estado.ref;
  const c = {
    ds,
    ref,
    agora: Date.parse(ds.generatedAt) || Date.now(),
    gente: ds.people.filter((p) => !p.hidden && (!opts.cat || p.category === opts.cat)),
    meses: ds.months.filter((m) => m <= ref && m < ds.currentMonth),
    cat: opts.cat || "",
  };
  const n = Math.max(3, Math.min(12, Number(opts.n) || 7));
  const vistos = new Set((memoria.vistos || []).map((x) => x.k));
  const recentes = (memoria.temas || []).slice(-3);
  const cache = {};
  const factosDe = (id) => (cache[id] ||= (GERADORES[id](c) || []).filter((f) => f && f.peso > 0 && f.k).map((f) => ({ ...f, tema: id })));
  const especial = {};
  const planoDe = (id) => (ESPECIAIS[id] ? (especial[id] ||= ESPECIAIS[id](c, n, vistos, factosDe)) : null);
  let tema = opts.episodio && opts.episodio !== "acaso" && (GERADORES[opts.episodio] || ESPECIAIS[opts.episodio] || opts.episodio === "mistura") ? opts.episodio : "";
  let aviso = "";
  if (tema && ESPECIAIS[tema] && planoDe(tema).length < 3) {
    aviso = `Há poucos dados para "${temaCuriosidades(tema)?.nome || tema}": fica um pouco de tudo.`;
    tema = "mistura";
  } else if (tema && !ESPECIAIS[tema] && tema !== "mistura" && factosDe(tema).length < 3) {
    aviso = `Há poucas curiosidades de "${temaCuriosidades(tema)?.nome || tema}" com estes dados: fica um pouco de tudo.`;
    tema = "mistura";
  }
  if (!tema) {
    // Ao acaso: os temas com factos que chegam, com mais hipóteses para os que têm coisas novas
    const opcoes = TEMAS_COM_FACTOS.map((id) => ({ id, f: factosDe(id) })).filter((x) => x.f.length >= 3);
    for (const id of Object.keys(ESPECIAIS)) if (planoDe(id).length >= 3) opcoes.push({ id, f: planoDe(id) });
    opcoes.push({ id: "mistura", f: [] });
    const escolhido = sortear(opcoes, (x) => (x.id === "mistura" ? 3 : 1 + Math.min(8, x.f.filter((f) => !vistos.has(f.k)).length)) * (recentes.includes(x.id) ? 0.12 : 1));
    tema = escolhido?.id || "mistura";
  }
  const mistura = tema === "mistura";
  const factos = ESPECIAIS[tema] ? planoDe(tema) : escolherFactos(mistura ? TEMAS_COM_FACTOS.flatMap(factosDe) : factosDe(tema), n, vistos, { mistura });
  // "Consegues adivinhar?": algumas curiosidades começam com uma pergunta de escolha múltipla
  // (nunca as de "Quem é?", que mostrariam o nome antes do tempo)
  const anoAgora = new Date(c.agora).getFullYear();
  let perguntas = 0;
  const comPerguntas = factos.map((f) => {
    const { q, ...resto } = f;
    if (!q || f.vis === "revela" || perguntas >= 3 || aleatorio() > 0.4) return resto;
    const pergunta = criarPergunta(q, anoAgora);
    if (!pergunta) return resto;
    perguntas++;
    return { ...resto, pergunta };
  });
  return { tema, ref, n, aviso, factos: comPerguntas, final: escolher(["Qual destas não sabias?", "Qual foi a mais surpreendente?", "Sabias todas?", "Qual te espantou mais?"]) };
}

// ---------- O espetáculo ----------

export async function correr(palco, opts) {
  const plano = await palco.captura("curiosidades", async () => planear(opts, lerMemoria()));
  if (!palco.reproduzir) guardarMemoria(plano);
  // Para a legenda de publicar saber que tema saiu
  opts.temaEscolhido = plano.tema;
  const T = temaCuriosidades(plano.tema) || TEMAS_CURIOSIDADES.at(-1);
  if (!plano.factos.length) throw new Error("Não há curiosidades suficientes com estes dados. Experimenta outro tema ou outra categoria.");
  palco.contexto = { metrica: "subs", m: plano.ref };
  const tensos = ["lembras", "adormecidos", "montanha", "antesagora"];
  palco.musica(tensos.includes(plano.tema) ? "tensao" : "leve", 1);
  await palco.abertura({ etiqueta: `${T.icone} Curiosidades`, titulo: T.nome, sub: plano.aviso || T.sub });
  palco.musica(tensos.includes(plano.tema) ? "tensao" : "epico", 0.85);

  const cena = palco.cena;
  const total = plano.factos.length;
  cena.innerHTML = `<div class="cu${plano.tema === "iceberg" ? " cu-mar" : ""}"><div class="cu-topo"><span class="cu-etq">${esc(T.icone)} ${esc(T.nome)}</span><div class="cu-pontos">${plano.factos.map(() => "<i></i>").join("")}</div></div><div class="cu-palco"></div></div>`;
  const pontos = [...cena.querySelectorAll(".cu-pontos i")];
  const alvo = cena.querySelector(".cu-palco");
  const iceberg = plano.tema === "iceberg";
  let nivel = -1;
  for (const [i, f] of plano.factos.entries()) {
    if (palco.terminado) return;
    pontos.forEach((p, k) => p.classList.toggle("feito", k <= i));
    // Iceberg: a descer de nível, a água escurece
    if (iceberg && f.nivel !== nivel) {
      nivel = f.nivel;
      cena.querySelector(".cu").dataset.nivel = nivel;
      await cenaNivel(palco, alvo, nivel);
    }
    if (f.pergunta) await cenaPergunta(palco, alvo, f);
    const final = i === total - 1 && total >= 3;
    const etq = final ? (iceberg ? "O mais fundo de todos…" : "E a mais incrível…") : iceberg ? `${NIVEIS_ICEBERG[f.nivel].nome} · ${i + 1} de ${total}` : `Curiosidade ${i + 1} de ${total}`;
    alvo.innerHTML = `<div class="cu-cartao cu-${f.vis}${final ? " final" : ""}"><div class="cu-num-etq">${esc(etq)}</div>${CENAS[f.vis].html(f, palco)}</div>`;
    const cartao = alvo.firstElementChild;
    cartao.animate([{ opacity: 0, transform: "translateY(70px) scale(.96)" }, { opacity: 1, transform: "none" }], { duration: 650, easing: "cubic-bezier(.2,1.2,.4,1)" });
    if (final) palco.tocar("rufo");
    await CENAS[f.vis].animar(palco, cartao, f, { final });
    if (final) {
      const av = cartao.querySelector(".palco-avatar");
      const real = f.p ? pessoa(f.p) : null;
      const tratou = palco.evento("vencedor", { alvo: av, ...(real ? { p: real } : {}) });
      palco.festa({ forca: 0.7, som: !tratou });
      await palco.passo(2200);
    }
    if (i === Math.floor(total / 2) - 1) await palco.meio();
    if (i < total - 1) {
      cartao.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateX(-160px) scale(.94)" }], { duration: 340, easing: "ease-in", fill: "forwards" });
      await palco.esperar(320, { exato: true });
    }
  }
  await cenaFim(palco, plano, T);
  palco.resumir({
    tipo: "grafico",
    medida: T.nome,
    linhas: plano.factos.map((f) => ({ nome: f.titulo.replace(/\*\*/g, ""), valor: `${f.num?.pre || ""}${fmt(f.num?.v, f.num?.f)}${f.num?.suf || ""}` })),
    ...(plano.factos.at(-1)?.pessoas?.length ? { vencedor: { id: plano.factos.at(-1).pessoas.at(-1).id, nome: plano.factos.at(-1).pessoas.at(-1).name, valor: "", pos: 1 } } : {}),
  });
  await palco.fecho();
}

/** Iceberg: a descida ao próximo nível, com o iceberg e a marca da profundidade. */
async function cenaNivel(palco, alvo, nivel) {
  const N = NIVEIS_ICEBERG[nivel];
  const Y = [13, 40, 64, 86];
  const y = Y[nivel];
  alvo.innerHTML = `<div class="cu-cartao cu-nivel">
    <svg class="cu-ice" viewBox="0 0 400 520" aria-hidden="true">
      <rect x="0" y="92" width="400" height="428" class="cu-ice-agua"/>
      <path class="cu-ice-pedra" d="M170 20 L230 30 L262 92 L330 170 L356 300 L320 420 L240 500 L150 492 L74 410 L48 280 L86 160 L140 92 Z"/>
      <path class="cu-ice-topo" d="M170 20 L230 30 L262 92 L140 92 Z"/>
      <line x1="0" y1="92" x2="400" y2="92" class="cu-ice-linha"/>
      ${NIVEIS_ICEBERG.map((_, k) => `<line x1="20" x2="380" y1="${Y[k] * 5.2}" y2="${Y[k] * 5.2}" class="cu-ice-nivel${k === nivel ? " este" : ""}"/>`).join("")}
      <circle cx="200" cy="${y * 5.2}" r="16" class="cu-ice-marca"/>
    </svg>
    <div class="cu-nivel-txt"><small>Nível ${nivel + 1} de ${NIVEIS_ICEBERG.length}</small><h2 class="cu-titulo">${esc(N.nome)}</h2><p class="cu-texto">${esc(N.sub)}</p></div>
  </div>`;
  const c = alvo.firstElementChild;
  palco.tocar(nivel ? "whoosh" : "_destaque");
  if (nivel) palco.tocar("bolha", {}, 0.3);
  c.querySelector(".cu-ice-marca").animate([{ transform: `translateY(${-90}px)`, opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 900, easing: "cubic-bezier(.3,1.4,.5,1)" });
  entrar(c.querySelector(".cu-nivel-txt"), 200);
  await palco.passo(2600);
  await palco.sair_(c);
}

/** "Consegues adivinhar?": três respostas, uma contagem e a certa a acender. */
async function cenaPergunta(palco, alvo, f) {
  const q = f.pergunta;
  const s = f.pessoas.find((x) => x.id === f.p) || f.pessoas.at(-1);
  alvo.innerHTML = `<div class="cu-cartao cu-pergunta">
    <div class="cu-num-etq">🤔 Consegues adivinhar?</div>
    ${s ? avatarPalco(s, palco.vertical ? 190 : 150) : ""}
    <h2 class="cu-titulo">${rico(q.t)}</h2>
    <div class="cu-opcoes">${q.opcoes.map((o, i) => `<div class="cu-op"><i>${"ABC"[i]}</i><b>${esc(o)}</b></div>`).join("")}</div>
    <div class="cu-relogio"><b>5</b></div>
  </div>`;
  const c = alvo.firstElementChild;
  palco.tocar("_abertura", {}, 0.05);
  const ops = [...c.querySelectorAll(".cu-op")];
  ops.forEach((o, k) => o.animate([{ opacity: 0, transform: "translateY(50px) scale(.9)" }, { opacity: 1, transform: "none" }], { duration: 520, delay: (300 + k * 160) * palco.fator, easing: "cubic-bezier(.2,1.5,.4,1)", fill: "backwards" }));
  const rel = c.querySelector(".cu-relogio b");
  await palco.esperar(900);
  for (let t = 5; t >= 1; t--) {
    rel.textContent = t;
    rel.classList.remove("p-slam");
    void rel.offsetWidth;
    rel.classList.add("p-slam");
    palco.tocar("tique");
    await palco.esperar(900);
  }
  c.querySelector(".cu-relogio").classList.add("fim");
  ops.forEach((o, k) => o.classList.add(k === q.certa ? "certa" : "errada"));
  palco.tocar("acerto");
  palco.flash(0.25);
  await palco.passo(1700);
  await palco.sair_(c);
}

/** O fim: todas as caras do episódio e a pergunta para os comentários. */
async function cenaFim(palco, plano, T) {
  const caras = [];
  for (const f of plano.factos) for (const s of f.pessoas) if (!caras.some((x) => x.id === s.id)) caras.push(s);
  const tam = palco.vertical ? (caras.length > 6 ? 130 : 170) : caras.length > 8 ? 120 : 150;
  palco.cena.innerHTML = `<div class="p-centro cu-fim">
    <div class="cu-fim-ic">${esc(T.icone)}</div>
    <h1 class="p-titulo" style="font-size:${palco.vertical ? 104 : 116}px">${esc(plano.final)}</h1>
    ${caras.length ? `<div class="cu-fim-caras">${caras.slice(0, 12).map((s) => avatarPalco(s, tam)).join("")}</div>` : ""}
    <p class="p-sub">Comenta a que te surpreendeu mais 👇</p></div>`;
  const raiz = palco.cena.firstElementChild;
  palco.tocar("_destaque");
  raiz.querySelectorAll(".cu-fim-caras .avatar").forEach((a, k) => {
    a.animate([{ transform: "scale(0) rotate(-25deg)" }, { transform: "none" }], { duration: 520, delay: (300 + k * 90) * palco.fator, easing: "cubic-bezier(.2,1.6,.4,1)", fill: "backwards" });
    palco.tocar("ponto", {}, 0.3 + k * 0.09);
  });
  setTimeout(() => !palco.terminado && palco.explodir(palco.L / 2, palco.A * 0.4, { n: 70, forca: 0.6 }), 600);
  await palco.passo(5200);
  await palco.sair_(raiz);
}

// ---------- As cenas ----------
// Cada uma: html(f) desenha o cartão e animar(palco, cartao, f) conta os números e mostra as partes.

const titulo = (f) => `<h2 class="cu-titulo">${rico(f.titulo)}</h2>`;
const texto = (f) => `<p class="cu-texto">${rico(f.texto)}</p>`;
const entrar = (el, atraso = 0) => el?.animate([{ opacity: 0, transform: "translateY(40px)" }, { opacity: 1, transform: "none" }], { duration: 600, delay: atraso, easing: "cubic-bezier(.2,1.2,.4,1)", fill: "backwards" });
const pessoaReal = (f) => (f.p ? pessoa(f.p) : null);

const CENAS = {
  // A escala real: as barras de antes encolhem quando chega um maior (o "zoom out")
  escala: {
    html: (f, palco) => {
      const d = f.dados;
      const barra = (x, cls, cabeca) => `<div class="cu-es-b ${cls}" data-v="${x.v}"><div class="cu-es-cabeca">${cabeca}</div><i></i><small>${esc(x.nome)}</small><b>${esc(curto(x.v))}</b></div>`;
      return `<div class="cu-es">${titulo(f)}
        <div class="cu-es-graf">
          ${d.antes.map((x) => barra({ ...x, nome: x.name }, "antes", avatarPalco(x, palco.vertical ? 56 : 64))).join("")}
          ${barra({ v: d.ancora.n, nome: d.ancora.nome }, "ancora", `<span class="cu-es-ic">${esc(d.ancora.ic)}</span>`)}
          ${barra({ v: d.v, nome: f.pessoas[0].name }, "agora", avatarPalco(f.pessoas[0], palco.vertical ? 110 : 120))}
        </div>${texto(f)}</div>`;
    },
    async animar(palco, cartao, f) {
      const bs = [...cartao.querySelectorAll(".cu-es-b")];
      const altura = (max) => bs.forEach((b) => b.style.setProperty("--h", Math.max(0.6, (Number(b.dataset.v) / max) * 100)));
      // Primeiro na escala de antes (o novo ainda a zero), depois na nova: tudo o resto encolhe
      const antes = Math.max(...bs.filter((b) => !b.classList.contains("agora")).map((b) => Number(b.dataset.v)));
      altura(antes);
      const novo = cartao.querySelector(".agora");
      novo.style.setProperty("--h", 0);
      palco.tocar("whoosh");
      await palco.esperar(1200);
      cartao.querySelector(".cu-es-graf").classList.add("zoom");
      altura(Math.max(antes, f.dados.v));
      palco.tocar("subida", { dur: 1.6 });
      if (f.dados.v > antes * 1.5) setTimeout(() => !palco.terminado && palco.tremer(0.4), 900 * palco.fator);
      await palco.esperar(1900);
      entrar(cartao.querySelector(".cu-texto"));
      await palco.passo(5600);
    },
  },

  // O catálogo completo: todos os n.º 1, um mês de cada vez
  catalogo: {
    html: (f, palco) => {
      const n = f.dados.meses.length;
      // Poucos meses: menos colunas e caras maiores
      const cols = palco.vertical ? (n <= 4 ? 2 : n <= 12 ? 3 : 4) : n <= 6 ? n : n <= 12 ? Math.ceil(n / 2) : 8;
      const tam = palco.vertical ? (n <= 6 ? 150 : n <= 12 ? 110 : 80) : n <= 6 ? 140 : n <= 12 ? 110 : 72;
      return `<div class="cu-cat">${titulo(f)}
      <div class="cu-cat-grelha" style="grid-template-columns:repeat(${cols}, minmax(0, 1fr))">${f.dados.meses
        .map((x) => `<div class="cu-cat-m"><small>${esc(mesNome(x.m, { curto: true }))}</small>${avatarPalco(x, tam)}<b>${esc(x.name)}</b><span>${esc(curto(x.v))}</span></div>`)
        .join("")}</div>${texto(f)}</div>`;
    },
    async animar(palco, cartao) {
      const ms = [...cartao.querySelectorAll(".cu-cat-m")];
      const passo = Math.max(90, Math.min(260, 4200 / ms.length));
      for (const [k, m] of ms.entries()) {
        setTimeout(() => !palco.terminado && m.classList.add("ve"), k * passo * palco.fator);
        palco.tocar("ponto", {}, (k * passo) / 1000);
      }
      await palco.esperar(ms.length * passo + 500);
      entrar(cartao.querySelector(".cu-texto"));
      await palco.passo(6000);
    },
  },

  // Uma estimativa entre dois valores (ganhos): a barra enche entre o mínimo e o máximo
  intervalo: {
    html: (f, palco) => {
      const d = f.dados;
      return `<div class="cu-in">${avatarPalco(f.pessoas[0], palco.vertical ? 190 : 150)}${titulo(f)}
        <div class="cu-in-v">👁 ${esc(curto(d.v))} views</div>
        <div class="cu-in-barra"><i></i><span class="min"><small>No mínimo</small><b>${esc(fmt(d.min, "dolares"))}</b></span><span class="max"><small>No máximo</small><b>${esc(fmt(d.max, "dolares"))}</b></span></div>
        <small class="cu-in-nota">Estimativa: 0,25 a 4 dólares por mil views (a conta do Social Blade). O valor real pode ser muito diferente.</small>
        ${texto(f)}</div>`;
    },
    async animar(palco, cartao) {
      palco.tocar("moeda");
      await palco.esperar(700);
      cartao.querySelector(".cu-in-barra").classList.add("ve");
      for (let k = 0; k < 6; k++) palco.tocar("moeda", {}, 0.2 + k * 0.18);
      await palco.esperar(1600);
      entrar(cartao.querySelector(".cu-texto"));
      await palco.passo(6200);
    },
  },

  // Quem é? Foto desfocada, pistas uma a uma, contagem e a revelação
  revela: {
    html: (f, palco) => `<div class="cu-rv">
      <div class="cu-rv-foto">${avatarPalco(f.pessoas[0], palco.vertical ? 400 : 380)}<b class="cu-rv-q">?</b></div>
      <div class="cu-rv-lado">
        <div class="cu-rv-pre">Quem é?</div>
        <ul class="cu-pistas">${f.dados.pistas.map(([i, t]) => `<li>${ic(i)}<span>${esc(t)}</span></li>`).join("")}</ul>
        <div class="cu-rv-depois">${titulo(f)}${texto(f)}</div>
      </div></div>`,
    async animar(palco, cartao, f) {
      palco.tocar("whoosh");
      const q = cartao.querySelector(".cu-rv-q");
      for (const li of cartao.querySelectorAll(".cu-pistas li")) {
        await palco.esperar(950);
        li.classList.add("ve");
        palco.tocar("tique");
      }
      await palco.passo(1300);
      for (const s of ["3", "2", "1"]) {
        q.textContent = s;
        q.classList.remove("p-slam");
        void q.offsetWidth;
        q.classList.add("p-slam");
        palco.tocar("bip");
        await palco.esperar(650);
      }
      cartao.querySelector(".cu-rv").classList.add("revelado");
      palco.tocar("revelar");
      palco.tocar("_destaque", {}, 0.15);
      palco.flash(0.5);
      const foto = cartao.querySelector(".cu-rv-foto");
      const r = foto.getBoundingClientRect();
      const t = palco.tela.getBoundingClientRect();
      const k = palco.L / t.width;
      palco.explodir((r.left - t.left + r.width / 2) * k, (r.top - t.top + r.height / 2) * k, { n: 70, forca: 0.7 });
      const real = pessoaReal(f);
      palco.evento("revelar", { alvo: foto.querySelector(".palco-avatar"), ...(real ? { p: real, pos: 9 } : {}) });
      await palco.passo(5600);
    },
  },

  // O canal abandonado: foto a preto e branco, teias, pó e os dias a contar
  fantasma: {
    html: (f, palco) => `<div class="cu-fa">
      <div class="cu-fa-foto">${avatarPalco(f.pessoas[0], palco.vertical ? 380 : 360)}
        <svg class="cu-teia" viewBox="0 0 200 200" aria-hidden="true"><path d="M0 0 L200 200 M0 0 L200 90 M0 0 L90 200 M0 0 L200 30 M0 0 L30 200"/><path d="M40 0 Q35 35 0 40 M85 0 Q75 75 0 85 M135 0 Q118 118 0 135 M185 0 Q160 160 0 185"/></svg>
        ${Array.from({ length: 14 }, (_, i) => `<span class="cu-po" style="--i:${i};--x:${(i * 37) % 100}%"></span>`).join("")}
      </div>
      <div class="cu-fa-lado">${titulo(f)}
        <div class="cu-fa-dias"><b>0</b><span>dias sem um vídeo novo</span></div>
        <div class="cu-fa-stats">${f.dados.stats.map((s) => `<div><small>${esc(s.rot)}</small><b data-v="${s.v}">0</b></div>`).join("")}</div>
        ${texto(f)}
      </div></div>`,
    async animar(palco, cartao, f) {
      palco.tocar("whoosh");
      palco.tocar("estatica", {}, 0.2);
      contar(cartao.querySelector(".cu-fa-dias b"), f.num.v, { formato: (x) => inteiro(Math.round(x)), duracao: 2000, atraso: 400 });
      for (let k = 0; k < 6; k++) palco.tocar("tique", {}, 0.4 + k * 0.3);
      cartao.querySelectorAll(".cu-fa-stats b").forEach((b, k) => contar(b, Number(b.dataset.v), { formato: curto, duracao: 1100, atraso: 1600 + k * 300 }));
      entrar(cartao.querySelector(".cu-texto"), 2400 * palco.fator);
      const real = pessoaReal(f);
      setTimeout(() => !palco.terminado && palco.evento("revelar", { alvo: cartao.querySelector(".palco-avatar"), ...(real ? { p: real, pos: 9 } : {}) }), 900);
      await palco.passo(7600);
    },
  },

  // Frente a frente: linha a linha, com a reviravolta no fim
  duelo: {
    html: (f, palco) => {
      const { a, b, linhas } = f.dados;
      const tam = palco.vertical ? 190 : 150;
      const linha = (l) => {
        const max = Math.max(l.va, l.vb) || 1;
        const w = (v) => (l.semBarra ? 0 : Math.max(3, (v / max) * 100));
        const ga = !l.semBarra && l.va > l.vb;
        const gb = !l.semBarra && l.vb > l.va;
        return `<div class="cu-du-l${l.twist ? " twist" : ""}${l.semBarra ? " sem-barra" : ""}">
          <div class="cu-du-v a${ga ? " ganha" : ""}"><b>${esc(fmt(l.va, l.f))}</b><i style="--w:${w(l.va)}"></i></div>
          <div class="cu-du-rot">${ic(l.ic)}<span>${esc(l.rot)}</span></div>
          <div class="cu-du-v b${gb ? " ganha" : ""}"><i style="--w:${w(l.vb)}"></i><b>${esc(fmt(l.vb, l.f))}</b></div></div>`;
      };
      return `<div class="cu-du">${titulo(f)}
        <div class="cu-du-caras"><div>${avatarPalco(a, tam)}<b>${esc(a.name)}</b></div><span class="cu-vs">VS</span><div>${avatarPalco(b, tam)}<b>${esc(b.name)}</b></div></div>
        <div class="cu-du-linhas">${linhas.map(linha).join("")}</div>${texto(f)}</div>`;
    },
    async animar(palco, cartao) {
      palco.tocar("whoosh");
      palco.tocar("impacto", {}, 0.3);
      cartao.querySelectorAll(".cu-du-caras > div").forEach((d, k) => d.animate([{ opacity: 0, transform: `translateX(${k ? 200 : -200}px)` }, { opacity: 1, transform: "none" }], { duration: 700, delay: 200 * palco.fator, easing: "cubic-bezier(.2,1.3,.4,1)", fill: "backwards" }));
      await palco.esperar(1100);
      for (const l of cartao.querySelectorAll(".cu-du-l")) {
        const twist = l.classList.contains("twist");
        await palco.esperar(twist ? 1500 : 800);
        l.classList.add("ve");
        palco.tocar(twist ? "ooh" : "virar");
        if (twist) {
          palco.flash(0.3);
          palco.tremer(0.35);
        }
      }
      entrar(cartao.querySelector(".cu-texto"), 600 * palco.fator);
      await palco.passo(6200);
    },
  },

  // Linha do tempo: o pino do Youtuber cai no ano em que começou, e acendem-se os que vieram depois
  tempo: {
    html: (f) => {
      const { ano, fim, eventos } = f.dados;
      const ini = Math.min(2005, ano);
      const vao = Math.max(1, fim - ini);
      const x = (a) => ((a - ini) / vao) * 100;
      return `<div class="cu-te">${titulo(f)}
        <div class="cu-te-linha">
          <div class="cu-te-eixo"><i></i></div>
          ${eventos.map((e, k) => `<div class="cu-te-ev ${e.ano > ano ? "depois" : "antes"} ${k % 2 ? "baixo" : "cima"}" style="--x:${x(e.ano)}"><b>${e.ano}</b><span>${esc(e.ic)} ${esc(e.t)}</span></div>`).join("")}
          <div class="cu-te-pino" style="--x:${x(ano)}">${avatarPalco(f.pessoas[0], 150)}<b>${ano}</b></div>
          <span class="cu-te-ano ini">${ini}</span><span class="cu-te-ano fim">${fim}</span>
        </div>${texto(f)}</div>`;
    },
    async animar(palco, cartao) {
      cartao.querySelector(".cu-te-eixo").classList.add("ve");
      palco.tocar("whoosh");
      cartao.querySelectorAll(".cu-te-ev").forEach((e, k) => setTimeout(() => !palco.terminado && e.classList.add("ve"), (500 + k * 120) * palco.fator));
      await palco.esperar(1700);
      cartao.querySelector(".cu-te-pino").classList.add("ve");
      palco.tocar("impacto");
      palco.tremer(0.3);
      await palco.esperar(900);
      for (const e of cartao.querySelectorAll(".cu-te-ev.depois")) {
        e.classList.add("acende");
        palco.tocar("ding");
        await palco.esperar(420);
      }
      entrar(cartao.querySelector(".cu-texto"));
      await palco.passo(5800);
    },
  },

  // Um número gigante e ícones a encher o ecrã (estádios, vídeos, relógios…)
  contador: {
    html: (f, palco) => `<div class="cu-co">
      ${f.pessoas[0] ? avatarPalco(f.pessoas.at(-1), palco.vertical ? 210 : 160) : ""}
      ${titulo(f)}
      <b class="cu-co-num">0</b>
      <div class="cu-co-icones">${Array.from({ length: f.dados.n }, () => `<span>${esc(f.dados.icone)}</span>`).join("")}</div>
      <small class="cu-co-leg">${esc(f.dados.legenda)}</small>
      ${texto(f)}</div>`,
    async animar(palco, cartao, f) {
      const n = f.num;
      contar(cartao.querySelector(".cu-co-num"), n.v, { formato: (x) => `${n.pre || ""}${fmt(x, n.f)}${n.suf || ""}`, duracao: 1600, atraso: 300 });
      palco.tocar("rufo");
      const ics = [...cartao.querySelectorAll(".cu-co-icones span")];
      ics.forEach((s, k) => s.animate([{ transform: "scale(0) translateY(40px)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 420, delay: (900 + k * Math.max(25, 900 / ics.length)) * palco.fator, easing: "cubic-bezier(.2,1.6,.4,1)", fill: "backwards" }));
      for (let k = 0; k < Math.min(10, ics.length); k++) palco.tocar("ponto", {}, 0.9 + k * 0.09);
      entrar(cartao.querySelector(".cu-texto"), 2000 * palco.fator);
      await palco.passo(7000);
    },
  },

  // Quase lá: a barra até ao marco e o que falta
  progresso: {
    html: (f, palco) => {
      const d = f.dados;
      return `<div class="cu-pr">${avatarPalco(f.pessoas[0], palco.vertical ? 220 : 170)}${titulo(f)}
        <div class="cu-pr-barra"><i></i><span class="cu-pr-meta">🎯 ${esc(marco(d.alvo))}</span><span class="cu-pr-base">${esc(curto(d.base))}</span></div>
        <div class="cu-pr-falta">Faltam <b>0</b> ${esc(d.unidade)}</div>
        ${d.dias ? `<div class="cu-pr-eta">⏳ Cerca de ${esc(tempo(d.dias))} ao ritmo atual</div>` : ""}
        ${texto(f)}</div>`;
    },
    async animar(palco, cartao, f) {
      const d = f.dados;
      const pct = Math.max(0.02, Math.min(0.995, (d.atual - d.base) / (d.alvo - d.base)));
      const barra = cartao.querySelector(".cu-pr-barra i");
      palco.tocar("subida", { dur: 1.8 });
      await animar(palco, 2200, (_, e) => (barra.style.width = `${e * pct * 100}%`));
      contar(cartao.querySelector(".cu-pr-falta b"), d.falta, { formato: (x) => (d.falta >= 1e5 ? curto(x) : inteiro(Math.round(x))), duracao: 1000 });
      cartao.querySelector(".cu-pr-barra").classList.add("quase");
      palco.tocar("_destaque");
      entrar(cartao.querySelector(".cu-pr-eta"), 400 * palco.fator);
      entrar(cartao.querySelector(".cu-texto"), 800 * palco.fator);
      await palco.passo(5600);
    },
  },

  // Os meses em barras, com o melhor e o pior marcados
  serie: {
    html: (f, palco) => {
      const { pontos, marcas } = f.dados;
      const max = Math.max(...pontos.map((x) => x.v), 1);
      return `<div class="cu-se"><div class="cu-se-topo">${avatarPalco(f.pessoas[0], palco.vertical ? 150 : 110)}${titulo(f)}</div>
        <div class="cu-se-graf" style="--n:${pontos.length}">${pontos
          .map((x, k) => {
            const marca = marcas.includes(k);
            const tipo = marca ? (x.v === max ? "max" : "min") : "";
            return `<div class="cu-se-b ${tipo}" style="--h:${Math.max(1.5, (x.v / max) * 100)};--k:${k}"><i></i>${marca ? `<span class="cu-se-rot"><b>${esc(curto(x.v))}</b><small>${esc(mesNome(x.m, { curto: true }))}</small></span>` : ""}</div>`;
          })
          .join("")}</div>${texto(f)}</div>`;
    },
    async animar(palco, cartao) {
      const graf = cartao.querySelector(".cu-se-graf");
      graf.classList.add("ve");
      const n = graf.children.length;
      for (let k = 0; k < Math.min(14, n); k++) palco.tocar("tique", {}, k * (1.2 / Math.min(14, n)));
      await palco.esperar(1600);
      for (const b of graf.querySelectorAll(".max, .min")) {
        b.classList.add("marca");
        palco.tocar(b.classList.contains("max") ? "subida" : "falha");
        await palco.esperar(700);
      }
      entrar(cartao.querySelector(".cu-texto"));
      await palco.passo(5600);
    },
  },

  // O vídeo que rebentou: a miniatura, as views a contar e a comparação com um vídeo normal
  video: {
    html: (f) => {
      const d = f.dados;
      return `<div class="cu-vi">${titulo(f)}
        ${f.titulo.includes(f.pessoas[0].name) ? "" : `<div class="cu-vi-quem">${avatarPalco(f.pessoas[0], 64)}<b>${esc(f.pessoas[0].name)}</b></div>`}
        <div class="cu-vi-mini">${d.th ? `<img src="${esc(d.th)}" alt="" referrerpolicy="no-referrer">` : ""}<span class="cu-vi-play">▶</span><b class="cu-vi-views">0</b>${d.s ? `<span class="cu-vi-short">Short</span>` : ""}</div>
        <div class="cu-vi-comp">
          <div><small>Este vídeo</small><i style="--w:100"></i><b>${esc(curto(d.v))}</b></div>
          <div><small>Um vídeo normal do canal</small><i style="--w:${Math.max(1.5, (d.med / d.v) * 100)}"></i><b>${esc(curto(d.med))}</b></div>
        </div>${texto(f)}</div>`;
    },
    async animar(palco, cartao, f) {
      palco.tocar("impacto");
      cartao.querySelector(".cu-vi-mini").classList.add("p-slam");
      contar(cartao.querySelector(".cu-vi-views"), f.dados.v, { formato: (x) => `${curto(x)} views`, duracao: 1800, atraso: 300 });
      await palco.esperar(1500);
      cartao.querySelector(".cu-vi-comp").classList.add("ve");
      palco.tocar("ooh", {}, 0.6);
      entrar(cartao.querySelector(".cu-texto"), 900 * palco.fator);
      await palco.passo(6200);
    },
  },

  // Duas barras grandes lado a lado e o "×N" entre elas
  comparar: {
    html: (f, palco) => {
      const { a, b } = f.dados;
      const max = Math.max(a.v, b.v) || 1;
      const r = Math.max(a.v, b.v) / Math.max(1e-9, Math.min(a.v, b.v));
      const coluna = (x, cls) => `<div class="cu-cp-b ${cls}${x.v === max ? " ganha" : ""}"><b data-v="${x.v}">0</b><div class="cu-cp-tubo"><i style="--h:${Math.max(2, (x.v / max) * 100)}"></i></div><span>${ic(x.ic)} ${esc(x.rot)}</span></div>`;
      return `<div class="cu-cp">${f.pessoas[0] ? avatarPalco(f.pessoas[0], palco.vertical ? 170 : 130) : ""}${titulo(f)}
        <div class="cu-cp-barras">${coluna(a, "a")}<div class="cu-cp-x">×${esc(vezes(r))}</div>${coluna(b, "b")}</div>${texto(f)}</div>`;
    },
    async animar(palco, cartao, f) {
      const formato = (x) => fmt(x, f.dados.f || "curto");
      const cols = [...cartao.querySelectorAll(".cu-cp-b")];
      for (const [k, c] of cols.entries()) {
        await palco.esperar(k ? 900 : 400);
        c.classList.add("ve");
        contar(c.querySelector("b"), Number(c.querySelector("b").dataset.v), { formato, duracao: 1100 });
        palco.tocar("subida", { dur: 0.8 });
      }
      await palco.esperar(1300);
      cartao.querySelector(".cu-cp-x").classList.add("ve");
      palco.tocar("ooh");
      palco.flash(0.25);
      entrar(cartao.querySelector(".cu-texto"), 500 * palco.fator);
      await palco.passo(6000);
    },
  },

  // Um mês de calendário: os dias com vídeos acendem-se
  calendario: {
    html: (f, palco) => {
      const porDia = f.dados.porDia;
      const dias = Array.from({ length: 28 }, (_, k) => {
        if (porDia >= 1) {
          const resto = porDia % 1;
          return Math.floor(porDia) + (Math.floor((k + 1) * resto) > Math.floor(k * resto) ? 1 : 0);
        }
        const cada = Math.max(1, Math.round(1 / porDia));
        return k % cada === 0 ? 1 : 0;
      });
      return `<div class="cu-ca">${avatarPalco(f.pessoas[0], palco.vertical ? 170 : 130)}${titulo(f)}
        <div class="cu-ca-grelha">${["S", "T", "Q", "Q", "S", "S", "D"].map((d) => `<small class="cu-ca-dia">${d}</small>`).join("")}${dias.map((n, k) => `<div class="cu-ca-d${n ? " tem" : ""}"><small>${k + 1}</small>${n ? `<b>${n > 1 ? `▶×${n}` : "▶"}</b>` : ""}</div>`).join("")}</div>
        ${texto(f)}</div>`;
    },
    async animar(palco, cartao) {
      const ds = [...cartao.querySelectorAll(".cu-ca-d")];
      ds.forEach((d, k) => d.animate([{ opacity: 0, transform: "scale(.6)" }, { opacity: 1, transform: "none" }], { duration: 300, delay: k * 35 * palco.fator, easing: "ease-out", fill: "backwards" }));
      await palco.esperar(1100);
      const com = ds.filter((d) => d.classList.contains("tem"));
      for (const [k, d] of com.entries()) {
        setTimeout(() => !palco.terminado && d.classList.add("ve"), k * (1600 / Math.max(1, com.length)) * palco.fator);
        if (k < 12) palco.tocar("tique", {}, k * (1.6 / Math.max(1, com.length)));
      }
      await palco.esperar(1900);
      entrar(cartao.querySelector(".cu-texto"));
      await palco.passo(5600);
    },
  },
};
