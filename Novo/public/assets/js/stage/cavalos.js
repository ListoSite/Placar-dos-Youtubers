// Corrida de cavalos: cada Youtuber é um cavalo que corre sempre à mesma velocidade e ressalta nas
// paredes de um labirinto (como os "Horse Race Tests"). Ganha o primeiro a chegar à cenoura.
// É pura sorte: o labirinto, as partidas e cada ressalto mudam de corrida para corrida.

import { esc } from "../format.js";
import { cabecalho } from "./grafico.js";
import { aleatorio } from "./sorte.js";
import { jogadores, forcas, arena, simular, chocar, paredes, bloco, rapidez, lancar, bolaHtml, mover, faixa, partida, vencedor, CORES } from "./jogos.js";

const ESCALA = [60, 62, 64, 67, 69, 72, 74, 76, 79, 81, 84];

export async function correr(palco, opts) {
  const pessoas = jogadores(palco, opts, { min: 3, max: 12, padrao: 8 });
  const vertical = palco.vertical;
  const A = arena(palco, { topo: vertical ? 380 : 230 });
  const vantagem = opts.vantagem === "dados";
  const forca = vantagem ? forcas(pessoas, opts.tamanho || "views", opts.m) : null;
  const r = vertical ? 36 : 32;
  const V = vertical ? 470 : 440;
  palco.contexto = { metrica: "indice", cat: opts.cat };

  // Labirinto em "caminho" (u ao longo da corrida, v de lado): 4 zonas separadas por paredes com uma passagem
  const U0 = vertical ? A.y0 : A.x0;
  const U1 = vertical ? A.y1 : A.x1;
  const V0 = vertical ? A.x0 : A.y0;
  const V1 = vertical ? A.x1 : A.y1;
  const zonas = 4;
  const largU = (U1 - U0) / zonas;
  const esp = 26;
  const passagem = vertical ? 250 : 230;
  const blocos = [];
  const rect = (u0, u1, v0, v1) => (vertical ? { x0: v0, x1: v1, y0: u0, y1: u1 } : { x0: u0, x1: u1, y0: v0, y1: v1 });
  let cima = aleatorio() < 0.5;
  const passagens = [];
  for (let k = 1; k < zonas; k++) {
    const u = U0 + largU * k;
    // A passagem fica num dos lados (alternando) ou, às vezes, a meio
    const meio = aleatorio() < 0.25;
    const p0 = meio ? V0 + (V1 - V0) / 2 - passagem / 2 + (aleatorio() - 0.5) * 120 : cima ? V0 : V1 - passagem;
    passagens.push({ u, v: p0 + passagem / 2 });
    if (p0 > V0) blocos.push({ ...rect(u - esp / 2, u + esp / 2, V0, p0), parede: true });
    if (p0 + passagem < V1) blocos.push({ ...rect(u - esp / 2, u + esp / 2, p0 + passagem, V1), parede: true });
    cima = !cima;
  }
  // Pilares ao acaso em cada zona (sem tapar a partida nem a cenoura)
  for (let k = 0; k < zonas; k++) {
    const n = 1 + Math.floor(aleatorio() * 2);
    for (let j = 0; j < n; j++) {
      const lado = 46 + aleatorio() * 50;
      const u = U0 + largU * k + largU * (0.3 + aleatorio() * 0.4);
      const v = V0 + (V1 - V0) * (0.15 + aleatorio() * 0.7);
      if (k === zonas - 1 && Math.abs(v - (V0 + V1) / 2) < 160) continue;
      blocos.push(rect(u - lado / 2, u + lado / 2, v - lado / 2, v + lado / 2));
    }
  }
  const cenouraU = U1 - largU * 0.35;
  const cenouraV = V0 + (V1 - V0) * (0.3 + aleatorio() * 0.4);
  const cenoura = vertical ? { x: cenouraV, y: cenouraU, r: 44 } : { x: cenouraU, y: cenouraV, r: 44 };

  // Cavalos na primeira zona
  const cavalos = pessoas.map((p, i) => {
    const c = { i, p, r, x: 0, y: 0, vx: 0, vy: 0, v: V * (vantagem ? 0.93 + forca.get(p.id) * 0.14 : 1), toques: 0 };
    const u = U0 + 50 + ((i % 3) + 0.5) * ((largU - 100) / 3);
    const v = V0 + 50 + (Math.floor(i / 3) + 0.5) * ((V1 - V0 - 100) / Math.ceil(pessoas.length / 3)) + (aleatorio() - 0.5) * 30;
    c.x = vertical ? v : u;
    c.y = vertical ? u : v;
    lancar(c, c.v);
    return c;
  });

  palco.musica("leve", 1);
  await palco.abertura({ etiqueta: "Simulação", titulo: "Corrida de\ncavalos", sub: `${pessoas.length} cavalos, um labirinto e uma cenoura. Quem chega primeiro?` });

  const cena = palco.cena;
  const tamanho = r * 2;
  cena.innerHTML = `${cabecalho("Corrida de cavalos", vantagem ? "Os números dão um pouco mais de velocidade" : "Pura sorte: todos à mesma velocidade", `<span data-lider>Partida</span>`)}
    <div class="jg-arena jg-labirinto" style="left:${A.x0}px;top:${A.y0}px;width:${A.x1 - A.x0}px;height:${A.y1 - A.y0}px"></div>
    ${blocos.map((b) => `<div class="jg-bloco ${b.parede ? "parede" : ""}" style="left:${b.x0}px;top:${b.y0}px;width:${b.x1 - b.x0}px;height:${b.y1 - b.y0}px"></div>`).join("")}
    <div class="jg-cenoura" style="left:${cenoura.x}px;top:${cenoura.y}px">🥕</div>
    <div class="jg-mundo">${cavalos.map((c) => bolaHtml(c.p, c.i, tamanho, `<span class="jg-cavalo">🐎</span>`)).join("")}</div>`;
  const els = cavalos.map((c) => cena.querySelector(`.jg-bola[data-i="${c.i}"]`));
  const emojis = els.map((el) => el.querySelector(".jg-cavalo"));
  const lider = cena.querySelector("[data-lider]");
  const noticia = faixa(cena);
  const blocosEl = [...cena.querySelectorAll(".jg-bloco")];
  const progresso = (c) => ((vertical ? c.y : c.x) - U0) / (U1 - U0);
  const zonaDe = (c) => Math.min(zonas - 1, Math.floor(((vertical ? c.y : c.x) - U0) / largU));
  let melhorZona = 0;
  let ultimoSom = 0;
  let nota = 0;
  const eventos = [];
  const desenhar = (tempo) => {
    for (const c of cavalos) {
      mover(els[c.i], c.x, c.y);
      const dir = (vertical ? c.vx : c.vx) < 0 ? -1 : 1;
      if (emojis[c.i].dataset.dir !== String(dir)) {
        emojis[c.i].dataset.dir = String(dir);
        emojis[c.i].style.transform = `scaleX(${-dir})`;
      }
    }
    const frente = cavalos.reduce((a, b) => (progresso(b) > progresso(a) ? b : a));
    lider.textContent = `1.º ${frente.p.name}`;
    while (eventos.length) {
      const e = eventos.shift();
      if (e.tipo === "som" && tempo - ultimoSom > 0.07) {
        ultimoSom = tempo;
        palco.tocar("nota", { n: ESCALA[nota++ % ESCALA.length], vol: 0.07 });
      }
      if (e.tipo === "bloco") blocosEl[e.k]?.animate([{ filter: "brightness(2)" }, { filter: "none" }], { duration: 220 });
      if (e.tipo === "zona") {
        noticia(`<b style="color:${CORES[e.c.i % CORES.length]}">${esc(e.c.p.name)}</b> é o primeiro na zona ${e.zona + 1}!`, CORES[e.c.i % CORES.length]);
        palco.tocar("whoosh");
      }
    }
  };
  desenhar(0);
  await palco.esperar(900);
  await palco.meio();
  await partida(palco, cena, "Partida!");
  palco.musica("tensao", 1);

  let ganhou = null;
  const res = await simular(palco, {
    hz: 120,
    maxSeg: 80,
    acabou: () => Boolean(ganhou),
    passo: (dt) => {
      for (const c of cavalos) {
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        let bateu = paredes(c, A);
        blocos.forEach((b, k) => {
          if (bloco(c, b)) {
            bateu = true;
            eventos.push({ tipo: "bloco", k });
          }
        });
        if (bateu) {
          // Um pouco de sorte em cada ressalto, como nos cavalos dos vídeos
          const a = Math.atan2(c.vy, c.vx) + (aleatorio() - 0.5) * 0.35;
          c.vx = Math.cos(a) * c.v;
          c.vy = Math.sin(a) * c.v;
          c.toques++;
          eventos.push({ tipo: "som" });
        }
      }
      for (let i = 0; i < cavalos.length; i++) for (let j = i + 1; j < cavalos.length; j++) if (chocar(cavalos[i], cavalos[j])) eventos.push({ tipo: "som" });
      for (const c of cavalos) {
        rapidez(c, c.v);
        const z = zonaDe(c);
        if (z > melhorZona) {
          melhorZona = z;
          eventos.push({ tipo: "zona", c, zona: z });
        }
        if (!ganhou && Math.hypot(c.x - cenoura.x, c.y - cenoura.y) < c.r + cenoura.r) ganhou = c;
      }
    },
    desenhar,
  });
  // Sem ninguém na cenoura a tempo: ganha quem está mais perto
  const campeao = ganhou || [...cavalos].sort((a, b) => Math.hypot(a.x - cenoura.x, a.y - cenoura.y) - Math.hypot(b.x - cenoura.x, b.y - cenoura.y))[0];
  cena.querySelector(".jg-cenoura").animate([{ transform: "translate(-50%,-50%) scale(1)" }, { transform: "translate(-50%,-50%) scale(1.8)", opacity: 0 }], { duration: 600, fill: "forwards" });
  els[campeao.i].classList.add("jg-ganha");
  palco.tocar("impacto");
  await palco.esperar(1200);
  const ordem = [...cavalos].sort((a, b) => (a === campeao ? -1 : b === campeao ? 1 : progresso(b) - progresso(a)));
  await vencedor(palco, campeao.p, {
    espetaculo: "cavalos",
    etiqueta: ganhou ? "Chegou à cenoura" : "O mais perto da cenoura",
    frase: `${Math.round(res.tempo)} segundos e ${campeao.toques} ressaltos`,
    linhas: ordem.map((c, k) => ({ id: c.p.id, nome: c.p.name, valor: k === 0 ? "1.º" : `${k + 1}.º`, pos: k + 1 })),
    nota: `Corrida de cavalos · ${pessoas.length} cavalos`,
  });
  await palco.fecho();
}
