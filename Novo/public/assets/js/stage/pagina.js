// Página do Palco: lista de espetáculos (para vídeos e para direto) e opções de cada um.

import { estado, pessoa, mesesComDados, procurar } from "../data.js";
import { esc, mesNome } from "../format.js";
import { $, $$, avatar, toast } from "../ui.js";
import { som } from "../audio.js";
import { Palco, ESPETACULOS, GRUPOS, eAbortado } from "./stage.js";
import { TEMAS, GRUPOS_TEMAS, TEMA_DA_CATEGORIA } from "./temas.js";
import { podeGravar, prepararGravacao } from "./gravar.js";
import { textoPublicar } from "./legenda.js";

const USOS = { video: "Vídeo", direto: "Direto" };

export async function render(main, { params, query }) {
  main.dataset.titulo = "Palco";
  const id = params[0];
  const esp = ESPETACULOS.find((e) => e.id === id);
  if (!esp) return escolha(main, query);
  return opcoes(main, esp, query);
}

// ---------- Lista ----------
function escolha(main, query) {
  let filtro = ["video", "direto"].includes(query.get("para")) ? query.get("para") : "todos";
  main.innerHTML = `<div class="wrap">
    <div class="pagina-topo"><h1>Palco</h1><p>Espetáculos em ecrã inteiro, com música, efeitos e ${TEMAS.length} temas. Para gravar vídeos para o YouTube, TikTok, Reels e Shorts, ou para mostrar em direto na Twitch.</p></div>
    <div class="segmentos pl-filtro" role="group">
      <button type="button" data-para="todos">Tudo</button>
      <button type="button" data-para="video">Para vídeos</button>
      <button type="button" data-para="direto">Para direto (Twitch)</button>
    </div>
    <div class="pl-dica" id="pl-dica"></div>
    <div id="pl-grupos"></div>
  </div>`;
  const dicas = {
    todos: "",
    video: `<b>Para vídeos:</b> escolhe o formato 9:16 para TikTok, Reels e Shorts (até 60 s com a velocidade Rápida) ou 16:9 para o YouTube. Carrega em <b>Gravar vídeo</b> e o site grava o espetáculo com som, sem precisares de outro programa. No fim aparece o vídeo e uma legenda pronta a copiar. Todos os vídeos acabam com a divulgação do canal.`,
    direto: `<b>Para direto:</b> usa o ritmo <b>Eu avanço</b> (espaço para avançar), responde aos jogos com as setas e liga <b>Repetir no fim</b> para deixar a correr entre conversas. O tema <b>Chroma (OBS)</b> tem fundo verde para recortar por cima da câmara.`,
  };
  const desenhar = () => {
    $$("[data-para]", main).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.para === filtro)));
    $("#pl-dica", main).innerHTML = dicas[filtro] ? `<div class="aviso info"><p>${dicas[filtro]}</p></div>` : "";
    $("#pl-grupos", main).innerHTML = GRUPOS.map((g) => {
      const lista = ESPETACULOS.filter((e) => e.grupo === g.id && (filtro === "todos" || e.usos.includes(filtro)));
      if (!lista.length) return "";
      return `<section class="secao palco-grupo"><div class="secao-cabeca"><div><h2>${esc(g.nome)}</h2><p>${esc(g.texto)}</p></div></div>
        <div class="palco-lista">${lista
          .map(
            (e) => `<a class="palco-opcao" href="#/palco/${e.id}${filtro !== "todos" ? `?para=${filtro}` : ""}">
          ${e.icone}
          <span><b>${esc(e.nome)}</b><small>${esc(e.texto)}</small></span>
          <span class="pl-selos">${e.usos.map((u) => `<i class="pl-selo ${u}">${USOS[u]}</i>`).join("")}<i class="pl-selo dur">${esc(e.dur)}</i></span>
        </a>`,
          )
          .join("")}</div></section>`;
    }).join("");
  };
  $$("[data-para]", main).forEach((b) =>
    b.addEventListener("click", () => {
      filtro = b.dataset.para;
      history.replaceState(null, "", "#/palco" + (filtro !== "todos" ? `?para=${filtro}` : ""));
      desenhar();
    }),
  );
  desenhar();
}

// ---------- Opções ----------
const opcaoMes = (meses, sel) => [...meses].reverse().map((m) => `<option value="${m}" ${m === sel ? "selected" : ""}>${mesNome(m)}</option>`).join("");
const campoPessoa = (nome, rotulo, query, ph = "Ao acaso") => `<label class="campo cresce"><span>${rotulo}</span><span style="position:relative"><input class="input" name="${nome}" data-pessoa="${esc(query.get(nome) || "")}" placeholder="${ph}" value="${esc(pessoa(query.get(nome))?.name || "")}"></span></label>`;

function opcoes(main, esp, query) {
  const ds = estado.ds;
  const meses = mesesComDados(5).filter((m) => m < ds.currentMonth);
  const fmt = query.get("fmt") === "9x16" ? "9x16" : "16x9";
  let modo = query.get("para") === "direto" || (query.get("para") !== "video" && esp.usos[0] === "direto") ? "direto" : "video";
  const temaInicial = TEMAS.some((t) => t.id === query.get("tema")) ? query.get("tema") : lerTema();
  const cat = `<label class="campo"><span>Categoria</span><select class="input" name="cat"><option value="">Todas</option>${ds.categories.map((c) => `<option>${esc(c)}</option>`).join("")}</select></label>`;
  const mes = `<label class="campo"><span>Mês</span><select class="input" name="m">${opcaoMes(meses, estado.ref)}</select></label>`;
  const temSubs = ds.people.some((p) => p.sb?.s && Object.keys(p.sb.s).length);
  const metricas = () => `<label class="campo"><span>Ranking por</span><select class="input" name="metric">
      <option value="views">Views do mês</option><option value="indice">Índice de Influência</option>${temSubs ? `<option value="subsMes">Subscritores ganhos no mês</option>` : ""}
      <option value="crescimento">Crescimento face ao mês anterior</option><option value="subs">Subscritores (total)</option><option value="total">Views totais</option></select></label>`;
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
    desafio: `<label class="campo"><span>Perguntas</span><select class="input" name="n"><option>6</option><option selected>8</option><option>12</option></select></label>${mes}
      <label class="campo"><span>Entre os</span><select class="input" name="top"><option value="30">Top 30</option><option value="60" selected>Top 60</option><option value="150">Top 150</option></select></label>${cat}`,
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
  const temFoco = !["cartao", "historia"].includes(esp.id);

  main.innerHTML = `<div class="wrap">
    <div class="pagina-topo"><p><a href="#/palco${query.get("para") ? `?para=${esc(query.get("para"))}` : ""}">Palco</a></p><h1>${esc(esp.nome)}</h1><p>${esc(esp.texto)}</p></div>
    <form class="painel palco-form" id="pl-form">
      <div class="campo"><span>Para</span><div class="segmentos pl-modo" role="group"><button type="button" data-modo="video" aria-pressed="${modo === "video"}">Vídeo (gravar e publicar)</button><button type="button" data-modo="direto" aria-pressed="${modo === "direto"}">Direto (Twitch)</button></div></div>
      <div class="campo" style="margin-top:18px"><span>Tema</span>
        ${GRUPOS_TEMAS.map(
          (g) => `<div class="tema-grupo"><small>${esc(g.nome)}</small><div class="tema-escolha" role="radiogroup">${TEMAS.filter((t) => (t.grupo || "ambientes") === g.id)
            .map((t) => `<button type="button" role="radio" data-tema="${t.id}" aria-checked="${t.id === temaInicial}" style="--a:${t.amostra[0]};--b:${t.amostra[1]};--c:${t.amostra[2]}"><i></i><b>${esc(t.nome)}</b><small>${esc(t.texto)}</small></button>`)
            .join("")}</div></div>`,
        ).join("")}
        <small class="muted" id="pl-tema-nota"></small>
      </div>
      <div class="filtros" style="margin:18px 0 0">
        <div class="campo"><span>Formato</span><div class="segmentos" role="group"><button type="button" data-fmt="16x9" aria-pressed="${fmt === "16x9"}">16:9 horizontal</button><button type="button" data-fmt="9x16" aria-pressed="${fmt === "9x16"}">9:16 vertical</button></div></div>
        ${campos}
      </div>
      ${
        temFoco
          ? `<div class="pl-foco">
        <div class="filtros" style="margin:0">
          ${campoPessoa("foco", "Youtuber em foco (opcional)", query, "Por exemplo o teu canal")}
          <label class="campo"><span>Mostrar em foco</span><select class="input" name="focoQuando"><option value="fim">No fim</option><option value="meio">A meio</option><option value="inicio">No início</option></select></label>
        </div>
        <small class="muted">O espetáculo corre normalmente e, no momento escolhido, mostra onde ficou este Youtuber e os números dele. Sempre que aparecer, tem um brilho especial. Nos jogos e duelos, entra de certeza.</small>
      </div>`
          : ""
      }
      <div class="filtros" style="margin:18px 0 0">
        <div class="campo"><span>Ritmo</span><div class="segmentos" role="group"><button type="button" data-ritmo="auto" aria-pressed="${modo === "video"}">Automático</button><button type="button" data-ritmo="manual" aria-pressed="${modo === "direto"}">Eu avanço</button></div></div>
        <div class="campo"><span>Velocidade</span><div class="segmentos" role="group"><button type="button" data-vel="rapido" aria-pressed="false">Rápida</button><button type="button" data-vel="normal" aria-pressed="true">Normal</button><button type="button" data-vel="lento" aria-pressed="false">Lenta</button></div></div>
      </div>
      <div class="ed-acoes pl-acoes">
        <div class="pl-checks">
          <label class="ed-check" style="margin:0"><input type="checkbox" name="som" ${som.ligado ? "checked" : ""}> Com música e efeitos</label>
          <label class="ed-check pl-so-direto" style="margin:0"><input type="checkbox" name="repetir"> Repetir no fim (deixar a correr)</label>
        </div>
        <div class="pl-botoes">
          <button class="btn" type="button" id="pl-legenda">Legenda para publicar</button>
          ${podeGravar() ? `<button class="btn btn-primario pl-so-video" type="button" id="pl-gravar">● Gravar vídeo</button>` : ""}
          <button class="btn btn-ouro" type="submit" style="height:48px;padding:0 28px;font-size:var(--t-base)">Começar</button>
        </div>
      </div>
      ${podeGravar() ? `<p class="muted pl-so-video" style="font-size:var(--t-sm);margin:12px 0 0">Gravar vídeo: o browser pede para partilhar este separador (escolhe <b>Este separador</b>). O vídeo é gravado em Full HD (1080×1920 na vertical, 1920×1080 na horizontal), com som, e aparece aqui no fim. Para a melhor qualidade, usa o Chrome no computador, com a janela grande. Esc termina a gravação.</p>` : `<p class="muted pl-so-video" style="font-size:var(--t-sm);margin:12px 0 0">Para gravar neste aparelho, usa a gravação de ecrã do sistema. No computador, com o Chrome, aparece aqui o botão Gravar vídeo.</p>`}
    </form>
    <div id="pl-publicar"></div></div>`;

  let formato = fmt;
  let ritmo = modo === "direto" ? "manual" : "auto";
  let velocidade = "normal";
  let temaId = temaInicial;
  let temaEscolhidoAMao = TEMAS.some((t) => t.id === query.get("tema"));
  const form = $("#pl-form", main);
  const marcar = (attr, v) => $$(`[data-${attr}]`, main).forEach((x) => x.setAttribute(x.getAttribute("role") === "radio" ? "aria-checked" : "aria-pressed", String(x.dataset[attr] === v)));
  const grupo = (attr, aoEscolher) =>
    $$(`[data-${attr}]`, main).forEach((b) =>
      b.addEventListener("click", () => {
        aoEscolher(b.dataset[attr]);
        marcar(attr, b.dataset[attr]);
      }),
    );
  const atualizarModo = () => {
    form.classList.toggle("modo-direto", modo === "direto");
    form.classList.toggle("modo-video", modo === "video");
  };
  const mudarTema = (id, nota = "") => {
    temaId = id;
    marcar("tema", id);
    $("#pl-tema-nota", main).textContent = nota;
  };
  grupo("modo", (v) => {
    modo = v;
    ritmo = v === "direto" ? "manual" : "auto";
    marcar("ritmo", ritmo);
    atualizarModo();
  });
  grupo("fmt", (v) => (formato = v));
  grupo("ritmo", (v) => (ritmo = v));
  grupo("vel", (v) => (velocidade = v));
  grupo("tema", (v) => {
    temaId = v;
    temaEscolhidoAMao = true;
    guardarTema(v);
    $("#pl-tema-nota", main).textContent = "";
    som.tocar("clique");
  });
  atualizarModo();
  // Tema da categoria: ao escolher uma categoria ou um Youtuber, o tema acompanha (se não foi escolhido à mão)
  const sugerirTema = (categoria) => {
    const t = TEMA_DA_CATEGORIA[categoria];
    if (!t || temaEscolhidoAMao) return;
    mudarTema(t, `Tema ${TEMAS.find((x) => x.id === t).nome} sugerido para a categoria ${categoria}.`);
  };
  form.elements.namedItem("cat")?.addEventListener("change", (e) => sugerirTema(e.target.value));
  $$("input[data-pessoa]", main).forEach((inp) =>
    ligarEscolhaPessoa(inp, (p) => {
      if (inp.name !== "foco") sugerirTema(p.category);
    }),
  );

  const lerOpcoes = () => {
    const opts = {};
    for (const el of form.elements) if (el.name && !["som", "repetir"].includes(el.name)) opts[el.name] = el.dataset.pessoa !== undefined ? el.dataset.pessoa : el.value;
    return opts;
  };

  const iniciar = async (gravarVideo) => {
    const opts = lerOpcoes();
    const repetir = modo === "direto" && form.elements.namedItem("repetir").checked;
    som.definir(form.elements.namedItem("som").checked);
    som.desbloquear();
    let gravacao = null;
    if (gravarVideo) {
      gravacao = await prepararGravacao(formato);
      if (!gravacao) return;
    }
    const mod = await import(esp.mod);
    const palco = new Palco({ formato, manual: ritmo === "manual", tema: temaId, velocidade, foco: opts.foco, focoQuando: opts.focoQuando || "fim", modo });
    if (gravacao) gravacao.comecar(palco);
    let erro = false;
    try {
      do {
        await mod.correr(palco, opts);
        palco.focoMostrado = false;
        palco.lembreteFeito = false;
      } while (repetir && !palco.terminado);
      await palco.esperar(800, { exato: true });
    } catch (err) {
      if (!eAbortado(err)) {
        erro = true;
        console.error(err);
        palco.cena.innerHTML = `<div class="palco-erro"><h2>Não foi possível continuar</h2><p>${esc(err.message)}</p></div>`;
        await palco.esperar(4000).catch(() => {});
      }
    }
    const video = gravacao ? await gravacao.parar() : null;
    palco.sair();
    if (!erro) mostrarPublicar($("#pl-publicar", main), esp, opts, { formato, temaId, video });
  };
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    iniciar(false);
  });
  $("#pl-gravar", main)?.addEventListener("click", () => iniciar(true));
  $("#pl-legenda", main).addEventListener("click", () => {
    mostrarPublicar($("#pl-publicar", main), esp, lerOpcoes(), { formato, temaId });
    $("#pl-publicar", main).scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

/** Painel com o vídeo gravado (se houver) e a legenda pronta a copiar. */
function mostrarPublicar(alvo, esp, opts, { formato, temaId, video }) {
  const t = textoPublicar(esp, opts, { formato, temaId });
  const nomeFicheiro = `placar-${esp.id}-${temaId}-${formato}-${new Date().toISOString().slice(0, 10)}.${video?.ext || "mp4"}`;
  alvo.innerHTML = `<section class="secao"><div class="secao-cabeca"><div><h2>Pronto para publicar</h2><p>${esc(t.dica)}</p></div></div>
    <div class="pl-publicar ${video ? "com-video" : ""}">
      ${
        video
          ? `<div class="painel pl-video"><video src="${video.url}" controls playsinline class="${formato === "9x16" ? "vertical" : ""}"></video>
          <div class="ed-acoes" style="justify-content:flex-start"><a class="btn btn-ouro" href="${video.url}" download="${esc(nomeFicheiro)}">Descarregar vídeo (${video.ext.toUpperCase()}, ${(video.blob.size / 1048576).toFixed(1)} MB)</a></div>
          ${video.ext !== "mp4" ? `<p class="muted" style="font-size:var(--t-sm)">Este browser gravou em WebM. O YouTube aceita WebM; para TikTok e Instagram converte para MP4 (o Chrome recente já grava diretamente em MP4).</p>` : ""}</div>`
          : ""
      }
      <div class="painel pl-textos">
        ${[
          ["Título", t.titulo],
          ["Legenda", t.legenda],
          ["Hashtags", t.hashtags],
        ]
          .map(([n, v]) => `<div class="pl-texto"><div class="pl-texto-topo"><b>${n}</b><button class="btn btn-pequeno" data-copiar>Copiar</button></div><p>${esc(v)}</p></div>`)
          .join("")}
      </div>
    </div></section>`;
  $$("[data-copiar]", alvo).forEach((b) =>
    b.addEventListener("click", async () => {
      const texto = b.closest(".pl-texto").querySelector("p").textContent;
      try {
        await navigator.clipboard.writeText(texto);
        toast("Copiado.");
      } catch {
        toast("Não foi possível copiar.", { erro: true });
      }
    }),
  );
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

function ligarEscolhaPessoa(input, aoEscolher) {
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
    const p = pessoa(b.dataset.id);
    input.value = p.name;
    caixa.classList.remove("aberta");
    aoEscolher?.(p);
  });
  input.addEventListener("blur", () => setTimeout(() => caixa.classList.remove("aberta"), 200));
}
