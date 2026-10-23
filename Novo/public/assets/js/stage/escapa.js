// Escapa do círculo: os Youtubers são bolas presas dentro de anéis que rodam, cada um com uma abertura.
// Cada ressalto toca uma nota. Quem passa pela abertura parte o anel (para todos) e ganha um ponto.
// Ganha quem partir o último anel. Como os vídeos "Will the ball escape?" dos Shorts.

import { esc } from "../format.js";
import { avatar } from "../ui.js";
import { cabecalho } from "./grafico.js";
import { aleatorio } from "./sorte.js";
import { jogadores, simular, chocar, lancar, bolaHtml, mover, faixa, partida, vencedor, CORES } from "./jogos.js";

// Uma melodia simples em escala pentatónica (sobe e desce, para cada ressalto tocar a nota seguinte)
const MELODIA = [72, 74, 76, 79, 81, 79, 76, 74, 72, 76, 79, 84, 81, 79, 76, 72, 69, 72, 74, 76];

export async function correr(palco, opts) {
  const pessoas = jogadores(palco, opts, { min: 2, max: 10, padrao: 6 });
  const vertical = palco.vertical;
  const cx = vertical ? 540 : 960;
  const cy = vertical ? 1060 : 640;
  const nAneis = Math.min(12, Math.max(3, Number(opts.aneis) || 8));
  const rMax = vertical ? 470 : 395;
  const rMin = vertical ? 190 : 160;
  const passoR = nAneis > 1 ? (rMax - rMin) / (nAneis - 1) : 0;
  const r = vertical ? 26 : 22;
  const GRAV = 900;
  const ABERTURA = 0.46;
  palco.contexto = { metrica: "indice", cat: opts.cat };

  const aneis = Array.from({ length: nAneis }, (_, k) => ({
    k,
    R: rMin + passoR * k,
    ang: aleatorio() * Math.PI * 2,
    w: (0.5 + aleatorio() * 0.9) * (aleatorio() < 0.5 ? -1 : 1),
    partido: false,
    por: null,
  }));
  const bolas = pessoas.map((p, i) => {
    const a = (i / pessoas.length) * Math.PI * 2;
    const b = { i, p, r, x: cx + Math.cos(a) * 60, y: cy + Math.sin(a) * 60, vx: 0, vy: 0, pontos: 0 };
    lancar(b, 520);
    return b;
  });

  palco.musica("leve", 1);
  await palco.abertura({ etiqueta: "Simulação", titulo: "Escapa do\ncírculo", sub: `${pessoas.length} bolas presas em ${nAneis} anéis. Quem parte o último?` });

  const cena = palco.cena;
  const lado = rMax * 2 + 60;
  cena.innerHTML = `${cabecalho("Escapa do círculo", "Passa pela abertura e o anel parte. Quem parte o último ganha.", `<span data-faltam>${nAneis} anéis</span>`)}
    <svg class="jg-aneis" style="left:${cx - lado / 2}px;top:${cy - lado / 2}px" width="${lado}" height="${lado}" viewBox="${-lado / 2} ${-lado / 2} ${lado} ${lado}">
      ${aneis
        .map((a) => {
          const comp = 2 * Math.PI * a.R;
          const aberto = ABERTURA * a.R;
          return `<circle data-anel="${a.k}" r="${a.R}" stroke-dasharray="${comp - aberto} ${aberto}" style="--cor:hsl(${(a.k * 360) / nAneis} 85% 62%)"/>`;
        })
        .join("")}
    </svg>
    <div class="jg-mundo">${bolas.map((b) => bolaHtml(b.p, b.i, r * 2)).join("")}</div>
    <div class="jg-tabela ${vertical ? "baixo" : ""}"></div>`;
  const anelEl = aneis.map((a) => cena.querySelector(`[data-anel="${a.k}"]`));
  const els = bolas.map((b) => cena.querySelector(`.jg-bola[data-i="${b.i}"]`));
  const tabela = cena.querySelector(".jg-tabela");
  const faltam = cena.querySelector("[data-faltam]");
  const noticia = faixa(cena);
  const eventos = [];
  let nota = 0;
  let ultimoSom = -1;
  const desenharTabela = () => {
    tabela.innerHTML = [...bolas]
      .sort((a, b) => b.pontos - a.pontos || a.i - b.i)
      .slice(0, vertical ? 4 : 10)
      .map((b, k) => `<div class="jg-linha" style="--cor:${CORES[b.i % CORES.length]}"><b>${k + 1}</b>${avatar(b.p, vertical ? 44 : 40)}<span>${esc(b.p.name)}</span><i>${b.pontos}</i></div>`)
      .join("");
  };
  const desenhar = (tempo) => {
    for (const a of aneis) if (!a.partido) anelEl[a.k].style.transform = `rotate(${a.ang + ABERTURA}rad)`;
    for (const b of bolas) mover(els[b.i], b.x, b.y);
    while (eventos.length) {
      const e = eventos.shift();
      if (e.tipo === "toque") {
        if (tempo - ultimoSom > 0.05) {
          ultimoSom = tempo;
          palco.tocar("nota", { n: MELODIA[nota++ % MELODIA.length], vol: 0.09 });
        }
        anelEl[e.k]?.animate([{ strokeWidth: "14px" }, { strokeWidth: "8px" }], { duration: 160 });
      }
      if (e.tipo === "partiu") {
        const a = aneis[e.k];
        const el = anelEl[e.k];
        el.animate([{ opacity: 1, transform: `${el.style.transform} scale(1)` }, { opacity: 0, transform: `${el.style.transform} scale(1.25)` }], { duration: 500, fill: "forwards" });
        for (let j = 0; j < 8; j++) {
          const t = (j / 8) * Math.PI * 2;
          palco.explodir(cx + Math.cos(t) * a.R, cy + Math.sin(t) * a.R, { n: 10, forca: 0.4 });
        }
        palco.tocar("cristal");
        const cor = CORES[e.b.i % CORES.length];
        noticia(`<b style="color:${cor}">${esc(e.b.p.name)}</b> partiu um anel!`, cor);
        faltam.textContent = `${aneis.filter((x) => !x.partido).length} ${aneis.filter((x) => !x.partido).length === 1 ? "anel" : "anéis"}`;
        desenharTabela();
      }
    }
  };
  desenharTabela();
  desenhar(0);
  await palco.esperar(900);
  await palco.meio();
  await partida(palco, cena, "Já!");
  palco.musica("tensao", 1);

  const restantes = () => aneis.filter((a) => !a.partido);
  let ultimo = null;
  await simular(palco, {
    hz: 240,
    maxSeg: 90,
    acabou: () => restantes().length === 0,
    passo: (dt) => {
      for (const a of aneis) a.ang += a.w * dt;
      for (const b of bolas) {
        b.vy += GRAV * dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        const dx = b.x - cx;
        const dy = b.y - cy;
        const d = Math.hypot(dx, dy) || 0.0001;
        // O anel que prende esta bola: o mais pequeno ainda inteiro à volta dela
        const anel = aneis.find((a) => !a.partido && a.R > d - b.r * 0.2);
        if (!anel) {
          // Já fora de todos os anéis: continua a cair e volta para dentro do maior (para seguir em jogo)
          if (d > rMax + 140) {
            b.x = cx;
            b.y = cy;
            lancar(b, 520);
          }
          continue;
        }
        if (d + b.r < anel.R) continue;
        const nx = dx / d;
        const ny = dy / d;
        const ang = Math.atan2(dy, dx);
        let rel = (ang - anel.ang) % (Math.PI * 2);
        if (rel < 0) rel += Math.PI * 2;
        // A abertura fica entre ang e ang + ABERTURA (em radianos ao longo do anel)
        if (rel < ABERTURA - (b.r * 0.8) / anel.R && rel > (b.r * 0.8) / anel.R) {
          anel.partido = true;
          anel.por = b;
          b.pontos++;
          ultimo = b;
          eventos.push({ tipo: "partiu", k: anel.k, b });
          continue;
        }
        // Ressalto (com um pouco de sorte e sem perder força)
        b.x = cx + nx * (anel.R - b.r - 0.5);
        b.y = cy + ny * (anel.R - b.r - 0.5);
        const vn = b.vx * nx + b.vy * ny;
        if (vn > 0) {
          b.vx -= 2 * vn * nx;
          b.vy -= 2 * vn * ny;
          const t = (aleatorio() - 0.5) * 80;
          b.vx += -ny * t;
          b.vy += nx * t;
          const s = Math.hypot(b.vx, b.vy);
          const alvo = Math.min(1500, Math.max(560, s * 1.012));
          b.vx = (b.vx / s) * alvo;
          b.vy = (b.vy / s) * alvo;
          eventos.push({ tipo: "toque", k: anel.k });
        }
      }
      for (let i = 0; i < bolas.length; i++) for (let j = i + 1; j < bolas.length; j++) chocar(bolas[i], bolas[j]);
    },
    desenhar,
  });
  // Ganha quem partiu o último anel (se o tempo acabou: quem partiu mais)
  const campeao = restantes().length === 0 && ultimo ? ultimo : [...bolas].sort((a, b) => b.pontos - a.pontos || a.i - b.i)[0];
  els[campeao.i].classList.add("jg-ganha");
  palco.tocar("impacto");
  await palco.esperar(1200);
  const ordem = [...bolas].sort((a, b) => (a === campeao ? -1 : b === campeao ? 1 : b.pontos - a.pontos));
  await vencedor(palco, campeao.p, {
    espetaculo: "escapa",
    etiqueta: restantes().length === 0 ? "Partiu o último anel" : "Partiu mais anéis",
    frase: `${campeao.pontos} ${campeao.pontos === 1 ? "anel partido" : "anéis partidos"}`,
    linhas: ordem.map((b, k) => ({ id: b.p.id, nome: b.p.name, valor: `${b.pontos} ${b.pontos === 1 ? "anel" : "anéis"}`, pos: k + 1 })),
    nota: `Escapa do círculo · ${nAneis} anéis`,
  });
  await palco.fecho();
}
