// O mês em números: cartões rápidos, um número gigante de cada vez, com um pequeno gráfico animado.

import { estado, views, mesAnterior } from "../data.js";
import { esc, curto, inteiro, mesNome } from "../format.js";
import { contar } from "../ui.js";
import { avatarPalco } from "./stage.js";
import { METRICAS, rankingPor } from "./metricas.js";
import { animar } from "./grafico.js";

export async function correr(palco, opts) {
  const ds = estado.ds;
  const m = opts.m || estado.ref;
  const ant = mesAnterior(m);
  const cat = opts.cat || "";
  palco.contexto = { metrica: "views", m, cat };
  const pessoas = ds.people.filter((p) => !cat || p.category === cat);
  const comDados = pessoas.filter((p) => views(p, m) !== null);
  if (comDados.length < 5) throw new Error("Há poucos Youtubers com dados neste mês.");
  const total = comDados.reduce((a, p) => a + views(p, m), 0);
  const vertical = palco.vertical;
  const cena = palco.cena;

  // ---------- Os números ----------
  const cartoes = [];
  // 1. Total de views, com os últimos 6 meses (só canais com dados em todos)
  const ultimos = ds.months.filter((x) => x <= m && x < ds.currentMonth).slice(-6);
  const mesmos = pessoas.filter((p) => ultimos.every((x) => views(p, x) !== null));
  const serie = ultimos.map((x) => ({ m: x, v: mesmos.reduce((a, p) => a + views(p, x), 0) }));
  cartoes.push({ rotulo: `views em ${mesNome(m)}`, v: total, fmt: curto, nota: `${comDados.length} Youtubers${cat ? ` de ${cat}` : ""}`, visual: mesmos.length >= 5 ? { tipo: "barras", serie } : null });
  // 2. Variação face ao mês anterior (mesmos canais)
  if (ant) {
    const ambos = pessoas.filter((p) => views(p, m) !== null && views(p, ant) !== null);
    const a = ambos.reduce((s, p) => s + views(p, ant), 0);
    const b = ambos.reduce((s, p) => s + views(p, m), 0);
    if (a > 0 && ambos.length >= 5) {
      const pct = ((b - a) / a) * 100;
      cartoes.push({ rotulo: `${pct >= 0 ? "mais" : "menos"} views do que em ${mesNome(ant, { ano: false })}`, v: Math.abs(pct), fmt: (x) => `${pct >= 0 ? "+" : "−"}${x.toFixed(1).replace(".", ",")}%`, nota: `Comparando os mesmos ${ambos.length} canais`, visual: { tipo: "seta", sobe: pct >= 0 } });
    }
  }
  // 3. Canais com mais de 1 milhão
  const milionarios = comDados.filter((p) => views(p, m) >= 1e6).sort((a, b) => views(b, m) - views(a, m));
  if (milionarios.length) cartoes.push({ rotulo: milionarios.length === 1 ? "Youtuber passou o milhão de views" : "Youtubers passaram o milhão de views", v: milionarios.length, fmt: inteiro, nota: "Num só mês", visual: { tipo: "caras", lista: milionarios.slice(0, vertical ? 12 : 14) } });
  // 4. Categoria do mês
  if (!cat) {
    const grupos = new Map();
    for (const p of comDados) grupos.set(p.category || "Outra", (grupos.get(p.category || "Outra") || 0) + views(p, m));
    const lista = [...grupos.entries()].sort((a, b) => b[1] - a[1]);
    if (lista.length >= 3) cartoes.push({ rotulo: `das views foram de ${lista[0][0]}`, v: (lista[0][1] / total) * 100, fmt: (x) => `${Math.round(x)}%`, nota: "A categoria do mês", visual: { tipo: "faixa", lista: lista.slice(0, 5).map(([c, v]) => ({ c, f: v / total })) } });
  }
  // 5. Maior crescimento
  const cresc = rankingPor("crescimento", m, { cat, n: 1 })[0];
  if (cresc && cresc.v > 0) cartoes.push({ rotulo: `de crescimento para ${cresc.p.name}`, v: cresc.v, fmt: (x) => `+${Math.round(x)}%`, nota: `A maior subida face a ${mesNome(ant, { ano: false })}`, visual: { tipo: "pessoa", p: cresc.p, texto: `${curto(views(cresc.p, ant))} → ${curto(views(cresc.p, m))} views` } });
  // 6. Mais subscritores ganhos
  const subs = rankingPor("subsMes", m, { cat, n: 1 })[0];
  if (subs && subs.v > 0) cartoes.push({ rotulo: `subscritores novos para ${subs.p.name}`, v: subs.v, fmt: (x) => `+${curto(x)}`, nota: "Quem mais ganhou subscritores", visual: { tipo: "pessoa", p: subs.p, texto: METRICAS.subs.valor(subs.p) ? `${curto(METRICAS.subs.valor(subs.p))} no total` : "" } });
  // 6b. TikTok
  const tt = rankingPor("tiktokMes", m, { cat, n: 1 })[0];
  if (tt && tt.v > 0) cartoes.push({ rotulo: `seguidores novos no TikTok para ${tt.p.name}`, v: tt.v, fmt: (x) => `+${curto(x)}`, nota: "O que mais cresceu no TikTok", visual: { tipo: "pessoa", p: tt.p, texto: tt.p.socials?.tiktok?.last?.followers ? `${curto(tt.p.socials.tiktok.last.followers)} seguidores no TikTok` : "" } });
  // 7. O n.º 1
  const top = rankingPor("views", m, { cat, n: 1 })[0];
  cartoes.push({ rotulo: `views: ${top.p.name} é o n.º 1`, v: top.v, fmt: curto, nota: `O mais visto de ${mesNome(m)}`, visual: { tipo: "pessoa", p: top.p, grande: true }, final: true });

  palco.musica("leve", 1);
  await palco.abertura({ etiqueta: "Em números", titulo: `${mesNome(m, { ano: false })}\nem números`, sub: `${cartoes.length} números${cat ? ` de ${cat}` : ""} sobre os Youtubers portugueses` });
  palco.musica("epico", 1);

  cena.innerHTML = `<div class="nm-pontos">${cartoes.map(() => "<i></i>").join("")}</div><div class="nm-palco"></div>`;
  const pontos = [...cena.querySelectorAll(".nm-pontos i")];
  const alvo = cena.querySelector(".nm-palco");
  for (const [i, c] of cartoes.entries()) {
    pontos.forEach((p, k) => p.classList.toggle("feito", k <= i));
    alvo.innerHTML = `<div class="nm-cartao ${c.final ? "final" : ""}">
      <small class="nm-nota">${esc(c.nota)}</small>
      <b class="nm-num">0</b>
      <span class="nm-rotulo">${esc(c.rotulo)}</span>
      <div class="nm-visual">${visual(c.visual, vertical)}</div></div>`;
    const cartao = alvo.firstElementChild;
    cartao.animate([{ opacity: 0, transform: "scale(.7) translateY(80px)" }, { opacity: 1, transform: "none" }], { duration: 650, easing: "cubic-bezier(.2,1.3,.4,1)" });
    contar(cartao.querySelector(".nm-num"), c.v, { formato: c.fmt, duracao: 1300 });
    palco.tocar(c.final ? "rufo" : "whoosh");
    await animarVisual(palco, cartao, c.visual);
    if (c.final) {
      await palco.esperar(900, { exato: true });
      const tratou = palco.evento("vencedor", { alvo: cartao.querySelector(".nm-pessoa .palco-avatar"), p: c.visual.p });
      if (!tratou) palco.tocar("_destaque");
      palco.festa({ forca: 0.8, som: !tratou });
    } else if (c.visual?.tipo === "pessoa" && palco.evento("subida", { alvo: cartao.querySelector(".nm-pessoa .palco-avatar"), p: c.visual.p })) {
      palco.explodir(palco.L / 2, vertical ? 760 : 380, { n: 40, forca: 0.5 });
    } else if (c.visual?.tipo === "seta" && palco.evento(c.visual.sobe ? "subida" : "queda", { alvo: cartao.querySelector(".nm-seta") })) {
      palco.explodir(palco.L / 2, vertical ? 760 : 380, { n: 40, forca: 0.5 });
    } else {
      palco.tocar(i % 2 ? "ponto" : "revelar");
      palco.explodir(palco.L / 2, vertical ? 760 : 380, { n: 40, forca: 0.5 });
    }
    await palco.passo(c.final ? 4200 : 2800);
    if (i === Math.floor(cartoes.length / 2) - 1) await palco.meio();
    if (!c.final) {
      cartao.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateX(-140px) scale(.9)" }], { duration: 320, easing: "ease-in", fill: "forwards" });
      await palco.esperar(300, { exato: true });
    }
  }
  await palco.fecho();
}

function visual(v, vertical) {
  if (!v) return "";
  if (v.tipo === "barras") {
    const max = Math.max(...v.serie.map((x) => x.v)) || 1;
    return `<div class="nm-barras">${v.serie.map((x, i) => `<div class="${i === v.serie.length - 1 ? "ultimo" : ""}"><i data-h="${(x.v / max) * 100}"></i><small>${esc(mesNome(x.m, { curto: true, ano: false }))}</small></div>`).join("")}</div>`;
  }
  if (v.tipo === "seta") return `<svg class="nm-seta ${v.sobe ? "sobe" : "desce"}" viewBox="0 0 400 160"><path pathLength="1" d="${v.sobe ? "M10 140 L120 90 L190 115 L380 20" : "M10 20 L120 70 L190 45 L380 140"}"/><path class="cabeca" pathLength="1" d="${v.sobe ? "M340 18 L382 18 L382 60" : "M340 142 L382 142 L382 100"}"/></svg>`;
  if (v.tipo === "caras") return `<div class="nm-caras">${v.lista.map((p) => avatarPalco(p, vertical ? 96 : 84)).join("")}</div>`;
  if (v.tipo === "faixa") return `<div class="nm-faixa">${v.lista.map((x, i) => `<div style="--f:${x.f};--i:${i}"><span>${esc(x.c)}</span></div>`).join("")}</div>`;
  if (v.tipo === "pessoa") return `<div class="nm-pessoa ${v.grande ? "grande" : ""}">${avatarPalco(v.p, v.grande ? (vertical ? 280 : 220) : vertical ? 150 : 120)}${v.texto ? `<span>${esc(v.texto)}</span>` : ""}</div>`;
  return "";
}

async function animarVisual(palco, cartao, v) {
  if (!v) return;
  if (v.tipo === "barras") {
    const barras = [...cartao.querySelectorAll(".nm-barras i")];
    for (const [k, b] of barras.entries()) {
      palco.tocar("tique", {}, k * 0.09);
      b.animate([{ height: "0%" }, { height: b.dataset.h + "%" }], { duration: 600, delay: k * 90 * palco.fator, easing: "cubic-bezier(.2,1.3,.4,1)", fill: "both" });
    }
  } else if (v.tipo === "seta") {
    const ps = cartao.querySelectorAll(".nm-seta path");
    await animar(palco, 700, (_, e) => ps.forEach((p) => (p.style.strokeDashoffset = String(1 - e))));
    palco.tocar(v.sobe ? "subida" : "falha");
  } else if (v.tipo === "caras") {
    cartao.querySelectorAll(".nm-caras .avatar").forEach((a, k) => a.animate([{ transform: "scale(0)" }, { transform: "scale(1)" }], { duration: 450, delay: k * 70 * palco.fator, easing: "cubic-bezier(.2,1.6,.4,1)", fill: "backwards" }));
    for (let k = 0; k < Math.min(8, cartao.querySelectorAll(".nm-caras .avatar").length); k++) palco.tocar("ponto", {}, k * 0.07);
  } else if (v.tipo === "faixa") {
    cartao.querySelectorAll(".nm-faixa div").forEach((d, k) => d.animate([{ flexGrow: 0 }, { flexGrow: Number(getComputedStyle(d).getPropertyValue("--f")) * 100 }], { duration: 900, delay: k * 120 * palco.fator, easing: "cubic-bezier(.2,.9,.3,1)", fill: "both" }));
  } else if (v.tipo === "pessoa") {
    const a = cartao.querySelector(".nm-pessoa .avatar");
    a?.animate([{ transform: "scale(.3) rotate(-20deg)" }, { transform: "none" }], { duration: 800, easing: "cubic-bezier(.2,1.4,.4,1)" });
  }
}
