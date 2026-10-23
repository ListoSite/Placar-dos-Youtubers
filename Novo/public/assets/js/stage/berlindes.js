// Corrida de berlindes: cada Youtuber é um berlinde que cai por uma pista cheia de pinos, rampas e
// pás a rodar. A câmara segue o da frente. Ganha o primeiro a cruzar a meta. Sorte pura, como nas
// corridas de berlindes que enchem o TikTok e os Shorts.

import { esc } from "../format.js";
import { avatar } from "../ui.js";
import { cabecalho } from "./grafico.js";
import { aleatorio } from "./sorte.js";
import { jogadores, simular, chocar, bolaHtml, mover, faixa, partida, vencedor, CORES } from "./jogos.js";

export async function correr(palco, opts) {
  const pessoas = jogadores(palco, opts, { min: 3, max: 16, padrao: 10 });
  const vertical = palco.vertical;
  palco.contexto = { metrica: "indice", cat: opts.cat };
  // Janela da pista no palco e tamanho do mundo
  const J = vertical ? { x: 60, y: 360, w: 960, h: 1180 } : { x: 600, y: 210, w: 720, h: 840 };
  const W = J.w;
  const H = Math.round(J.h * 3);
  const r = vertical ? 25 : 19;
  const G = 1500;
  const E = 0.5;

  // ---------- A pista (gerada com a sorte do jogo) ----------
  const pinos = [];
  const pr = vertical ? 11 : 9;
  const campoPinos = (y0, y1, passoY, passoX, desvio = 8) => {
    let linha = 0;
    for (let y = y0; y < y1; y += passoY, linha++) {
      for (let x = (linha % 2 ? passoX / 2 : passoX) * 0.75; x < W - 20; x += passoX) {
        pinos.push({ x: x + (aleatorio() - 0.5) * desvio, y: y + (aleatorio() - 0.5) * desvio, r: pr });
      }
    }
  };
  campoPinos(H * 0.07, H * 0.36, vertical ? 84 : 64, vertical ? 128 : 96);
  const barras = [];
  const barra = (ax, ay, bx, by, rad = 8) => barras.push({ ax, ay, bx, by, r: rad });
  // Rampas em zigue-zague
  const r0 = H * 0.39;
  const passoR = H * 0.045;
  for (let k = 0; k < 4; k++) {
    const y = r0 + k * passoR;
    if (k % 2 === 0) barra(0, y, W * (0.72 + aleatorio() * 0.06), y + passoR * 0.55);
    else barra(W, y, W * (0.28 - aleatorio() * 0.06), y + passoR * 0.55);
  }
  // Pás a rodar
  const pas = [];
  const pa = (cx, cy, comp, w) => pas.push({ cx, cy, comp, w, ang: aleatorio() * Math.PI, r: 10 });
  pa(W * 0.3, H * 0.62, W * 0.36, 2.4 + aleatorio());
  pa(W * 0.72, H * 0.62, W * 0.36, -(2.4 + aleatorio()));
  pa(W * 0.5, H * 0.7, W * 0.42, 1.8 + aleatorio());
  // Segundo campo de pinos, mais solto e ao acaso
  for (let k = 0; k < (vertical ? 60 : 70); k++) {
    const p = { x: 30 + aleatorio() * (W - 60), y: H * 0.76 + aleatorio() * H * 0.12, r: pr };
    if (pinos.every((q) => Math.hypot(q.x - p.x, q.y - p.y) > r * 3)) pinos.push(p);
  }
  // Funil da meta
  const meta = H * 0.95;
  barra(0, H * 0.9, W * 0.4, H * 0.935);
  barra(W, H * 0.9, W * 0.6, H * 0.935);
  // Grelha para procurar pinos perto depressa
  const CEL = 80;
  const grelha = new Map();
  for (const p of pinos) {
    const k = Math.floor(p.y / CEL);
    if (!grelha.has(k)) grelha.set(k, []);
    grelha.get(k).push(p);
  }

  // ---------- Berlindes ----------
  const bolas = pessoas.map((p, i) => ({
    i,
    p,
    r,
    m: 1,
    x: W * (0.12 + 0.76 * ((i + 0.5) / pessoas.length)) + (aleatorio() - 0.5) * 10,
    y: 60 + (i % 2) * r * 2.2,
    vx: 0,
    vy: 0,
    parado: 0,
    chegou: null,
  }));

  palco.musica("leve", 1);
  await palco.abertura({ etiqueta: "Simulação", titulo: "Corrida de\nberlindes", sub: `${pessoas.length} berlindes, pinos, rampas e pás. Quem chega primeiro à meta?` });

  const cena = palco.cena;
  const svg = `<svg class="jg-pista-svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
      <rect x="0" y="${meta}" width="${W}" height="14" class="jg-meta"/>
      ${pinos.map((p) => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${p.r}" class="jg-pino"/>`).join("")}
      ${barras.map((b) => `<line x1="${b.ax}" y1="${b.ay}" x2="${b.bx}" y2="${b.by}" stroke-width="${b.r * 2}" class="jg-rampa"/>`).join("")}
    </svg>`;
  cena.innerHTML = `${cabecalho("Corrida de berlindes", "Sorte pura: quem chega primeiro à meta?", `<span data-lider>Partida</span>`)}
    <div class="jg-janela" style="left:${J.x}px;top:${J.y}px;width:${J.w}px;height:${J.h}px">
      <div class="jg-pista" style="width:${W}px;height:${H}px">${svg}
        ${pas.map((p, k) => `<div class="jg-pa" data-pa="${k}" style="width:${p.comp}px;height:${p.r * 2}px;margin:${-p.r}px 0 0 ${-p.comp / 2}px"></div>`).join("")}
        <div class="jg-meta-texto" style="top:${meta - 70}px">META</div>
        ${bolas.map((b) => bolaHtml(b.p, b.i, r * 2)).join("")}
      </div>
      <div class="jg-mapa">${bolas.map((b) => `<i data-m="${b.i}" style="background:${CORES[b.i % CORES.length]}"></i>`).join("")}</div>
    </div>
    <div class="jg-tabela ${vertical ? "baixo" : ""}"></div>`;
  const pista = cena.querySelector(".jg-pista");
  const els = bolas.map((b) => cena.querySelector(`.jg-bola[data-i="${b.i}"]`));
  const pasEl = pas.map((_, k) => cena.querySelector(`[data-pa="${k}"]`));
  const mapa = bolas.map((b) => cena.querySelector(`[data-m="${b.i}"]`));
  const tabela = cena.querySelector(".jg-tabela");
  const lider = cena.querySelector("[data-lider]");
  const noticia = faixa(cena);
  let cam = 0;
  let chegados = 0;
  const eventos = [];
  let ultimaTabela = -1;
  const ordem = () => [...bolas].sort((a, b) => (a.chegou ?? 1e9) - (b.chegou ?? 1e9) || b.y - a.y);
  const desenhar = (tempo) => {
    const correr_ = bolas.filter((b) => b.chegou === null);
    const alvo = (correr_.length ? Math.max(...correr_.map((b) => b.y)) : meta) - J.h * 0.55;
    cam += (Math.max(0, Math.min(H - J.h, alvo)) - cam) * 0.12;
    pista.style.transform = `translateY(${-cam}px)`;
    for (const b of bolas) {
      mover(els[b.i], b.x, b.y);
      mapa[b.i].style.top = `${(Math.min(b.y, meta) / meta) * 100}%`;
    }
    pas.forEach((p, k) => (pasEl[k].style.transform = `translate(${p.cx}px, ${p.cy}px) rotate(${p.ang}rad)`));
    while (eventos.length) {
      const e = eventos.shift();
      if (e.tipo === "chegou") {
        const cor = CORES[e.b.i % CORES.length];
        noticia(`<b style="color:${cor}">${esc(e.b.p.name)}</b> chegou em ${e.b.chegou + 1}.º!`, cor);
        palco.tocar(e.b.chegou === 0 ? "vitoria" : "ding");
        if (e.b.chegou === 0) palco.flash(0.4);
      }
      if (e.tipo === "pino" && tempo - (desenhar.som || 0) > 0.06) {
        desenhar.som = tempo;
        palco.tocar("tique");
      }
    }
    if (Math.floor(tempo * 4) !== ultimaTabela) {
      ultimaTabela = Math.floor(tempo * 4);
      const o = ordem();
      lider.textContent = `1.º ${o[0].p.name}`;
      tabela.innerHTML = o
        .slice(0, vertical ? 4 : 8)
        .map((b, k) => `<div class="jg-linha ${b.chegou !== null ? "chegou" : ""}" style="--cor:${CORES[b.i % CORES.length]}"><b>${k + 1}</b>${avatar(b.p, vertical ? 44 : 40)}<span>${esc(b.p.name)}</span>${b.chegou !== null ? "<i>🏁</i>" : ""}</div>`)
        .join("");
    }
  };
  desenhar(0);
  await palco.esperar(800);
  await palco.meio();
  await partida(palco, cena, "Já!");
  palco.musica("tensao", 1);

  const contra = (b, ax, ay, bx, by, rad, ux = 0, uy = 0) => {
    // Ponto mais perto do segmento e ressalto (u: velocidade da superfície, para as pás)
    const dx = bx - ax;
    const dy = by - ay;
    const t = Math.max(0, Math.min(1, ((b.x - ax) * dx + (b.y - ay) * dy) / (dx * dx + dy * dy || 1)));
    const qx = ax + dx * t;
    const qy = ay + dy * t;
    const ex = b.x - qx;
    const ey = b.y - qy;
    const d = Math.hypot(ex, ey) || 0.0001;
    if (d >= b.r + rad) return false;
    const nx = ex / d;
    const ny = ey / d;
    b.x = qx + nx * (b.r + rad);
    b.y = qy + ny * (b.r + rad);
    const rvx = b.vx - ux;
    const rvy = b.vy - uy;
    const vn = rvx * nx + rvy * ny;
    if (vn < 0) {
      b.vx = rvx - (1 + E) * vn * nx + ux;
      b.vy = rvy - (1 + E) * vn * ny + uy;
    }
    return { qx, qy };
  };

  await simular(palco, {
    hz: 120,
    maxSeg: 75,
    // Acaba quando chegam os primeiros quatro (ou todos, se forem menos)
    acabou: () => chegados >= Math.min(4, bolas.length),
    passo: (dt) => {
      for (const p of pas) p.ang += p.w * dt;
      const ativos = bolas.filter((b) => b.chegou === null);
      for (const b of ativos) {
        b.vy += G * dt;
        const s = Math.hypot(b.vx, b.vy);
        if (s > 1500) ((b.vx *= 1500 / s), (b.vy *= 1500 / s));
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        if (b.x - b.r < 0) ((b.x = b.r), (b.vx = Math.abs(b.vx) * E));
        if (b.x + b.r > W) ((b.x = W - b.r), (b.vx = -Math.abs(b.vx) * E));
        // Pinos (só os das células perto)
        const k = Math.floor(b.y / CEL);
        for (let kk = k - 1; kk <= k + 1; kk++) {
          for (const p of grelha.get(kk) || []) {
            const ex = b.x - p.x;
            const ey = b.y - p.y;
            const d = Math.hypot(ex, ey);
            if (d >= b.r + p.r || d === 0) continue;
            const nx = ex / d;
            const ny = ey / d;
            b.x = p.x + nx * (b.r + p.r);
            b.y = p.y + ny * (b.r + p.r);
            const vn = b.vx * nx + b.vy * ny;
            if (vn < 0) {
              b.vx -= (1 + E) * vn * nx;
              b.vy -= (1 + E) * vn * ny;
              // Um toque de sorte em cada pino
              b.vx += -ny * (aleatorio() - 0.5) * 70;
              b.vy += nx * (aleatorio() - 0.5) * 70;
              if (vn < -120) eventos.push({ tipo: "pino" });
            }
          }
        }
        for (const s of barras) contra(b, s.ax, s.ay, s.bx, s.by, s.r);
        for (const p of pas) {
          const cx = Math.cos(p.ang) * (p.comp / 2);
          const cy = Math.sin(p.ang) * (p.comp / 2);
          const ax = p.cx - cx;
          const ay = p.cy - cy;
          const bx = p.cx + cx;
          const by = p.cy + cy;
          // Velocidade da pá no ponto de contacto
          const dx = bx - ax;
          const dy = by - ay;
          const t = Math.max(0, Math.min(1, ((b.x - ax) * dx + (b.y - ay) * dy) / (dx * dx + dy * dy || 1)));
          const qx = ax + dx * t;
          const qy = ay + dy * t;
          contra(b, ax, ay, bx, by, p.r, -p.w * (qy - p.cy), p.w * (qx - p.cx));
        }
        // Berlinde parado em cima de alguma coisa: um empurrão ao acaso
        if (Math.hypot(b.vx, b.vy) < 15) b.parado += dt;
        else b.parado = 0;
        if (b.parado > 1.2) {
          b.vx += (aleatorio() - 0.5) * 420;
          b.vy -= 160;
          b.parado = 0;
        }
        if (b.y > meta) {
          b.chegou = chegados++;
          // Fica arrumado depois da meta, pela ordem de chegada
          b.x = W * (0.1 + ((b.chegou % 8) / 8) * 0.8) + r;
          b.y = meta + 50 + Math.floor(b.chegou / 8) * r * 2.2;
          eventos.push({ tipo: "chegou", b });
        }
      }
      for (let i = 0; i < ativos.length; i++) for (let j = i + 1; j < ativos.length; j++) chocar(ativos[i], ativos[j], { restituicao: 0.6 });
    },
    desenhar,
  });
  const final = ordem();
  const campeao = final[0];
  els[campeao.i].classList.add("jg-ganha");
  await palco.esperar(1000);
  await vencedor(palco, campeao.p, {
    espetaculo: "berlindes",
    etiqueta: "1.º na meta",
    frase: `${pessoas.length} berlindes na pista`,
    linhas: final.slice(0, 10).map((b, k) => ({ id: b.p.id, nome: b.p.name, valor: `${k + 1}.º`, pos: k + 1 })),
    nota: `Corrida de berlindes · ${pessoas.length} Youtubers`,
  });
  await palco.fecho();
}
