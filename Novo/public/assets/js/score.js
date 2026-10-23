// Índice de Influência (0 a 1000) e a Pontuação Clássica da folha antiga.
// Tudo é calculado no browser para que as contas sejam transparentes.

export const PARTES = [
  { id: "alcance", nome: "Alcance atual", explica: "Média de views por mês nos últimos 3 meses com dados, em escala logarítmica." },
  { id: "constancia", nome: "Constância", explica: "Meses com views nos últimos 12 e se as views são regulares ou aos picos." },
  { id: "atividade", nome: "Atividade", explica: "Vídeos publicados nos últimos 90 dias e há quanto tempo saiu o último." },
  { id: "momento", nome: "Momento", explica: "Últimos 3 meses comparados com os 3 anteriores: está a subir ou a cair?" },
  { id: "historico", nome: "Peso histórico", explica: "Subscritores e views totais acumulados ao longo da carreira." },
  { id: "envolvimento", nome: "Envolvimento", explica: "Gostos e comentários por cada view nos vídeos recentes." },
];

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

  if (!partes.alcance) return { total: null, partes };
  let soma = 0;
  let pesoTotal = 0;
  for (const { id } of PARTES) {
    if (partes[id]) {
      soma += (pesos[id] || 0) * partes[id].s;
      pesoTotal += pesos[id] || 0;
    }
  }
  const total = pesoTotal ? Math.round((soma / pesoTotal) * 1000) : null;
  return { total, partes, cobertura: pesoTotal / Object.values(pesos).reduce((a, b) => a + b, 0) };
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
