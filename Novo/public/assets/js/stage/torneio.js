// Torneio: 8 ou 16 Youtubers em eliminatórias, com o quadro e duelos até à final.

import { esc } from "../format.js";
import { contar } from "../ui.js";
import { avatarPalco, baralhar, letras } from "./stage.js";
import { METRICAS, melhores } from "./metricas.js";
import { animate, stagger, spring } from "../../vendor/anime.esm.min.js";

const CRITERIOS = ["views", "indice", "subs", "total", "media3", "subsMes", "videos30", "crescimento"];
const NOMES_RONDA = { 16: "Oitavos de final", 8: "Quartos de final", 4: "Meias-finais", 2: "Final" };

/** Ordem clássica dos cabeças de série: 1 contra o último, etc. */
function semear(n) {
  let ordem = [1, 2];
  while (ordem.length < n) {
    const m = ordem.length * 2 + 1;
    ordem = ordem.flatMap((s) => [s, m - s]);
  }
  return ordem.map((s) => s - 1);
}

export async function correr(palco, opts) {
  const n = Number(opts.n) === 16 ? 16 : 8;
  const m = opts.m;
  let lista = opts.quem === "acaso" ? baralhar(melhores(60, { cat: opts.cat })).slice(0, n) : melhores(n, { cat: opts.cat });
  if (lista.length < n) throw new Error(`São precisos ${n} Youtubers com Índice${opts.cat ? " nesta categoria" : ""}.`);
  if (opts.quem !== "acaso") lista = semear(n).map((i) => lista[i]);
  const vertical = palco.vertical;
  const cena = palco.cena;
  const R = Math.log2(n);

  // ---------- Geometria do quadro ----------
  const G = (() => {
    if (!vertical) {
      const slotW = n === 16 ? 205 : 270;
      const colW = n === 16 ? 218 : 300;
      const slotH = n === 16 ? 80 : 104;
      const topo = 210;
      const fundo = 1010;
      return {
        slotW,
        slotH,
        pos(lado, r, i) {
          const c = n / 2 ** (r + 1);
          const y = topo + ((i + 0.5) * (fundo - topo)) / c - slotH / 2;
          const x = lado === 0 ? 34 + r * colW : palco.L - 34 - slotW - r * colW;
          return { x, y };
        },
      };
    }
    const slotW = n === 16 ? 124 : 230;
    const slotH = n === 16 ? 158 : 150;
    const rowH = n === 16 ? 176 : 205;
    return {
      slotW,
      slotH,
      pos(lado, r, i) {
        const c = n / 2 ** (r + 1);
        const x = ((i + 0.5) * palco.L) / c - slotW / 2;
        const y = lado === 0 ? 200 + r * rowH : palco.A - 200 - slotH - r * rowH;
        return { x, y };
      },
    };
  })();

  // rondas[r][k] = [a, b] (k = índice do jogo nessa ronda); o lado é k < metade ? 0 : 1
  const jogos = [];
  const slotEl = new Map(); // chave "r-j" (j = posição do Youtuber na ronda)
  const chave = (r, j) => `${r}-${j}`;
  const posSlot = (r, j) => {
    const total = n / 2 ** r;
    const lado = j < total / 2 ? 0 : 1;
    return G.pos(lado, r, lado === 0 ? j : j - total / 2);
  };

  // ---------- Abertura ----------
  palco.musica("tensao", 1);
  await palco.abertura({ etiqueta: `${n} Youtubers`, titulo: "O grande\ntorneio", sub: "Eliminatórias até à final. Só um fica com a taça." });

  palco.tela.classList.add("denso");
  // ---------- Quadro ----------
  cena.innerHTML = `<div class="tn-quadro">
    <div class="tn-topo"><div class="tn-ronda"></div><div class="tn-criterio"></div></div>
    <svg class="tn-linhas" viewBox="0 0 ${palco.L} ${palco.A}" width="${palco.L}" height="${palco.A}"></svg>
    <div class="tn-slots"></div>
    <div class="tn-taca">${taca()}</div>
  </div><div class="tn-duelo" hidden></div>`;
  const quadro = cena.querySelector(".tn-quadro");
  const slots = cena.querySelector(".tn-slots");
  const svg = cena.querySelector(".tn-linhas");
  const rondaEl = cena.querySelector(".tn-ronda");
  const critEl = cena.querySelector(".tn-criterio");
  const duelo = cena.querySelector(".tn-duelo");
  const taEl = cena.querySelector(".tn-taca");
  {
    const meio = vertical ? { x: palco.L / 2, y: palco.A / 2 } : { x: palco.L / 2, y: 330 };
    taEl.style.left = meio.x + "px";
    taEl.style.top = meio.y + "px";
  }

  // Ligações entre rondas
  const linhas = new Map();
  for (let r = 0; r < R - 1; r++) {
    const total = n / 2 ** r;
    for (let j = 0; j < total; j++) {
      const a = posSlot(r, j);
      const b = posSlot(r + 1, Math.floor(j / 2));
      const lado = j < total / 2 ? 0 : 1;
      let d;
      if (!vertical) {
        const x1 = lado === 0 ? a.x + G.slotW : a.x;
        const x2 = lado === 0 ? b.x : b.x + G.slotW;
        const y1 = a.y + G.slotH / 2;
        const y2 = b.y + G.slotH / 2;
        const xm = (x1 + x2) / 2;
        d = `M${x1} ${y1}H${xm}V${y2}H${x2}`;
      } else {
        const y1 = lado === 0 ? a.y + G.slotH : a.y;
        const y2 = lado === 0 ? b.y : b.y + G.slotH;
        const x1 = a.x + G.slotW / 2;
        const x2 = b.x + G.slotW / 2;
        const ym = (y1 + y2) / 2;
        d = `M${x1} ${y1}V${ym}H${x2}V${y2}`;
      }
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", d);
      svg.appendChild(path);
      linhas.set(chave(r, j), path);
    }
  }
  // Ligação das duas finais à taça
  const criarSlot = (r, j, p) => {
    const { x, y } = posSlot(r, j);
    const el = document.createElement("div");
    el.className = `tn-slot ${p ? "" : "vazio"}`;
    Object.assign(el.style, { left: x + "px", top: y + "px", width: G.slotW + "px", height: G.slotH + "px" });
    el.innerHTML = p ? conteudoSlot(p) : `<span class="tn-q">?</span>`;
    slots.appendChild(el);
    slotEl.set(chave(r, j), el);
    return el;
  };
  const conteudoSlot = (p) => `${avatarPalco(p, vertical ? (n === 16 ? 74 : 80) : n === 16 ? 54 : 70).replace("palco-avatar", "")}<span class="tn-info"><span class="tn-nome">${esc(p.name)}</span><b class="tn-v"></b></span>`;
  for (let r = 0; r < R; r++) for (let j = 0; j < n / 2 ** r; j++) criarSlot(r, j, r === 0 ? lista[j] : null);
  rondaEl.textContent = NOMES_RONDA[n];
  palco.tocar("whoosh");
  animate(slots.querySelectorAll(".tn-slot:not(.vazio)"), { opacity: [0, 1], scale: [0.6, 1], delay: stagger(60), duration: 700, ease: spring({ stiffness: 160, damping: 13 }) });
  animate(svg.querySelectorAll("path"), { opacity: [0, 1], delay: 600, duration: 800 });
  await palco.passo(2600);

  // ---------- Decidir um duelo ----------
  let ultimoCriterio = null;
  const escolherCriterio = (a, b) => {
    const disponiveis = (opts.criterio && opts.criterio !== "misto" ? [opts.criterio] : CRITERIOS).filter((k) => {
      const va = METRICAS[k].valor(a, m);
      const vb = METRICAS[k].valor(b, m);
      return va !== null && vb !== null && va !== undefined && vb !== undefined && va !== vb;
    });
    const sem = disponiveis.filter((k) => k !== ultimoCriterio);
    const k = (sem.length ? sem : disponiveis)[Math.floor(Math.random() * (sem.length || disponiveis.length))] || "indice";
    ultimoCriterio = k;
    return k;
  };
  const decidir = (a, b, k) => {
    const va = METRICAS[k].valor(a, m);
    const vb = METRICAS[k].valor(b, m);
    if (va === null || vb === null || va === vb) {
      const ia = METRICAS.indice.valor(a, m) ?? 0;
      const ib = METRICAS.indice.valor(b, m) ?? 0;
      return { va, vb, vence: ia >= ib ? 0 : 1 };
    }
    return { va, vb, vence: va > vb ? 0 : 1 };
  };

  // Mover o vencedor para a ronda seguinte (avatar a voar)
  const avancar = async (r, j, p) => {
    const destino = slotEl.get(chave(r + 1, Math.floor(j / 2)));
    const origem = slotEl.get(chave(r, j));
    const linha = linhas.get(chave(r, j));
    linha?.classList.add("aceso");
    if (destino) {
      const voo = document.createElement("div");
      voo.className = "tn-voo";
      voo.innerHTML = avatarPalco(p, vertical ? 80 : 64).replace("palco-avatar", "");
      slots.appendChild(voo);
      const o = { x: parseFloat(origem.style.left) + 8, y: parseFloat(origem.style.top) + 8 };
      const d = { x: parseFloat(destino.style.left) + 8, y: parseFloat(destino.style.top) + 8 };
      Object.assign(voo.style, { left: o.x + "px", top: o.y + "px" });
      palco.tocar("whoosh", { dur: 0.4 });
      await voo.animate([{ transform: "translate(0,0) scale(1)" }, { transform: `translate(${(d.x - o.x) / 2}px, ${(d.y - o.y) / 2 - 60}px) scale(1.4)` }, { transform: `translate(${d.x - o.x}px, ${d.y - o.y}px) scale(1)` }], { duration: 650, easing: "cubic-bezier(.4,0,.2,1)" }).finished.catch(() => {});
      voo.remove();
      destino.classList.remove("vazio");
      destino.innerHTML = conteudoSlot(p);
      destino.animate([{ transform: "scale(1.25)" }, { transform: "scale(1)" }], { duration: 400, easing: "cubic-bezier(.2,1.4,.4,1)" });
      palco.tocar("ponto");
    }
  };

  // Duelo no quadro (rondas com muitos jogos)
  const dueloNoQuadro = async (r, k, a, b) => {
    const ja = k * 2;
    const jb = k * 2 + 1;
    const ea = slotEl.get(chave(r, ja));
    const eb = slotEl.get(chave(r, jb));
    const crit = escolherCriterio(a, b);
    const res = decidir(a, b, crit);
    critEl.textContent = METRICAS[crit].nome(m);
    ea.classList.add("joga");
    eb.classList.add("joga");
    palco.tocar("virar");
    if (res.va !== null) contar(ea.querySelector(".tn-v"), res.va, { formato: METRICAS[crit].fmt, duracao: 600 });
    if (res.vb !== null) contar(eb.querySelector(".tn-v"), res.vb, { formato: METRICAS[crit].fmt, duracao: 600 });
    await palco.esperar(900);
    const [ganha, perde] = res.vence === 0 ? [ea, eb] : [eb, ea];
    ganha.classList.add("ganha");
    perde.classList.add("fora");
    ea.classList.remove("joga");
    eb.classList.remove("joga");
    await avancar(r, res.vence === 0 ? ja : jb, res.vence === 0 ? a : b);
    return res.vence === 0 ? a : b;
  };

  // Duelo em ecrã inteiro (meias-finais e final)
  const dueloGrande = async (r, k, a, b, final) => {
    quadro.classList.add("escondido");
    duelo.hidden = false;
    const crit = escolherCriterio(a, b);
    const res = decidir(a, b, crit);
    const lado = (p, i) => `<div class="tn-lado l${i}">${avatarPalco(p, vertical ? 300 : 340)}<div class="p-titulo">${esc(p.name)}</div><div class="tn-grande-v"></div></div>`;
    duelo.innerHTML = `<div class="tn-titulo-duelo">${final ? "A grande final" : `${NOMES_RONDA[4]}, jogo ${k + 1}`}</div>
      <div class="tn-frente">${lado(a, 0)}<div class="tn-vs">VS</div>${lado(b, 1)}</div>
      <div class="tn-roleta"><span></span></div>`;
    palco.tocar("whoosh");
    if (final) {
      palco.musica("epico", 2);
      palco.tocar("_abertura");
      palco.flash(0.6);
    }
    animate(duelo.querySelectorAll(".tn-lado"), { translateX: (el, i) => [i ? 600 : -600, 0], opacity: [0, 1], duration: 900, ease: spring({ stiffness: 120, damping: 14 }) });
    animate(duelo.querySelector(".tn-vs"), { scale: [3, 1], opacity: [0, 1], delay: 400, duration: 700, ease: "outBack" });
    await palco.esperar(1400);
    // Roleta do critério
    const rol = duelo.querySelector(".tn-roleta span");
    const giro = opts.criterio === "misto" || !opts.criterio ? baralhar(CRITERIOS).slice(0, 7) : [];
    for (const [i, c] of giro.entries()) {
      rol.textContent = METRICAS[c].curtoNome;
      palco.tocar("tique");
      await palco.esperar(90 + i * 35, { exato: true });
    }
    rol.textContent = METRICAS[crit].nome(m);
    rol.parentElement.classList.add("parou");
    palco.tocar("impacto");
    await palco.esperar(1100);
    const [va, vb] = duelo.querySelectorAll(".tn-grande-v");
    if (final) {
      palco.tocar("rufo", { dur: 2.2 });
      await palco.esperar(2300, { exato: true });
    }
    if (res.va !== null) contar(va, res.va, { formato: METRICAS[crit].fmt, duracao: 1100 });
    if (res.vb !== null) contar(vb, res.vb, { formato: METRICAS[crit].fmt, duracao: 1100 });
    await palco.esperar(1300);
    const lados = duelo.querySelectorAll(".tn-lado");
    lados[res.vence].classList.add("ganha");
    lados[1 - res.vence].classList.add("fora");
    palco.tremer(final ? 1 : 0.6);
    palco.tocar(final ? "_destaque" : "acerto");
    palco.explodir(res.vence === 0 ? (vertical ? palco.L / 2 : palco.L * 0.25) : vertical ? palco.L / 2 : palco.L * 0.75, vertical ? (res.vence === 0 ? palco.A * 0.3 : palco.A * 0.7) : palco.A * 0.45, { n: final ? 120 : 60, forca: 0.8 });
    await palco.passo(final ? 2600 : 2400);
    duelo.hidden = true;
    quadro.classList.remove("escondido");
    // Marca no quadro
    const ea = slotEl.get(chave(r, k * 2));
    const eb = slotEl.get(chave(r, k * 2 + 1));
    if (res.va !== null) ea.querySelector(".tn-v").textContent = METRICAS[crit].fmt(res.va);
    if (res.vb !== null) eb.querySelector(".tn-v").textContent = METRICAS[crit].fmt(res.vb);
    (res.vence === 0 ? ea : eb).classList.add("ganha");
    (res.vence === 0 ? eb : ea).classList.add("fora");
    const vencedor = res.vence === 0 ? a : b;
    if (!final) await avancar(r, k * 2 + res.vence, vencedor);
    return vencedor;
  };

  // ---------- Rondas ----------
  let vivos = lista;
  palco.musica("epico", 1);
  for (let r = 0; r < R; r++) {
    const nJogos = vivos.length / 2;
    rondaEl.textContent = NOMES_RONDA[vivos.length];
    rondaEl.classList.remove("p-slam");
    void rondaEl.offsetWidth;
    rondaEl.classList.add("p-slam");
    palco.tocar("revelar");
    await palco.esperar(900);
    const seguintes = [];
    for (let k = 0; k < nJogos; k++) {
      const a = vivos[k * 2];
      const b = vivos[k * 2 + 1];
      if (nJogos > 2) seguintes.push(await dueloNoQuadro(r, k, a, b));
      else seguintes.push(await dueloGrande(r, k, a, b, nJogos === 1));
      await palco.esperar(nJogos > 2 ? 350 : 500);
    }
    critEl.textContent = "";
    if (nJogos > 2) await palco.passo(1400);
    vivos = seguintes;
  }

  // ---------- Campeão ----------
  const campeao = vivos[0];
  palco.musica("epico", 1);
  cena.innerHTML = `<div class="p-centro tn-campeao">
    <div class="tn-taca-grande">${taca()}</div>
    ${avatarPalco(campeao, vertical ? 300 : 260)}
    <div class="ab-etiqueta" style="margin:40px 0 0">Campeão do torneio</div>
    <h1 class="p-titulo" style="font-size:${vertical ? 100 : 120}px;margin-top:20px">${letras(campeao.name)}</h1></div>`;
  animate(cena.querySelectorAll(".ab-letra"), { translateY: [120, 0], opacity: [0, 1], delay: stagger(40, { start: 500 }), duration: 900, ease: spring({ stiffness: 130, damping: 12 }) });
  animate(cena.querySelector(".tn-taca-grande"), { translateY: [-400, 0], rotate: [-20, 0], duration: 1200, ease: spring({ stiffness: 90, damping: 10 }) });
  palco.tremer(1.3);
  palco.festa({ forca: 1.2 });
  await palco.passo(6500);
  await palco.fecho();
}

function taca() {
  return `<svg viewBox="0 0 120 140" aria-hidden="true"><defs><linearGradient id="taca-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:#fff6cc"/><stop offset=".4" style="stop-color:var(--ouro)"/><stop offset="1" style="stop-color:color-mix(in srgb, var(--ouro) 55%, #000)"/></linearGradient></defs>
    <path d="M30 8h60v30c0 22-13 38-30 40-17-2-30-18-30-40z" fill="url(#taca-g)"/>
    <path d="M30 18H12c0 18 8 28 22 30M90 18h18c0 18-8 28-22 30" fill="none" stroke="url(#taca-g)" stroke-width="7"/>
    <path d="M52 78h16v22H52z" fill="url(#taca-g)"/><path d="M36 100h48l6 18H30z" fill="url(#taca-g)"/><rect x="24" y="118" width="72" height="14" rx="4" fill="url(#taca-g)"/>
    <path d="m60 22 4 8 9 1.3-6.5 6.3 1.5 9L60 42l-8 4.2 1.5-9-6.5-6.3 9-1.3z" fill="#fff" opacity=".85"/></svg>`;
}

