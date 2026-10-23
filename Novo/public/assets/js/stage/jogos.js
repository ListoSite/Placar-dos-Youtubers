// Peças comuns dos jogos de simulação (bolas comilonas, cavalos, berlindes, escapa do círculo, ringue).
// A simulação corre a passo fixo e toda a sorte passa por aleatorio(): com a mesma semente, o jogo
// repete-se igual (é assim que um exclusivo fica no site tal e qual). Os efeitos visuais usam Math.random.

import { estado, indice, views } from "../data.js";
import { esc, curto, mesNome } from "../format.js";
import { avatarPalco, baralhar, comFoco } from "./stage.js";
import { melhores } from "./metricas.js";
import { aleatorio } from "./sorte.js";

export const CORES = ["#ff4d70", "#f4b942", "#2ec4a0", "#4db6ff", "#c86bfa", "#ff8a3d", "#8bd450", "#ff6fb5", "#29d3e8", "#ffd23f", "#9085e9", "#ff5d3b", "#4ade80", "#60a5fa", "#f472b6", "#facc15", "#a3e635", "#38bdf8", "#fb7185", "#c084fc"];

export const TAMANHOS = { views: "Views do mês", subs: "Subscritores", indice: "Índice de Influência", igual: "Ao acaso (sem dados)" };

const limitar = (x, a, b) => Math.max(a, Math.min(b, x));

/** Quem entra no jogo: os melhores pelo Índice ou ao acaso entre os 60 melhores (e o Youtuber em foco). */
export function jogadores(palco, opts, { min = 4, max = 20, padrao = 10 } = {}) {
  const n = limitar(Number(opts.n) || padrao, min, max);
  // Uma lista escolhida (por exemplo numa sugestão do público): entram esses
  const escolhidos = opts.pessoas ? String(opts.pessoas).split(",").map((id) => estado.pessoas.get(id)).filter(Boolean).slice(0, max) : [];
  if (escolhidos.length >= min) return baralhar(comFoco(escolhidos, palco));
  const base = melhores(opts.quem === "top" ? n : Number(opts.top) || 60, { cat: opts.cat });
  const lista = opts.quem === "top" ? base.slice(0, n) : baralhar(base).slice(0, n);
  if (lista.length < min) throw new Error(`São precisos pelo menos ${min} Youtubers com dados${opts.cat ? ` na categoria ${opts.cat}` : ""}.`);
  return baralhar(comFoco(lista, palco));
}

/** O valor de cada Youtuber na medida do tamanho (0 a 1, em escala de raiz quadrada para não esmagar os pequenos). */
export function forcas(pessoas, medida, m = estado.ref) {
  if (medida === "igual") return new Map(pessoas.map((p) => [p.id, 0.25 + aleatorio() * 0.5]));
  const valor = (p) => (medida === "indice" ? indice(p.id).total : medida === "subs" ? p.totals?.subs : views(p, m)) ?? null;
  const vals = pessoas.map((p) => valor(p));
  const ok = vals.filter((v) => v !== null && v > 0);
  const max = Math.max(...ok, 1);
  const min = Math.min(...ok, max);
  return new Map(
    pessoas.map((p, i) => {
      const v = vals[i];
      if (v === null || v <= 0) return [p.id, 0.08];
      const k = max === min ? 0.6 : (Math.sqrt(v) - Math.sqrt(min)) / (Math.sqrt(max) - Math.sqrt(min));
      return [p.id, 0.12 + k * 0.88];
    }),
  );
}

/** Texto curto do valor de um Youtuber (para a legenda do tamanho). */
export function valorTexto(p, medida, m = estado.ref) {
  if (medida === "igual") return "";
  if (medida === "indice") return `Índice ${indice(p.id).total ?? "—"}`;
  if (medida === "subs") return p.totals?.subs ? `${curto(p.totals.subs)} subs` : "";
  const v = views(p, m);
  return v !== null ? `${curto(v)} views` : "";
}
export const textoMedida = (medida, m = estado.ref) => (medida === "igual" ? "Tamanhos ao acaso" : medida === "views" ? `Tamanho pelas views de ${mesNome(m)}` : `Tamanho por ${TAMANHOS[medida]}`);

/** A área de jogo dentro do palco (abaixo do cabeçalho). */
export function arena(palco, { topo } = {}) {
  return palco.vertical ? { x0: 50, y0: topo ?? 360, x1: 1030, y1: 1760 } : { x0: 90, y0: topo ?? 220, x1: 1830, y1: 1030 };
}

/**
 * Corre uma simulação a passo fixo: o mesmo número de passos acontece seja qual for o computador,
 * por isso o resultado só depende da sorte (com semente). A pausa e a velocidade do Palco contam.
 */
export function simular(palco, { passo, desenhar, acabou, hz = 120, maxSeg = 90 }) {
  const DT = 1 / hz;
  const max = Math.round(maxSeg * hz);
  return new Promise((resolve, reject) => {
    let acc = 0;
    let antes = performance.now();
    let n = 0;
    const frame = (agora) => {
      if (palco.terminado) return reject(new Error("abortado"));
      const dt = Math.min(0.1, (agora - antes) / 1000);
      antes = agora;
      if (!palco.pausado) acc += dt / palco.fator;
      let fim = false;
      while (acc >= DT) {
        acc -= DT;
        passo(DT, n++);
        if (acabou() || n >= max) {
          fim = true;
          break;
        }
      }
      desenhar(n / hz);
      if (fim) return resolve({ passos: n, tempo: n / hz, esgotado: n >= max });
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
}

/** Colisão elástica entre dois círculos (com massas). Devolve a força do choque (0 se não tocam). */
export function chocar(a, b, { restituicao = 1 } = {}) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.hypot(dx, dy) || 0.0001;
  const minimo = a.r + b.r;
  if (d >= minimo) return 0;
  const nx = dx / d;
  const ny = dy / d;
  // Separar
  const sobra = minimo - d;
  const ma = a.m ?? a.r * a.r;
  const mb = b.m ?? b.r * b.r;
  a.x -= nx * sobra * (mb / (ma + mb));
  a.y -= ny * sobra * (mb / (ma + mb));
  b.x += nx * sobra * (ma / (ma + mb));
  b.y += ny * sobra * (ma / (ma + mb));
  // Velocidades na direção do choque
  const va = a.vx * nx + a.vy * ny;
  const vb = b.vx * nx + b.vy * ny;
  const rel = va - vb;
  if (rel <= 0) return 0;
  const j = ((1 + restituicao) * rel) / (1 / ma + 1 / mb);
  a.vx -= (j / ma) * nx;
  a.vy -= (j / ma) * ny;
  b.vx += (j / mb) * nx;
  b.vy += (j / mb) * ny;
  return rel;
}

/** Ressalta dentro de um retângulo. Devolve true se bateu numa parede. */
export function paredes(c, r) {
  let bateu = false;
  if (c.x - c.r < r.x0) ((c.x = r.x0 + c.r), (c.vx = Math.abs(c.vx)), (bateu = true));
  if (c.x + c.r > r.x1) ((c.x = r.x1 - c.r), (c.vx = -Math.abs(c.vx)), (bateu = true));
  if (c.y - c.r < r.y0) ((c.y = r.y0 + c.r), (c.vy = Math.abs(c.vy)), (bateu = true));
  if (c.y + c.r > r.y1) ((c.y = r.y1 - c.r), (c.vy = -Math.abs(c.vy)), (bateu = true));
  return bateu;
}

/** Ressalta num retângulo sólido (obstáculo). Devolve true se bateu. */
export function bloco(c, b) {
  const px = limitar(c.x, b.x0, b.x1);
  const py = limitar(c.y, b.y0, b.y1);
  const dx = c.x - px;
  const dy = c.y - py;
  const d2 = dx * dx + dy * dy;
  if (d2 >= c.r * c.r) return false;
  if (d2 === 0) {
    // O centro entrou no bloco: sai pelo lado mais perto
    const lados = [c.x - b.x0, b.x1 - c.x, c.y - b.y0, b.y1 - c.y];
    const k = lados.indexOf(Math.min(...lados));
    if (k === 0) ((c.x = b.x0 - c.r), (c.vx = -Math.abs(c.vx)));
    if (k === 1) ((c.x = b.x1 + c.r), (c.vx = Math.abs(c.vx)));
    if (k === 2) ((c.y = b.y0 - c.r), (c.vy = -Math.abs(c.vy)));
    if (k === 3) ((c.y = b.y1 + c.r), (c.vy = Math.abs(c.vy)));
    return true;
  }
  const d = Math.sqrt(d2);
  const nx = dx / d;
  const ny = dy / d;
  c.x = px + nx * c.r;
  c.y = py + ny * c.r;
  const vn = c.vx * nx + c.vy * ny;
  if (vn < 0) {
    c.vx -= 2 * vn * nx;
    c.vy -= 2 * vn * ny;
  }
  return true;
}

/** Mantém a mesma rapidez (para os jogos em que as bolas nunca abrandam). */
export function rapidez(c, v) {
  const s = Math.hypot(c.vx, c.vy) || 1;
  c.vx = (c.vx / s) * v;
  c.vy = (c.vy / s) * v;
}

/** Uma direção ao acaso com a rapidez dada. */
export function lancar(c, v) {
  const a = aleatorio() * Math.PI * 2;
  c.vx = Math.cos(a) * v;
  c.vy = Math.sin(a) * v;
}

/** A bola de um Youtuber (o avatar dentro de um círculo da cor dele). */
export function bolaHtml(p, i, tam, extra = "") {
  return `<div class="jg-bola" data-i="${i}" style="--cor:${CORES[i % CORES.length]};width:${tam}px;height:${tam}px;margin:${-tam / 2}px 0 0 ${-tam / 2}px">${avatarPalco(p, tam).replace("palco-avatar", "palco-avatar jg-cara")}${extra}</div>`;
}

/** A bola na posição dela (transform, para ser leve). */
export function mover(el, x, y, escala = 1) {
  el.style.transform = `translate(${x}px, ${y}px) scale(${escala})`;
}

/** Faixa com os últimos acontecimentos ("A comeu B"). */
export function faixa(cena) {
  const el = document.createElement("div");
  el.className = "jg-faixa";
  cena.appendChild(el);
  return (html, cor = "") => {
    const linha = document.createElement("div");
    linha.className = "jg-faixa-linha";
    if (cor) linha.style.setProperty("--cor", cor);
    linha.innerHTML = html;
    el.prepend(linha);
    while (el.children.length > 3) el.lastElementChild.remove();
    setTimeout(() => linha.classList.add("velha"), 2600);
  };
}

/** Contagem para começar ("3, 2, 1, já!") por cima da arena. */
export async function partida(palco, cena, texto = "Já!") {
  const el = document.createElement("div");
  el.className = "jg-partida";
  cena.appendChild(el);
  for (const n of ["3", "2", "1", texto]) {
    el.innerHTML = `<b>${esc(n)}</b>`;
    el.firstElementChild.animate([{ transform: "scale(2.4)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }], { duration: 450, easing: "cubic-bezier(.2,1.4,.4,1)" });
    palco.tocar(n === texto ? "apito" : "bip");
    await palco.esperar(n === texto ? 500 : 700);
  }
  el.remove();
}

/** O vencedor em grande, a festa e o resultado (conta como coroa quando o vídeo conta). */
export async function vencedor(palco, p, { espetaculo, etiqueta = "Vencedor", frase = "", linhas = [], nota = "" }) {
  const camada = document.createElement("div");
  camada.className = "jg-vencedor";
  camada.innerHTML = `<div class="p-centro"><div class="vv-etiqueta"><i></i>${esc(etiqueta)}</div>${avatarPalco(p, palco.vertical ? 380 : 300)}<h2 class="p-titulo">${esc(p.name)}</h2>${frase ? `<p class="p-sub">${esc(frase)}</p>` : ""}</div>`;
  palco.cena.appendChild(camada);
  camada.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, fill: "forwards" });
  camada.querySelector(".palco-avatar").animate([{ transform: "scale(.3) rotate(-12deg)" }, { transform: "scale(1.08)" }, { transform: "none" }], { duration: 900, easing: "cubic-bezier(.2,1.3,.4,1)" });
  palco.flash(0.6);
  palco.registar({ tipo: "coroa", espetaculo, vence: p.id });
  palco.festa({ som: !palco.evento("vencedor", { alvo: camada.querySelector(".palco-avatar"), p }) });
  palco.resumir({ tipo: "torneio", vencedor: { id: p.id, nome: p.name, valor: etiqueta }, linhas, nota });
  await palco.passo(5200);
}
