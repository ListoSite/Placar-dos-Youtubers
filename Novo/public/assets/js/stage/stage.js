// Palco: espetáculos em ecrã inteiro para mostrar e gravar (16:9 e 9:16).

import { estado, pessoa, mesesComDados, procurar } from "../data.js";
import { esc, mesNome } from "../format.js";
import { $, $$, avatar } from "../ui.js";
import { som } from "../audio.js";

export const ESPETACULOS = [
  { id: "revelacao", icone: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3"><path d="M4 42h40M8 42V28h10v14M19 42V18h10v24M30 42V32h10v10"/><path d="m24 4 2.4 4.8 5.3.8-3.8 3.7.9 5.2L24 16l-4.8 2.5.9-5.2-3.8-3.7 5.3-.8z" fill="currentColor" stroke="none"/></svg>`, nome: "Revelação do top", texto: "Do 10.º ao 1.º lugar, com suspense no pódio. Ideal para o vídeo do mês.", mod: "./revelacao.js" },
  { id: "corrida", icone: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3"><path d="M6 6v36h36"/><path d="M12 14h22M12 22h30M12 30h14" stroke-width="5" stroke-linecap="round"/></svg>`, nome: "Corrida das views", texto: "Barras que se ultrapassam mês a mês. Mostra quem dominou cada época.", mod: "./corrida.js" },
  { id: "batalha", icone: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3"><path d="M6 6l20 20M42 6 22 26M10 30l8 8M38 30l-8 8M14 34l-6 6M34 34l6 6"/></svg>`, nome: "Batalha", texto: "Dois Youtubers frente a frente, categoria a categoria, até haver um vencedor.", mod: "./batalha.js" },
  { id: "quiz", icone: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3"><circle cx="24" cy="24" r="19"/><path d="M18 18a6 6 0 1 1 9 5.2c-2 1.2-3 2.3-3 4.8"/><circle cx="24" cy="35" r="1.8" fill="currentColor"/></svg>`, nome: "Quem fez mais?", texto: "Jogo de adivinhar: dois Youtubers, conta até 5 e revela quem fez mais views.", mod: "./quiz.js" },
  { id: "cartao", icone: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3"><rect x="5" y="9" width="38" height="30" rx="5"/><circle cx="17" cy="21" r="5"/><path d="M10 33c2-4 12-4 14 0M29 19h9M29 26h9"/></svg>`, nome: "Cartão de Youtuber", texto: "Um Youtuber em destaque, com o Índice e os números mais importantes.", mod: "./cartao.js" },
];

class Abortado extends Error {}

/** Motor do palco: escala a tela, controla tempo, pausa e avanço. */
export class Palco {
  constructor({ formato = "16x9", manual = false }) {
    this.formato = formato;
    this.manual = manual;
    this.L = formato === "9x16" ? 1080 : 1920;
    this.A = formato === "9x16" ? 1920 : 1080;
    this.pausado = false;
    this.terminado = false;
    this.esperas = new Set();
    this.raiz = document.createElement("div");
    this.raiz.className = "palco";
    this.raiz.innerHTML = `
      <div class="palco-tela ${formato === "9x16" ? "vertical" : "horizontal"}" style="width:${this.L}px;height:${this.A}px">
        <div class="palco-ondas"></div>
        <div class="palco-cena"></div>
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
    this.cena = $(".palco-cena", this.raiz);
    document.body.appendChild(this.raiz);
    document.body.classList.add("modo-palco");

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
    if (this.pausado) som.musica.parar(0.3);
    else if (this.musicaAtual) som.musica.iniciar(this.musicaAtual);
  }
  avancar() {
    for (const w of [...this.esperas]) w.saltar();
  }

  /** Espera ms (o tempo pára durante a pausa). Em modo manual, os "passos" esperam pelo utilizador. */
  esperar(ms, { passo = false } = {}) {
    if (this.terminado) return Promise.reject(new Abortado());
    return new Promise((resolve, reject) => {
      let restante = ms;
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
  musica(estilo, intensidade = 1) {
    this.musicaAtual = estilo;
    som.musica.definirIntensidade(intensidade);
    if (!this.pausado) som.musica.iniciar(estilo);
  }
  tocar(nome, opcoes, atraso) {
    if (!this.terminado) som.tocar(nome, opcoes, atraso);
  }
  limpar() {
    this.cena.innerHTML = "";
  }
  sair(peloVoltar = false) {
    if (this.terminado) return;
    this.terminado = true;
    removeEventListener("popstate", this._voltar);
    if (!peloVoltar && history.state?.palco) history.back();
    for (const w of [...this.esperas]) w.abortar();
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

/** Confetes dourados e azuis. */
export function confetes(cena, n = 140) {
  const cores = ["#f4b942", "#ffd77a", "#e0294f", "#ffffff", "#ff8199"];
  const caixa = document.createElement("div");
  caixa.className = "confetes";
  for (let i = 0; i < n; i++) {
    const c = document.createElement("i");
    c.style.left = Math.random() * 100 + "%";
    c.style.background = cores[i % cores.length];
    c.style.animationDelay = Math.random() * 0.9 + "s";
    c.style.animationDuration = 2.6 + Math.random() * 2.2 + "s";
    c.style.setProperty("--deriva", (Math.random() * 2 - 1) * 260 + "px");
    c.style.setProperty("--roda", Math.random() * 1080 + "deg");
    c.style.width = 10 + Math.random() * 14 + "px";
    c.style.height = 6 + Math.random() * 10 + "px";
    caixa.appendChild(c);
  }
  cena.appendChild(caixa);
  setTimeout(() => caixa.remove(), 6500);
}

/** Avatar grande para o palco. */
export function avatarPalco(p, tam) {
  return avatar(p, tam).replace('class="avatar"', 'class="avatar palco-avatar"');
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
    <div class="pagina-topo"><h1>Palco</h1><p>Espetáculos em ecrã inteiro, com música e efeitos, para mostrar numa chamada ou gravar para o YouTube, TikTok, Reels e Shorts. Escolhe o formato antes de começar.</p></div>
    <div class="palco-lista">${ESPETACULOS.map(
      (e) => `<a class="palco-opcao" href="#/palco/${e.id}">
        ${e.icone}
        <span><b>${esc(e.nome)}</b><small>${esc(e.texto)}</small></span>
      </a>`,
    ).join("")}</div>
    <div class="aviso info" style="margin-top:28px"><p>Para gravar, usa a gravação de ecrã do computador (por exemplo OBS ou a Barra de Jogo do Windows) ou do telemóvel, com o som do sistema ligado. O formato 9:16 enche o ecrã vertical do TikTok, Reels e Shorts.</p></div>
  </div>`;
}

function opcoes(main, esp, query) {
  const ds = estado.ds;
  const meses = mesesComDados(5).filter((m) => m < ds.currentMonth);
  const fmt = query.get("fmt") === "9x16" ? "9x16" : "16x9";
  const campos = {
    revelacao: `
      <label class="campo"><span>Ranking</span><select class="input" name="metric"><option value="views">Views do mês</option><option value="indice">Índice de Influência</option></select></label>
      <label class="campo"><span>Mês</span><select class="input" name="m">${[...meses].reverse().map((m) => `<option value="${m}" ${m === estado.ref ? "selected" : ""}>${mesNome(m)}</option>`).join("")}</select></label>
      <label class="campo"><span>Quantos</span><select class="input" name="n"><option>5</option><option selected>10</option><option>15</option><option>20</option></select></label>
      <label class="campo"><span>Categoria</span><select class="input" name="cat"><option value="">Todas</option>${ds.categories.map((c) => `<option>${esc(c)}</option>`).join("")}</select></label>`,
    corrida: `
      <label class="campo"><span>Medida</span><select class="input" name="modo"><option value="mes">Views de cada mês</option><option value="acumulado">Views acumuladas</option></select></label>
      <label class="campo"><span>De</span><select class="input" name="de">${meses.map((m, i) => `<option value="${m}" ${i === 0 ? "selected" : ""}>${mesNome(m)}</option>`).join("")}</select></label>
      <label class="campo"><span>Até</span><select class="input" name="ate">${meses.map((m) => `<option value="${m}" ${m === estado.ref ? "selected" : ""}>${mesNome(m)}</option>`).join("")}</select></label>
      <label class="campo"><span>Barras</span><select class="input" name="n"><option>8</option><option selected>10</option><option>12</option><option>15</option></select></label>
      <label class="campo"><span>Categoria</span><select class="input" name="cat"><option value="">Todas</option>${ds.categories.map((c) => `<option>${esc(c)}</option>`).join("")}</select></label>`,
    batalha: `
      <label class="campo cresce"><span>Youtuber 1</span><span style="position:relative"><input class="input" name="a" data-pessoa="${esc(query.get("a") || "")}" placeholder="Ao acaso" value="${esc(pessoa(query.get("a"))?.name || "")}"></span></label>
      <label class="campo cresce"><span>Youtuber 2</span><span style="position:relative"><input class="input" name="b" data-pessoa="${esc(query.get("b") || "")}" placeholder="Ao acaso" value="${esc(pessoa(query.get("b"))?.name || "")}"></span></label>`,
    quiz: `
      <label class="campo"><span>Rondas</span><select class="input" name="n"><option>5</option><option selected>8</option><option>12</option></select></label>
      <label class="campo"><span>Mês</span><select class="input" name="m">${[...meses].reverse().map((m) => `<option value="${m}" ${m === estado.ref ? "selected" : ""}>${mesNome(m)}</option>`).join("")}</select></label>
      <label class="campo"><span>Entre os</span><select class="input" name="top"><option value="30">Top 30</option><option value="80" selected>Top 80</option><option value="200">Top 200</option></select></label>`,
    cartao: `<label class="campo cresce"><span>Youtuber</span><span style="position:relative"><input class="input" name="id" data-pessoa="${esc(query.get("id") || "")}" placeholder="Procurar" value="${esc(pessoa(query.get("id"))?.name || "")}"></span></label>`,
  }[esp.id];

  main.innerHTML = `<div class="wrap">
    <div class="pagina-topo"><p><a href="#/palco">Palco</a></p><h1>${esc(esp.nome)}</h1><p>${esc(esp.texto)}</p></div>
    <form class="painel palco-form" id="pl-form">
      <div class="filtros" style="margin:0">
        <div class="campo"><span>Formato</span><div class="segmentos" role="group"><button type="button" data-fmt="16x9" aria-pressed="${fmt === "16x9"}">16:9 horizontal</button><button type="button" data-fmt="9x16" aria-pressed="${fmt === "9x16"}">9:16 vertical</button></div></div>
        ${campos}
        <div class="campo"><span>Ritmo</span><div class="segmentos" role="group"><button type="button" data-ritmo="auto" aria-pressed="true">Automático</button><button type="button" data-ritmo="manual" aria-pressed="false">Eu avanço</button></div></div>
      </div>
      <div class="ed-acoes" style="justify-content:space-between;margin-top:20px">
        <label class="ed-check" style="margin:0"><input type="checkbox" name="som" ${som.ligado ? "checked" : ""}> Com música e efeitos</label>
        <button class="btn btn-ouro" type="submit" style="height:48px;padding:0 28px;font-size:var(--t-base)">Começar</button>
      </div>
    </form></div>`;

  let formato = fmt;
  let ritmo = "auto";
  $$("[data-fmt]", main).forEach((b) =>
    b.addEventListener("click", () => {
      formato = b.dataset.fmt;
      $$("[data-fmt]", main).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    }),
  );
  $$("[data-ritmo]", main).forEach((b) =>
    b.addEventListener("click", () => {
      ritmo = b.dataset.ritmo;
      $$("[data-ritmo]", main).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    }),
  );
  $$("input[data-pessoa]", main).forEach((inp) => ligarEscolhaPessoa(inp));

  $("#pl-form", main).addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target.elements;
    const opts = {};
    for (const el of f) if (el.name && el.name !== "som") opts[el.name] = el.dataset.pessoa !== undefined ? el.dataset.pessoa : el.value;
    som.definir(f.namedItem("som").checked);
    som.desbloquear();
    const mod = await import(esp.mod);
    const palco = new Palco({ formato, manual: ritmo === "manual" });
    try {
      await mod.correr(palco, opts);
      await palco.esperar(1500);
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
