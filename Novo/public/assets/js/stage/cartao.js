// Cartão de Youtuber: um perfil em destaque, número a número.

import { estado, pessoa, indice, views, mediaMeses, recordes, rankingMes, seguidoresRede, seguidoresTotal, ganhosRede } from "../data.js";
import { esc, curto, inteiro, mesNome } from "../format.js";
import { contar, ICONES } from "../ui.js";
import { avatarPalco } from "./stage.js";
import { bocaPara } from "./bocas.js";

export async function correr(palco, opts) {
  const p = pessoa(opts.id) || pessoa(palco.foco) || pessoa([...estado.posIndice.entries()].find(([, pos]) => pos === 1)?.[0]);
  if (!p) throw new Error("Escolhe um Youtuber.");
  const ref = estado.ref;
  const vertical = palco.formato === "9x16";
  const ind = indice(p.id);
  const pos = estado.posIndice.get(p.id);
  const rec = recordes(p);
  const posMes = rankingMes(ref).find((x) => x.p.id === p.id)?.pos;
  const janela = estado.janela;
  const serie = janela.map((m) => views(p, m) || 0);
  const max = Math.max(...serie, 1);
  const numeros = [
    { nome: `Views em ${mesNome(ref)}`, v: views(p, ref), extra: posMes ? `${posMes}.º lugar` : "" },
    { nome: "Média de 3 meses", v: mediaMeses(p, ref, 3) },
    { nome: "Subscritores", v: p.totals?.subs },
    { nome: "Views totais", v: p.totals?.views },
    { nome: "Melhor mês", v: rec.melhor?.v, extra: rec.melhor ? mesNome(rec.melhor.m) : "" },
    { nome: "Meses no top 10", v: rec.top10, fmt: inteiro },
    { nome: "Subscritores ganhos num ano", v: p.sb?.s ? Object.values(p.sb.s).slice(-12).reduce((x, y) => x + y, 0) || null : null },
    { nome: "Vídeos publicados num ano", v: p.sb?.n ? Object.values(p.sb.n).slice(-12).reduce((x, y) => x + y, 0) || null : null, fmt: inteiro },
  ].filter((n) => n.v !== null && n.v !== undefined);

  const cena = palco.cena;
  palco.musica("leve", 1);
  cena.innerHTML = `<div class="ct-grelha">
    <div class="p-slam">${avatarPalco(p, vertical ? 360 : 420)}</div>
    <div>
      <div class="ct-nome p-entra" style="animation-delay:.3s">${esc(p.name)}</div>
      <div class="ct-cat p-entra" style="animation-delay:.45s">${esc([p.category, p.location].filter(Boolean).join(", "))}</div>
      ${ind.total !== null ? `<div class="ct-indice p-entra" style="animation-delay:.6s"><b id="ct-ind">0</b><span>Índice de Influência${pos ? `<br>${pos}.º em Portugal` : ""}</span></div>` : ""}
      <div class="ct-numeros"></div>
      <div class="ct-barras"></div>
    </div></div>`;
  palco.tocar("whoosh");
  palco.tocar("impacto", {}, 0.2);
  palco.tocar("_abertura", {}, 0.3);
  palco.flash(0.5);
  palco.explodir(vertical ? palco.L / 2 : palco.L * 0.27, vertical ? palco.A * 0.22 : palco.A * 0.45, { n: 70, forca: 0.7 });
  setTimeout(() => !palco.terminado && palco.evento("revelar", { alvo: cena.querySelector(".palco-avatar"), p, pos: pos || 99 }), 700);
  const indEl = cena.querySelector("#ct-ind");
  if (indEl) {
    contar(indEl, ind.total, { formato: inteiro, duracao: 1600, atraso: 600 });
    palco.tocar("brilho", {}, 2.2);
  }
  await palco.esperar(2600);
  const grelha = cena.querySelector(".ct-numeros");
  for (const n of numeros) {
    const d = document.createElement("div");
    d.className = "ct-num p-entra";
    d.innerHTML = `<span>${esc(n.nome)}</span><b>0</b>${n.extra ? `<span style="font-size:24px">${esc(n.extra)}</span>` : ""}`;
    grelha.appendChild(d);
    contar(d.querySelector("b"), n.v, { formato: n.fmt || curto, duracao: 900 });
    palco.tocar("virar");
    await palco.passo(1100);
  }
  // Uma boca sobre os números dele (vídeos, antiguidade, crescimento…)
  const b1 = bocaPara("revelar", p, { historico: palco.historico });
  if (b1) {
    palco.boca(b1);
    await palco.passo(2500);
  }
  const barras = cena.querySelector(".ct-barras");
  const iMax = serie.indexOf(Math.max(...serie));
  barras.innerHTML = serie.map((v, i) => `<i class="${i === iMax && v ? "melhor" : ""}" style="height:${Math.max(3, (v / max) * 100)}%;animation-delay:${i * 60}ms" title="${esc(mesNome(janela[i]))}"></i>`).join("");
  palco.tocar("subida", { dur: 0.9 });
  await palco.passo(4500);
  if (pos && pos <= 10) {
    palco.festa({ forca: 0.7, som: !palco.evento("vencedor", { alvo: cena.querySelector(".palco-avatar"), p }) });
    await palco.passo(3500);
  }
  // As outras redes, com curiosidades (só em dados novos: os exclusivos antigos ficam iguais)
  if (estado.ds.settings?.weights?.redes !== undefined) await cenaRedes(palco, p, vertical);
  const L = (p, valor = "", pos) => ({ id: p.id, nome: p.name, valor: String(valor), pos });
  palco.resumir({ tipo: "historia", vencedor: L(p, ind.total ?? ""), nota: pos ? `${pos}.º no Índice de Influência` : "" });
  await palco.fecho();
}

// ---------- As outras redes ----------
const REDES_CT = [
  { id: "instagram", nome: "Instagram", no: "no Instagram", cor: "#e1306c" },
  { id: "tiktok", nome: "TikTok", no: "no TikTok", cor: "#25f4ee" },
  { id: "twitch", nome: "Twitch", no: "na Twitch", cor: "#9146ff" },
];
const subs = (x) => x.totals?.subs ?? null;
const temNum = (v) => Number.isFinite(v) && v >= 1000;

/** "tem ___ subscritores": o dobro dos, o triplo dos, 5 vezes mais. */
function vezesMais(k) {
  if (k < 1.95) return "quase o dobro dos";
  if (k < 2.6) return "o dobro dos";
  if (k < 3.6) return "o triplo dos";
  return `${Math.round(k)} vezes mais`;
}
/** "mas ___ seguidores": o dobro dos, metade dos, um terço dos, 5 vezes menos. */
function proporcao(k) {
  if (k >= 2) return vezesMais(k);
  if (k > 0.4) return "metade dos";
  if (k > 0.28) return "um terço dos";
  return `${Math.round(1 / k)} vezes menos`;
}

/**
 * Curiosidades das redes de p comparadas com as dos outros: quem está muito acima no YouTube mas
 * perde numa rede, quem tem os mesmos subscritores mas mundos à parte nas redes, o lugar no top
 * de cada rede, mais seguidores do que subscritores e o que ganhou num mês.
 */
export function curiosidadesRedes(p, pessoas, ref) {
  const out = [];
  const ytP = subs(p);
  const outros = pessoas.filter((q) => q.id !== p.id && q.id !== p.dono && q.dono !== p.id);
  for (const r of REDES_CT) {
    const fp = seguidoresRede(p, r.id);
    if (!temNum(fp)) continue;
    const fq = (q) => seguidoresRede(q, r.id);
    // 1. Muito acima no YouTube, mas abaixo nesta rede
    if (ytP) {
      const q = outros.filter((x) => subs(x) >= ytP * 1.8 && temNum(fq(x)) && fq(x) < fp).sort((a, b) => subs(b) - subs(a))[0];
      if (q) out.push({ tipo: "acima", rede: r, peso: 3 + Math.min(4, Math.log2(subs(q) / ytP)), texto: `No YouTube, <b>${esc(q.name)}</b> tem ${vezesMais(subs(q) / ytP)} subscritores de ${esc(p.name)}… mas ${r.no}, quem ganha é <b>${esc(p.name)}</b>.`, duelo: { a: q, b: p, r } });
    }
    // 2. Quase os mesmos subscritores, mundos à parte nesta rede
    if (ytP) {
      const c = outros
        .filter((x) => subs(x) && Math.abs(subs(x) - ytP) / ytP <= 0.2 && temNum(fq(x)))
        .map((x) => ({ q: x, k: fp / fq(x) }))
        .filter((x) => x.k >= 2 || x.k <= 0.5)
        .sort((a, b) => Math.abs(Math.log(b.k)) - Math.abs(Math.log(a.k)))[0];
      if (c) out.push({ tipo: "gemeos", rede: r, peso: 2 + Math.min(3, Math.abs(Math.log2(c.k))), texto: `Quase os mesmos subscritores que <b>${esc(c.q.name)}</b> no YouTube… mas ${proporcao(c.k)} seguidores ${r.no}.`, duelo: { a: c.q, b: p, r } });
    }
    // 3. Mais seguidores nesta rede do que subscritores no YouTube
    if (ytP && fp > ytP * 1.2) out.push({ tipo: "maisQueYT", rede: r, peso: 2 + Math.min(3, Math.log2(fp / ytP)), texto: `Tem mais seguidores ${r.no} (<b>${curto(fp)}</b>) do que subscritores no YouTube (<b>${curto(ytP)}</b>).` });
    // 4. Lugar no top desta rede (melhor do que no YouTube)
    const posR = 1 + outros.filter((x) => (fq(x) ?? -1) > fp).length;
    const posYT = ytP ? 1 + outros.filter((x) => (subs(x) ?? -1) > ytP).length : null;
    if (posR <= 10 && (!posYT || posR < posYT)) out.push({ tipo: "top", rede: r, peso: 4 - posR / 5 + (posYT ? Math.min(2, (posYT - posR) / 10) : 0), texto: `É o <b>${posR}.º</b> com mais seguidores ${r.no} de todo o Placar${posYT ? `, e no YouTube é o ${posYT}.º` : ""}.` });
    // 5. O que ganhou num mês, comparado com o total de alguém
    const meses = estado.ds.months.filter((m) => m <= ref).reverse();
    const m = meses.find((x) => Number.isFinite(ganhosRede(p, r.id, x)));
    const g = m ? ganhosRede(p, r.id, m) : null;
    if (g > 1000) {
      const q = outros.filter((x) => temNum(fq(x)) && fq(x) < g).sort((a, b) => fq(b) - fq(a))[0];
      out.push({ tipo: "mes", rede: r, peso: q ? 3 : 1.5, texto: `Só em ${mesNome(m)} ganhou <b>+${curto(g)}</b> seguidores ${r.no}${q ? `: mais do que <b>${esc(q.name)}</b> tem no total` : ""}.` });
    }
  }
  // As 3 mais curiosas, de tipos diferentes e no máximo 2 da mesma rede
  const escolhidas = [];
  for (const c of out.sort((a, b) => b.peso - a.peso)) {
    if (escolhidas.length >= 3) break;
    if (escolhidas.some((x) => x.tipo === c.tipo) || escolhidas.filter((x) => x.rede.id === c.rede.id).length >= 2) continue;
    escolhidas.push(c);
  }
  return escolhidas;
}

function dueloHtml({ a, b, r }, vertical) {
  const linha = (rotulo, icone, cor, va, vb) => {
    const max = Math.max(va, vb, 1);
    const barra = (x, v, ganha) => `<div class="rsc-barra${ganha ? " ganha" : ""}"><span class="rsc-quem">${avatarPalco(x, vertical ? 64 : 56)}</span><i style="--w:${Math.max(4, (v / max) * 100)}%;--cor:${cor}"></i><b>${curto(v)}</b></div>`;
    return `<div class="rsc-linha"><div class="rsc-rotulo"><span style="color:${cor}">${icone}</span>${rotulo}</div>${barra(a, va, va > vb)}${barra(b, vb, vb > va)}</div>`;
  };
  return `<div class="rsc-duelo">${linha("YouTube", ICONES.youtube, "#ff3355", subs(a), subs(b))}${linha(r.nome, ICONES[r.id] || "", r.cor, seguidoresRede(a, r.id), seguidoresRede(b, r.id))}</div>`;
}

async function cenaRedes(palco, p, vertical) {
  const redes = REDES_CT.map((r) => ({ ...r, v: seguidoresRede(p, r.id) })).filter((r) => temNum(r.v));
  if (!redes.length || palco.terminado) return;
  const curios = curiosidadesRedes(p, estado.ds.people, estado.ref);
  const total = seguidoresTotal(p);
  const cena = palco.cena;
  cena.innerHTML = `<div class="rsc">
    <div class="rsc-topo p-entra">${avatarPalco(p, vertical ? 150 : 120)}<div><small>E nas outras redes?</small><b>${esc(p.name)}</b></div></div>
    <div class="rsc-redes">
      ${subs(p) ? `<div class="rsc-rede p-entra" style="--cor:#ff3355;animation-delay:.2s"><i>${ICONES.youtube}</i><span>YouTube</span><b data-v="${subs(p)}">0</b><small>subscritores</small></div>` : ""}
      ${redes.map((r, i) => `<div class="rsc-rede p-entra" style="--cor:${r.cor};animation-delay:${0.45 + i * 0.25}s"><i>${ICONES[r.id] || ""}</i><span>${r.nome}</span><b data-v="${r.v}">0</b><small>seguidores</small></div>`).join("")}
    </div>
    ${total ? `<div class="rsc-total p-entra" style="animation-delay:1.3s">Somando tudo: <b data-v="${total}">0</b> seguidores</div>` : ""}
    <div class="rsc-curiosidade" id="rsc-cur"></div>
  </div>`;
  palco.tocar("whoosh");
  cena.querySelectorAll("[data-v]").forEach((b, i) => {
    contar(b, Number(b.dataset.v), { formato: curto, duracao: 1100, atraso: 300 + i * 250 });
    palco.tocar("virar", {}, 0.3 + i * 0.25);
  });
  await palco.passo(2600 + redes.length * 300);
  const alvo = cena.querySelector("#rsc-cur");
  for (const c of curios) {
    if (palco.terminado) return;
    alvo.innerHTML = `<div class="rsc-card p-entra" style="--cor:${c.rede.cor}"><span class="rsc-sabias">${ICONES[c.rede.id] || ""} Sabias que…?</span><p>${c.texto}</p>${c.duelo ? dueloHtml(c.duelo, vertical) : ""}</div>`;
    palco.tocar("ding");
    if (c.duelo) {
      // Primeiro o YouTube, depois a reviravolta na outra rede
      const [l1, l2] = alvo.querySelectorAll(".rsc-linha");
      setTimeout(() => l1?.classList.add("cresce"), 500);
      setTimeout(() => {
        if (palco.terminado) return;
        l2?.classList.add("cresce");
        palco.tocar("ooh");
      }, 1900);
    }
    await palco.passo(c.duelo ? 6000 : 4500);
  }
  if (!curios.length) await palco.passo(1500);
  const b2 = bocaPara("cartao", p, { historico: palco.historico });
  if (b2) {
    palco.boca(b2);
    await palco.passo(4200);
  }
}
