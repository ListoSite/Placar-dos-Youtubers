// Palco: espetáculos em ecrã inteiro para mostrar e gravar (16:9 e 9:16), com temas.

import { estado, pessoa, mesesComDados, procurar } from "../data.js";
import { esc, mesNome } from "../format.js";
import { $, $$, avatar } from "../ui.js";
import { som } from "../audio.js";
import { animate, stagger, spring, engine } from "../../vendor/anime.esm.min.js";
import { TEMAS, tema as temaPorId, cenario } from "./temas.js";
import { Ambiente } from "./ambiente.js";

const I = (d) => `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;

export const GRUPOS = [
  { id: "rankings", nome: "Rankings", texto: "Os números do mês contados com suspense." },
  { id: "jogos", nome: "Jogos", texto: "Para jogar com quem está a ver, em direto ou em vídeo." },
  { id: "duelos", nome: "Duelos", texto: "Frente a frente, até haver um vencedor." },
  { id: "historias", nome: "Histórias", texto: "Um Youtuber em destaque." },
];

export const ESPETACULOS = [
  { id: "revelacao", grupo: "rankings", nome: "Revelação do top", texto: "Do último ao primeiro lugar, com o pódio no fim. Por views, Índice, subscritores ou crescimento.", mod: "./revelacao.js", icone: I(`<path d="M4 42h40M8 42V28h10v14M19 42V18h10v24M30 42V32h10v10"/><path d="m24 4 2.4 4.8 5.3.8-3.8 3.7.9 5.2L24 16l-4.8 2.5.9-5.2-3.8-3.7 5.3-.8z" fill="currentColor" stroke="none"/>`) },
  { id: "corrida", grupo: "rankings", nome: "Corrida das views", texto: "Barras que se ultrapassam mês a mês, com cada mudança de líder em destaque.", mod: "./corrida.js", icone: I(`<path d="M6 6v36h36"/><path d="M12 14h22M12 22h30M12 30h14" stroke-width="5"/>`) },
  { id: "tier", grupo: "rankings", nome: "Tier list", texto: "Cada Youtuber cai na sua fila: S, A, B, C ou D.", mod: "./tier.js", icone: I(`<rect x="5" y="6" width="38" height="9" rx="3"/><rect x="5" y="19" width="38" height="9" rx="3"/><rect x="5" y="32" width="38" height="9" rx="3"/><path d="M12 6v9M12 19v9M12 32v9"/>`) },
  { id: "altos", grupo: "rankings", nome: "Altos e baixos", texto: "Quem subiu e quem caiu mais no ranking do mês.", mod: "./altos.js", icone: I(`<path d="M10 34 22 20l7 7 11-15"/><path d="M32 12h8v8"/><path d="M8 42h32"/>`) },
  { id: "quiz", grupo: "jogos", nome: "Quem fez mais?", texto: "Perguntas variadas, 5 segundos para pensar e a resposta revelada.", mod: "./quiz.js", icone: I(`<circle cx="24" cy="24" r="19"/><path d="M18 18a6 6 0 1 1 9 5.2c-2 1.2-3 2.3-3 4.8"/><circle cx="24" cy="35" r="1.8" fill="currentColor"/>`) },
  { id: "maismenos", grupo: "jogos", nome: "Mais ou menos", texto: "Mais ou menos views do que o anterior? Uma corrente sem fim.", mod: "./maismenos.js", icone: I(`<path d="M24 6 12 20h24zM24 42 12 28h24z"/>`) },
  { id: "adivinha", grupo: "jogos", nome: "Adivinha quem é", texto: "Foto desfocada e pistas uma a uma. Quem adivinha primeiro?", mod: "./adivinha.js", icone: I(`<circle cx="24" cy="18" r="9"/><path d="M8 42c2-9 9-13 16-13s14 4 16 13"/><path d="M33 6l6 6M39 6l-6 6"/>`) },
  { id: "roda", grupo: "jogos", nome: "Roda da sorte", texto: "A roda gira e escolhe um Youtuber ao acaso. Depois, os números dele.", mod: "./roda.js", icone: I(`<circle cx="24" cy="26" r="17"/><path d="M24 9v34M7 26h34M12 14l24 24M36 14 12 38"/><path d="M20 3h8l-4 6z" fill="currentColor"/>`) },
  { id: "batalha", grupo: "duelos", nome: "Batalha", texto: "Combate com barras de vida: cada ronda ganha tira vida ao outro, até ao K.O.", mod: "./batalha.js", icone: I(`<path d="M6 6l20 20M42 6 22 26M10 30l8 8M38 30l-8 8M14 34l-6 6M34 34l6 6"/>`) },
  { id: "torneio", grupo: "duelos", nome: "Torneio", texto: "8 ou 16 Youtubers em eliminatórias até à grande final.", mod: "./torneio.js", icone: I(`<path d="M5 9h8v10h7M5 29h8V19M20 14v10h8M5 33h8v6h7M20 34V24"/><path d="M33 17h10v6a5 5 0 0 1-10 0z" fill="currentColor" stroke="none"/><path d="M38 28v6M34 37h8"/>`) },
  { id: "cartao", grupo: "historias", nome: "Cartão de Youtuber", texto: "Um Youtuber em destaque, com o Índice e os números mais importantes.", mod: "./cartao.js", icone: I(`<rect x="5" y="9" width="38" height="30" rx="5"/><circle cx="17" cy="21" r="5"/><path d="M10 33c2-4 12-4 14 0M29 19h9M29 26h9"/>`) },
  { id: "historia", grupo: "historias", nome: "A história de…", texto: "O percurso de um Youtuber mês a mês, com os momentos marcantes.", mod: "./historia.js", icone: I(`<path d="M5 38c6-2 8-14 14-14s7 8 12 8 6-16 12-22"/><circle cx="43" cy="10" r="3" fill="currentColor"/><path d="M5 43h38"/>`) },
];

class Abortado extends Error {}

const VELOCIDADE = { rapido: 0.72, normal: 1, lento: 1.35 };

/** Motor do palco: escala a tela, controla tempo, pausa, avanço, tema e efeitos. */
export class Palco {
  static atual = null;

  constructor({ formato = "16x9", manual = false, tema = "rubi", velocidade = "normal" }) {
    Palco.atual = this;
    this.formato = formato;
    this.vertical = formato === "9x16";
    this.manual = manual;
    this.tema = temaPorId(tema);
    this.fator = VELOCIDADE[velocidade] || 1;
    this.L = this.vertical ? 1080 : 1920;
    this.A = this.vertical ? 1920 : 1080;
    this.pausado = false;
    this.terminado = false;
    this.esperas = new Set();
    this.ouvintes = new Set();
    this.raiz = document.createElement("div");
    this.raiz.className = "palco";
    this.raiz.innerHTML = `
      <div class="palco-tela tema-${this.tema.id} ${this.vertical ? "vertical" : "horizontal"}" style="width:${this.L}px;height:${this.A}px">
        <div class="palco-ondas"></div>
        <div class="palco-decor">${cenario(this.tema.id)}</div>
        <canvas class="palco-particulas"></canvas>
        <div class="palco-mundo"><div class="palco-cena"></div></div>
        <div class="palco-flash"></div>
        <div class="palco-marca"><svg viewBox="0 0 40 40" aria-hidden="true"><defs><linearGradient id="lg-stage" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff4d70"/><stop offset=".55" stop-color="#c3123e"/><stop offset="1" stop-color="#6e0820"/></linearGradient></defs><rect width="40" height="40" rx="13" fill="url(#lg-stage)"/><path class="marca-play" d="M16 12.6c0-1.5 1.6-2.4 2.9-1.6l10.1 6.4c1.2.8 1.2 2.5 0 3.3l-10.1 6.4c-1.3.8-2.9-.1-2.9-1.6z" fill="#fff"/><circle class="marca-ponto" cx="32" cy="8" r="4.2" fill="#f4b942" stroke="#12060b" stroke-width="2"/></svg><span>Placar dos Youtubers</span></div>
      </div>
      <div class="palco-controlos">
        <button data-acao="sair" title="Sair (Esc)">Sair</button>
        <button data-acao="pausa" title="Pausa (P)">Pausa</button>
        <button data-acao="seguinte" title="Avançar (espaço ou seta)">Avançar</button>
        <button data-acao="som" title="Som (M)"></button>
        <button data-acao="ecra" title="Ecrã inteiro (F)">Ecrã inteiro</button>
        <span class="palco-dica">${manual ? "Modo manual: carrega no espaço para avançar." : "Espaço para saltar, P para pausa, H para esconder isto."}</span>
      </div>`;
    this.tela = $(".palco-tela", this.raiz);
    this.mundo = $(".palco-mundo", this.raiz);
    this.cena = $(".palco-cena", this.raiz);
    this.flashEl = $(".palco-flash", this.raiz);
    document.body.appendChild(this.raiz);
    document.body.classList.add("modo-palco");
    this.ambiente = new Ambiente($(".palco-particulas", this.raiz), this, this.tema);

    this._escala = () => {
      const k = Math.min(innerWidth / this.L, innerHeight / this.A);
      this.tela.style.transform = `translate(-50%,-50%) scale(${k})`;
    };
    this._escala();
    addEventListener("resize", this._escala);

    // No telemóvel, o botão "voltar" fecha o Palco em vez de sair da página.
    history.pushState({ palco: true }, "");
    this._voltar = () => this.sair(true);
    addEventListener("popstate", this._voltar);

    this._tecla = (e) => {
      for (const f of this.ouvintes) if (f({ tecla: e.key }) === true) return e.preventDefault();
      if (e.key === " " || e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        this.avancar();
      } else if (e.key === "Escape") this.sair();
      else if (e.key.toLowerCase() === "p") this.alternarPausa();
      else if (e.key.toLowerCase() === "f") this.ecra();
      else if (e.key.toLowerCase() === "m") this.alternarSom();
      else if (e.key.toLowerCase() === "h") this.raiz.classList.toggle("sem-controlos");
    };
    document.addEventListener("keydown", this._tecla);
    this.raiz.addEventListener("click", (e) => {
      const esc = e.target.closest("[data-escolha]");
      if (esc) {
        for (const f of this.ouvintes) if (f({ escolha: esc.dataset.escolha }) === true) return;
      }
      const b = e.target.closest("[data-acao]");
      if (!b) {
        if (e.target.closest(".palco-tela")) this.avancar();
        return;
      }
      ({ sair: () => this.sair(), pausa: () => this.alternarPausa(), seguinte: () => this.avancar(), som: () => this.alternarSom(), ecra: () => this.ecra() })[b.dataset.acao]();
    });
    let t = null;
    this._rato = () => {
      this.raiz.classList.add("rato");
      clearTimeout(t);
      t = setTimeout(() => this.raiz.classList.remove("rato"), 2200);
    };
    this.raiz.addEventListener("mousemove", this._rato);
    // No telemóvel não há rato: um toque mostra os controlos durante uns segundos
    this.raiz.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse") this._rato();
    });
    this._atualizarSom();
  }

  _atualizarSom() {
    $('[data-acao="som"]', this.raiz).textContent = som.ligado ? "Som ligado" : "Som desligado";
  }
  alternarSom() {
    som.alternar();
    this._atualizarSom();
    if (som.ligado && this.musicaAtual && !this.pausado) som.musica.iniciar(this.musicaAtual);
  }
  ecra() {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else this.raiz.requestFullscreen?.().catch(() => {});
  }
  alternarPausa() {
    this.pausado = !this.pausado;
    $('[data-acao="pausa"]', this.raiz).textContent = this.pausado ? "Continuar" : "Pausa";
    this.raiz.classList.toggle("em-pausa", this.pausado);
    for (const anim of this.tela.getAnimations({ subtree: true })) this.pausado ? anim.pause() : anim.play();
    try {
      this.pausado ? engine.pause() : engine.resume();
    } catch {
      /* versão do anime.js sem pausa global */
    }
    if (this.pausado) som.musica.parar(0.3);
    else if (this.musicaAtual) som.musica.iniciar(this.musicaAtual);
  }
  avancar() {
    for (const w of [...this.esperas]) w.saltar();
  }

  /** Espera ms (o tempo pára durante a pausa). Em modo manual, os "passos" esperam pelo utilizador. */
  esperar(ms, { passo = false, exato = false } = {}) {
    if (this.terminado) return Promise.reject(new Abortado());
    return new Promise((resolve, reject) => {
      let restante = exato ? ms : ms * this.fator;
      let ultimo = performance.now();
      const w = {
        saltar: () => {
          clearInterval(id);
          this.esperas.delete(w);
          resolve();
        },
        abortar: () => {
          clearInterval(id);
          this.esperas.delete(w);
          reject(new Abortado());
        },
      };
      const manualAqui = passo && this.manual;
      const id = setInterval(() => {
        const agora = performance.now();
        if (!this.pausado && !manualAqui) restante -= agora - ultimo;
        ultimo = agora;
        if (restante <= 0) w.saltar();
      }, 30);
      this.esperas.add(w);
    });
  }
  passo(ms) {
    return this.esperar(ms, { passo: true });
  }
  /** Fica à escuta de teclas e toques em [data-escolha]. A função devolve true para consumir o evento. */
  ouvir(f) {
    this.ouvintes.add(f);
    return () => this.ouvintes.delete(f);
  }

  // ---------- Som ----------
  musica(estilo, intensidade = 1) {
    const nome = this.tema.musica[estilo] || estilo;
    this.musicaAtual = nome;
    som.musica.definirIntensidade(intensidade);
    if (!this.pausado) som.musica.iniciar(nome);
  }
  tocar(nome, opcoes, atraso) {
    if (this.terminado) return;
    const n = { _abertura: this.tema.sons.abertura, _destaque: this.tema.sons.destaque, _festa: this.tema.sons.festa }[nome] || nome;
    som.tocar(n, opcoes, atraso);
  }

  // ---------- Efeitos ----------
  flash(forca = 1) {
    this.flashEl.animate([{ opacity: 0.85 * forca }, { opacity: 0 }], { duration: 650, easing: "ease-out" });
  }
  tremer(forca = 1) {
    const f = 18 * forca;
    this.mundo.animate(
      [0, 1, 2, 3, 4, 5, 6].map((i) => ({ transform: i === 6 ? "translate(0,0)" : `translate(${(Math.random() * 2 - 1) * f}px, ${(Math.random() * 2 - 1) * f}px) rotate(${(Math.random() * 2 - 1) * forca * 0.6}deg)` })),
      { duration: 420, easing: "ease-out" },
    );
  }
  explodir(x, y, opcoes) {
    this.ambiente.explodir(x ?? this.L / 2, y ?? this.A / 2, opcoes);
  }
  /** Grande celebração: explosões, chuva, flash e o som de festa do tema. */
  festa({ x, y, som: comSom = true, forca = 1 } = {}) {
    const cx = x ?? this.L / 2;
    const cy = y ?? this.A * 0.45;
    this.explodir(cx, cy, { n: 160 * forca, forca });
    setTimeout(() => !this.terminado && this.explodir(this.L * 0.2, this.A * 0.35, { n: 90 * forca, forca: 0.8 }), 280);
    setTimeout(() => !this.terminado && this.explodir(this.L * 0.8, this.A * 0.35, { n: 90 * forca, forca: 0.8 }), 520);
    this.ambiente.chuva({ n: 140 * forca });
    this.flash(0.6);
    if (comSom) {
      this.tocar("vitoria");
      if (this.tema.sons.festa !== "vitoria") this.tocar("_festa", {}, 0.3);
    }
  }

  // ---------- Peças comuns ----------
  /** Abertura com o título letra a letra, a etiqueta do espetáculo e o som do tema. */
  async abertura({ etiqueta = "", titulo, sub = "", tamanho }) {
    const t = tamanho || (this.vertical ? 104 : 124);
    this.cena.innerHTML = `<div class="p-centro ab-abertura">
      ${etiqueta ? `<div class="ab-etiqueta">${esc(etiqueta)}</div>` : ""}
      <h1 class="p-titulo ab-titulo" style="font-size:${t}px">${letras(titulo)}</h1>
      ${sub ? `<p class="p-sub ab-sub">${esc(sub)}</p>` : ""}</div>`;
    this.tocar("_abertura", {}, 0.1);
    const c = this.cena;
    animate(c.querySelectorAll(".ab-letra"), { translateY: [140, 0], rotate: [18, 0], opacity: [0, 1], delay: stagger(32, { start: 250 }), duration: 1000, ease: spring({ stiffness: 120, damping: 12 }) });
    animate(c.querySelectorAll(".ab-etiqueta"), { scale: [0.4, 1], opacity: [0, 1], duration: 700, ease: "outBack" });
    animate(c.querySelectorAll(".ab-sub"), { translateY: [40, 0], opacity: [0, 1], delay: 900, duration: 800, ease: "outExpo" });
    setTimeout(() => !this.terminado && this.explodir(this.L / 2, this.A * 0.42, { n: 50, forca: 0.6 }), 700);
    await this.passo(3600);
    await this.sair_(c.firstElementChild);
  }
  /** Faz um elemento sair (com a animação p-sai) e espera. */
  async sair_(el) {
    el?.classList.add("p-sai");
    await this.esperar(420, { exato: true });
  }
  /** Cartão final com o endereço do site. */
  async fecho(texto = "Vê o ranking completo em") {
    this.tela.classList.remove("denso");
    this.cena.innerHTML = `<div class="p-centro fc-fecho">
      <svg class="p-logo" viewBox="0 0 40 40" aria-hidden="true"><defs><linearGradient id="lg-fecho" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff4d70"/><stop offset=".55" stop-color="#c3123e"/><stop offset="1" stop-color="#6e0820"/></linearGradient></defs><rect width="40" height="40" rx="13" fill="url(#lg-fecho)"/><path d="M16 12.6c0-1.5 1.6-2.4 2.9-1.6l10.1 6.4c1.2.8 1.2 2.5 0 3.3l-10.1 6.4c-1.3.8-2.9-.1-2.9-1.6z" fill="#fff"/><circle cx="32" cy="8" r="4.2" fill="#f4b942" stroke="#12060b" stroke-width="2"/></svg>
      <h1 class="p-titulo" style="font-size:${this.vertical ? 86 : 96}px;margin-top:44px">Placar dos<br>Youtubers</h1>
      <p class="p-sub p-entra" style="animation-delay:.5s">${esc(texto)} <b class="fc-site">${esc(location.host)}</b></p></div>`;
    this.tocar("brilho", {}, 0.3);
    await this.passo(3800);
  }
  limpar() {
    this.cena.innerHTML = "";
  }
  sair(peloVoltar = false) {
    if (this.terminado) return;
    this.terminado = true;
    if (Palco.atual === this) Palco.atual = null;
    removeEventListener("popstate", this._voltar);
    if (!peloVoltar && history.state?.palco) history.back();
    for (const w of [...this.esperas]) w.abortar();
    try {
      engine.resume();
    } catch {
      /* nada */
    }
    som.musica.parar(0.5);
    removeEventListener("resize", this._escala);
    document.removeEventListener("keydown", this._tecla);
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    this.raiz.remove();
    document.body.classList.remove("modo-palco");
    this.aoSair?.();
  }
}

export function eAbortado(e) {
  return e instanceof Abortado || e?.message === "abortado";
}

/** Texto partido em letras (as palavras não se partem). */
export function letras(texto) {
  return String(texto)
    .split(/(\n)/)
    .map((parte) =>
      parte === "\n"
        ? "<br>"
        : parte
            .split(" ")
            .map((pal) => `<span class="ab-palavra">${[...pal].map((ch) => `<span class="ab-letra">${esc(ch)}</span>`).join("")}</span>`)
            .join(" "),
    )
    .join("");
}

/** Confetes no tema atual (compatível com os espetáculos antigos). */
export function confetes(cena, n = 140) {
  const p = Palco.atual;
  if (p) {
    p.explodir(p.L / 2, p.A * 0.4, { n });
    p.ambiente.chuva({ n: n * 0.8 });
    return;
  }
}

/** Avatar grande para o palco. */
export function avatarPalco(p, tam) {
  return avatar(p, tam).replace('class="avatar"', 'class="avatar palco-avatar"');
}

/** Baralha uma lista (cópia). */
export function baralhar(lista) {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Contagem decrescente num elemento, com tique em cada segundo. */
export async function contagem(palco, el, segundos = 5, { som: nomeSom = "tique", aoTerminar } = {}) {
  for (let s = segundos; s >= 1; s--) {
    if (aoTerminar?.()) break;
    el.textContent = s;
    el.classList.remove("p-slam");
    void el.offsetWidth;
    el.classList.add("p-slam");
    palco.tocar(nomeSom);
    await palco.esperar(1000, { exato: true });
  }
}

// ---------- Página de escolha ----------

export async function render(main, { params, query }) {
  main.dataset.titulo = "Palco";
  const id = params[0];
  const esp = ESPETACULOS.find((e) => e.id === id);
  if (!esp) return escolha(main);
  return opcoes(main, esp, query);
}

function escolha(main) {
  main.innerHTML = `<div class="wrap">
    <div class="pagina-topo"><h1>Palco</h1><p>Espetáculos em ecrã inteiro, com música, efeitos e ${TEMAS.length} temas, para mostrar numa chamada ou gravar para o YouTube, TikTok, Reels e Shorts.</p></div>
    <div class="palco-temas-faixa">${TEMAS.map((t) => `<span class="tema-chip" style="--a:${t.amostra[0]};--b:${t.amostra[1]};--c:${t.amostra[2]}"><i></i>${esc(t.nome)}</span>`).join("")}</div>
    ${GRUPOS.map(
      (g) => `<section class="secao palco-grupo"><div class="secao-cabeca"><div><h2>${esc(g.nome)}</h2><p>${esc(g.texto)}</p></div></div>
      <div class="palco-lista">${ESPETACULOS.filter((e) => e.grupo === g.id)
        .map(
          (e) => `<a class="palco-opcao" href="#/palco/${e.id}">
        ${e.icone}
        <span><b>${esc(e.nome)}</b><small>${esc(e.texto)}</small></span>
      </a>`,
        )
        .join("")}</div></section>`,
    ).join("")}
    <div class="aviso info" style="margin-top:28px"><p>Para gravar, usa a gravação de ecrã do computador (por exemplo OBS ou a Barra de Jogo do Windows) ou do telemóvel, com o som do sistema ligado. O formato 9:16 enche o ecrã vertical do TikTok, Reels e Shorts.</p></div>
  </div>`;
}

const opcaoMes = (meses, sel) => [...meses].reverse().map((m) => `<option value="${m}" ${m === sel ? "selected" : ""}>${mesNome(m)}</option>`).join("");
const campoPessoa = (nome, rotulo, query, ph = "Ao acaso") => `<label class="campo cresce"><span>${rotulo}</span><span style="position:relative"><input class="input" name="${nome}" data-pessoa="${esc(query.get(nome) || "")}" placeholder="${ph}" value="${esc(pessoa(query.get(nome))?.name || "")}"></span></label>`;

function opcoes(main, esp, query) {
  const ds = estado.ds;
  const meses = mesesComDados(5).filter((m) => m < ds.currentMonth);
  const fmt = query.get("fmt") === "9x16" ? "9x16" : "16x9";
  const temaInicial = TEMAS.some((t) => t.id === query.get("tema")) ? query.get("tema") : lerTema();
  const cat = `<label class="campo"><span>Categoria</span><select class="input" name="cat"><option value="">Todas</option>${ds.categories.map((c) => `<option>${esc(c)}</option>`).join("")}</select></label>`;
  const mes = `<label class="campo"><span>Mês</span><select class="input" name="m">${opcaoMes(meses, estado.ref)}</select></label>`;
  const temSubs = ds.people.some((p) => p.sb?.s && Object.keys(p.sb.s).length);
  const metricas = (extra = "") => `<label class="campo"><span>Ranking por</span><select class="input" name="metric">
      <option value="views">Views do mês</option><option value="indice">Índice de Influência</option>${temSubs ? `<option value="subsMes">Subscritores ganhos no mês</option>` : ""}
      <option value="crescimento">Crescimento face ao mês anterior</option><option value="subs">Subscritores (total)</option><option value="total">Views totais</option>${extra}</select></label>`;
  const campos = {
    revelacao: `${metricas()}${mes}
      <label class="campo"><span>Quantos</span><select class="input" name="n"><option>5</option><option selected>10</option><option>15</option><option>20</option></select></label>${cat}`,
    corrida: `
      <label class="campo"><span>Medida</span><select class="input" name="modo"><option value="mes">Views de cada mês</option><option value="acumulado">Views acumuladas</option></select></label>
      <label class="campo"><span>De</span><select class="input" name="de">${meses.map((m, i) => `<option value="${m}" ${i === 0 ? "selected" : ""}>${mesNome(m)}</option>`).join("")}</select></label>
      <label class="campo"><span>Até</span><select class="input" name="ate">${meses.map((m) => `<option value="${m}" ${m === estado.ref ? "selected" : ""}>${mesNome(m)}</option>`).join("")}</select></label>
      <label class="campo"><span>Barras</span><select class="input" name="n"><option>8</option><option selected>10</option><option>12</option><option>15</option></select></label>${cat}`,
    tier: `<label class="campo"><span>Classificar por</span><select class="input" name="metric"><option value="indice">Índice de Influência</option><option value="views">Views do mês</option></select></label>${mes}
      <label class="campo"><span>Quantos</span><select class="input" name="n"><option>12</option><option selected>16</option><option>20</option><option>24</option></select></label>${cat}`,
    altos: `${mes}<label class="campo"><span>Quantos de cada</span><select class="input" name="n"><option>3</option><option selected>5</option><option>7</option></select></label>
      <label class="campo"><span>Entre os</span><select class="input" name="top"><option value="50">Top 50</option><option value="100" selected>Top 100</option><option value="300">Todos</option></select></label>`,
    quiz: `<label class="campo"><span>Rondas</span><select class="input" name="n"><option>5</option><option selected>8</option><option>12</option></select></label>${mes}
      <label class="campo"><span>Entre os</span><select class="input" name="top"><option value="30">Top 30</option><option value="80" selected>Top 80</option><option value="200">Top 200</option></select></label>
      <label class="campo"><span>Perguntas</span><select class="input" name="tipo"><option value="misto">Variadas</option><option value="views">Só views do mês</option></select></label>`,
    maismenos: `<label class="campo"><span>Rondas</span><select class="input" name="n"><option>6</option><option selected>10</option><option>15</option></select></label>${mes}
      <label class="campo"><span>Comparar</span><select class="input" name="metric"><option value="views">Views do mês</option><option value="subs">Subscritores</option><option value="total">Views totais</option></select></label>
      <label class="campo"><span>Entre os</span><select class="input" name="top"><option value="40">Top 40</option><option value="100" selected>Top 100</option><option value="250">Top 250</option></select></label>`,
    adivinha: `<label class="campo"><span>Rondas</span><select class="input" name="n"><option>4</option><option selected>6</option><option>10</option></select></label>
      <label class="campo"><span>Dificuldade</span><select class="input" name="dif"><option value="20">Fácil (top 20)</option><option value="60" selected>Média (top 60)</option><option value="150">Difícil (top 150)</option></select></label>`,
    roda: `<label class="campo"><span>Na roda</span><select class="input" name="n"><option>8</option><option selected>10</option><option>12</option></select></label>
      <label class="campo"><span>Voltas</span><select class="input" name="voltas"><option>1</option><option selected>3</option><option>5</option></select></label>
      <label class="campo"><span>Entre os</span><select class="input" name="top"><option value="20">Top 20</option><option value="60" selected>Top 60</option><option value="150">Top 150</option></select></label>${cat}`,
    batalha: `${campoPessoa("a", "Youtuber 1", query)}${campoPessoa("b", "Youtuber 2", query)}`,
    torneio: `<label class="campo"><span>Participantes</span><select class="input" name="n"><option value="8" selected>8</option><option value="16">16</option></select></label>
      <label class="campo"><span>Quem entra</span><select class="input" name="quem"><option value="top">Os melhores pelo Índice</option><option value="acaso">Ao acaso entre os 60 melhores</option></select></label>
      <label class="campo"><span>Cada duelo decide-se por</span><select class="input" name="criterio"><option value="misto">Um critério ao acaso</option><option value="views">Views do mês</option><option value="indice">Índice de Influência</option><option value="subs">Subscritores</option></select></label>${mes}${cat}`,
    cartao: campoPessoa("id", "Youtuber", query, "Procurar"),
    historia: campoPessoa("id", "Youtuber", query, "Procurar"),
  }[esp.id];

  main.innerHTML = `<div class="wrap">
    <div class="pagina-topo"><p><a href="#/palco">Palco</a></p><h1>${esc(esp.nome)}</h1><p>${esc(esp.texto)}</p></div>
    <form class="painel palco-form" id="pl-form">
      <div class="campo"><span>Tema</span>
        <div class="tema-escolha" role="radiogroup">${TEMAS.map((t) => `<button type="button" role="radio" data-tema="${t.id}" aria-checked="${t.id === temaInicial}" style="--a:${t.amostra[0]};--b:${t.amostra[1]};--c:${t.amostra[2]}"><i></i><b>${esc(t.nome)}</b><small>${esc(t.texto)}</small></button>`).join("")}</div>
      </div>
      <div class="filtros" style="margin:18px 0 0">
        <div class="campo"><span>Formato</span><div class="segmentos" role="group"><button type="button" data-fmt="16x9" aria-pressed="${fmt === "16x9"}">16:9 horizontal</button><button type="button" data-fmt="9x16" aria-pressed="${fmt === "9x16"}">9:16 vertical</button></div></div>
        ${campos}
        <div class="campo"><span>Ritmo</span><div class="segmentos" role="group"><button type="button" data-ritmo="auto" aria-pressed="true">Automático</button><button type="button" data-ritmo="manual" aria-pressed="false">Eu avanço</button></div></div>
        <div class="campo"><span>Velocidade</span><div class="segmentos" role="group"><button type="button" data-vel="rapido" aria-pressed="false">Rápida</button><button type="button" data-vel="normal" aria-pressed="true">Normal</button><button type="button" data-vel="lento" aria-pressed="false">Lenta</button></div></div>
      </div>
      <div class="ed-acoes" style="justify-content:space-between;margin-top:20px">
        <label class="ed-check" style="margin:0"><input type="checkbox" name="som" ${som.ligado ? "checked" : ""}> Com música e efeitos</label>
        <button class="btn btn-ouro" type="submit" style="height:48px;padding:0 28px;font-size:var(--t-base)">Começar</button>
      </div>
    </form></div>`;

  let formato = fmt;
  let ritmo = "auto";
  let velocidade = "normal";
  let temaId = temaInicial;
  const grupo = (attr, aoEscolher) =>
    $$(`[data-${attr}]`, main).forEach((b) =>
      b.addEventListener("click", () => {
        aoEscolher(b.dataset[attr]);
        $$(`[data-${attr}]`, main).forEach((x) => x.setAttribute(x.getAttribute("role") === "radio" ? "aria-checked" : "aria-pressed", String(x === b)));
      }),
    );
  grupo("fmt", (v) => (formato = v));
  grupo("ritmo", (v) => (ritmo = v));
  grupo("vel", (v) => (velocidade = v));
  grupo("tema", (v) => {
    temaId = v;
    guardarTema(v);
    som.tocar("clique");
  });
  $$("input[data-pessoa]", main).forEach((inp) => ligarEscolhaPessoa(inp));

  $("#pl-form", main).addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target.elements;
    const opts = {};
    for (const el of f) if (el.name && el.name !== "som") opts[el.name] = el.dataset.pessoa !== undefined ? el.dataset.pessoa : el.value;
    som.definir(f.namedItem("som").checked);
    som.desbloquear();
    const mod = await import(esp.mod);
    const palco = new Palco({ formato, manual: ritmo === "manual", tema: temaId, velocidade });
    try {
      await mod.correr(palco, opts);
      await palco.esperar(1200);
    } catch (err) {
      if (!eAbortado(err)) {
        console.error(err);
        palco.cena.innerHTML = `<div class="palco-erro"><h2>Não foi possível continuar</h2><p>${esc(err.message)}</p></div>`;
        await palco.esperar(4000).catch(() => {});
      }
    }
    palco.sair();
  });
}

function lerTema() {
  try {
    const t = localStorage.getItem("placar-tema");
    return TEMAS.some((x) => x.id === t) ? t : "rubi";
  } catch {
    return "rubi";
  }
}
function guardarTema(t) {
  try {
    localStorage.setItem("placar-tema", t);
  } catch {
    /* sem armazenamento */
  }
}

function ligarEscolhaPessoa(input) {
  const caixa = document.createElement("div");
  caixa.className = "pesquisa-lista";
  caixa.style.cssText = "left:0;right:auto;width:100%";
  input.parentNode.appendChild(caixa);
  input.addEventListener("input", () => {
    input.dataset.pessoa = "";
    const r = procurar(input.value, 6);
    caixa.innerHTML = r.map((p) => `<button type="button" class="pesquisa-item" style="width:100%;border:0;background:none;text-align:left" data-id="${esc(p.id)}">${avatar(p, 28)}<span><b>${esc(p.name)}</b><small>${esc(p.category || "")}</small></span></button>`).join("");
    caixa.classList.toggle("aberta", r.length > 0);
  });
  caixa.addEventListener("click", (e) => {
    const b = e.target.closest("[data-id]");
    if (!b) return;
    input.dataset.pessoa = b.dataset.id;
    input.value = pessoa(b.dataset.id).name;
    caixa.classList.remove("aberta");
  });
  input.addEventListener("blur", () => setTimeout(() => caixa.classList.remove("aberta"), 200));
}
