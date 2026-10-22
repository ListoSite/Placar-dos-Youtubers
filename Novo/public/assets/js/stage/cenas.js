// Cenas próprias dos 10 temas principais (no modo "Tema completo").
//
// Nestes temas a abertura, os cartões da revelação e a batalha são encenados de raiz:
//   Futebol: placar luminoso do estádio, cartas de jogador e um jogo com golos
//   Carros: semáforos de partida, conta-rotações e uma corrida de arranque
//   Cozinha: menu de giz, a campânula que levanta e um duelo de jurados
//   Girly: capa de revista e um duelo de corações
//   Inferno: luta épica (título em chamas, seleção de lutador, combate com cronómetro)
//   YouTube: leitor de vídeo, miniaturas e uma batalha de views
//   Gaming: PRESS START, cartas de raridade e um combate de píxeis
//   Comédia: banda desenhada (vinhetas, balões, POW) e um medidor de risos
//   Vlog: câmara a gravar, stories e um duelo de gostos
//   Tech: terminal, ficha técnica e um teste de desempenho

import { esc } from "../format.js";
import { avatarPalco } from "./stage.js";
import { avatar } from "../ui.js";

const A = (el, quadros, opts) => el?.animate(quadros, { fill: "both", ...opts });
const todos = (raiz, sel) => [...raiz.querySelectorAll(sel)];
const linhasTitulo = (t) => esc(t).replace(/\n/g, "<br>");
const pct = (el) => el.style.getPropertyValue("--p") || "0%";
/** Tamanho de letra para um nome caber no cartão (os nomes compridos encolhem). */
const tam = (nome, base, cabe = 12) => {
  const n = String(nome || "").length;
  return `font-size:${Math.round(n > cabe ? Math.max(base * 0.55, (base * cabe) / n) : base)}px`;
};
const MEDALHA = (pos) => (pos === 1 ? "ouro" : pos === 2 ? "prata" : pos === 3 ? "bronze" : "");

/** Abertura genérica das cenas: monta o HTML, corre a animação e sai. */
async function abrir(palco, html, animar, { dur = 3800, som } = {}) {
  palco.cena.innerHTML = html;
  const raiz = palco.cena.firstElementChild;
  if (som) palco.tocar(som);
  animar?.(raiz);
  // A coreografia das aberturas é em tempo real (não depende da velocidade escolhida)
  await palco.esperar(dur, { passo: true, exato: true });
  await palco.sair_(raiz);
}

export const CENAS = {
  // ------------------------------------------------------------------ Futebol
  estadio: {
    async abertura(palco, { etiqueta, titulo, sub }) {
      const luzes = Array.from({ length: 4 }, (_, i) => `<i style="--i:${i}"></i>`).join("");
      await abrir(
        palco,
        `<div class="cn cn-estadio-ab"><div class="cn-holofotes">${luzes}</div>
          <div class="cn-led"><small>${esc(etiqueta || "Placar")}</small><h1>${linhasTitulo(titulo)}</h1>${sub ? `<p>${esc(sub)}</p>` : ""}</div></div>`,
        (r) => {
          todos(r, ".cn-holofotes i").forEach((l, i) => A(l, [{ opacity: 0 }, { opacity: 1 }], { duration: 120, delay: 200 + i * 220 }));
          [0, 1, 2, 3].forEach((i) => setTimeout(() => !palco.terminado && palco.tocar("tique"), 200 + i * 220));
          A(r.querySelector(".cn-led"), [{ transform: "scaleY(0)", opacity: 0 }, { transform: "scaleY(1)", opacity: 1 }], { duration: 500, delay: 1100, easing: "cubic-bezier(.2,1.3,.4,1)" });
          A(r.querySelector(".cn-led h1"), [{ opacity: 0, filter: "blur(8px)" }, { opacity: 1, filter: "blur(0)" }], { duration: 600, delay: 1500 });
          palco.tocar("impacto", {}, 1.1);
        },
        { dur: 4200 },
      );
    },
    cartao(x, { met, misterio, cor, vertical }) {
      return `<div class="cn-fut ${MEDALHA(x.pos) || "normal"} ${cor}">
        <div class="cn-fut-topo"><b>${x.pos}</b><small>TOP</small></div>
        <span class="${misterio ? "rv-misterio" : ""}">${avatarPalco(x.p, vertical ? 300 : 250)}</span>
        <div class="cn-fut-nome" style="${tam(x.p.name, 50, 10)}">${misterio ? "???" : esc(x.p.name)}</div>
        ${misterio ? `<div class="cn-fut-stats"><span>Quem será?</span></div>` : `<div class="cn-fut-stats"><span><b data-v="${x.v}">0</b> ${esc(met.unidade)}</span><span>${esc(x.p.category || "")}</span></div>`}
        <i class="cn-brilho"></i></div>`;
    },
    animar(el, x, palco) {
      const c = el.querySelector(".cn-fut");
      A(c, [{ transform: "rotateY(180deg) scale(.6)", opacity: 0 }, { transform: "rotateY(0) scale(1)", opacity: 1 }], { duration: 900, easing: "cubic-bezier(.2,1.2,.4,1)" });
      A(c.querySelector(".cn-brilho"), [{ transform: "translateX(-150%) skewX(-20deg)" }, { transform: "translateX(250%) skewX(-20deg)" }], { duration: 900, delay: 700 });
      if (x.pos <= 3) palco.tocar("multidao", { dur: 2, vol: 0.8 }, 0.4);
    },
  },

  // ------------------------------------------------------------------ Carros
  carros: {
    async abertura(palco, { etiqueta, titulo, sub }) {
      await abrir(
        palco,
        `<div class="cn cn-carros-ab"><div class="cn-semaforo"><i></i><i></i><i></i><i></i><i></i></div>
          <div class="cn-carros-tit"><small>${esc(etiqueta || "")}</small><h1>${linhasTitulo(titulo)}</h1>${sub ? `<p>${esc(sub)}</p>` : ""}</div>
          <div class="cn-riscas">${Array.from({ length: 14 }, (_, i) => `<i style="--i:${i}"></i>`).join("")}</div></div>`,
        (r) => {
          const luzes = todos(r, ".cn-semaforo i");
          luzes.forEach((l, i) =>
            setTimeout(() => {
              if (palco.terminado) return;
              l.classList.add("on");
              palco.tocar("bip");
            }, 250 + i * 330),
          );
          setTimeout(() => {
            if (palco.terminado) return;
            luzes.forEach((l) => l.classList.remove("on"));
            r.classList.add("partida");
            palco.tocar("motor");
            palco.tocar("pneu", {}, 0.15);
          }, 250 + 5 * 330 + 200);
          A(r.querySelector(".cn-carros-tit"), [{ transform: "scale(.1)", opacity: 0, filter: "blur(10px)" }, { transform: "scale(1)", opacity: 1, filter: "blur(0)" }], { duration: 650, delay: 2150, easing: "cubic-bezier(.2,1.2,.3,1)" });
        },
        { dur: 4400 },
      );
    },
    cartao(x, { met, misterio, vertical, max }) {
      const ang = -120 + 240 * Math.min(1, x.v / (max || x.v || 1));
      return `<div class="cn-pista-card">
        <div class="cn-placa">P${x.pos}</div>
        <div class="cn-piloto"><span class="${misterio ? "rv-misterio" : ""}">${avatarPalco(x.p, vertical ? 240 : 200)}</span>
          <div><b style="${tam(x.p.name, 62, 14)}">${misterio ? "???" : esc(x.p.name)}</b><small>${misterio ? "Quem será?" : esc(x.p.category || "")}</small></div></div>
        ${
          misterio
            ? ""
            : `<div class="cn-conta"><svg viewBox="0 0 200 120"><path d="M20 110a80 80 0 0 1 160 0" class="arco"/><path d="M20 110a80 80 0 0 1 160 0" class="arco-cor" pathLength="1"/></svg><i class="agulha" data-a="${ang}"></i><b data-v="${x.v}">0</b><small>${esc(met.unidade)}</small></div>`
        }</div>`;
    },
    animar(el, x, palco) {
      const c = el.querySelector(".cn-pista-card");
      A(c, [{ transform: "translateX(900px) skewX(-25deg)", opacity: 0, filter: "blur(6px)" }, { transform: "translateX(-30px) skewX(6deg)", opacity: 1, filter: "blur(0)", offset: 0.7 }, { transform: "none" }], { duration: 750, easing: "ease-out" });
      palco.tocar("pneu", {}, 0.35);
      const ag = c.querySelector(".agulha");
      if (ag) {
        const a = Number(ag.dataset.a);
        A(ag, [{ transform: "rotate(-120deg)" }, { transform: `rotate(${a + 10}deg)`, offset: 0.75 }, { transform: `rotate(${a}deg)` }], { duration: 1400, delay: 450, easing: "ease-out" });
        A(c.querySelector(".arco-cor"), [{ strokeDashoffset: 1 }, { strokeDashoffset: 1 - (a + 120) / 240 }], { duration: 1200, delay: 450, easing: "ease-out" });
        palco.tocar("motor", {}, 0.5);
      }
    },
    luta: { modo: "progresso", classe: "bt-corrida", pista: true, unidade: "metros", anuncios: { inicio: ["Às grelhas", "Partida!"], final: "Última volta", fim: "Bandeira de xadrez", ko: "Bandeira de xadrez", vitoriaKo: "Primeiro a cortar a meta", vitoriaPontos: "Vitória na corrida" } },
  },

  // ------------------------------------------------------------------ Cozinha
  cozinha: {
    async abertura(palco, { etiqueta, titulo, sub }) {
      await abrir(
        palco,
        `<div class="cn cn-menu"><div class="cn-quadro"><small>${esc(etiqueta || "Menu do dia")}</small>
          <h1>${titulo
            .split("\n")
            .map((l) => `<span>${esc(l)}</span>`)
            .join("")}</h1>${sub ? `<p>${esc(sub)}</p>` : ""}<i class="cn-garfo">🍴</i></div>
          <div class="cn-vapor"><i></i><i></i><i></i></div></div>`,
        (r) => {
          A(r.querySelector(".cn-quadro"), [{ transform: "rotate(-8deg) translateY(-600px)" }, { transform: "rotate(-2deg) translateY(0)" }], { duration: 800, easing: "cubic-bezier(.3,1.4,.5,1)" });
          todos(r, ".cn-quadro h1 span").forEach((s, i) => A(s, [{ clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0 0 0)" }], { duration: 700, delay: 900 + i * 600, easing: "steps(12)" }));
          palco.tocar("fritar", {}, 0.2);
          palco.tocar("ding", {}, 0.9);
        },
        { dur: 4300 },
      );
    },
    cartao(x, { met, misterio, vertical }) {
      const estrelas = Math.max(1, 6 - Math.min(5, Math.ceil(x.pos / 2)));
      return `<div class="cn-prato">
        <div class="cn-mesa"><div class="cn-pratinho"><span class="${misterio ? "rv-misterio" : ""}">${avatarPalco(x.p, vertical ? 260 : 220)}</span></div><div class="cn-campanula"><i></i></div></div>
        <div class="cn-ementa"><small>Prato n.º ${x.pos}</small><b style="${tam(x.p.name, 54, 12)}">${misterio ? "???" : esc(x.p.name)}</b>
          ${misterio ? `<span>Quem será o chef?</span>` : `<span><b data-v="${x.v}">0</b> ${esc(met.unidade)}</span><em>${"★".repeat(estrelas)}</em>`}</div></div>`;
    },
    animar(el, x, palco) {
      const c = el.querySelector(".cn-prato");
      A(c, [{ transform: "translateY(80px)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 500, easing: "ease-out" });
      A(c.querySelector(".cn-campanula"), [{ transform: "none" }, { transform: "translateY(-20px) rotate(-4deg)", offset: 0.35 }, { transform: "translate(260px,-420px) rotate(30deg)", opacity: 0 }], { duration: 1100, delay: 500, easing: "cubic-bezier(.4,0,.2,1)" });
      palco.tocar("ding", {}, 0.6);
      A(c.querySelector(".cn-ementa"), [{ transform: "translateX(60px)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 600, delay: 900 });
    },
    luta: { modo: "progresso", classe: "bt-cozinha", unidade: "pontos dos jurados", anuncios: { inicio: ["Cozinheiros, preparar", "Mãos à obra!"], final: "Prova final", fim: "Os jurados decidiram", ko: "Prato perfeito!", vitoriaKo: "Prato perfeito", vitoriaPontos: "Vitória dos jurados" } },
  },

  // ------------------------------------------------------------------ Girly
  girly: {
    async abertura(palco, { etiqueta, titulo, sub }) {
      await abrir(
        palco,
        `<div class="cn cn-revista-ab"><div class="cn-capa"><div class="cn-mancheta">PLACAR</div><small>${esc(etiqueta || "Edição especial")}</small>
          <h1>${linhasTitulo(titulo)}</h1>${sub ? `<p>${esc(sub)}</p>` : ""}<span class="cn-autocolante">Exclusivo!</span></div></div>`,
        (r) => {
          A(r.querySelector(".cn-capa"), [{ transform: "perspective(1400px) rotateY(-95deg)", transformOrigin: "left center" }, { transform: "perspective(1400px) rotateY(0)", transformOrigin: "left center" }], { duration: 900, easing: "cubic-bezier(.2,1.1,.3,1)" });
          A(r.querySelector(".cn-autocolante"), [{ transform: "scale(0) rotate(-40deg)" }, { transform: "scale(1) rotate(12deg)" }], { duration: 600, delay: 1300, easing: "cubic-bezier(.2,1.6,.4,1)" });
          palco.tocar("virar");
          palco.tocar("fofo", {}, 1.2);
        },
        { dur: 4000 },
      );
    },
    cartao(x, { met, misterio, vertical }) {
      return `<div class="cn-revista">
        <div class="cn-mancheta">PLACAR</div>
        <span class="cn-capa-foto ${misterio ? "rv-misterio" : ""}">${avatarPalco(x.p, vertical ? 360 : 300)}</span>
        <div class="cn-linhas"><small>A n.º ${x.pos} do mês</small><b style="${tam(x.p.name, 66, 13)}">${misterio ? "???" : esc(x.p.name)}</b></div>
        ${misterio ? "" : `<div class="cn-selo"><b data-v="${x.v}">0</b><small>${esc(met.unidade)}</small></div>`}</div>`;
    },
    animar(el, x, palco) {
      const c = el.querySelector(".cn-revista");
      A(c, [{ transform: "perspective(1400px) rotateY(-90deg)", transformOrigin: "left center", opacity: 0 }, { transform: "perspective(1400px) rotateY(0)", transformOrigin: "left center", opacity: 1 }], { duration: 800, easing: "cubic-bezier(.2,1.1,.3,1)" });
      A(c.querySelector(".cn-selo"), [{ transform: "scale(0) rotate(-30deg)" }, { transform: "scale(1) rotate(10deg)" }], { duration: 600, delay: 900, easing: "cubic-bezier(.2,1.6,.4,1)" });
      palco.tocar("virar");
    },
    luta: { modo: "progresso", classe: "bt-coracoes", unidade: "corações", anuncios: { inicio: ["Quem é a mais fofa?", "Votem com o coração!"], final: "Último coração", fim: "Contagem final", ko: "Coração cheio!", vitoriaKo: "Coração cheio", vitoriaPontos: "Mais corações" } },
  },

  // ------------------------------------------------------------------ Inferno (luta épica)
  inferno: {
    async abertura(palco, { etiqueta, titulo, sub }) {
      await abrir(
        palco,
        `<div class="cn cn-fogo-ab"><small class="cn-prepara">${esc(etiqueta || "Prepara-te")}</small><h1>${linhasTitulo(titulo)}</h1>${sub ? `<p>${esc(sub)}</p>` : ""}<div class="cn-labaredas">${Array.from({ length: 18 }, (_, i) => `<i style="--i:${i}"></i>`).join("")}</div></div>`,
        (r) => {
          A(r.querySelector("h1"), [{ transform: "scale(3)", opacity: 0, filter: "blur(12px) brightness(3)" }, { transform: "scale(1)", opacity: 1, filter: "blur(0) brightness(1)" }], { duration: 700, delay: 600, easing: "cubic-bezier(.2,1.2,.4,1)" });
          A(r.querySelector(".cn-prepara"), [{ opacity: 0, letterSpacing: "1em" }, { opacity: 1, letterSpacing: ".4em" }], { duration: 900 });
          setTimeout(() => {
            if (palco.terminado) return;
            palco.tocar("trovao");
            palco.tocar("fogo", {}, 0.1);
            palco.tremer(1.2);
            palco.flash(0.7);
            palco.explodir(palco.L / 2, palco.A * 0.45, { n: 160 });
          }, 650);
        },
        { dur: 4000 },
      );
    },
    cartao(x, { met, misterio, vertical, max }) {
      return `<div class="cn-lutador">
        <div class="cn-moldura-fogo"><span class="${misterio ? "rv-misterio" : ""}">${avatarPalco(x.p, vertical ? 320 : 280)}</span></div>
        <div class="cn-placa-metal"><small>Lutador n.º ${x.pos}</small><b style="${tam(x.p.name, 60, 11)}">${misterio ? "???" : esc(x.p.name)}</b></div>
        ${misterio ? "" : `<div class="cn-poder"><span>Poder</span><div><i style="--p:${Math.round(100 * Math.min(1, x.v / (max || x.v || 1)))}%"></i></div><b data-v="${x.v}">0</b></div>`}</div>`;
    },
    animar(el, x, palco) {
      const c = el.querySelector(".cn-lutador");
      A(c, [{ transform: "translateY(-700px) scale(1.2)" }, { transform: "translateY(20px) scale(1)", offset: 0.7 }, { transform: "none" }], { duration: 600, easing: "cubic-bezier(.6,0,.4,1)" });
      setTimeout(() => {
        if (palco.terminado) return;
        palco.tremer(0.8);
        palco.tocar("golpe");
        palco.tocar("fogo", {}, 0.05);
      }, 420);
      const barra = c.querySelector(".cn-poder i");
      if (barra) A(barra, [{ width: "0%" }, { width: pct(barra) }], { duration: 1200, delay: 600, easing: "cubic-bezier(.3,1.2,.5,1)" });
    },
    luta: { modo: "vida", classe: "bt-luta", cronometro: true, anuncios: { inicio: ["Ronda 1", "Lutem!"], final: "Golpe final", fim: "Tempo!", ko: "K.O.", vitoriaKo: "Vitória por K.O.", vitoriaPontos: "Vitória por pontos" } },
  },

  // ------------------------------------------------------------------ YouTube
  youtube: {
    async abertura(palco, { etiqueta, titulo, sub }) {
      await abrir(
        palco,
        `<div class="cn cn-leitor-ab"><div class="cn-leitor"><div class="cn-ecra"><i class="cn-roda"></i><span class="cn-play"></span><h1>${linhasTitulo(titulo)}</h1></div>
          <div class="cn-barra"><i></i></div>
          <div class="cn-info"><b>${esc(String(titulo).replace(/\n/g, " "))}</b><small>${esc(sub || etiqueta || "")}</small><span class="cn-sub-btn">Subscrever</span></div></div></div>`,
        (r) => {
          A(r.querySelector(".cn-leitor"), [{ transform: "scale(.7)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 600, easing: "cubic-bezier(.2,1.2,.4,1)" });
          A(r.querySelector(".cn-roda"), [{ opacity: 1, rotate: "0deg" }, { opacity: 1, rotate: "720deg", offset: 0.95 }, { opacity: 0, rotate: "760deg" }], { duration: 1300, delay: 300 });
          A(r.querySelector(".cn-play"), [{ transform: "scale(0)", opacity: 0 }, { transform: "scale(1.2)", opacity: 1, offset: 0.6 }, { transform: "scale(1)", opacity: 0 }], { duration: 900, delay: 1600 });
          A(r.querySelector(".cn-ecra h1"), [{ opacity: 0, transform: "translateY(40px)" }, { opacity: 1, transform: "none" }], { duration: 700, delay: 2200 });
          A(r.querySelector(".cn-barra i"), [{ width: "0%" }, { width: "100%" }], { duration: 3600, delay: 1600, easing: "linear" });
          palco.tocar("clique", {}, 1.6);
          palco.tocar("sino", {}, 2.6);
        },
        { dur: 4200 },
      );
    },
    cartao(x, { met, misterio, vertical }) {
      return `<div class="cn-video">
        <div class="cn-mini"><span class="cn-mini-fundo"></span><span class="${misterio ? "rv-misterio" : ""}">${avatarPalco(x.p, vertical ? 300 : 240)}</span><b class="cn-n">#${x.pos}</b><i class="cn-dur">N.º ${x.pos}</i><i class="cn-prog"></i></div>
        <div class="cn-video-info">${misterio ? `<span class="avatar" style="--tam:70px;background:#444">?</span>` : avatar(x.p, 70)}<div><b>${misterio ? "Quem será? 👀" : `${esc(x.p.name)}: o n.º ${x.pos}`}</b>
          ${misterio ? "" : `<small><span data-v="${x.v}">0</span> ${esc(met.unidade)} · ${esc(x.p.category || "Youtuber")}</small>`}</div></div></div>`;
    },
    animar(el, x, palco) {
      const c = el.querySelector(".cn-video");
      A(c, [{ transform: "translateY(120px) scale(.9)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 650, easing: "cubic-bezier(.2,1.2,.4,1)" });
      A(c.querySelector(".cn-prog"), [{ width: "0%" }, { width: `${Math.max(12, 100 - (x.pos - 1) * 9)}%` }], { duration: 1500, delay: 500, easing: "ease-out" });
      palco.tocar("bolha", {}, 0.2);
    },
    luta: { modo: "progresso", classe: "bt-views", unidade: "pontos de tendência", anuncios: { inicio: ["Batalha de views", "Carrega no play!"], final: "Último vídeo", fim: "Fim da transmissão", ko: "Em alta n.º 1", vitoriaKo: "Em alta n.º 1", vitoriaPontos: "Mais views" } },
  },

  // ------------------------------------------------------------------ Gaming
  gaming: {
    async abertura(palco, { etiqueta, titulo, sub }) {
      await abrir(
        palco,
        `<div class="cn cn-arcada-ab"><div class="cn-press">PRESS START</div><div class="cn-carregar"><i></i></div>
          <h1>${linhasTitulo(titulo)}</h1>${sub ? `<p>${esc(sub)}</p>` : ""}<small>${esc(etiqueta || "")}</small></div>`,
        (r) => {
          A(r.querySelector(".cn-press"), [{ opacity: 1 }, { opacity: 0 }, { opacity: 1 }], { duration: 400, iterations: 3, easing: "steps(2)" });
          palco.tocar("moeda", {}, 0.3);
          A(r.querySelector(".cn-press"), [{ opacity: 1 }, { opacity: 0 }], { duration: 150, delay: 1250, fill: "forwards" });
          A(r.querySelector(".cn-carregar"), [{ opacity: 0 }, { opacity: 1 }], { duration: 100, delay: 1300 });
          A(r.querySelector(".cn-carregar i"), [{ width: "0%" }, { width: "100%" }], { duration: 900, delay: 1350, easing: "steps(10)" });
          A(r.querySelector(".cn-carregar"), [{ opacity: 1 }, { opacity: 0 }], { duration: 100, delay: 2300, fill: "forwards" });
          A(r.querySelector("h1"), [{ transform: "scale(0)", opacity: 0 }, { transform: "scale(1.15)", opacity: 1, offset: 0.7 }, { transform: "scale(1)" }], { duration: 500, delay: 2350, easing: "steps(6)" });
          palco.tocar("powerup", {}, 2.35);
        },
        { dur: 4300 },
      );
    },
    cartao(x, { met, misterio, vertical, max }) {
      const raridade = x.pos <= 3 ? ["lendario", "Lendário"] : x.pos <= 6 ? ["epico", "Épico"] : x.pos <= 10 ? ["raro", "Raro"] : ["comum", "Comum"];
      const forca = Math.round(100 * Math.min(1, x.v / (max || x.v || 1)));
      return `<div class="cn-carta ${raridade[0]}">
        <div class="cn-raridade">${raridade[1]}</div>
        <span class="${misterio ? "rv-misterio" : ""}">${avatarPalco(x.p, vertical ? 240 : 170)}</span>
        <div class="cn-carta-nome" style="${tam(x.p.name, 50, 12)}">${misterio ? "???" : esc(x.p.name)}</div>
        <div class="cn-stats">
          <div><span>NÍVEL</span><b>${Math.max(1, 100 - x.pos)}</b></div>
          ${misterio ? "" : `<div><span>PODER</span><i style="--p:${forca}%"></i></div><div><span>VALOR</span><b data-v="${x.v}">0</b></div>`}
        </div></div>`;
    },
    animar(el, x, palco) {
      const c = el.querySelector(".cn-carta");
      A(c, [{ transform: "rotateY(720deg) scale(.2)", opacity: 0, filter: "brightness(4)" }, { transform: "rotateY(0) scale(1)", opacity: 1, filter: "brightness(1)" }], { duration: 900, easing: "cubic-bezier(.2,1,.3,1)" });
      palco.tocar(x.pos <= 3 ? "powerup" : "moeda", {}, 0.5);
      if (x.pos <= 3) setTimeout(() => !palco.terminado && palco.flash(0.5), 700);
      todos(c, ".cn-stats i").forEach((i) => A(i, [{ width: "0%" }, { width: pct(i) }], { duration: 900, delay: 800, easing: "steps(10)" }));
    },
    luta: { modo: "vida", classe: "bt-pixel", cronometro: true, anuncios: { inicio: ["Jogador 1 vs Jogador 2", "FIGHT!"], final: "Última vida", fim: "TIME OVER", ko: "K.O.", vitoriaKo: "Perfeito: K.O.", vitoriaPontos: "Vitória nos pontos" } },
  },

  // ------------------------------------------------------------------ Comédia
  comedia: {
    async abertura(palco, { etiqueta, titulo, sub }) {
      await abrir(
        palco,
        `<div class="cn cn-bd-ab">
          <div class="cn-vinheta v1"><span class="cn-legenda">${esc(etiqueta || "Entretanto…")}</span></div>
          <div class="cn-vinheta v2"><span class="cn-pow">POW!</span></div>
          <div class="cn-vinheta v3"><div class="cn-balao"><h1>${linhasTitulo(titulo)}</h1>${sub ? `<p>${esc(sub)}</p>` : ""}</div></div></div>`,
        (r) => {
          todos(r, ".cn-vinheta").forEach((v, i) => {
            A(v, [{ transform: "scale(0) rotate(-12deg)", opacity: 0 }, { transform: "scale(1) rotate(0)", opacity: 1 }], { duration: 450, delay: 150 + i * 650, easing: "cubic-bezier(.2,1.6,.4,1)" });
            setTimeout(() => !palco.terminado && palco.tocar(i === 1 ? "golpe" : "boing"), 150 + i * 650);
          });
        },
        { dur: 4200 },
      );
    },
    cartao(x, { met, misterio, vertical }) {
      return `<div class="cn-painel-bd">
        <span class="cn-legenda">N.º ${x.pos}</span>
        <span class="${misterio ? "rv-misterio" : ""}">${avatarPalco(x.p, vertical ? 300 : 250)}</span>
        <div class="cn-balao fala"><b style="${tam(x.p.name, 56, 12)}">${misterio ? "Quem sou eu?!" : esc(x.p.name)}</b>${misterio ? "" : `<small><span data-v="${x.v}">0</span> ${esc(met.unidade)}!</small>`}</div>
        <span class="cn-bam">${["BAM!", "UAU!", "ZÁS!", "POW!"][x.pos % 4]}</span></div>`;
    },
    animar(el, x, palco) {
      const c = el.querySelector(".cn-painel-bd");
      A(c, [{ transform: "rotate(-14deg) scale(.4)", opacity: 0 }, { transform: "rotate(-2deg) scale(1)", opacity: 1 }], { duration: 550, easing: "cubic-bezier(.2,1.6,.4,1)" });
      A(c.querySelector(".cn-balao"), [{ transform: "scale(0)" }, { transform: "scale(1)" }], { duration: 400, delay: 500, easing: "cubic-bezier(.2,1.6,.4,1)" });
      A(c.querySelector(".cn-bam"), [{ transform: "scale(0) rotate(30deg)" }, { transform: "scale(1) rotate(-10deg)" }], { duration: 400, delay: 800, easing: "cubic-bezier(.2,1.8,.4,1)" });
      palco.tocar("boing", {}, 0.1);
      palco.tocar("golpe", {}, 0.8);
    },
    luta: { modo: "progresso", classe: "bt-risos", unidade: "gargalhadas", anuncios: { inicio: ["Duelo de piadas", "Que comece o riso!"], final: "A piada final", fim: "Fim do espetáculo", ko: "Morreu a rir!", vitoriaKo: "Morreu a rir", vitoriaPontos: "Mais gargalhadas" } },
  },

  // ------------------------------------------------------------------ Vlog
  vlog: {
    async abertura(palco, { etiqueta, titulo, sub }) {
      await abrir(
        palco,
        `<div class="cn cn-camara-ab"><div class="cn-visor"><span class="cn-rec"><i></i>REC</span><span class="cn-tempo">00:00:00</span><i class="cn-canto a"></i><i class="cn-canto b"></i><i class="cn-canto c"></i><i class="cn-canto d"></i><i class="cn-foco"></i>
          <div class="cn-sticker"><h1>${linhasTitulo(titulo)}</h1>${sub ? `<p>${esc(sub)}</p>` : ""}</div></div></div>`,
        (r) => {
          const t = r.querySelector(".cn-tempo");
          let s = 0;
          const id = setInterval(() => {
            if (palco.terminado || !document.body.contains(t)) return clearInterval(id);
            if (!palco.pausado) t.textContent = `00:00:0${Math.min(9, ++s)}`;
          }, 450);
          A(r.querySelector(".cn-foco"), [{ transform: "scale(1.6)", opacity: 0 }, { transform: "scale(1)", opacity: 1, offset: 0.5 }, { transform: "scale(.95)", opacity: 0.6 }], { duration: 900, delay: 300 });
          A(r.querySelector(".cn-sticker"), [{ transform: "scale(0) rotate(-10deg)" }, { transform: "scale(1) rotate(-3deg)" }], { duration: 600, delay: 1300, easing: "cubic-bezier(.2,1.6,.4,1)" });
          palco.tocar("camara", {}, 1.1);
          setTimeout(() => !palco.terminado && palco.flash(0.6), 1100);
        },
        { dur: 4000 },
      );
    },
    cartao(x, { met, misterio, vertical, total }) {
      const seg = Math.min(10, total || 10);
      return `<div class="cn-story">
        <div class="cn-segmentos">${Array.from({ length: seg }, (_, i) => `<i class="${seg - i > x.pos ? "" : seg - i === x.pos ? "agora" : "feito"}"></i>`).join("")}</div>
        <div class="cn-story-topo">${misterio ? `<span class="avatar" style="--tam:56px;background:#444">?</span>` : avatar(x.p, 56)}<b>${misterio ? "???" : esc(x.p.name)}</b><small>agora</small></div>
        <span class="cn-story-foto ${misterio ? "rv-misterio" : ""}">${avatarPalco(x.p, vertical ? 330 : 260)}</span>
        <span class="cn-st pin">📍 ${x.pos}.º lugar</span>
        ${misterio ? "" : `<span class="cn-st valor"><b data-v="${x.v}">0</b> ${esc(met.unidade)}</span>`}</div>`;
    },
    animar(el, x, palco) {
      const c = el.querySelector(".cn-story");
      A(c, [{ transform: "translateY(110%)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 600, easing: "cubic-bezier(.2,1,.3,1)" });
      const agora = c.querySelector(".cn-segmentos .agora");
      if (agora) A(agora, [{ backgroundSize: "0% 100%" }, { backgroundSize: "100% 100%" }], { duration: 3200, easing: "linear" });
      todos(c, ".cn-st").forEach((s, i) => A(s, [{ transform: "scale(0) rotate(-20deg)" }, { transform: "scale(1) rotate(-4deg)" }], { duration: 450, delay: 700 + i * 250, easing: "cubic-bezier(.2,1.6,.4,1)" }));
      palco.tocar("whoosh", { dur: 0.4 });
    },
    luta: { modo: "progresso", classe: "bt-gostos", unidade: "gostos", anuncios: { inicio: ["Story contra story", "A gravar!"], final: "Último story", fim: "Fim do vlog", ko: "Viral!", vitoriaKo: "Ficou viral", vitoriaPontos: "Mais gostos" } },
  },

  // ------------------------------------------------------------------ Tech
  tech: {
    async abertura(palco, { etiqueta, titulo, sub }) {
      const linhas = ["> a ligar o placar…", "> a ler os dados do YouTube… OK", "> a calcular o ranking… OK"];
      await abrir(
        palco,
        `<div class="cn cn-terminal-ab"><div class="cn-term"><div class="cn-term-topo"><i></i><i></i><i></i><span>placar.sh</span></div>
          <div class="cn-term-corpo">${linhas.map((l) => `<p class="ln">${esc(l)}</p>`).join("")}<h1>${linhasTitulo(titulo)}<i class="cursor"></i></h1>${sub ? `<p class="sub">${esc(sub)}</p>` : ""}<small>${esc(etiqueta || "")}</small></div></div></div>`,
        (r) => {
          todos(r, ".ln").forEach((l, i) => {
            A(l, [{ clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0 0 0)" }], { duration: 450, delay: 200 + i * 450, easing: "steps(20)" });
            setTimeout(() => !palco.terminado && palco.tocar("bip"), 200 + i * 450);
          });
          A(r.querySelector("h1"), [{ opacity: 0, transform: "translateY(20px)" }, { opacity: 1, transform: "none" }], { duration: 500, delay: 1700 });
          palco.tocar("laser", {}, 1.7);
        },
        { dur: 4200 },
      );
    },
    cartao(x, { met, misterio, vertical, max }) {
      const des = Math.round(100 * Math.min(1, x.v / (max || x.v || 1)));
      return `<div class="cn-ficha">
        <div class="cn-ficha-topo"><span>FICHA TÉCNICA</span><b>#${x.pos}</b></div>
        <div class="cn-ficha-corpo"><span class="cn-chip ${misterio ? "rv-misterio" : ""}">${avatarPalco(x.p, vertical ? 220 : 190)}</span>
          <dl><dt>Modelo</dt><dd style="${tam(x.p.name, 46, 14)}">${misterio ? "???" : esc(x.p.name)}</dd><dt>Série</dt><dd>${esc(x.p.category || "Youtuber")}</dd>
          ${misterio ? "" : `<dt>Desempenho</dt><dd><b data-v="${x.v}">0</b> ${esc(met.unidade)}</dd>`}</dl></div>
        ${misterio ? "" : `<div class="cn-bench"><span>Benchmark</span><div><i style="--p:${des}%"></i></div><b>${des}/100</b></div>`}
        <i class="cn-scan"></i></div>`;
    },
    animar(el, x, palco) {
      const c = el.querySelector(".cn-ficha");
      A(c, [{ clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0 0)" }], { duration: 700, easing: "steps(14)" });
      A(c.querySelector(".cn-scan"), [{ top: "0%" }, { top: "100%" }], { duration: 700, easing: "linear" });
      const b = c.querySelector(".cn-bench i");
      if (b) A(b, [{ width: "0%" }, { width: pct(b) }], { duration: 1200, delay: 700, easing: "cubic-bezier(.3,1,.5,1)" });
      palco.tocar("bip", {}, 0.1);
      palco.tocar("laser", {}, 0.7);
    },
    luta: { modo: "progresso", classe: "bt-bench", unidade: "pontos de benchmark", anuncios: { inicio: ["Teste de desempenho", "A correr o benchmark"], final: "Teste final", fim: "Resultados", ko: "Desempenho máximo!", vitoriaKo: "Desempenho máximo", vitoriaPontos: "Mais rápido" } },
  },
};

/** Cena do tema do palco (só no modo "Tema completo"). */
export function cenaDoTema(palco) {
  return palco.kit ? CENAS[palco.tema.id] || null : null;
}
