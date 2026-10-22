// Palco: espetáculos em ecrã inteiro para mostrar e gravar (16:9 e 9:16), com temas.

import { estado, pessoa, mesesComDados, procurar, indice, views } from "../data.js";
import { METRICAS, rankingPor } from "./metricas.js";
import { esc, mesNome, curto } from "../format.js";
import { $, $$, avatar } from "../ui.js";
import { som } from "../audio.js";
import { animate, stagger, spring, engine } from "../../vendor/anime.esm.min.js";
import { TEMAS, tema as temaPorId, cenario, estiloTema } from "./temas.js";
import { Ambiente } from "./ambiente.js";
import { criarKit } from "./kits.js";
import { historicoEmCache } from "./historico.js";
import { cenaDoTema } from "./cenas.js";
import qrcode from "../../vendor/qrcode.esm.js";

const I = (d) => `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;

export const GRUPOS = [
  { id: "rankings", nome: "Rankings", texto: "Os números do mês contados com suspense." },
  { id: "graficos", nome: "Gráficos", texto: "Os números em gráficos animados: simples de ler e sempre a mexer." },
  { id: "jogos", nome: "Jogos", texto: "Para jogar com quem está a ver, em direto ou em vídeo." },
  { id: "duelos", nome: "Duelos", texto: "Frente a frente, até haver um vencedor." },
  { id: "historias", nome: "Histórias", texto: "Um Youtuber em destaque." },
];

export const ESPETACULOS = [
  { id: "revelacao", usos: ["video","direto"], dur: "1–2 min", grupo: "rankings", nome: "Revelação do top", texto: "Do último ao primeiro lugar, com o pódio no fim. Por views, Índice, subscritores ou crescimento.", mod: "./revelacao.js", icone: I(`<path d="M4 42h40M8 42V28h10v14M19 42V18h10v24M30 42V32h10v10"/><path d="m24 4 2.4 4.8 5.3.8-3.8 3.7.9 5.2L24 16l-4.8 2.5.9-5.2-3.8-3.7 5.3-.8z" fill="currentColor" stroke="none"/>`) },
  { id: "corrida", usos: ["video"], dur: "40–60 s", grupo: "rankings", nome: "Corrida das views", texto: "Barras que se ultrapassam mês a mês, com cada mudança de líder em destaque.", mod: "./corrida.js", icone: I(`<path d="M6 6v36h36"/><path d="M12 14h22M12 22h30M12 30h14" stroke-width="5"/>`) },
  { id: "tier", usos: ["video"], dur: "1–2 min", grupo: "rankings", nome: "Tier list", texto: "Cada Youtuber cai na sua fila: S, A, B, C ou D.", mod: "./tier.js", icone: I(`<rect x="5" y="6" width="38" height="9" rx="3"/><rect x="5" y="19" width="38" height="9" rx="3"/><rect x="5" y="32" width="38" height="9" rx="3"/><path d="M12 6v9M12 19v9M12 32v9"/>`) },
  { id: "altos", usos: ["video"], dur: "1–1,5 min", grupo: "rankings", nome: "Altos e baixos", texto: "Quem subiu e quem caiu mais no ranking do mês.", mod: "./altos.js", icone: I(`<path d="M10 34 22 20l7 7 11-15"/><path d="M32 12h8v8"/><path d="M8 42h32"/>`) },
  { id: "barras", usos: ["video","direto"], dur: "45 s", grupo: "graficos", nome: "Gráfico de barras", texto: "As colunas crescem fora de ordem, ordenam-se sozinhas e aparece a linha da média.", mod: "./barras.js", icone: I(`<path d="M6 42h36"/><path d="M11 42V26M19 42V12M27 42V20M35 42V30" stroke-width="6"/>`) },
  { id: "categorias", usos: ["video","direto"], dur: "45 s", grupo: "graficos", nome: "O bolo das categorias", texto: "Um donut com a fatia de cada categoria nas views do mês e o n.º 1 de cada uma.", mod: "./categorias.js", icone: I(`<circle cx="24" cy="24" r="16" stroke-width="8" stroke-dasharray="50 101"/><circle cx="24" cy="24" r="16" stroke-width="8" stroke-dasharray="0 50 30 101" opacity=".6"/>`) },
  { id: "bolhas", usos: ["video","direto"], dur: "50 s", grupo: "graficos", nome: "Bolhas", texto: "Cada Youtuber é uma bolha do tamanho dos seus números. Muda a medida e as bolhas crescem e encolhem.", mod: "./bolhas.js", icone: I(`<circle cx="18" cy="20" r="12"/><circle cx="35" cy="31" r="8"/><circle cx="33" cy="12" r="5"/><circle cx="14" cy="39" r="4"/>`) },
  { id: "linhas", usos: ["video"], dur: "40 s", grupo: "graficos", nome: "Linha a linha", texto: "Até 7 Youtubers num gráfico de linhas que se desenha mês a mês, com quem vai na frente.", mod: "./linhas.js", icone: I(`<path d="M6 6v36h36"/><path d="M10 34l9-10 7 5 14-16"/><path d="M10 38l10-6 8 2 12-9" opacity=".55"/>`) },
  { id: "numeros", usos: ["video"], dur: "35 s", grupo: "graficos", nome: "O mês em números", texto: "Números gigantes, um de cada vez: total de views, subidas, milionários e o n.º 1.", mod: "./numeros.js", icone: I(`<rect x="6" y="8" width="36" height="32" rx="5"/><path d="M14 30V18l-3 3M22 18h6l-6 12M32 18h5v12"/>`) },
  { id: "votacao", usos: ["video", "direto"], dur: "40 s", grupo: "graficos", nome: "O público escolheu", texto: "Os resultados de uma votação do site, do último ao primeiro, com o vencedor no fim.", mod: "./votacao.js", icone: I(`<path d="M8 22h32v18H8z"/><path d="M16 22V10l8-5 8 5v12"/><path d="m19 16 4 4 7-7"/>`) },
  { id: "desafio", usos: ["video"], dur: "1,5–2 min", grupo: "jogos", nome: "Desafio do Placar", texto: "Para jogar com o vídeo: escolha múltipla, o intruso, ordenar e verdadeiro ou falso. Quem vê pausa, responde e conta os pontos.", mod: "./desafio.js", icone: I(`<path d="M8 6h32v26H22l-9 9v-9H8z"/><path d="M19 15a5 5 0 1 1 7 4.6c-1.4.7-2 1.6-2 3.4"/><circle cx="24" cy="27.5" r="1.6" fill="currentColor"/>`) },
  { id: "quiz", usos: ["video","direto"], dur: "1–2 min", grupo: "jogos", nome: "Quem fez mais?", texto: "Perguntas variadas, 5 segundos para pensar e a resposta revelada.", mod: "./quiz.js", icone: I(`<circle cx="24" cy="24" r="19"/><path d="M18 18a6 6 0 1 1 9 5.2c-2 1.2-3 2.3-3 4.8"/><circle cx="24" cy="35" r="1.8" fill="currentColor"/>`) },
  { id: "maismenos", usos: ["video","direto"], dur: "1–2 min", grupo: "jogos", nome: "Mais ou menos", texto: "Mais ou menos views do que o anterior? Uma corrente sem fim.", mod: "./maismenos.js", icone: I(`<path d="M24 6 12 20h24zM24 42 12 28h24z"/>`) },
  { id: "adivinha", usos: ["video","direto"], dur: "1–2 min", grupo: "jogos", nome: "Adivinha quem é", texto: "Foto desfocada e pistas uma a uma. Quem adivinha primeiro?", mod: "./adivinha.js", icone: I(`<circle cx="24" cy="18" r="9"/><path d="M8 42c2-9 9-13 16-13s14 4 16 13"/><path d="M33 6l6 6M39 6l-6 6"/>`) },
  { id: "roda", usos: ["direto","video"], dur: "1–2 min", grupo: "jogos", nome: "Roda da sorte", texto: "A roda gira e escolhe um Youtuber ao acaso. Depois, os números dele.", mod: "./roda.js", icone: I(`<circle cx="24" cy="26" r="17"/><path d="M24 9v34M7 26h34M12 14l24 24M36 14 12 38"/><path d="M20 3h8l-4 6z" fill="currentColor"/>`) },
  { id: "batalha", usos: ["video","direto"], dur: "1–1,5 min", grupo: "duelos", nome: "Batalha", texto: "Combate com barras de vida: cada ronda ganha tira vida ao outro, até ao K.O.", mod: "./batalha.js", icone: I(`<path d="M6 6l20 20M42 6 22 26M10 30l8 8M38 30l-8 8M14 34l-6 6M34 34l6 6"/>`) },
  { id: "torneio", usos: ["direto","video"], dur: "3–4 min", grupo: "duelos", nome: "Torneio", texto: "8 ou 16 Youtubers em eliminatórias até à grande final.", mod: "./torneio.js", icone: I(`<path d="M5 9h8v10h7M5 29h8V19M20 14v10h8M5 33h8v6h7M20 34V24"/><path d="M33 17h10v6a5 5 0 0 1-10 0z" fill="currentColor" stroke="none"/><path d="M38 28v6M34 37h8"/>`) },
  { id: "cartao", usos: ["video"], dur: "30 s", grupo: "historias", nome: "Cartão de Youtuber", texto: "Um Youtuber em destaque, com o Índice e os números mais importantes.", mod: "./cartao.js", icone: I(`<rect x="5" y="9" width="38" height="30" rx="5"/><circle cx="17" cy="21" r="5"/><path d="M10 33c2-4 12-4 14 0M29 19h9M29 26h9"/>`) },
  { id: "historia", usos: ["video"], dur: "1 min", grupo: "historias", nome: "A história de…", texto: "O percurso de um Youtuber mês a mês, com os momentos marcantes.", mod: "./historia.js", icone: I(`<path d="M5 38c6-2 8-14 14-14s7 8 12 8 6-16 12-22"/><circle cx="43" cy="10" r="3" fill="currentColor"/><path d="M5 43h38"/>`) },
];

class Abortado extends Error {}

const VELOCIDADE = { rapido: 0.72, normal: 1, lento: 1.35 };

/** Motor do palco: escala a tela, controla tempo, pausa, avanço, tema e efeitos. */
export class Palco {
  static atual = null;

  constructor({ formato = "16x9", manual = false, tema = "rubi", velocidade = "normal", foco = "", focoQuando = "fim", modo = "video", completo = true, votacao = null }) {
    Palco.atual = this;
    // Votação a decorrer no site: nos vídeos, aparece um aviso antes do fim
    this.votacaoAviso = votacao;
    this.votacaoMostrada = false;
    this.foco = foco || "";
    this.focoQuando = focoQuando;
    this.focoMostrado = false;
    this.modo = modo;
    this.canal = { nome: "Placar dos Youtubers", youtube: "@placardosyoutubers", tiktok: "", instagram: "", ...(estado.ds?.settings?.canal || {}) };
    this.contexto = { metrica: "indice", m: estado.ref };
    // Histórico (confrontos, estrelas) e os resultados deste espetáculo, guardados se for gravado
    this.historico = historicoEmCache();
    this.resultados = [];
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
      <div class="palco-tela tema-${this.tema.id}${this.tema.gerado ? ` tema-gerado${this.tema.claro ? " tema-claro" : ""}` : ""} ${this.vertical ? "vertical" : "horizontal"}" style="width:${this.L}px;height:${this.A}px;${estiloTema(this.tema)}">
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
    // Tema completo: o kit do tema desenha os momentos (golos, espadas, emojis…) por cima da cena
    this.kit = criarKit(this, completo);
    if (this.kit) this.raiz.querySelector(".palco-tela").classList.add(`kit-${this.kit.id}`);
    setTimeout(() => this.evento("inicio"), 400);

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
    this.aoPausar?.(this.pausado);
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

  /** O que o vídeo mostrou, em resumo (vai para a página pública quando o vídeo é gravado). */
  resumir(r) {
    this.resumo = r;
  }

  /** Guarda um resultado (duelo, título ou coroa) para o histórico. */
  registar(r) {
    this.resultados.push(r);
  }

  /** Um momento do espetáculo (golpe, acerto, vencedor…). Devolve true se o tema tratou o som. */
  evento(nome, dados) {
    return this.kit ? this.kit.evento(nome, dados) : false;
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
    // Os temas principais (no modo "Tema completo") têm a sua própria abertura
    const tema = cenaDoTema(this);
    if (tema?.abertura) {
      await tema.abertura(this, { etiqueta, titulo, sub });
      if (this.foco && this.focoQuando === "inicio") await this.segmentoFoco();
      return;
    }
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
    if (this.foco && this.focoQuando === "inicio") await this.segmentoFoco();
  }

  /** A meio do espetáculo: o Youtuber em foco (se for esse o momento) e o lembrete para subscrever. */
  async meio() {
    if (this.foco && this.focoQuando === "meio") await this.segmentoFoco();
    if (this.modo === "video") this.lembrete();
  }

  /** Faixa a lembrar de subscrever o canal (só nos vídeos). */
  lembrete() {
    if (this.lembreteFeito || this.terminado) return;
    this.lembreteFeito = true;
    const el = document.createElement("div");
    el.className = "lb-lembrete";
    el.innerHTML = `${LOGO_CANAL}<span><b>${esc(this.canal.nome)}</b><small>${esc(this.canal.youtube || "Subscreve o canal")}</small></span><i class="lb-botao">Subscrever</i><i class="lb-sino">${SINO}</i>`;
    this.tela.appendChild(el);
    this.tocar("bip", {}, 0.2);
    setTimeout(() => {
      el.classList.add("carregado");
      this.tocar("clique");
      this.tocar("sino", {}, 0.15);
    }, 1600);
    setTimeout(() => el.classList.add("sai"), 5200);
    setTimeout(() => el.remove(), 6000);
  }

  /** Mostra o Youtuber em foco: onde ficou neste espetáculo e os seus números. */
  async segmentoFoco() {
    if (this.focoMostrado || !this.foco) return;
    const p = pessoa(this.foco);
    if (!p) return;
    this.focoMostrado = true;
    const { metrica = "indice", m = estado.ref, cat = "" } = this.contexto || {};
    const met = METRICAS[metrica] || METRICAS.indice;
    const lista = rankingPor(metrica, m, { cat });
    const meu = lista.find((x) => x.p.id === p.id);
    const total = lista.length;
    const lider = lista[0];
    const pos = estado.posIndice.get(p.id);
    const extra = [
      metrica !== "indice" && indice(p.id).total !== null ? { n: "Índice de Influência", v: `${indice(p.id).total}${pos ? ` · ${pos}.º` : ""}` } : null,
      metrica !== "views" && views(p, estado.ref) !== null ? { n: `Views em ${mesNome(estado.ref, { ano: false })}`, v: curto(views(p, estado.ref)) } : null,
      metrica !== "subs" && p.totals?.subs ? { n: "Subscritores", v: curto(p.totals.subs) } : null,
    ].filter(Boolean);
    const camada = document.createElement("div");
    camada.className = "fo-camada";
    camada.innerHTML = `<div class="fo-cartao">
      <div class="fo-etiqueta">★ Em foco</div>
      ${avatarPalco(p, this.vertical ? 300 : 260)}
      <h2 class="p-titulo">${esc(p.name)}</h2>
      ${
        meu
          ? `<div class="fo-pos"><b data-pos>${meu.pos}.º</b><span>de ${total} em ${esc(met.nome(m))}${cat ? `, ${esc(cat)}` : ""}</span></div>
             <div class="fo-valor">${esc(met.fmt(meu.v))} <small>${esc(met.unidade)}</small></div>
             ${lider && lider.p.id !== p.id ? `<div class="fo-lider">A ${esc(met.fmt(lider.v - meu.v))} de ${esc(lider.p.name)}, o 1.º</div>` : `<div class="fo-lider">É o n.º 1!</div>`}`
          : `<div class="fo-pos"><span>Sem dados para ${esc(met.nome(m))}${cat ? ` na categoria ${esc(cat)}` : ""}.</span></div>`
      }
      ${extra.length ? `<div class="fo-extra">${extra.map((x) => `<div><small>${esc(x.n)}</small><b>${esc(x.v)}</b></div>`).join("")}</div>` : ""}
    </div>`;
    this.mundo.appendChild(camada);
    const musicaAntes = this.musicaAtual;
    this.tocar("whoosh");
    this.tocar("_destaque", {}, 0.4);
    this.flash(0.35);
    animate(camada.querySelector(".fo-cartao"), { scale: [0.6, 1], opacity: [0, 1], duration: 800, ease: spring({ stiffness: 140, damping: 13 }) });
    if (meu && meu.pos <= 3) setTimeout(() => !this.terminado && this.explodir(this.L / 2, this.A * 0.35, { n: 90 }), 600);
    await this.passo(6000);
    camada.classList.add("p-sai");
    await this.esperar(420, { exato: true });
    camada.remove();
    if (musicaAntes && this.musicaAtual !== musicaAntes) som.musica.iniciar(musicaAntes);
  }
  /** Antes do fim dos vídeos: há uma votação a decorrer no site, e onde se vota (link na bio, endereço e QR). */
  async segmentoVotacao() {
    const v = this.votacaoAviso;
    this.votacaoMostrada = true;
    let qr = "";
    try {
      const c = qrcode(0, "M");
      c.addData(v.link);
      c.make();
      qr = c.createSvgTag({ cellSize: 1, margin: 2, scalable: true });
    } catch {
      /* sem QR */
    }
    const dois = v.opcoes.length === 2 && ["confronto", "torneio"].includes(v.tipo);
    const caras = v.opcoes.slice(0, 4);
    const nCaras = caras.length + (v.mais ? 1 : 0);
    const tam = this.vertical ? (dois ? 230 : nCaras > 4 ? 140 : 170) : dois ? 190 : 140;
    this.cena.innerHTML = `<div class="p-centro vv-aviso ${dois ? "dois" : ""}">
      <div class="vv-etiqueta"><i></i>${esc(v.etiqueta)}</div>
      <h2 class="p-titulo vv-pergunta">${esc(v.titulo)}</h2>
      ${caras.length ? `<div class="vv-caras">${caras.map((o, i) => `${dois && i === 1 ? `<b class="vv-vs">VS</b>` : ""}<div class="vv-cara">${o.p ? avatarPalco(o.p, tam) : `<span class="vo-letra" style="width:${tam}px;height:${tam}px">${esc(o.nome.slice(0, 1))}</span>`}<span>${esc(o.nome)}</span></div>`).join("")}${v.mais ? `<div class="vv-cara vv-mais"><span class="vo-letra" style="width:${tam}px;height:${tam}px">+${v.mais}</span><span>e mais</span></div>` : ""}</div>` : ""}
      <div class="vv-onde">
        <div class="vv-texto"><b>Vai votar!</b><span class="vv-bio">👉 ${esc(v.textoBio)}</span><small>ou em <b>${esc(v.linkCurto)}</b></small></div>
        ${qr ? `<div class="vv-qr">${qr}</div>` : ""}
      </div></div>`;
    const raiz = this.cena.firstElementChild;
    animate(raiz.querySelectorAll(".vv-etiqueta, .vv-pergunta"), { translateY: [70, 0], opacity: [0, 1], delay: stagger(160), duration: 900, ease: spring({ stiffness: 140, damping: 14 }) });
    animate(raiz.querySelectorAll(".vv-cara, .vv-vs"), { scale: [0.3, 1], opacity: [0, 1], delay: stagger(130, { start: 450 }), duration: 900, ease: spring({ stiffness: 160, damping: 12 }) });
    animate(raiz.querySelectorAll(".vv-onde"), { translateY: [90, 0], opacity: [0, 1], delay: 1000, duration: 900, ease: "outExpo" });
    this.tocar("whoosh");
    this.tocar("_destaque", {}, 0.5);
    setTimeout(() => !this.terminado && this.explodir(this.L / 2, this.A * 0.3, { n: 60, forca: 0.6 }), 900);
    setTimeout(() => !this.terminado && raiz.querySelector(".vv-bio")?.classList.add("pulsa"), 1700);
    await this.passo(6500);
    await this.sair_(raiz);
  }
  /** Faz um elemento sair (com a animação p-sai) e espera. */
  async sair_(el) {
    el?.classList.add("p-sai");
    await this.esperar(420, { exato: true });
  }
  /** Final: o Youtuber em foco (se ficou para o fim) e a divulgação do canal. */
  async fecho() {
    this.tela.classList.remove("denso");
    if (this.foco && !this.focoMostrado) await this.segmentoFoco();
    if (this.modo === "video" && this.votacaoAviso && !this.votacaoMostrada) await this.segmentoVotacao();
    const c = this.canal;
    const redes = [
      c.youtube ? { i: ICONE_YT, t: c.youtube } : null,
      c.tiktok ? { i: ICONE_TT, t: c.tiktok } : null,
      c.instagram ? { i: ICONE_IG, t: c.instagram } : null,
    ].filter(Boolean);
    this.cena.innerHTML = `<div class="p-centro fc-fecho">
      <div class="fc-pergunta">${esc(this.modo === "direto" ? "Gostaste? Segue o canal" : "Gostaste? Subscreve!")}</div>
      <div class="fc-canal">
        ${LOGO_CANAL}
        <div class="fc-nome"><b>${esc(c.nome)}</b><small>${esc(c.youtube || "no YouTube")}</small></div>
      </div>
      <div class="fc-acoes"><span class="fc-botao">Subscrever</span><span class="fc-sino">${SINO}</span><span class="fc-gosto">${GOSTO}</span></div>
      <div class="fc-cursor">${CURSOR}</div>
      ${redes.length ? `<div class="fc-redes">${redes.map((r) => `<span>${r.i}${esc(r.t)}</span>`).join("")}</div>` : ""}
      <p class="fc-site-linha">Vota e vê os resultados em <b class="fc-site">${esc(this.votacaoAviso ? this.votacaoAviso.linkCurto : location.host)}</b></p></div>`;
    const raiz = this.cena.firstElementChild;
    animate(raiz.querySelectorAll(".fc-pergunta, .fc-canal, .fc-acoes, .fc-redes, .fc-site-linha"), { translateY: [60, 0], opacity: [0, 1], delay: stagger(140), duration: 900, ease: spring({ stiffness: 140, damping: 14 }) });
    this.tocar("_abertura", {}, 0.1);
    // O cursor carrega em "Subscrever", no sino e no gosto
    const cursor = raiz.querySelector(".fc-cursor");
    const alvos = ["fc-botao", "fc-sino", "fc-gosto"];
    await this.esperar(1300, { exato: true });
    for (const cls of alvos) {
      const el = raiz.querySelector("." + cls);
      const r = el.getBoundingClientRect();
      const t = raiz.getBoundingClientRect();
      const k = this.L / this.tela.getBoundingClientRect().width;
      cursor.style.opacity = "1";
      cursor.style.transform = `translate(${(r.left - t.left + r.width * 0.6) * k}px, ${(r.top - t.top + r.height * 0.55) * k}px)`;
      await this.esperar(650, { exato: true });
      el.classList.add("feito");
      cursor.classList.add("clica");
      setTimeout(() => cursor.classList.remove("clica"), 200);
      this.tocar(cls === "fc-sino" ? "sino" : "clique");
      if (cls === "fc-botao") {
        el.textContent = "Subscrito";
        this.explodir((r.left - t.left + r.width / 2) * k, (r.top - t.top) * k, { n: 50, forca: 0.5 });
      }
      await this.esperar(450, { exato: true });
    }
    cursor.style.opacity = "0";
    this.tocar("_destaque", {}, 0.1);
    await this.passo(3200);
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
    this.kit?.limpar();
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
  const foco = Palco.atual?.foco && p?.id === Palco.atual.foco;
  return avatar(p, tam).replace('class="avatar"', `class="avatar palco-avatar${foco ? " em-foco" : ""}"`);
}

/** Junta o Youtuber em foco a uma lista (substitui o último), se ainda não estiver lá. */
export function comFoco(lista, palco, { chave = (x) => x, criar = (p) => p } = {}) {
  const id = palco?.foco;
  if (!id || lista.some((x) => chave(x)?.id === id)) return lista;
  const p = pessoa(id);
  if (!p) return lista;
  const nova = [...lista];
  nova[Math.max(0, nova.length - 1 - Math.floor(Math.random() * Math.min(3, nova.length)))] = criar(p);
  return nova;
}

const LOGO_CANAL = `<svg class="fc-logo" viewBox="0 0 40 40" aria-hidden="true"><defs><linearGradient id="lg-canal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff4d70"/><stop offset=".55" stop-color="#c3123e"/><stop offset="1" stop-color="#6e0820"/></linearGradient></defs><rect width="40" height="40" rx="20" fill="url(#lg-canal)"/><path d="M16 12.6c0-1.5 1.6-2.4 2.9-1.6l10.1 6.4c1.2.8 1.2 2.5 0 3.3l-10.1 6.4c-1.3.8-2.9-.1-2.9-1.6z" fill="#fff"/><circle cx="31" cy="9" r="4.2" fill="#f4b942" stroke="#12060b" stroke-width="2"/></svg>`;
const SINO = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a6 6 0 0 0-6 6v4l-2 3h16l-2-3V9a6 6 0 0 0-6-6zM9.5 19a2.5 2.5 0 0 0 5 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`;
const GOSTO = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10v10H4V10zM7 10l4-7c1.5 0 2.5 1 2.2 2.6L12.6 9H19a2 2 0 0 1 2 2.3l-1.2 7A2 2 0 0 1 17.8 20H7" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`;
const CURSOR = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3l14 8-6 1.5L9.5 19z" fill="#fff" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
const ICONE_YT = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="4" fill="#ff0033"/><path d="M10 9v6l5-3z" fill="#fff"/></svg>`;
const ICONE_TT = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3v11.5a3.5 3.5 0 1 1-3-3.46V8.1A6.5 6.5 0 1 0 17 14.5V8.6a6.6 6.6 0 0 0 4 1.4V7a4 4 0 0 1-4-4z" fill="currentColor"/></svg>`;
const ICONE_IG = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.5" cy="6.5" r="1.3" fill="currentColor"/></svg>`;

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

// ---------- Página de escolha (em pagina.js) ----------
export { render } from "./pagina.js";
