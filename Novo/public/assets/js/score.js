// Índice de Influência (0 a 1000) e a Pontuação Clássica da folha antiga.
// Tudo é calculado no browser para que as contas sejam transparentes.

export const PARTES = [
  { id: "alcance", nome: "Alcance atual", explica: "Média de views por mês nos últimos 3 meses com dados, em escala logarítmica." },
  { id: "constancia", nome: "Constância", explica: "Meses com views nos últimos 12 e se as views são regulares ou aos picos." },
  { id: "atividade", nome: "Atividade", explica: "Vídeos publicados nos últimos 90 dias e há quanto tempo saiu o último." },
  { id: "momento", nome: "Momento", explica: "Últimos 3 meses comparados com os 3 anteriores: está a subir ou a cair?" },
  { id: "historico", nome: "Peso histórico", explica: "Subscritores e views totais acumulados ao longo da carreira." },
  { id: "envolvimento", nome: "Envolvimento", explica: "Gostos e comentários por cada view nos vídeos recentes." },
  { id: "redes", nome: "Outras redes", explica: "Seguidores no Instagram e na Twitch (valem mais) e no TikTok (vale menos), e se estão a crescer. Só entra quando ajuda: nunca tira pontos." },
];

// Outras redes: quantos seguidores valem nota máxima, quanto vale cada rede e a partir de quantos conta.
// O TikTok é fácil de crescer (vale 60%); no Instagram estão os seguidores "a sério" e a Twitch é difícil.
export const REDES_INDICE = {
  instagram: { nome: "Instagram", topo: 5e6, vale: 1 },
  twitch: { nome: "Twitch", topo: 2e6, vale: 1 },
  tiktok: { nome: "TikTok", topo: 2e7, vale: 0.6 },
};
const MINIMO_SEGUIDORES = 1000;
const seguidores = (p, r) => p.socials?.[r]?.last?.followers ?? p.rs?.[r]?.info?.seg ?? null;
const ganhos = (p, r) => (r === "tiktok" ? p.tt?.f : p.rs?.[r]?.f) || null;

/** A parte "Outras redes" (0 a 1): a melhor rede conta inteira, a 2.ª 35% e a 3.ª 15%, mais um extra por crescer. */
export function parteRedes(p, janela) {
  const redes = [];
  for (const [r, cfg] of Object.entries(REDES_INDICE)) {
    const f = seguidores(p, r);
    if (!Number.isFinite(f) || f < MINIMO_SEGUIDORES) continue;
    const s = clamp((Math.log10(f) - Math.log10(MINIMO_SEGUIDORES)) / (Math.log10(cfg.topo) - Math.log10(MINIMO_SEGUIDORES)));
    // Crescimento: seguidores ganhos nos últimos 3 meses com dados, face aos seguidores de hoje
    const g = ganhos(p, r);
    const ult = g ? janela.map((m) => g[m]).filter((v) => Number.isFinite(v)).slice(-3) : [];
    const cresc = ult.length ? ult.reduce((a, b) => a + b, 0) / f : null;
    redes.push({ r, f, s, v: s * cfg.vale, cresc });
  }
  if (!redes.length) return null;
  redes.sort((a, b) => b.v - a.v);
  const base = redes.reduce((a, x, i) => a + x.v * ([1, 0.35, 0.15][i] || 0), 0);
  // Quem está a crescer depressa noutra rede ganha até +0,15 (crescer 15% em 3 meses dá o máximo)
  const cresc = Math.max(0, ...redes.map((x) => (x.cresc === null ? 0 : x.cresc * REDES_INDICE[x.r].vale)));
  const extra = 0.15 * clamp(cresc / 0.15);
  return { s: clamp(base + extra), info: { redes: redes.map(({ r, f, s: sr, cresc: c }) => ({ r, f, s: sr, cresc: c })), extra } };
}

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;

/** Valor de um mês (usa a projeção quando o mês ficou parcial). */
export function valorMes(p, m) {
  const e = p.monthly?.[m];
  if (!e) return null;
  if (e.p && !e.cur && e.est) return e.est;
  if (e.cur) return null;
  return e.v;
}

export function calcularIndice(p, ctx) {
  const { janela, pesos, topo } = ctx;
  const vals = janela.map((m) => valorMes(p, m));
  const conhecidos = vals.filter((v) => v !== null);
  const partes = {};

  // Alcance
  const recentes = [];
  for (let i = vals.length - 1; i >= 0 && recentes.length < 3; i--) if (vals[i] !== null) recentes.push(vals[i]);
  if (recentes.length) {
    const media = mean(recentes);
    partes.alcance = { s: clamp(Math.log10(media + 1) / Math.log10(topo)), info: { media } };
  }

  // Constância
  if (conhecidos.length >= 2) {
    const ativos = conhecidos.filter((v) => v > 0).length / conhecidos.length;
    const m = mean(conhecidos);
    const sd = Math.sqrt(mean(conhecidos.map((v) => (v - m) ** 2)));
    const cv = m > 0 ? sd / m : 2;
    const regular = 1 - clamp(cv / 1.5);
    partes.constancia = { s: 0.6 * ativos + 0.4 * regular, info: { meses: conhecidos.length, ativos, cv } };
  } else if (conhecidos.length === 1) {
    partes.constancia = { s: conhecidos[0] > 0 ? 0.4 : 0, info: { meses: 1 } };
  }

  // Atividade
  if (p.vid) {
    // Com vários canais: os vídeos dos outros canais contam só em parte (ver idx no dataset)
    const up = p.idx?.up90 ?? p.vid.up90 ?? 0;
    const s1 = clamp(Math.log2(1 + up) / Math.log2(1 + 60));
    const dias = p.vid.last ? (Date.now() - Date.parse(p.vid.last)) / 86400000 : 999;
    const s2 = dias <= 7 ? 1 : dias >= 180 ? 0 : 1 - (dias - 7) / 173;
    partes.atividade = { s: 0.7 * s1 + 0.3 * s2, info: { up90: up, dias: Math.round(dias), canais: p.idx?.up90 !== undefined ? p.idx.canais : undefined } };
  } else if (conhecidos.length) {
    const ult = conhecidos.slice(-3);
    partes.atividade = { s: 0.8 * (ult.filter((v) => v > 0).length / 3), info: { aprox: true } };
  }

  // Momento
  if (conhecidos.length >= 4) {
    const ult = conhecidos.slice(-3);
    const ant = conhecidos.slice(-6, -3);
    const r = (mean(ult) + 1) / (mean(ant) + 1);
    partes.momento = { s: clamp(0.5 + Math.log2(r) / 4), info: { r, antes: mean(ant), depois: mean(ult) } };
  }

  // Peso histórico
  const t = p.totals;
  const hs = [];
  // Com vários canais, os subscritores repetidos não contam duas vezes
  const subs = p.idx?.subs ?? t?.subs;
  if (subs) hs.push(clamp(Math.log10(subs + 1) / Math.log10(5e6)));
  if (t?.views) hs.push(clamp(Math.log10(t.views + 1) / Math.log10(2e9)));
  if (hs.length) partes.historico = { s: mean(hs), info: { subs, views: t?.views, canais: p.idx?.canais } };

  // Envolvimento
  if (p.vid && p.vid.eng > 0) partes.envolvimento = { s: clamp(p.vid.eng / 0.06), info: { eng: p.vid.eng } };

  // Outras redes (só se o peso existir: os dados de exclusivos antigos não o têm e ficam iguais)
  if (pesos.redes) {
    const pr = parteRedes(p, janela);
    if (pr) partes.redes = pr;
  }

  if (!partes.alcance) return { total: null, partes };
  const media = (comRedes) => {
    let soma = 0;
    let peso = 0;
    for (const { id } of PARTES) {
      if (!partes[id] || (id === "redes" && !comRedes)) continue;
      soma += (pesos[id] || 0) * partes[id].s;
      peso += pesos[id] || 0;
    }
    return { soma, peso };
  };
  const sem = media(false);
  const totalSem = sem.peso ? Math.round((sem.soma / sem.peso) * 1000) : null;
  let total = totalSem;
  let peso = sem.peso;
  // As outras redes só somam: se a nota delas for mais baixa do que a do YouTube, ficam de fora
  if (partes.redes && totalSem !== null) {
    const com = media(true);
    const totalCom = Math.round((com.soma / com.peso) * 1000);
    partes.redes.ajudou = totalCom > totalSem;
    if (partes.redes.ajudou) {
      total = totalCom;
      peso = com.peso;
    }
  }
  return { total, partes, cobertura: peso / Object.values(pesos).reduce((a, b) => a + b, 0), ...(partes.redes?.ajudou ? { semRedes: totalSem, ganhoRedes: total - totalSem } : {}) };
}

/**
 * Bónus de quem tem vários canais: os números juntam-se como se fosse um canal só (sem vantagem
 * direta) e depois o Índice ganha uma percentagem por cada canal a mais que conta (até 3).
 */
export const MAX_CANAIS_BONUS = 3;
export function comBonusCanais(i, p, pct = 0) {
  // Sem a definição (por exemplo num exclusivo gravado antes do bónus existir) não há bónus
  const extra = Math.min(MAX_CANAIS_BONUS, (p.medida?.canais || 1) - 1);
  if (!i || i.total === null || extra <= 0 || !(pct > 0)) return i;
  const bonus = Math.round(i.total * (pct / 100) * extra);
  return { ...i, total: Math.min(1000, i.total + bonus), semBonus: i.total, bonusCanais: { canais: extra + 1, pct: pct * extra } };
}

/**
 * A fórmula da folha antiga:
 * ROUND( LOG10(média dos meses com views + 10) / LOG10(7 000 000) × 700 × (0,5 + meses com views / 14) )
 * usada nos últimos 8 meses.
 */
export function pontuacaoClassica(p, janela) {
  const ult8 = janela.slice(-8).map((m) => valorMes(p, m)).filter((v) => v !== null && v > 0);
  if (!ult8.length) return null;
  const media = mean(ult8);
  return Math.round((Math.log10(media + 10) / Math.log10(7000000)) * 700 * (0.5 + ult8.length / 14));
}
