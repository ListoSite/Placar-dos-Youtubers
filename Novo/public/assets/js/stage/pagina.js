// Página do Palco: lista de espetáculos (para vídeos e para direto) e opções de cada um.

import { estado, pessoa, mesesComDados, procurar, api, temSessao } from "../data.js";
import { CENAS, ONDES, novaCena, roteiroPadrao, resumoCena, cenaPronta } from "./roteiro.js";
import { semear, largar, novaSemente } from "./sorte.js";
import { quemAparece } from "../quem.js";
import { esc, mesNome } from "../format.js";
import { $, $$, avatar, toast, janela } from "../ui.js";
import { som } from "../audio.js";
import { Palco, ESPETACULOS, GRUPOS, eAbortado } from "./stage.js";
import { TEMAS, GRUPOS_TEMAS, TEMA_DA_CATEGORIA } from "./temas.js";
import { NOME_DO_KIT, kitDoTema } from "./kits.js";
import { podeGravar, prepararGravacao } from "./gravar.js";
import { textoPublicar } from "./legenda.js";
import { carregarHistorico, historicoEmCache } from "./historico.js";

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
  main.innerHTML = `<div class="wrap pl-pagina">
    <div class="pagina-topo pn-topo-acoes">
      <div><p class="pn-migalha">Criar vídeos</p><h1>Palco</h1><p>Escolhe um espetáculo, ajusta-o e grava o vídeo. ${ESPETACULOS.length} espetáculos e ${TEMAS.length} temas.</p></div>
      <div class="segmentos pl-filtro" role="group" aria-label="Mostrar">
        <button type="button" data-para="todos">Tudo</button>
        <button type="button" data-para="video">Para vídeos</button>
        <button type="button" data-para="direto">Para direto</button>
      </div>
    </div>
    <div class="pl-dica" id="pl-dica"></div>
    <div id="pl-grupos"></div>
    <div id="pl-hall"></div>
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
      return `<section class="pl-grupo"><header class="pl-grupo-cabeca"><h2>${esc(g.nome)} <span>${lista.length}</span></h2><p>${esc(g.texto)}</p></header>
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
  hallDaFama($("#pl-hall", main));
}

/** Estrelas, coroas e clássicos dos vídeos gravados. */
async function hallDaFama(alvo) {
  const h = await carregarHistorico();
  const lista = Object.entries(h.pessoas || {}).map(([id, d]) => ({ p: pessoa(id), ...d })).filter((x) => x.p);
  if (!lista.length || !document.body.contains(alvo)) return;
  const topo = (campo, n = 5) => lista.filter((x) => x[campo] > 0).sort((a, b) => b[campo] - a[campo]).slice(0, n);
  const linhaP = (x, valor) => `<a class="hall-linha" href="#/youtuber/${encodeURIComponent(x.p.id)}">${avatar(x.p, 32)}<span>${esc(x.p.name)}</span><b>${valor}</b></a>`;
  const caixas = [
    topo("estrelas").length ? `<div class="vidro hall-caixa"><h3>★ Estrelas (torneios ganhos)</h3>${topo("estrelas").map((x) => linhaP(x, `<span class="estrelas">${x.estrelas > 5 ? `★×${x.estrelas}` : "★".repeat(x.estrelas)}</span>`)).join("")}</div>` : "",
    topo("coroas").length ? `<div class="vidro hall-caixa"><h3>👑 Coroas (1.º nos rankings)</h3>${topo("coroas").map((x) => linhaP(x, x.coroas)).join("")}</div>` : "",
    topo("v").length ? `<div class="vidro hall-caixa"><h3>⚔️ Mais vitórias em duelos</h3>${topo("v").map((x) => linhaP(x, `${x.v}–${x.d}`)).join("")}</div>` : "",
    (h.classicos || []).length
      ? `<div class="vidro hall-caixa"><h3>⚡ Clássicos</h3>${h.classicos
          .slice(0, 5)
          .map((c) => {
            const [a, b] = c.par.map(pessoa);
            if (!a || !b) return "";
            return `<div class="hall-linha">${avatar(a, 28)}${avatar(b, 28)}<span>${esc(a.name)} vs ${esc(b.name)}</span><b>${c.v[a.id] || 0}–${c.v[b.id] || 0}</b></div>`;
          })
          .join("")}</div>`
      : "",
  ].filter(Boolean);
  alvo.innerHTML = `<section class="pl-grupo pl-hall"><header class="pl-grupo-cabeca"><h2>Hall da fama</h2><p>Os resultados dos vídeos gravados ficam para sempre: estrelas dos torneios, coroas dos rankings e os clássicos.</p></header><div class="hall" style="margin-top:0">${caixas.join("")}</div></section>`;
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
  // O Caso: o Índice com o karma do público (só quando já há votos)
  const opcoesKarma = estado.karma?.size ? (estado.karmaNoIndice ? `<option value="indiceNumeros">Índice só com os números (sem karma)</option>` : `<option value="indiceKarma">Índice com o karma do público (O Caso)</option>`) : "";
  const temTT = ds.people.filter((p) => p.socials?.tiktok?.last?.followers).length >= 5;
  const temTTMes = ds.people.filter((p) => p.tt?.f && Object.keys(p.tt.f).length).length >= 5;
  const metricas = () => `<label class="campo"><span>Ranking por</span><select class="input" name="metric">
      <option value="views">Views do mês</option><option value="indice">Índice de Influência</option>${temSubs ? `<option value="subsMes">Subscritores ganhos no mês</option>` : ""}
      <option value="crescimento">Crescimento face ao mês anterior</option><option value="subs">Subscritores (total)</option><option value="total">Views totais</option>${temTT ? `<option value="tiktok">Seguidores no TikTok</option>` : ""}${temTTMes ? `<option value="tiktokMes">Seguidores ganhos no TikTok no mês</option>` : ""}${opcoesKarma}</select></label>`;
  // Peças das simulações: quantos, quem entra e o que dá o tamanho (ou a vida)
  const numero = (lista, def) => `<label class="campo"><span>Youtubers</span><select class="input" name="n">${lista.map((n) => `<option ${n === def ? "selected" : ""}>${n}</option>`).join("")}</select></label>`;
  const quem = () => `<label class="campo"><span>Quem entra</span><select class="input" name="quem"><option value="acaso">Ao acaso entre os 60 melhores</option><option value="top">Os melhores pelo Índice</option></select></label>`;
  const tamanho = (soDados = false, rotulo = "Tamanho por") => `<label class="campo"><span>${soDados ? "Números que contam" : rotulo}</span><select class="input" name="tamanho"><option value="views">Views do mês</option><option value="subs">Subscritores</option><option value="indice">Índice de Influência</option>${soDados ? "" : `<option value="igual">Ao acaso (sem números)</option>`}</select></label>`;
  const camposBase = {
    revelacao: `${metricas()}${mes}
      <label class="campo"><span>Quantos</span><select class="input" name="n"><option>5</option><option selected>10</option><option>15</option><option>20</option></select></label>${cat}`,
    corrida: `
      <label class="campo"><span>Medida</span><select class="input" name="modo"><option value="mes">Views de cada mês</option><option value="acumulado">Views acumuladas</option></select></label>
      <label class="campo"><span>De</span><select class="input" name="de">${meses.map((m, i) => `<option value="${m}" ${i === 0 ? "selected" : ""}>${mesNome(m)}</option>`).join("")}</select></label>
      <label class="campo"><span>Até</span><select class="input" name="ate">${meses.map((m) => `<option value="${m}" ${m === estado.ref ? "selected" : ""}>${mesNome(m)}</option>`).join("")}</select></label>
      <label class="campo"><span>Barras</span><select class="input" name="n"><option>8</option><option selected>10</option><option>12</option><option>15</option></select></label>${cat}`,
    tier: `<label class="campo"><span>Classificar por</span><select class="input" name="metric"><option value="indice">Índice de Influência</option><option value="views">Views do mês</option>${opcoesKarma}</select></label>${mes}
      <label class="campo"><span>Quantos</span><select class="input" name="n"><option>12</option><option selected>16</option><option>20</option><option>24</option></select></label>${cat}`,
    altos: `${mes}<label class="campo"><span>Quantos de cada</span><select class="input" name="n"><option>3</option><option selected>5</option><option>7</option></select></label>
      <label class="campo"><span>Entre os</span><select class="input" name="top"><option value="50">Top 50</option><option value="100" selected>Top 100</option><option value="300">Todos</option></select></label>`,
    barras: `${metricas()}${mes}<label class="campo"><span>Barras</span><select class="input" name="n"><option>6</option><option>8</option><option selected>10</option><option>12</option></select></label>${cat}`,
    categorias: `${mes}<label class="campo"><span>Medida</span><select class="input" name="medida"><option value="views">Views do mês</option><option value="canais">Número de canais</option></select></label>`,
    bolhas: `${mes}<label class="campo"><span>Bolhas</span><select class="input" name="n"><option>12</option><option selected>20</option><option>30</option></select></label>${cat}`,
    linhas: `<label class="campo"><span>Youtubers</span><select class="input" name="n"><option>3</option><option selected>5</option><option>7</option></select></label>
      <label class="campo"><span>Período</span><select class="input" name="meses"><option value="6">6 meses</option><option value="12" selected>12 meses</option><option value="24">24 meses</option><option value="999">Tudo</option></select></label>
      <label class="campo"><span>Até</span><select class="input" name="m">${opcaoMes(meses, estado.ref)}</select></label>${cat}`,
    numeros: `${mes}${cat}`,
    votacao: `<label class="campo cresce"><span>Votação</span><select class="input" name="votacao" id="pl-votacao"><option value="">A mais recente com votos</option></select></label>`,
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
    comilonas: `${numero([6, 8, 10, 12, 16, 20], 12)}${tamanho()}${quem()}${mes}${cat}`,
    cavalos: `${numero([4, 6, 8, 10, 12], 8)}<label class="campo"><span>Velocidade</span><select class="input" name="vantagem"><option value="">Todos iguais (pura sorte)</option><option value="dados">Os números dão um pouco mais</option></select></label>${tamanho(true)}${quem()}${cat}`,
    berlindes: `${numero([4, 6, 8, 10, 12, 16], 10)}${quem()}${cat}`,
    escapa: `${numero([2, 3, 4, 6, 8, 10], 6)}<label class="campo"><span>Anéis</span><select class="input" name="aneis"><option>5</option><option selected>8</option><option>12</option></select></label>${quem()}${cat}`,
    ringue: `${numero([4, 6, 8, 10, 12, 16], 8)}${tamanho(false, "Vida por")}${quem()}${mes}${cat}`,
    cartao: campoPessoa("id", "Youtuber", query, "Procurar"),
    historia: campoPessoa("id", "Youtuber", query, "Procurar"),
  }[esp.id];
  // Uma lista de Youtubers escolhida (por exemplo numa sugestão do público): só entram esses
  const ESCOLHA_LISTA = ["revelacao", "torneio", "comilonas", "cavalos", "berlindes", "escapa", "ringue"];
  const listaEscolhida = ESCOLHA_LISTA.includes(esp.id) ? String(query.get("pessoas") || "").split(",").filter((id) => pessoa(id)) : [];
  const campos = camposBase + (listaEscolhida.length
    ? `<div class="pl-lista-escolhida campo cresce" data-lista><span>Só entram estes Youtubers</span><input type="hidden" name="pessoas" value="${esc(listaEscolhida.join(","))}">
        <p>${listaEscolhida.map((id) => `<b>${esc(pessoa(id).name)}</b>`).join(", ")}</p>
        <button type="button" class="btn btn-pequeno" data-tirar-lista>Usar as opções normais</button></div>`
    : "");

  const voltar = `#/palco${query.get("para") ? `?para=${esc(query.get("para"))}` : ""}`;
  const passo = (n, titulo, texto, corpo, extra = "") => `<section class="pl-passo ${extra}"><header class="pl-passo-cabeca"><i>${n}</i><div><h2>${titulo}</h2>${texto ? `<p>${texto}</p>` : ""}</div></header><div class="pl-passo-corpo">${corpo}</div></section>`;
  const opcaoGrande = (attr, v, ativo, titulo, sub, icone = "") => `<button type="button" class="pl-grande" data-${attr}="${v}" aria-pressed="${ativo}">${icone}<b>${titulo}</b><small>${sub}</small></button>`;
  const iconeFmt = (h) => `<span class="pl-fmt-icone ${h ? "h" : "v"}"></span>`;
  const temaBotao = (t, g) => {
    const cats = Object.entries(TEMA_DA_CATEGORIA).filter(([, id]) => id === t.id).map(([c]) => c);
    const sub = g.id === "categorias" && cats.length ? cats.join(", ") : t.texto;
    return `<button type="button" role="radio" data-tema="${t.id}" aria-checked="${t.id === temaInicial}" title="${esc(t.texto)}" style="--a:${t.amostra[0]};--b:${t.amostra[1]};--c:${t.amostra[2]}"><i></i><b>${esc(t.nome)}</b><small>${esc(sub)}</small></button>`;
  };

  main.innerHTML = `<div class="wrap pl-pagina">
    <div class="pagina-topo pl-topo">
      <a class="pn-voltar" href="${voltar}">← Todos os espetáculos</a>
      <div class="pl-topo-linha"><span class="pl-topo-icone">${esp.icone}</span><div><h1>${esc(esp.nome)}</h1><p>${esc(esp.texto)}</p></div></div>
    </div>
    <div class="pl-estudio" id="pl-estudio">
      <form class="palco-form" id="pl-form">
        ${passo(
          1,
          "Onde vai passar",
          "",
          `<div class="pl-duas">
            <div class="campo"><span>Para</span><div class="pl-grandes">
              ${opcaoGrande("modo", "video", modo === "video", "Vídeo", "Gravar e publicar", `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3z"/></svg>`)}
              ${opcaoGrande("modo", "direto", modo === "direto", "Direto", "Twitch ou OBS", `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="2.5"/><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14"/></svg>`)}
            </div></div>
            <div class="campo"><span>Formato</span><div class="pl-grandes">
              ${opcaoGrande("fmt", "16x9", fmt === "16x9", "16:9", "YouTube", iconeFmt(true))}
              ${opcaoGrande("fmt", "9x16", fmt === "9x16", "9:16", "TikTok, Reels, Shorts", iconeFmt(false))}
            </div></div>
          </div>`,
        )}
        ${passo(2, "O que mostrar", "Os dados deste espetáculo.", `<div class="pl-campos">${campos}</div>`)}
        ${passo(
          3,
          "Tema",
          "As cores, o cenário, a música e os efeitos.",
          `<div class="pl-tema-atual">
            <div class="pl-tema-amostra" id="pl-tema-amostra"></div>
            <div class="pl-tema-texto"><b id="pl-tema-nome"></b><small id="pl-tema-desc"></small><small class="pl-tema-nota" id="pl-tema-nota"></small></div>
            <button type="button" class="btn" id="pl-tema-abrir" aria-expanded="false">Mudar tema</button>
          </div>
          <div class="pl-temas" id="pl-temas" hidden>
            <div class="segmentos pl-temas-grupos" role="group">${GRUPOS_TEMAS.map((g, i) => `<button type="button" data-tgrupo="${g.id}" aria-pressed="${i === 0}">${esc(g.nome)}</button>`).join("")}</div>
            ${GRUPOS_TEMAS.map((g, i) => `<div class="tema-grupo" data-grupo-temas="${g.id}" ${i === 0 ? "" : "hidden"}>${g.id === "categorias" ? `<small>${Object.keys(TEMA_DA_CATEGORIA).length} categorias, cada uma com o seu tema. Escolher uma categoria ou um Youtuber sugere o tema dele.</small>` : ""}<div class="tema-escolha ${g.id === "categorias" ? "compacto" : ""}" role="radiogroup">${TEMAS.filter((t) => (t.grupo || "ambientes") === g.id).map((t) => temaBotao(t, g)).join("")}</div></div>`).join("")}
          </div>
          <div class="campo pl-efeitos"><span>Efeitos do tema</span><div class="segmentos" role="group"><button type="button" data-efeitos="completo" aria-pressed="${lerModoTema() === "completo"}">Tema completo</button><button type="button" data-efeitos="cores" aria-pressed="${lerModoTema() === "cores"}">Só cores</button></div>
            <small class="muted" id="pl-kit-nota"></small></div>`,
        )}
        ${passo(
          4,
          "Cenas do vídeo",
          "A ordem em que tudo aparece. Liga, desliga, muda de sítio e junta cenas novas.",
          `<div class="rt" id="pl-roteiro"></div>`,
          "pl-passo-cenas",
        )}
        ${passo(
          5,
          "Ritmo e som",
          "",
          `<div class="pl-campos">
            <div class="campo"><span>Ritmo</span><div class="segmentos" role="group"><button type="button" data-ritmo="auto" aria-pressed="${modo === "video"}">Automático</button><button type="button" data-ritmo="manual" aria-pressed="${modo === "direto"}">Eu avanço</button></div></div>
            <div class="campo"><span>Velocidade</span><div class="segmentos" role="group"><button type="button" data-vel="rapido" aria-pressed="false">Rápida</button><button type="button" data-vel="normal" aria-pressed="true">Normal</button><button type="button" data-vel="lento" aria-pressed="false">Lenta</button></div></div>
          </div>
          <div class="pl-checks">
            <label class="vc-interruptor"><input type="checkbox" name="som" ${som.ligado ? "checked" : ""}><span class="vc-bola"></span><span><b>Música e efeitos sonoros</b><small>Ficam gravados no vídeo.</small></span></label>
            <label class="vc-interruptor pl-so-direto"><input type="checkbox" name="repetir"><span class="vc-bola"></span><span><b>Repetir no fim</b><small>Para deixar a correr entre conversas.</small></span></label>
          </div>`,
        )}
      </form>
      <aside class="pl-resumo" id="pl-resumo">
        <div class="pl-previa-caixa"><div class="pl-previa" id="pl-previa"><span class="pl-previa-icone">${esp.icone}</span><b>${esc(esp.nome)}</b><small id="pl-previa-fmt"></small></div></div>
        <dl class="pl-resumo-lista" id="pl-resumo-lista"></dl>
        <div class="pl-resumo-botoes">
          ${podeGravar() ? `<button class="btn btn-primario pl-so-video pl-gravar" type="button" id="pl-gravar">● Gravar vídeo</button>` : ""}
          <button class="btn btn-ouro pl-comecar" type="submit" form="pl-form">▶ Ver sem gravar</button>
          <button class="btn btn-texto" type="button" id="pl-legenda">Legenda para publicar</button>
        </div>
        ${podeGravar() ? `<p class="muted pl-so-video pl-resumo-nota">O browser pede para partilhar este separador: escolhe <b>Este separador</b>. Grava em Full HD, com som. Esc termina.</p>` : `<p class="muted pl-so-video pl-resumo-nota">Para gravar neste aparelho, usa a gravação de ecrã do sistema. No computador, com o Chrome, aparece aqui o botão Gravar vídeo.</p>`}
        <p class="muted pl-so-direto pl-resumo-nota">Espaço avança, Esc sai, P pausa, F ecrã inteiro.</p>
      </aside>
    </div>
    <div id="pl-publicar"></div></div>`;

  let formato = fmt;
  let ritmo = modo === "direto" ? "manual" : "auto";
  let velocidade = "normal";
  let temaId = temaInicial;
  let efeitos = lerModoTema();
  // O roteiro do vídeo: intro, cenas extra e fim (o editor está no passo 4)
  let roteiro = roteiroPadrao({ modo });
  const notaKit = () => {
    $("#pl-kit-nota", main).textContent = efeitos === "completo" ? `${NOME_DO_KIT[kitDoTema(temaId)]}. Os golpes, acertos, revelações e o vencedor ganham animações e sons próprios do tema.` : "Só as cores, o cenário e a música do tema. As animações são as de sempre.";
  };
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
  const estudio = $("#pl-estudio", main);
  const atualizarModo = () => {
    for (const el of [form, estudio]) {
      el.classList.toggle("modo-direto", modo === "direto");
      el.classList.toggle("modo-video", modo === "video");
    }
    $(".pl-comecar", main).textContent = modo === "direto" ? "▶ Começar" : "▶ Ver sem gravar";
    resumo();
  };
  // O tema escolhido aparece num cartão; a grelha de todos os temas só abre quando se quer mudar
  const pintarTema = () => {
    const t = TEMAS.find((x) => x.id === temaId) || TEMAS[0];
    const fundo = `radial-gradient(120% 90% at 20% 10%, ${t.amostra[1]}, transparent 60%), linear-gradient(150deg, ${t.amostra[0]}, ${t.amostra[2]})`;
    $("#pl-tema-amostra", main).style.background = fundo;
    $("#pl-previa", main).style.background = fundo;
    $("#pl-tema-nome", main).textContent = t.nome;
    $("#pl-tema-desc", main).textContent = t.texto;
  };
  const resumo = () => {
    const t = TEMAS.find((x) => x.id === temaId);
    const ligadas = roteiro.cenas.filter((c) => c.ligada && cenaPronta(c));
    const linhas = [
      ["Para", modo === "video" ? "Vídeo" : "Direto"],
      ["Formato", formato === "9x16" ? "9:16 vertical" : "16:9 horizontal"],
      ["Tema", `${t?.nome || ""}${efeitos === "cores" ? " (só cores)" : ""}`],
      ["Ritmo", `${ritmo === "manual" ? "Eu avanço" : "Automático"}, ${{ rapido: "rápida", normal: "normal", lento: "lenta" }[velocidade]}`],
      ["Cenas", `${roteiro.intro ? "Intro, " : ""}${ligadas.length ? `${ligadas.length} ${ligadas.length === 1 ? "extra" : "extras"}` : "sem extras"}${roteiro.fim ? ", fim" : ""}`],
    ].filter(Boolean);
    $("#pl-resumo-lista", main).innerHTML = linhas.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("");
    const previa = $("#pl-previa", main);
    previa.classList.toggle("vertical", formato === "9x16");
    $("#pl-previa-fmt", main).textContent = formato === "9x16" ? "9:16" : "16:9";
  };
  const mudarTema = (id, nota = "") => {
    temaId = id;
    marcar("tema", id);
    $("#pl-tema-nota", main).textContent = nota;
    notaKit();
    pintarTema();
    resumo();
  };
  $("#pl-tema-abrir", main).addEventListener("click", (e) => {
    const caixa = $("#pl-temas", main);
    caixa.hidden = !caixa.hidden;
    e.currentTarget.setAttribute("aria-expanded", String(!caixa.hidden));
    e.currentTarget.textContent = caixa.hidden ? "Mudar tema" : "Fechar";
    if (!caixa.hidden) {
      const g = TEMAS.find((x) => x.id === temaId)?.grupo || "ambientes";
      $(`[data-tgrupo="${g}"]`, main)?.click();
    }
  });
  $$("[data-tgrupo]", main).forEach((b) =>
    b.addEventListener("click", () => {
      $$("[data-tgrupo]", main).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      $$("[data-grupo-temas]", main).forEach((x) => (x.hidden = x.dataset.grupoTemas !== b.dataset.tgrupo));
    }),
  );
  grupo("efeitos", (v) => {
    efeitos = v;
    guardarModoTema(v);
    notaKit();
    resumo();
  });
  grupo("modo", (v) => {
    modo = v;
    ritmo = v === "direto" ? "manual" : "auto";
    marcar("ritmo", ritmo);
    atualizarModo();
  });
  grupo("fmt", (v) => ((formato = v), resumo()));
  grupo("ritmo", (v) => ((ritmo = v), resumo()));
  grupo("vel", (v) => ((velocidade = v), resumo()));
  grupo("tema", (v) => {
    temaId = v;
    temaEscolhidoAMao = true;
    guardarTema(v);
    $("#pl-tema-nota", main).textContent = "";
    notaKit();
    pintarTema();
    resumo();
    som.tocar("clique");
  });
  atualizarModo();
  notaKit();
  pintarTema();
  // Lista das votações (para o espetáculo "O público escolheu")
  if (esp.id === "votacao")
    api("votacoes")
      .then((r) => {
        const sel = $("#pl-votacao", main);
        if (!sel) return;
        const grupos = new Map();
        for (const v of r.votacoes || []) if (v.grupo && v.estado !== "rascunho" && !grupos.has(v.grupo)) grupos.set(v.grupo, v.extra?.nomeGrupo || "Torneio");
        for (const [g, nome] of grupos) sel.insertAdjacentHTML("beforeend", `<option value="g:${esc(g)}" ${query.get("votacao") === "g:" + g ? "selected" : ""}>🏟️ ${esc(nome)} (a chave do torneio)</option>`);
        for (const v of r.votacoes || []) if (v.votos && !v.grupo) sel.insertAdjacentHTML("beforeend", `<option value="${esc(v.id)}" ${query.get("votacao") === v.id ? "selected" : ""}>${esc(v.titulo)} (${v.total || 0} votos)</option>`);
      })
      .catch(() => {});
  // ---------- Cenas do vídeo (roteiro) ----------
  let avisos = [];
  let exclusivosLista = null;
  let ligacoes = { linkVotar: "", textoBio: "Link na bio", avisoVideos: true };
  const curto = (l) => l.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const cfgVotacao = (a) => {
    const link = ligacoes.linkVotar || `${location.origin}/#/votar`;
    return { id: a.id, tipo: a.tipo, etiqueta: a.etiqueta, titulo: a.titulo, opcoes: a.opcoes, mais: a.mais, link, linkCurto: curto(link), textoBio: ligacoes.textoBio || "Link na bio" };
  };
  const cfgExclusivo = (x) => {
    const link = `${location.origin}/#/exclusivos`;
    return { id: x.id, titulo: x.titulo, nomeEsp: x.nomeEsp, cores: x.cores, link, linkCurto: curto(link), textoBio: ligacoes.textoBio || "Link na bio" };
  };
  const nomePessoa = (id) => pessoa(id)?.name || id;

  const desenharRoteiro = () => {
    const alvo = $("#pl-roteiro", main);
    const linha = (c) => {
      const d = CENAS[c.tipo];
      const pronta = cenaPronta(c);
      const configuravel = ["votacao", "exclusivo", "foco", "titulo", "proximo"].includes(c.tipo);
      return `<div class="rt-cena ${c.ligada ? "" : "desligada"} ${pronta ? "" : "falta"}" data-c="${esc(c.id)}">
        <label class="vc-interruptor so" title="${c.ligada ? "Desligar" : "Ligar"}"><input type="checkbox" data-ligar ${c.ligada ? "checked" : ""}><span class="vc-bola"></span></label>
        <span class="rt-icone">${d.icone}</span>
        <div class="rt-texto"><b>${esc(d.nome)}</b><small>${pronta ? "" : "⚠ "}${esc(resumoCena(c, nomePessoa))}</small></div>
        <span class="rt-botoes">
          <button type="button" class="botao-icone" data-subir title="Mais cedo">↑</button>
          <button type="button" class="botao-icone" data-descer title="Mais tarde">↓</button>
          ${configuravel ? `<button type="button" class="btn btn-pequeno" data-editar>Mudar</button>` : ""}
          <button type="button" class="botao-icone" data-tirar title="Tirar">✕</button>
        </span></div>`;
    };
    const grupoHtml = (onde) => {
      const cs = roteiro.cenas.filter((c) => c.onde === onde);
      return `<div class="rt-grupo"><div class="rt-grupo-nome">${ONDES[onde]}</div>${cs.length ? cs.map(linha).join("") : `<div class="rt-vazio">Nenhuma cena.</div>`}</div>`;
    };
    alvo.innerHTML = `${grupoHtml("antes")}
      <div class="rt-fixa ${roteiro.intro ? "" : "desligada"}"><label class="vc-interruptor so" title="Intro"><input type="checkbox" data-intro ${roteiro.intro ? "checked" : ""}><span class="vc-bola"></span></label><span class="rt-icone rt-icone-esp">${esp.icone}</span><div class="rt-texto"><b>${esc(esp.nome)}</b><small>${roteiro.intro ? "Com a intro: o título a entrar antes de começar." : "Sem intro: começa logo."}</small></div></div>
      ${grupoHtml("meio")}
      ${grupoHtml("depois")}
      <div class="rt-fixa ${roteiro.fim ? "" : "desligada"}"><label class="vc-interruptor so" title="Fim"><input type="checkbox" data-fim ${roteiro.fim ? "checked" : ""}><span class="vc-bola"></span></label><span class="rt-icone">🔔</span><div class="rt-texto"><b>Fim: Subscreve o canal</b><small>${roteiro.fim ? "O cartão do canal, com o rato a carregar em Subscrever." : "Sem cartão do fim."}</small></div></div>
      <button type="button" class="btn rt-juntar" id="rt-juntar">+ Juntar cena</button>`;
    $("[data-intro]", alvo).addEventListener("change", (e) => ((roteiro.intro = e.target.checked), desenharRoteiro()));
    $("[data-fim]", alvo).addEventListener("change", (e) => ((roteiro.fim = e.target.checked), desenharRoteiro()));
    $("#rt-juntar", alvo).addEventListener("click", juntarCena);
    const ordem = ["antes", "meio", "depois"];
    $$("[data-c]", alvo).forEach((el) => {
      const c = roteiro.cenas.find((x) => x.id === el.dataset.c);
      $("[data-ligar]", el).addEventListener("change", (e) => ((c.ligada = e.target.checked), desenharRoteiro()));
      $("[data-tirar]", el).addEventListener("click", () => ((roteiro.cenas = roteiro.cenas.filter((x) => x !== c)), desenharRoteiro()));
      $("[data-editar]", el)?.addEventListener("click", () => configurarCena(c));
      const mover = (d) => {
        const doGrupo = roteiro.cenas.filter((x) => x.onde === c.onde);
        const k = doGrupo.indexOf(c);
        const vizinho = doGrupo[k + d];
        const lista = roteiro.cenas.filter((x) => x !== c);
        if (vizinho) {
          // Troca com a cena ao lado, no mesmo momento
          const j = lista.indexOf(vizinho);
          lista.splice(d < 0 ? j : j + 1, 0, c);
        } else {
          // Passa para o momento anterior (fica no fim) ou seguinte (fica no início)
          const o = ordem[ordem.indexOf(c.onde) + d];
          if (!o) return;
          c.onde = o;
          if (d < 0) lista.push(c);
          else lista.unshift(c);
        }
        roteiro.cenas = lista;
        desenharRoteiro();
      };
      $("[data-subir]", el).addEventListener("click", () => mover(-1));
      $("[data-descer]", el).addEventListener("click", () => mover(1));
    });
    resumo();
  };

  const juntarCena = () => {
    const { el, fechar } = janela(
      `<h2>Juntar cena</h2><div class="vc-tipos">${Object.entries(CENAS)
        .map(([t, d]) => `<button type="button" class="vc-tipo" data-tipo="${t}"><b>${d.icone} ${esc(d.nome)}</b><small>${esc(d.texto)}</small></button>`)
        .join("")}</div><div class="janela-acoes"><button class="btn" data-fechar>Cancelar</button></div>`,
      { larga: true },
    );
    $$("[data-tipo]", el).forEach((b) =>
      b.addEventListener("click", () => {
        fechar();
        const t = b.dataset.tipo;
        const cfg = t === "site" ? { link: location.origin, textoBio: ligacoes.textoBio || "Link na bio" } : {};
        const c = novaCena(t, cfg);
        if (["votacao", "exclusivo", "foco", "titulo", "proximo"].includes(t)) configurarCena(c, true);
        else {
          roteiro.cenas.push(c);
          desenharRoteiro();
        }
      }),
    );
  };

  const configurarCena = async (c, nova = false) => {
    const d = CENAS[c.tipo];
    const g = c.cfg || {};
    let corpo = "";
    if (c.tipo === "votacao") {
      corpo = avisos.length
        ? `<div class="rt-opcoes">${avisos.map((a, i) => `<label class="ed-check"><input type="radio" name="escolha" value="${esc(a.id)}" ${g.id === a.id || (!g.id && i === 0) ? "checked" : ""}> <b>${esc(a.etiqueta)}:</b> ${esc(a.titulo)}</label>`).join("")}</div>`
        : `<p class="muted">Não há nenhuma votação aberta. Cria uma em <a href="#/votacoes">Votações</a>.</p>`;
    } else if (c.tipo === "exclusivo") {
      exclusivosLista ??= ((await api("admin/exclusivos").catch(() => ({}))).exclusivos || []).filter((x) => x.visivel);
      corpo = exclusivosLista.length
        ? `<div class="rt-opcoes">${exclusivosLista.map((x, i) => `<label class="ed-check"><input type="radio" name="escolha" value="${esc(x.id)}" ${g.id === x.id || (!g.id && i === 0) ? "checked" : ""}> <b>${esc(x.titulo)}</b> <small class="muted">${esc(x.nomeEsp || "")}</small></label>`).join("")}</div>`
        : `<p class="muted">Ainda não há exclusivos visíveis. Corre um espetáculo e, no fim, escolhe "Exclusivo no site".</p>`;
    } else if (c.tipo === "foco") {
      corpo = `<div class="campo"><span>Youtuber</span><div class="vc-pessoas" id="rt-pessoa">${g.pessoa && pessoa(g.pessoa) ? `<span class="vt-chip">${avatar(pessoa(g.pessoa), 24)}${esc(pessoa(g.pessoa).name)}</span>` : `<span class="muted">Ninguém escolhido.</span>`}</div>
        <div style="position:relative"><input class="input" id="rt-q" placeholder="Procurar Youtuber" autocomplete="off"><div class="pesquisa-lista" id="rt-lista" style="left:0;right:auto;width:100%"></div></div></div>`;
    } else if (c.tipo === "titulo") {
      corpo = `<label class="campo"><span>Etiqueta (opcional)</span><input class="input" name="etiqueta" maxlength="40" value="${esc(g.etiqueta || "")}" placeholder="Por exemplo: Especial 100 mil"></label>
        <label class="campo"><span>Título</span><input class="input" name="titulo" maxlength="70" value="${esc(g.titulo || "")}"></label>
        <label class="campo"><span>Frase (opcional)</span><input class="input" name="texto" maxlength="140" value="${esc(g.texto || "")}"></label>`;
    } else if (c.tipo === "proximo") {
      corpo = `<label class="campo"><span>O que vem no próximo vídeo</span><input class="input" name="texto" maxlength="90" value="${esc(g.texto || "")}" placeholder="Por exemplo: o torneio dos Gamers"></label>`;
    }
    const { el, fechar } = janela(`<h2>${d.icone} ${esc(d.nome)}</h2><p class="muted">${esc(d.texto)}</p><form class="vc-form" id="rt-form">${corpo}</form>
      <div class="janela-acoes"><button class="btn" data-fechar>Cancelar</button><button class="btn btn-primario" data-ok>${nova ? "Juntar" : "Guardar"}</button></div>`, { larga: true });
    let escolhida = g.pessoa || "";
    if (c.tipo === "foco") {
      const q = $("#rt-q", el);
      const lista = $("#rt-lista", el);
      q.addEventListener("input", () => {
        const r = procurar(q.value, 8);
        lista.innerHTML = r.map((p) => `<button type="button" class="pesquisa-item" style="width:100%;border:0;background:none;text-align:left" data-id="${esc(p.id)}">${avatar(p, 28)}<span><b>${esc(p.name)}</b><small>${esc(p.category || "")}</small></span></button>`).join("");
        lista.classList.toggle("aberta", r.length > 0);
      });
      lista.addEventListener("click", (e) => {
        const b = e.target.closest("[data-id]");
        if (!b) return;
        escolhida = b.dataset.id;
        $("#rt-pessoa", el).innerHTML = `<span class="vt-chip">${avatar(pessoa(escolhida), 24)}${esc(pessoa(escolhida).name)}</span>`;
        q.value = "";
        lista.classList.remove("aberta");
      });
    }
    $("[data-ok]", el).addEventListener("click", () => {
      const f = $("#rt-form", el);
      const v = f.querySelector("input[name=escolha]:checked")?.value;
      if (c.tipo === "votacao") {
        const a = avisos.find((x) => x.id === v);
        if (!a) return toast("Escolhe uma votação.", { erro: true });
        c.cfg = cfgVotacao(a);
      } else if (c.tipo === "exclusivo") {
        const x = exclusivosLista.find((y) => y.id === v);
        if (!x) return toast("Escolhe um exclusivo.", { erro: true });
        c.cfg = cfgExclusivo(x);
      } else if (c.tipo === "foco") {
        if (!escolhida) return toast("Escolhe o Youtuber.", { erro: true });
        // Só pode haver um Youtuber em foco
        roteiro.cenas = roteiro.cenas.filter((x) => x.tipo !== "foco" || x === c);
        c.cfg = { pessoa: escolhida };
      } else if (c.tipo === "titulo") {
        if (!f.titulo.value.trim()) return toast("Escreve o título.", { erro: true });
        c.cfg = { etiqueta: f.etiqueta.value.trim(), titulo: f.titulo.value.trim(), texto: f.texto.value.trim() };
      } else if (c.tipo === "proximo") {
        if (!f.texto.value.trim()) return toast("Escreve a frase.", { erro: true });
        c.cfg = { texto: f.texto.value.trim() };
      }
      if (nova) roteiro.cenas.push(c);
      fechar();
      desenharRoteiro();
    });
  };

  // Votações abertas (para a cena "Votação a decorrer") e as ligações escolhidas na Página pública
  Promise.all([api("votacoes"), api("admin/vitrine").catch(() => null), query.get("excl") ? api("admin/exclusivos").catch(() => null) : null])
    .then(([r, vit, ex]) => {
      if (vit?.config?.ligacoes) ligacoes = vit.config.ligacoes;
      avisos = avisosDeVotacao(r.votacoes || []);
      const doExcl = ex?.exclusivos?.find((x) => x.id === query.get("excl"));
      if (doExcl?.roteiro) roteiro = JSON.parse(JSON.stringify(doExcl.roteiro));
      else if (avisos.length && ligacoes.avisoVideos && modo === "video" && !roteiro.cenas.some((c) => c.tipo === "votacao")) roteiro.cenas.push(novaCena("votacao", cfgVotacao(avisos[0])));
      desenharRoteiro();
    })
    .catch(() => desenharRoteiro());
  desenharRoteiro();

  // Tema da categoria: ao escolher uma categoria ou um Youtuber, o tema acompanha (se não foi escolhido à mão)
  const sugerirTema = (categoria) => {
    const t = TEMA_DA_CATEGORIA[categoria];
    if (!t || temaEscolhidoAMao) return;
    mudarTema(t, `Tema ${TEMAS.find((x) => x.id === t).nome} sugerido para a categoria ${categoria}.`);
  };
  form.elements.namedItem("cat")?.addEventListener("change", (e) => sugerirTema(e.target.value));
  $$("input[data-pessoa]", main).forEach((inp) =>
    ligarEscolhaPessoa(inp, (p) => {
      sugerirTema(p.category);
    }),
  );

  $("[data-tirar-lista]", main)?.addEventListener("click", () => $("[data-lista]", main).remove());

  const lerOpcoes = () => {
    const opts = {};
    for (const el of form.elements) if (el.name && !["som", "repetir"].includes(el.name)) opts[el.name] = el.dataset.pessoa !== undefined ? el.dataset.pessoa : el.value;
    return opts;
  };

  // Abrir um exclusivo para o mudar: as opções vêm no endereço
  for (const el of form.elements) if (el.name && el.tagName === "SELECT" && query.has(el.name) && [...el.options].some((o) => o.value === query.get(el.name))) el.value = query.get(el.name);
  if (["rapido", "normal", "lento"].includes(query.get("vel"))) $(`[data-vel="${query.get("vel")}"]`, main)?.click();
  if (["completo", "cores"].includes(query.get("efeitos"))) $(`[data-efeitos="${query.get("efeitos")}"]`, main)?.click();

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
    const [mod] = await Promise.all([import(esp.mod), carregarHistorico()]);
    // Tudo o que decide o resultado fica guardado, para um exclusivo repetir exatamente igual
    const dsUsado = estado.ds;
    const historicoUsado = historicoEmCache();
    const roteiroUsado = JSON.parse(JSON.stringify(roteiro));
    const semente = novaSemente();
    semear(semente);
    const palco = new Palco({ formato, manual: ritmo === "manual", tema: temaId, velocidade, modo, completo: efeitos === "completo", roteiro: roteiroUsado, historico: historicoUsado });
    if (gravacao) gravacao.comecar(palco);
    let erro = false;
    let voltas = 0;
    try {
      do {
        await palco.correr(mod, opts);
        voltas++;
        palco.cenasFeitas.clear();
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
    } finally {
      largar();
    }
    const video = gravacao ? await gravacao.parar() : null;
    palco.sair();
    if (erro && !video) return;
    menuFinal($("#pl-publicar", main), {
      esp, opts, formato, temaId, efeitos, velocidade, video, voltas: erro ? 0 : voltas, repetir,
      palco, semente, roteiro: roteiroUsado, ds: dsUsado, historico: historicoUsado, cores: TEMAS.find((x) => x.id === temaId)?.amostra || [], exclId: query.get("excl"),
      aoGuardarExclusivo: (id) => {
        query.set("excl", id);
        history.replaceState(null, "", `${location.hash.split("?")[0]}?${new URLSearchParams(Object.fromEntries(query))}`);
      },
    });
  };
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    iniciar(false);
  });
  $("#pl-gravar", main)?.addEventListener("click", () => iniciar(true));
  $("#pl-legenda", main).addEventListener("click", () => {
    mostrarPublicar($("#pl-publicar", main), esp, lerOpcoes(), { formato, temaId, aviso: roteiro.cenas.find((c) => c.tipo === "votacao" && c.ligada)?.cfg });
    $("#pl-publicar", main).scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

/** As votações abertas (e cada torneio a decorrer) que um vídeo pode anunciar, da mais recente para a mais antiga. */
function avisosDeVotacao(lista) {
  const abertas = lista.filter((v) => v.aberta);
  const out = [];
  const vistos = new Set();
  for (const v of abertas) {
    if (v.grupo) {
      if (vistos.has(v.grupo)) continue;
      vistos.add(v.grupo);
      const jogos = abertas.filter((x) => x.grupo === v.grupo);
      const opcoes = jogos.flatMap((x) => x.opcoes);
      out.push({
        id: "g:" + v.grupo,
        tipo: "torneio",
        etiqueta: jogos.length === 1 && (v.extra?.rondas || 0) === (v.ronda || 1) ? "A final está a decorrer" : "Torneio a decorrer",
        titulo: jogos.length === 1 ? `${v.extra?.nomeGrupo || "Torneio"}: ${v.titulo}` : v.extra?.nomeGrupo || "Torneio do Placar",
        opcoes: opcoes.slice(0, 4).map((o) => ({ nome: o.nome, id: o.pessoa || null })),
        mais: Math.max(0, opcoes.length - 4),
        criado: v.criado,
      });
      continue;
    }
    const etiqueta = v.tipo === "previsao" || v.modo === "previsao" ? "Previsão a decorrer" : v.tipo === "desafiante" ? "Escolhe o próximo desafiante" : "Votação a decorrer";
    const comPessoa = v.opcoes.filter((o) => o.pessoa);
    out.push({
      id: v.id,
      tipo: v.tipo,
      etiqueta,
      titulo: v.titulo,
      opcoes: (v.tipo === "favorito" ? [] : comPessoa.slice(0, 4)).map((o) => ({ nome: o.nome, id: o.pessoa })),
      mais: v.tipo === "favorito" ? 0 : Math.max(0, comPessoa.length - 4),
      criado: v.criado,
    });
  }
  return out.sort((a, b) => (Date.parse(b.criado) || 0) - (Date.parse(a.criado) || 0));
}

/** Depois de cada espetáculo: foi um teste, um vídeo para os canais ou um exclusivo para o site? */
function menuFinal(alvo, x) {
  const { esp, video, voltas, repetir } = x;
  const podeContar = voltas > 0;
  const podeExclusivo = voltas === 1 && !repetir;
  const aviso = x.roteiro.cenas.find((c) => c.tipo === "votacao" && c.ligada)?.cfg;
  const nomeFicheiro = `placar-${esp.id}-${x.temaId}-${x.formato}-${new Date().toISOString().slice(0, 10)}.${video?.ext || "mp4"}`;
  const op = (k, icone, titulo, texto, desligado = false) =>
    `<button type="button" class="pl-fim-op" data-fim="${k}" ${desligado ? "disabled" : ""}><span class="pl-fim-icone">${icone}</span><b>${titulo}</b><small>${texto}</small></button>`;
  alvo.innerHTML = `<section class="pl-fim">
    <div class="pl-fim-cabeca"><h2>O que foi isto?</h2><p>${
      podeContar
        ? "Escolhe para onde vai. O teste não conta para nada. O vídeo para os canais e o exclusivo contam nas estatísticas (rivais, estrelas, coroas e hall da fama)."
        : "O espetáculo parou antes do fim: fica como teste e não conta."
    }</p></div>
    <div class="pl-fim-opcoes">
      ${op("teste", "🧪", "Teste", "Não conta para nada.")}
      ${op("canais", "📺", "Vídeo para os canais", "Conta nas estatísticas e aparece em Vídeos no site.", !podeContar)}
      ${op("exclusivo", "☆", x.exclId ? "Exclusivo (substitui o atual)" : "Exclusivo no site", podeExclusivo ? "Fica no site tal e qual: os mesmos números, a mesma sorte e as mesmas cenas. Conta nas estatísticas." : "Só dá para um espetáculo que correu uma vez até ao fim.", !podeExclusivo)}
    </div>
    ${
      video
        ? `<div class="painel pl-video"><video src="${video.url}" controls playsinline class="${x.formato === "9x16" ? "vertical" : ""}"></video>
      <div class="ed-acoes" style="justify-content:flex-start"><a class="btn btn-ouro" href="${video.url}" download="${esc(nomeFicheiro)}">Descarregar vídeo (${video.ext.toUpperCase()}, ${(video.blob.size / 1048576).toFixed(1)} MB)</a></div></div>`
        : ""
    }
    <div id="pl-fim-res"></div></section>`;
  alvo.scrollIntoView({ behavior: "smooth", block: "start" });
  const res = $("#pl-fim-res", alvo);
  const botoes = $$("[data-fim]", alvo);
  const travar = (k) => botoes.forEach((b) => ((b.disabled = true), b.classList.toggle("escolhido", b.dataset.fim === k)));
  const soltar = () => {
    botoes.forEach((b) => b.classList.remove("escolhido"));
    botoes[0].disabled = false;
    botoes[1].disabled = !podeContar;
    botoes[2].disabled = !podeExclusivo;
  };
  const contar = (publicacao) =>
    api("admin/palco/resultados", { corpo: { espetaculo: esp.id, tema: x.temaId, formato: x.formato, resultados: x.palco.resultados, ...(publicacao ? { publicacao } : {}) } });

  $('[data-fim="teste"]', alvo).addEventListener("click", () => {
    travar("teste");
    res.innerHTML = `<div class="aviso info"><p>Ficou como teste: não contou para nada.${video ? " O vídeo continua aqui para o descarregares, se quiseres." : ""}</p></div>`;
  });

  $('[data-fim="canais"]', alvo).addEventListener("click", async () => {
    if (!temSessao()) return toast("A sessão expirou: entra outra vez para guardar.", { erro: true });
    travar("canais");
    res.innerHTML = `<div class="a-carregar" style="min-height:10vh"><div class="roda"></div></div>`;
    try {
      const t = textoPublicar(esp, x.opts, { formato: x.formato, temaId: x.temaId, aviso });
      const r = await contar({ titulo: t.titulo, legenda: t.legenda, resumo: x.palco.resumo || { tipo: "jogo" } });
      carregarHistorico({ forcar: true });
      mostrarPublicar(res, esp, x.opts, { formato: x.formato, temaId: x.temaId, historico: { n: r.guardados, publicacao: r.publicacao }, aviso });
    } catch (e) {
      res.innerHTML = `<div class="aviso"><p>Não foi possível guardar: ${esc(e.message)}</p></div>`;
      soltar();
    }
  });

  $('[data-fim="exclusivo"]', alvo).addEventListener("click", async () => {
    if (!temSessao()) return toast("A sessão expirou: entra outra vez para guardar.", { erro: true });
    const [lista, vit] = await Promise.all([x.exclId ? api("admin/exclusivos").catch(() => ({})) : {}, api("admin/vitrine").catch(() => null)]);
    const atual = (lista.exclusivos || []).find((e) => e.id === x.exclId) || null;
    // Quem não aparece no site (Quem aparece) não entra no exclusivo: avisa se isso o pode mudar
    let nota = "";
    if (vit?.config) {
      const indices = new Map([...estado.indices].map(([id, v]) => [id, v?.total ?? null]));
      const q = quemAparece(x.ds, vit.config.dados, vit.config.perfis, { ref: estado.ref, indices });
      const todos = x.ds.people.filter((p) => !p.hidden).length;
      if (q.aparece.size < todos) nota = `<div class="aviso"><p>No site só aparecem ${q.aparece.size} de ${todos} Youtubers (Página pública, Quem aparece). O exclusivo usa só esses: se entrou aqui alguém que não aparece no site, lá pode ficar diferente. Os Youtubers escolhidos nas opções entram sempre.</p></div>`;
    }
    const t = textoPublicar(esp, x.opts, { formato: x.formato, temaId: x.temaId });
    const local = (iso) => (iso ? new Date(Date.parse(iso) - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");
    const { el, fechar } = janela(
      `<h2>☆ ${atual ? "Substituir o exclusivo" : "Exclusivo no site"}</h2>
      <p class="muted">Os visitantes carregam em play e veem exatamente o que acabaste de ver: os mesmos números, a mesma sorte e as mesmas cenas, com a data de hoje no início.</p>
      ${nota}
      <form class="vc-form" id="ex-form">
        <label class="campo"><span>Título</span><input class="input" name="titulo" maxlength="100" value="${esc(atual?.titulo || t.titulo.replace(/\s*[\p{Extended_Pictographic}]+$/u, ""))}"></label>
        <label class="campo"><span>Texto (opcional)</span><textarea class="input" name="texto" rows="2" maxlength="400">${esc(atual?.texto || "")}</textarea></label>
        <div class="ed-grelha">
          <label class="campo"><span>Disponível a partir de (opcional)</span><input class="input" type="datetime-local" name="desde" value="${local(atual?.desde)}"></label>
          <label class="campo"><span>Até (opcional)</span><input class="input" type="datetime-local" name="ate" value="${local(atual?.ate)}"></label>
        </div>
        <label class="vc-interruptor"><input type="checkbox" name="visivel" ${atual?.visivel === false ? "" : "checked"}><span class="vc-bola"></span><span><b>Visível no site</b><small>Mostras e escondes quando quiseres em Página pública, Exclusivos.</small></span></label>
      </form>
      <div class="janela-acoes"><button class="btn" data-fechar>Cancelar</button><button class="btn btn-primario" data-ok>${atual ? "Substituir" : "Publicar"}</button></div>`,
      { larga: true },
    );
    const f = $("#ex-form", el);
    $("[data-ok]", el).addEventListener("click", async (e) => {
      const b = e.currentTarget;
      b.disabled = true;
      b.innerHTML = `<span class="mini-roda"></span> A guardar`;
      try {
        const exclusivo = {
          ...(atual ? { id: atual.id } : {}),
          titulo: f.titulo.value,
          texto: f.texto.value,
          desde: f.desde.value ? new Date(f.desde.value).toISOString() : null,
          ate: f.ate.value ? new Date(f.ate.value).toISOString() : null,
          visivel: f.visivel.checked,
          esp: esp.id,
          opts: x.opts,
          tema: x.temaId,
          cores: x.cores,
          formato: x.formato,
          efeitos: x.efeitos,
          velocidade: x.velocidade,
          roteiro: x.roteiro,
        };
        const retrato = { ds: x.ds, historico: x.historico, capturas: x.palco.capturas, semente: x.semente, roteiro: x.roteiro };
        const r = await api("admin/exclusivo", { corpo: { exclusivo, retrato } });
        const c = await contar(null).catch(() => null);
        carregarHistorico({ forcar: true });
        fechar();
        travar("exclusivo");
        x.aoGuardarExclusivo?.(r.exclusivo.id);
        res.innerHTML = `<div class="aviso info"><p>${atual ? "Exclusivo substituído." : "Publicado como exclusivo."} Os visitantes veem-no exatamente assim${c?.guardados ? `, e contou nas estatísticas (${c.guardados} ${c.guardados === 1 ? "resultado" : "resultados"})` : ""}.
          ${r.abaVisivel ? "" : " Para aparecer no site, liga a aba Exclusivos e carrega em Publicar."} <a href="#/publica/exclusivos">Ver os exclusivos</a></p></div>`;
      } catch (err) {
        toast(err.message, { erro: true, tempo: 7000 });
        b.disabled = false;
        b.textContent = atual ? "Substituir" : "Publicar";
      }
    });
  });
}

/** Painel com o vídeo gravado (se houver) e a legenda pronta a copiar. */
function mostrarPublicar(alvo, esp, opts, { formato, temaId, video, historico, aviso }) {
  const t = textoPublicar(esp, opts, { formato, temaId, aviso });
  const nomeFicheiro = `placar-${esp.id}-${temaId}-${formato}-${new Date().toISOString().slice(0, 10)}.${video?.ext || "mp4"}`;
  alvo.innerHTML = `<section class="secao"><div class="secao-cabeca"><div><h2>Pronto para publicar</h2><p>${esc(t.dica)}</p></div></div>
    ${historico ? `<div class="aviso ${historico.erro ? "" : "info"}" style="margin-bottom:14px"><p>${historico.erro ? esc(historico.erro) : `${historico.n ? `Guardado no histórico do Palco: ${historico.n} ${historico.n === 1 ? "resultado" : "resultados"} (confrontos, estrelas e coroas). ` : ""}${historico.publicacao ? "O vídeo já aparece na página pública; depois de o publicares, junta o link em Página pública, Vídeos e hall." : ""}`}</p></div>` : ""}
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
function lerModoTema() {
  try {
    return localStorage.getItem("placar-tema-modo") === "cores" ? "cores" : "completo";
  } catch {
    return "completo";
  }
}
function guardarModoTema(v) {
  try {
    localStorage.setItem("placar-tema-modo", v);
  } catch {
    /* sem armazenamento */
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
