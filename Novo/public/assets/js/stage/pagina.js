// Página do Palco: lista de espetáculos (para vídeos e para direto) e opções de cada um.

import { estado, pessoa, mesesComDados, procurar, api, temSessao } from "../data.js";
import { esc, mesNome } from "../format.js";
import { $, $$, avatar, toast } from "../ui.js";
import { som } from "../audio.js";
import { Palco, ESPETACULOS, GRUPOS, eAbortado } from "./stage.js";
import { TEMAS, GRUPOS_TEMAS, TEMA_DA_CATEGORIA } from "./temas.js";
import { NOME_DO_KIT, kitDoTema } from "./kits.js";
import { podeGravar, prepararGravacao } from "./gravar.js";
import { textoPublicar } from "./legenda.js";
import { carregarHistorico } from "./historico.js";

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
  const temTT = ds.people.filter((p) => p.socials?.tiktok?.last?.followers).length >= 5;
  const temTTMes = ds.people.filter((p) => p.tt?.f && Object.keys(p.tt.f).length).length >= 5;
  const metricas = () => `<label class="campo"><span>Ranking por</span><select class="input" name="metric">
      <option value="views">Views do mês</option><option value="indice">Índice de Influência</option>${temSubs ? `<option value="subsMes">Subscritores ganhos no mês</option>` : ""}
      <option value="crescimento">Crescimento face ao mês anterior</option><option value="subs">Subscritores (total)</option><option value="total">Views totais</option>${temTT ? `<option value="tiktok">Seguidores no TikTok</option>` : ""}${temTTMes ? `<option value="tiktokMes">Seguidores ganhos no TikTok no mês</option>` : ""}</select></label>`;
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
    cartao: campoPessoa("id", "Youtuber", query, "Procurar"),
    historia: campoPessoa("id", "Youtuber", query, "Procurar"),
  }[esp.id];
  const temFoco = !["cartao", "historia", "votacao"].includes(esp.id);

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
          "Extras",
          "Opcional.",
          `${
            temFoco
              ? `<div class="pl-extra">
            <div class="pl-campos">
              ${campoPessoa("foco", "Youtuber em foco", query, "Ninguém (por exemplo o teu canal)")}
              <label class="campo"><span>Quando aparece</span><select class="input" name="focoQuando"><option value="fim">No fim</option><option value="meio">A meio</option><option value="inicio">No início</option></select></label>
            </div>
            <small class="muted">No momento escolhido, mostra onde ficou este Youtuber e os números dele, com um brilho especial.</small>
          </div>`
              : ""
          }
          <div class="pl-extra pl-aviso pl-so-video" id="pl-aviso" hidden>
            <label class="campo"><span>Aviso de votação antes do fim</span><select class="input" id="pl-aviso-v"><option value="">Sem aviso</option></select></label>
            <small class="muted" id="pl-aviso-nota"></small>
          </div>
          <p class="muted pl-sem-extras" id="pl-sem-extras" ${temFoco ? "hidden" : ""}>Este espetáculo não tem extras.</p>`,
          "pl-passo-extras",
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
    const aviso = $("#pl-aviso-v", main);
    const linhas = [
      ["Para", modo === "video" ? "Vídeo" : "Direto"],
      ["Formato", formato === "9x16" ? "9:16 vertical" : "16:9 horizontal"],
      ["Tema", `${t?.nome || ""}${efeitos === "cores" ? " (só cores)" : ""}`],
      ["Ritmo", `${ritmo === "manual" ? "Eu avanço" : "Automático"}, ${{ rapido: "rápida", normal: "normal", lento: "lenta" }[velocidade]}`],
      modo === "video" && aviso && !$("#pl-aviso", main).hidden ? ["Votação", aviso.value ? "Com aviso no fim" : "Sem aviso"] : null,
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
  // Votações abertas no site: o vídeo avisa antes do fim que se pode votar (e onde)
  let avisos = [];
  let ligacoes = { linkVotar: "", textoBio: "Link na bio", avisoVideos: true };
  Promise.all([api("votacoes"), api("admin/vitrine").catch(() => null)])
    .then(([r, vit]) => {
      if (vit?.config?.ligacoes) ligacoes = vit.config.ligacoes;
      avisos = avisosDeVotacao(r.votacoes || []);
      const caixa = $("#pl-aviso", main);
      if (!caixa || !avisos.length) return;
      const sel = $("#pl-aviso-v", main);
      for (const a of avisos) sel.insertAdjacentHTML("beforeend", `<option value="${esc(a.id)}">${esc(a.etiqueta)}: ${esc(a.titulo)}</option>`);
      if (ligacoes.avisoVideos) sel.value = avisos[0].id;
      $("#pl-aviso-nota", main).textContent = `Aparece antes do "Subscreve": "${ligacoes.textoBio}", o endereço e um código QR. Liga ou desliga por defeito em Página pública, Dados e ligações.`;
      caixa.hidden = false;
      $("#pl-sem-extras", main).hidden = true;
      sel.addEventListener("change", resumo);
      resumo();
    })
    .catch(() => {});
  const avisoEscolhido = () => {
    const a = avisos.find((x) => x.id === $("#pl-aviso-v", main)?.value);
    if (!a || modo !== "video") return null;
    const link = ligacoes.linkVotar || `${location.origin}/#/votar`;
    return { ...a, link, linkCurto: link.replace(/^https?:\/\//, "").replace(/\/$/, ""), textoBio: ligacoes.textoBio || "Link na bio" };
  };
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
    const [mod] = await Promise.all([import(esp.mod), carregarHistorico()]);
    const palco = new Palco({ formato, manual: ritmo === "manual", tema: temaId, velocidade, foco: opts.foco, focoQuando: opts.focoQuando || "fim", modo, completo: efeitos === "completo", votacao: avisoEscolhido() });
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
    // O histórico (rivais, clássicos, estrelas) só conta os espetáculos gravados em vídeo
    let historico = null;
    // e cada vídeo gravado aparece na página pública (com o resumo do que mostrou)
    if (!erro && video) {
      if (!temSessao()) historico = { erro: "A sessão expirou: este vídeo não foi guardado no histórico nem na página pública." };
      else {
        try {
          const t = textoPublicar(esp, opts, { formato, temaId, aviso: palco.votacaoAviso });
          const publicacao = { titulo: t.titulo, legenda: t.legenda, resumo: palco.resumo || { tipo: "jogo" } };
          const r = await api("admin/palco/resultados", { corpo: { espetaculo: esp.id, tema: temaId, formato, resultados: palco.resultados, publicacao } });
          historico = { n: r.guardados, publicacao: r.publicacao };
          carregarHistorico({ forcar: true });
        } catch (e) {
          historico = { erro: `Não foi possível guardar no histórico: ${e.message}` };
        }
      }
    }
    if (!erro) mostrarPublicar($("#pl-publicar", main), esp, opts, { formato, temaId, video, historico, aviso: palco.votacaoAviso });
  };
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    iniciar(false);
  });
  $("#pl-gravar", main)?.addEventListener("click", () => iniciar(true));
  $("#pl-legenda", main).addEventListener("click", () => {
    mostrarPublicar($("#pl-publicar", main), esp, lerOpcoes(), { formato, temaId, aviso: avisoEscolhido() });
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
        opcoes: opcoes.slice(0, 4).map((o) => ({ nome: o.nome, p: o.pessoa ? pessoa(o.pessoa) : null })),
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
      opcoes: (v.tipo === "favorito" ? [] : comPessoa.slice(0, 4)).map((o) => ({ nome: o.nome, p: pessoa(o.pessoa) })),
      mais: v.tipo === "favorito" ? 0 : Math.max(0, comPessoa.length - 4),
      criado: v.criado,
    });
  }
  return out.sort((a, b) => (Date.parse(b.criado) || 0) - (Date.parse(a.criado) || 0));
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
