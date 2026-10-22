// Animações do site (anime.js v4). Tudo respeita "reduzir movimento" do sistema.

import { animate, stagger, spring, utils } from "../vendor/anime.esm.min.js";

export const calmo = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
export const mola = (stiffness = 140, damping = 13) => spring({ stiffness, damping, mass: 1 });

/** Entrada escalonada de uma lista de elementos. */
export function entrar(alvos, { y = 26, atraso = 0, passo = 60, escala = 1, x = 0 } = {}) {
  const els = typeof alvos === "string" ? document.querySelectorAll(alvos) : alvos;
  if (!els || !els.length) return;
  if (calmo()) return;
  return animate(els, {
    opacity: [0, 1],
    translateY: [y, 0],
    translateX: [x, 0],
    scale: [escala, 1],
    delay: stagger(passo, { start: atraso }),
    duration: 900,
    ease: "outExpo",
  });
}

/** Revela blocos à medida que entram no ecrã. */
export function revelarAoScroll(root) {
  if (calmo() || !("IntersectionObserver" in window)) return () => {};
  const seletores = [
    ".secao-cabeca",
    ".numeros > .numero",
    ".perguntas > .pergunta",
    ".projetos-grelha > *",
    ".grelha-2 > *",
    ".tabela-caixa",
    ".caixa-grafico",
    ".painel",
    ".videos-grelha > *",
    ".redes > *",
    ".palco-lista > *",
    ".recordes > *",
    ".aviso",
    ".vazio",
  ];
  const els = [...root.querySelectorAll(seletores.join(","))].filter((el) => !el.closest(".janela"));
  for (const el of els) el.style.opacity = "0";
  const pendentes = new Set();
  let agendado = false;
  const io = new IntersectionObserver(
    (entradas) => {
      for (const e of entradas) {
        if (!e.isIntersecting) continue;
        io.unobserve(e.target);
        pendentes.add(e.target);
      }
      if (!agendado && pendentes.size) {
        agendado = true;
        requestAnimationFrame(() => {
          const lote = [...pendentes];
          pendentes.clear();
          agendado = false;
          animate(lote, {
            opacity: [0, 1],
            translateY: [34, 0],
            scale: [0.97, 1],
            delay: stagger(70),
            duration: 1000,
            ease: "outExpo",
            onComplete: () => lote.forEach((el) => (el.style.transform = "")),
          });
        });
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
  );
  els.forEach((el) => io.observe(el));
  return () => io.disconnect();
}

/** Grelha de pontos com uma onda que parte do centro (como no animejs.com). */
export function grelhaPontos(alvo, { colunas = 28, linhas = 12 } = {}) {
  alvo.style.gridTemplateColumns = `repeat(${colunas}, 1fr)`;
  alvo.style.gridTemplateRows = `repeat(${linhas}, 1fr)`;
  alvo.innerHTML = "<i></i>".repeat(colunas * linhas);
  if (calmo()) return { onda() {}, parar() {} };
  const pontos = alvo.querySelectorAll("i");
  const loop = animate(pontos, {
    scale: [
      { to: 2.4, duration: 520, ease: "outSine" },
      { to: 1, duration: 900, ease: "inOutQuad" },
    ],
    opacity: [
      { to: 0.75, duration: 520 },
      { to: 0.16, duration: 900 },
    ],
    delay: stagger(70, { grid: [colunas, linhas], from: "center" }),
    loop: true,
    loopDelay: 2200,
  });
  return {
    /** Onda extra a partir de um índice (por exemplo do lado de um botão). */
    onda(de = "center") {
      animate(pontos, {
        translateY: [{ to: -8, duration: 260, ease: "outQuad" }, { to: 0, duration: 700, ease: mola(160, 9) }],
        delay: stagger(28, { grid: [colunas, linhas], from: de }),
      });
    },
    parar() {
      loop.pause();
    },
  };
}

/** Luz que segue o rato dentro de uma área. */
export function luzQueSegue(area, luz) {
  if (calmo()) return () => {};
  const mover = (e) => {
    const r = area.getBoundingClientRect();
    animate(luz, { left: e.clientX - r.left, top: e.clientY - r.top, duration: 1400, ease: "outExpo" });
  };
  area.addEventListener("pointermove", mover);
  return () => area.removeEventListener("pointermove", mover);
}

/** Título que sobe linha a linha, com máscara. */
export function tituloEmLinhas(h1) {
  if (calmo()) return;
  const partes = h1.querySelectorAll(".linha-titulo > span");
  animate(partes, { translateY: ["110%", "0%"], rotate: [6, 0], delay: stagger(120, { start: 120 }), duration: 1200, ease: "outExpo" });
}

/** Linhas do placar a entrar com mola, barras a encher e posições a girar. */
export function placarEntra(quadro) {
  const linhas = quadro.querySelectorAll(".quadro-linha");
  const barras = quadro.querySelectorAll(".barra-fundo");
  if (calmo()) {
    barras.forEach((b) => (b.style.transform = `scaleX(${b.dataset.k})`));
    return;
  }
  animate(linhas, { opacity: [0, 1], translateX: [60, 0], delay: stagger(55), duration: 1100, ease: mola(120, 14) });
  animate(quadro.querySelectorAll(".quadro-pos"), { rotate: [-180, 0], scale: [0.2, 1], delay: stagger(55, { start: 120 }), duration: 900, ease: mola(150, 11) });
  barras.forEach((b, i) => animate(b, { scaleX: [0, Number(b.dataset.k)], delay: 200 + i * 55, duration: 1400, ease: "outExpo" }));
}

/** Pílula da navegação que desliza até ao separador ativo. */
export function pilulaNav(nav) {
  let pil = nav.querySelector(".nav-pilula");
  if (!pil) {
    pil = document.createElement("span");
    pil.className = "nav-pilula";
    nav.prepend(pil);
  }
  const ativo = nav.querySelector('a[aria-current="page"]');
  if (!ativo) {
    animate(pil, { opacity: 0, duration: 200 });
    return;
  }
  const props = { left: ativo.offsetLeft, width: ativo.offsetWidth, opacity: 1 };
  if (calmo() || pil.style.opacity === "" || pil.style.opacity === "0") {
    utils.set(pil, props);
    if (!calmo()) animate(pil, { scale: [0.6, 1], duration: 600, ease: mola(200, 12) });
    return;
  }
  animate(pil, { ...props, duration: 700, ease: mola(170, 16) });
}

/** Logótipo: o "play" salta e o ponto dourado faz ricochete. */
export function logoEntra(svg) {
  if (calmo() || !svg) return;
  const play = svg.querySelector(".marca-play");
  const ponto = svg.querySelector(".marca-ponto");
  if (play) animate(play, { scale: [0, 1], rotate: [-90, 0], duration: 1200, ease: mola(160, 9), transformOrigin: "50% 50%" });
  if (ponto) animate(ponto, { translateY: [-30, 0], scale: [0, 1], delay: 300, duration: 1300, ease: mola(220, 8) });
}

/** Barras que crescem a partir da base (gráficos D3). */
export function barrasCrescem(svg) {
  if (calmo() || !svg) return;
  const barras = svg.querySelectorAll("path.barra");
  if (!barras.length) return;
  barras.forEach((b) => {
    b.style.transformBox = "fill-box";
    b.style.transformOrigin = "50% 100%";
  });
  animate(barras, { scaleY: [0, 1], delay: stagger(25), duration: 1100, ease: mola(110, 13) });
}

/** Barras horizontais que enchem (partes do Índice, mini barras). */
export function encher(els) {
  if (calmo() || !els?.length) return;
  els.forEach((el) => (el.style.transformOrigin = "left"));
  animate(els, { scaleX: [0, 1], delay: stagger(80, { start: 150 }), duration: 1300, ease: "outExpo" });
}

/** Pequeno salto num elemento (por exemplo ao mudar de mês). */
export function saltar(el) {
  if (calmo() || !el) return;
  animate(el, { scale: [{ to: 0.9, duration: 120 }, { to: 1, duration: 700, ease: mola(260, 10) }] });
}

export { animate, stagger };
