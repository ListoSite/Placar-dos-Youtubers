// Centro de controlo da página pública: tudo o que lá aparece liga-se, desliga-se e escolhe-se aqui.
// As mudanças aparecem logo na pré-visualização (telemóvel) e só chegam aos visitantes com "Publicar".

import { api, estado, procurar } from "../data.js";
import { esc, mesNome, ha } from "../format.js";
import { $, $$, avatar, toast, janela, confirmar } from "../ui.js";
import { chamar } from "./common.js";

const NOMES_MEDIDA = {
  views: "Views (soma do período)",
  media: "Média de views por mês",
  crescimento: "Crescimento",
  subs: "Subscritores ganhos",
  indice: "Índice de Influência",
  subsTotal: "Subscritores (total)",
  viewsTotal: "Views totais",
  tiktok: "Seguidores no TikTok",
};
const NOMES_ANIMACAO = {
  subir: "Subir (um a um)",
  revelar: "Revelar do último ao primeiro (suspense)",
  contar: "Números a contar",
  crescer: "Barras a crescer",
  deslizar: "Deslizar dos lados",
  nenhuma: "Sem animação",
};
const NOMES_ESTILO = { lista: "Lista", cartoes: "Cartões", normal: "Normal", aviso: "Destacado" };
const SECOES = [
  ["numeros", "Números principais"],
  ["indice", "Índice de Influência (e como se calcula)"],
  ["mensal", "Gráfico das views por mês"],
  ["crescimento", "Crescimento (Social Blade)"],
  ["diario", "Últimos dias (views por dia)"],
  ["tiktok", "TikTok"],
  ["recordes", "Recordes"],
  ["videos", "Vídeos recentes"],
  ["canais", "Canais"],
  ["palco", "No Palco (estrelas, coroas e rivais)"],
  ["redes", "Outras redes"],
  ["projetos", "Projetos"],
  ["comparar", "Botão Comparar"],
];
const SECCOES_PAINEL = [
  { id: "abas", nome: "Abas" },
  { id: "inicio", nome: "Início" },
  { id: "paginas", nome: "Páginas" },
  { id: "perfis", nome: "Youtubers e perfis" },
  { id: "videos", nome: "Vídeos e hall" },
  { id: "dados", nome: "Dados e ligações" },
];

let estadoV = null;

export async function render(main, { params }) {
  main.dataset.titulo = "Página pública";
  main.innerHTML = `<div class="wrap vt-centro"><div class="a-carregar"><div class="roda"></div></div></div>`;
  let r;
  try {
    r = await api("admin/vitrine");
  } catch (e) {
    main.innerHTML = `<div class="wrap pagina-topo"><h1>Página pública</h1><div class="aviso"><p>${esc(e.message)}</p></div></div>`;
    return;
  }
  estadoV = { cfg: r.config, blocos: r.blocos, guardado: JSON.stringify(r.config), seccao: SECCOES_PAINEL.some((s) => s.id === params[0]) ? params[0] : "abas" };
  main.innerHTML = `<div class="wrap vc">
    <div class="vc-topo">
      <div><h1>Página pública</h1><p class="muted">Tudo o que os visitantes veem. Nada aparece lá sem estar ligado aqui.</p></div>
      <div class="vc-acoes">
        <span class="vc-estado" id="vc-estado"></span>
        <button class="btn" id="vc-ver-previa" type="button">Pré-visualizar</button>
        <a class="btn" href="/" target="_blank" rel="noopener">Abrir o site</a>
        <button class="btn btn-primario" id="vc-publicar" type="button" data-a-esperar="A publicar">Publicar</button>
      </div>
    </div>
    <div class="vc-corpo">
      <div class="vc-editor">
        <nav class="segmentos vc-seccoes" id="vc-seccoes">${SECCOES_PAINEL.map((s) => `<button type="button" data-seccao="${s.id}">${s.nome}</button>`).join("")}</nav>
        <div id="vc-conteudo"></div>
      </div>
      <aside class="vc-previa" id="vc-previa">
        <div class="vc-telefone"><iframe id="vc-iframe" src="/?previa=1#/" title="Pré-visualização da página pública"></iframe></div>
        <p class="muted vc-nota">Pré-visualização com as tuas mudanças. Os visitantes só as veem depois de carregares em Publicar.</p>
        <button class="btn btn-pequeno vc-fechar-previa" id="vc-fechar-previa" type="button">Fechar</button>
      </aside>
    </div>
  </div>`;

  const iframe = $("#vc-iframe", main);
  const enviar = () => iframe.contentWindow?.postMessage({ tipo: "placar-previa", cfg: publicaDe(estadoV.cfg) }, location.origin);
  const aoMudar = () => {
    marcarEstado(main);
    enviar();
  };
  estadoV.aoMudar = aoMudar;
  estadoV.irPara = (hash) => iframe.contentWindow?.postMessage({ tipo: "placar-ir", hash }, location.origin);
  const ouvir = (e) => {
    if (e.origin === location.origin && e.data?.tipo === "placar-previa-pronta") enviar();
  };
  addEventListener("message", ouvir);

  $$("[data-seccao]", main).forEach((b) =>
    b.addEventListener("click", () => {
      estadoV.seccao = b.dataset.seccao;
      history.replaceState(null, "", `#/publica/${estadoV.seccao}`);
      desenharSeccao(main);
    }),
  );
  $("#vc-publicar", main).addEventListener("click", async (e) => {
    try {
      const res = await chamar("vitrine", { config: estadoV.cfg }, { botao: e.currentTarget, recarregar: false, sucesso: "Publicado: os visitantes já veem as mudanças." });
      estadoV.cfg = res.config;
      estadoV.guardado = JSON.stringify(res.config);
      marcarEstado(main);
      desenharSeccao(main);
      iframe.contentWindow?.location.reload();
    } catch {
      /* o aviso já apareceu */
    }
  });
  $("#vc-ver-previa", main).addEventListener("click", () => main.querySelector(".vc").classList.add("previa-aberta"));
  $("#vc-fechar-previa", main).addEventListener("click", () => main.querySelector(".vc").classList.remove("previa-aberta"));
  const sair = (e) => {
    if (JSON.stringify(estadoV?.cfg) !== estadoV?.guardado) {
      e.preventDefault();
      e.returnValue = "";
    }
  };
  addEventListener("beforeunload", sair);
  marcarEstado(main);
  desenharSeccao(main);
  return () => {
    removeEventListener("message", ouvir);
    removeEventListener("beforeunload", sair);
  };
}

/** A versão que a página pública recebe (como o servidor faz ao publicar). */
function publicaDe(cfg) {
  const { dados, ...resto } = cfg;
  return { ...resto, abas: cfg.abas.filter((a) => a.visivel), inicio: { ...cfg.inicio, blocos: cfg.inicio.blocos.filter((b) => b.visivel) } };
}

function marcarEstado(main) {
  const sujo = JSON.stringify(estadoV.cfg) !== estadoV.guardado;
  const el = $("#vc-estado", main);
  el.textContent = sujo ? "Alterações por publicar" : "Tudo publicado";
  el.classList.toggle("sujo", sujo);
}

function mudou() {
  estadoV.aoMudar?.();
}

// ---------- Secções ----------
function desenharSeccao(main) {
  $$("[data-seccao]", main).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.seccao === estadoV.seccao)));
  const alvo = $("#vc-conteudo", main);
  const f = { abas: seccaoAbas, inicio: seccaoInicio, paginas: seccaoPaginas, perfis: seccaoPerfis, videos: seccaoVideos, dados: seccaoDados }[estadoV.seccao];
  f(alvo, main);
  const hash = { abas: "#/", inicio: "#/inicio", paginas: "#/ranking", perfis: "#/youtubers", videos: "#/videos", dados: "#/votar" }[estadoV.seccao];
  estadoV.irPara?.(hash);
}

/** Um interruptor (checkbox) ligado a um caminho da configuração. */
function interruptor(caminho, rotulo, ajuda = "") {
  const v = ler(caminho);
  return `<label class="vc-interruptor"><input type="checkbox" data-caminho="${caminho}" ${v ? "checked" : ""}><span class="vc-bola"></span><span><b>${esc(rotulo)}</b>${ajuda ? `<small>${esc(ajuda)}</small>` : ""}</span></label>`;
}
function ler(caminho) {
  return caminho.split(".").reduce((o, k) => o?.[k], estadoV.cfg);
}
function escrever(caminho, valor) {
  const ks = caminho.split(".");
  let o = estadoV.cfg;
  for (const k of ks.slice(0, -1)) o = o[k] ||= {};
  o[ks[ks.length - 1]] = valor;
}
/** Liga os interruptores e campos simples (data-caminho) de uma secção. */
function ligarCampos(alvo) {
  $$("[data-caminho]", alvo).forEach((el) => {
    const evento = el.type === "checkbox" || el.tagName === "SELECT" ? "change" : "input";
    el.addEventListener(evento, () => {
      let v = el.type === "checkbox" ? el.checked : el.value;
      if (el.type === "number") v = Number(v);
      escrever(el.dataset.caminho, v);
      mudou();
    });
  });
}

function seccaoAbas(alvo) {
  const abas = estadoV.cfg.abas;
  const visiveis = abas.filter((a) => a.visivel).length;
  alvo.innerHTML = `<div class="painel ed-bloco">
    <h3>Abas da página pública</h3>
    <p class="muted">A ordem aqui é a ordem no site. No telemóvel, até 5 abas ficam na barra de baixo; com mais, as 4 primeiras e um botão "Mais". A primeira aba visível é a que abre primeiro.</p>
    <div class="vc-lista">${abas
      .map(
        (a, i) => `<div class="vc-item ${a.visivel ? "" : "desligado"}" data-i="${i}">
        <label class="vc-interruptor so"><input type="checkbox" data-visivel ${a.visivel ? "checked" : ""}><span class="vc-bola"></span></label>
        <input class="input vc-nome" value="${esc(a.nome)}" maxlength="24" data-nome aria-label="Nome da aba">
        <small class="muted">${esc(descricaoAba(a.id))}</small>
        <span class="vc-mover"><button class="botao-icone" data-subir title="Subir" ${i === 0 ? "disabled" : ""}>↑</button><button class="botao-icone" data-descer title="Descer" ${i === abas.length - 1 ? "disabled" : ""}>↓</button></span>
      </div>`,
      )
      .join("")}</div>
    <p class="muted" style="margin-top:12px">${visiveis ? `${visiveis} ${visiveis === 1 ? "aba visível" : "abas visíveis"}.` : "Nenhuma aba visível: o site mostra só um aviso."}</p>
  </div>`;
  $$("[data-i]", alvo).forEach((el) => {
    const i = Number(el.dataset.i);
    $("[data-visivel]", el).addEventListener("change", (e) => {
      abas[i].visivel = e.target.checked;
      mudou();
      seccaoAbas(alvo);
    });
    $("[data-nome]", el).addEventListener("input", (e) => {
      abas[i].nome = e.target.value;
      mudou();
    });
    $("[data-subir]", el).addEventListener("click", () => mover(abas, i, -1, () => seccaoAbas(alvo)));
    $("[data-descer]", el).addEventListener("click", () => mover(abas, i, 1, () => seccaoAbas(alvo)));
  });
}
function descricaoAba(id) {
  return {
    inicio: "Os blocos que escolheres (pódio, gráficos, votações…)",
    ranking: "O ranking completo, com filtros",
    votar: "Todas as votações e torneios",
    youtubers: "A lista de Youtubers (e os perfis)",
    videos: "Os vídeos gravados e o hall da fama",
    comparar: "Comparar até 4 Youtubers",
    categorias: "As categorias que fazem mais views",
    projetos: "Séries e projetos",
  }[id];
}
function mover(lista, i, d, depois) {
  const j = i + d;
  if (j < 0 || j >= lista.length) return;
  [lista[i], lista[j]] = [lista[j], lista[i]];
  mudou();
  depois();
}

// ---------- Início (blocos) ----------
function resumoBloco(b) {
  const partes = [];
  if (b.metrica) partes.push(NOMES_MEDIDA[b.metrica]);
  if (b.periodo) partes.push(textoPeriodo(b.periodo));
  if (b.n && ["ranking", "barras", "evolucao", "subidas", "videos"].includes(b.tipo)) partes.push(`${b.n}`);
  if (b.categoria) partes.push(b.categoria);
  if (b.pessoas?.length) partes.push(b.pessoas.map((id) => estado.pessoas.get(id)?.name || id).join(", "));
  if (b.tipo === "votacao") partes.push(b.votacao === "abertas" ? "votações abertas" : b.votacao === "todas" ? "todas as votações" : "uma votação");
  return partes.filter(Boolean).join(" · ");
}
function textoPeriodo(p) {
  if (!p) return "";
  if (p.tipo === "mes") return p.mes ? mesNome(p.mes) : "um mês";
  if (p.tipo === "ano") return String(p.ano);
  if (p.tipo === "intervalo") return `${p.de ? mesNome(p.de, { curto: true }) : "início"} a ${p.ate ? mesNome(p.ate, { curto: true }) : "agora"}`;
  if (p.tipo === "ultimos") return `últimos ${p.n} meses`;
  return "último mês completo";
}

function seccaoInicio(alvo) {
  const ini = estadoV.cfg.inicio;
  alvo.innerHTML = `<div class="painel ed-bloco">
      <h3>Cabeçalho</h3>
      ${interruptor("inicio.heroi.visivel", "Mostrar o cabeçalho no Início")}
      <div class="ed-grelha" style="margin-top:12px">
        <label class="campo"><span>Etiqueta</span><input class="input" data-caminho="inicio.heroi.etiqueta" value="${esc(ini.heroi.etiqueta)}" maxlength="80"></label>
        <label class="campo"><span>Título</span><input class="input" data-caminho="inicio.heroi.titulo" value="${esc(ini.heroi.titulo)}" maxlength="80"></label>
      </div>
      <label class="campo" style="margin-top:12px"><span>Texto</span><textarea class="input" rows="3" data-caminho="inicio.heroi.texto" maxlength="400">${esc(ini.heroi.texto)}</textarea></label>
    </div>
    <div class="painel ed-bloco">
      <div class="vc-cabeca"><div><h3>Blocos do Início</h3><p class="muted">Pela ordem em que aparecem. Cada bloco tem o seu período, medida e animação.</p></div><button class="btn btn-primario btn-pequeno" id="vc-novo-bloco">+ Adicionar bloco</button></div>
      <div class="vc-lista">${
        ini.blocos.length
          ? ini.blocos
              .map(
                (b, i) => `<div class="vc-item ${b.visivel ? "" : "desligado"}" data-i="${i}">
          <label class="vc-interruptor so"><input type="checkbox" data-visivel ${b.visivel ? "checked" : ""}><span class="vc-bola"></span></label>
          <div class="vc-item-texto"><b>${esc(b.titulo || estadoV.blocos[b.tipo]?.nome || b.tipo)}</b><small class="muted">${esc(estadoV.blocos[b.tipo]?.nome || b.tipo)}${resumoBloco(b) ? " · " + esc(resumoBloco(b)) : ""}</small></div>
          <span class="vc-mover">
            <button class="botao-icone" data-subir title="Subir" ${i === 0 ? "disabled" : ""}>↑</button>
            <button class="botao-icone" data-descer title="Descer" ${i === ini.blocos.length - 1 ? "disabled" : ""}>↓</button>
            <button class="btn btn-pequeno" data-editar>Editar</button>
            <button class="botao-icone" data-copiar title="Duplicar">⧉</button>
            <button class="botao-icone" data-apagar title="Apagar">✕</button>
          </span></div>`,
              )
              .join("")
          : `<p class="muted">Ainda não há blocos. O Início mostra só o cabeçalho.</p>`
      }</div>
    </div>`;
  ligarCampos(alvo);
  $("#vc-novo-bloco", alvo).addEventListener("click", () => escolherTipo((tipo) => editarBloco(novoBloco(tipo), (b) => (ini.blocos.push(b), mudou(), seccaoInicio(alvo)))));
  $$("[data-i]", alvo).forEach((el) => {
    const i = Number(el.dataset.i);
    $("[data-visivel]", el).addEventListener("change", (e) => {
      ini.blocos[i].visivel = e.target.checked;
      mudou();
      seccaoInicio(alvo);
    });
    $("[data-subir]", el).addEventListener("click", () => mover(ini.blocos, i, -1, () => seccaoInicio(alvo)));
    $("[data-descer]", el).addEventListener("click", () => mover(ini.blocos, i, 1, () => seccaoInicio(alvo)));
    $("[data-editar]", el).addEventListener("click", () =>
      editarBloco(structuredClone(ini.blocos[i]), (b) => {
        ini.blocos[i] = b;
        mudou();
        seccaoInicio(alvo);
      }),
    );
    $("[data-copiar]", el).addEventListener("click", () => {
      ini.blocos.splice(i + 1, 0, { ...structuredClone(ini.blocos[i]), id: "b" + Date.now().toString(36) });
      mudou();
      seccaoInicio(alvo);
    });
    $("[data-apagar]", el).addEventListener("click", async () => {
      if (!(await confirmar("Apagar este bloco do Início?", { sim: "Apagar", perigo: true }))) return;
      ini.blocos.splice(i, 1);
      mudou();
      seccaoInicio(alvo);
    });
  });
}

function novoBloco(tipo) {
  const base = { id: "b" + Date.now().toString(36), tipo, visivel: true, titulo: "", animacao: "subir" };
  const campos = new Set(estadoV.blocos[tipo].campos);
  if (campos.has("periodo")) base.periodo = { tipo: "ultimo" };
  if (campos.has("metrica")) base.metrica = "views";
  if (campos.has("n")) base.n = tipo === "subidas" ? 3 : tipo === "videos" ? 4 : tipo === "evolucao" ? 5 : 10;
  if (campos.has("estilo")) base.estilo = tipo === "texto" ? "normal" : "lista";
  if (campos.has("pessoas")) base.pessoas = [];
  if (campos.has("votacao")) base.votacao = "abertas";
  if (tipo === "podio") base.animacao = "revelar";
  if (tipo === "numeros") base.animacao = "contar";
  if (tipo === "barras" || tipo === "categorias") base.animacao = "crescer";
  return base;
}

const DESCRICOES = {
  podio: "Os 3 primeiros, com degraus de ouro, prata e bronze.",
  ranking: "Uma lista (ou cartões) com os primeiros de um ranking.",
  barras: "Barras horizontais a comparar os primeiros.",
  evolucao: "Linhas mês a mês de alguns Youtubers.",
  categorias: "Que tipo de conteúdo faz mais views.",
  numeros: "Total de views, o n.º 1, a maior subida…",
  subidas: "Quem mais subiu e mais caiu no ranking.",
  youtuber: "Um Youtuber em destaque, com os números dele.",
  duelo: "Dois Youtubers frente a frente.",
  votacao: "Uma votação (ou as abertas), para votar ali mesmo.",
  videos: "Os últimos vídeos gravados no Palco.",
  hall: "Estrelas, coroas, duelos e clássicos.",
  texto: "Um título, um texto e um botão (avisos, novidades).",
};

function escolherTipo(aoEscolher) {
  const { el, fechar } = janela(
    `<h2>Adicionar bloco</h2><div class="vc-tipos">${Object.entries(estadoV.blocos)
      .map(([id, b]) => `<button class="vc-tipo" data-tipo="${id}"><b>${esc(b.nome)}</b><small>${esc(DESCRICOES[id] || "")}</small></button>`)
      .join("")}</div><div class="janela-acoes"><button class="btn" data-fechar>Cancelar</button></div>`,
    { larga: true },
  );
  $$("[data-tipo]", el).forEach((b) =>
    b.addEventListener("click", () => {
      fechar();
      aoEscolher(b.dataset.tipo);
    }),
  );
}

/** O formulário de um bloco (só com os campos que esse tipo aceita). */
async function editarBloco(b, aoGuardar) {
  const campos = new Set(estadoV.blocos[b.tipo].campos);
  const completos = estado.ds.months.filter((m) => m < estado.ds.currentMonth);
  const anos = [...new Set(completos.map((m) => m.slice(0, 4)))].reverse();
  const opcoesMes = (sel) => [...completos].reverse().map((m) => `<option value="${m}" ${m === sel ? "selected" : ""}>${mesNome(m)}</option>`).join("");
  let votacoes = [];
  if (campos.has("votacao")) votacoes = (await api("admin/votacoes").catch(() => ({ votacoes: [] }))).votacoes || [];
  const grupos = new Map();
  for (const v of votacoes) if (v.grupo && !grupos.has(v.grupo)) grupos.set(v.grupo, v.extra?.nomeGrupo || "Torneio");
  const maxPessoas = b.tipo === "duelo" ? 2 : b.tipo === "youtuber" ? 1 : 8;
  const per = b.periodo || { tipo: "ultimo" };
  const { el, fechar } = janela(
    `<h2>${esc(estadoV.blocos[b.tipo].nome)}</h2>
    <form class="vc-form" id="vc-form">
      <label class="campo"><span>Título (opcional)</span><input class="input" name="titulo" value="${esc(b.titulo || "")}" maxlength="120"></label>
      ${campos.has("texto") ? `<label class="campo"><span>Texto</span><textarea class="input" name="texto" rows="3" maxlength="600">${esc(b.texto || "")}</textarea></label>` : ""}
      ${
        campos.has("periodo")
          ? `<fieldset class="vc-periodo"><legend>Período</legend>
        <select class="input" name="ptipo">
          <option value="ultimo">O último mês completo (muda sozinho)</option>
          <option value="mes">Um mês específico</option>
          <option value="ano">Um ano</option>
          <option value="ultimos">Os últimos meses (muda sozinho)</option>
          <option value="intervalo">De um mês a outro</option>
        </select>
        <label class="campo" data-p="mes"><span>Mês</span><select class="input" name="pmes">${opcoesMes(per.mes || estado.ref)}</select></label>
        <label class="campo" data-p="ano"><span>Ano</span><select class="input" name="pano">${anos.map((a) => `<option ${String(per.ano) === a ? "selected" : ""}>${a}</option>`).join("")}</select></label>
        <label class="campo" data-p="ultimos"><span>Quantos meses</span><input class="input" type="number" name="pn" min="2" max="36" value="${per.n || 6}"></label>
        <div class="ed-grelha" data-p="intervalo"><label class="campo"><span>De</span><select class="input" name="pde">${opcoesMes(per.de || completos[Math.max(0, completos.indexOf(estado.ref) - 5)])}</select></label><label class="campo"><span>Até</span><select class="input" name="pate">${opcoesMes(per.ate || estado.ref)}</select></label></div>
      </fieldset>`
          : ""
      }
      ${campos.has("metrica") ? `<label class="campo"><span>Medida</span><select class="input" name="metrica">${Object.entries(NOMES_MEDIDA).map(([k, n]) => `<option value="${k}" ${b.metrica === k ? "selected" : ""}>${esc(n)}</option>`).join("")}</select></label>` : ""}
      ${campos.has("categoria") ? `<label class="campo"><span>Categoria</span><select class="input" name="categoria"><option value="">Todas</option>${estado.ds.categories.map((c) => `<option ${b.categoria === c ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></label>` : ""}
      ${campos.has("n") ? `<label class="campo"><span>Quantos mostrar</span><input class="input" type="number" name="n" min="1" max="100" value="${b.n || 10}"></label>` : ""}
      ${campos.has("estilo") ? `<label class="campo"><span>Estilo</span><select class="input" name="estilo">${(b.tipo === "texto" ? ["normal", "aviso"] : ["lista", "cartoes"]).map((k) => `<option value="${k}" ${b.estilo === k ? "selected" : ""}>${NOMES_ESTILO[k]}</option>`).join("")}</select></label>` : ""}
      ${
        campos.has("pessoas")
          ? `<div class="campo"><span>${b.tipo === "duelo" ? "Os dois Youtubers" : b.tipo === "youtuber" ? "O Youtuber (vazio: o n.º 1 do período)" : "Youtubers (vazio: os primeiros do período)"}</span>
        <div class="vc-pessoas" id="vc-pessoas"></div>
        <div style="position:relative"><input class="input" id="vc-pessoa-q" placeholder="Procurar Youtuber" autocomplete="off"><div class="pesquisa-lista" id="vc-pessoa-lista" style="left:0;right:auto;width:100%"></div></div></div>`
          : ""
      }
      ${
        campos.has("votacao")
          ? `<label class="campo"><span>Votação</span><select class="input" name="votacao">
        <option value="abertas" ${b.votacao === "abertas" ? "selected" : ""}>As que estiverem abertas</option>
        <option value="todas" ${b.votacao === "todas" ? "selected" : ""}>Todas (abertas e fechadas)</option>
        ${[...grupos].map(([g, n]) => `<option value="${esc(g)}" ${b.votacao === g ? "selected" : ""}>Torneio: ${esc(n)}</option>`).join("")}
        ${votacoes.filter((v) => !v.grupo).map((v) => `<option value="${esc(v.id)}" ${b.votacao === v.id ? "selected" : ""}>${esc(v.titulo)}</option>`).join("")}
      </select></label>`
          : ""
      }
      ${campos.has("link") ? `<div class="ed-grelha"><label class="campo"><span>Botão: endereço (https://… ou #/votar)</span><input class="input" name="link" value="${esc(b.link || "")}"></label><label class="campo"><span>Botão: texto</span><input class="input" name="rotuloLink" value="${esc(b.rotuloLink || "")}" maxlength="40"></label></div>` : ""}
      ${campos.has("animacao") ? `<label class="campo"><span>Animação ao aparecer</span><select class="input" name="animacao">${Object.entries(NOMES_ANIMACAO).map(([k, n]) => `<option value="${k}" ${b.animacao === k ? "selected" : ""}>${esc(n)}</option>`).join("")}</select></label>` : ""}
    </form>
    <div class="janela-acoes"><button class="btn" data-fechar>Cancelar</button><button class="btn btn-primario" data-ok>Aplicar</button></div>`,
    { larga: true },
  );
  const form = $("#vc-form", el);
  if (campos.has("periodo")) {
    form.ptipo.value = per.tipo;
    const mostrar = () => $$("[data-p]", form).forEach((x) => (x.hidden = x.dataset.p !== form.ptipo.value));
    form.ptipo.addEventListener("change", mostrar);
    mostrar();
  }
  let pessoas = [...(b.pessoas || [])];
  const pintarPessoas = () => {
    const caixa = $("#vc-pessoas", el);
    if (!caixa) return;
    caixa.innerHTML = pessoas.map((id) => estado.pessoas.get(id)).filter(Boolean).map((p) => `<span class="vt-chip">${avatar(p, 24)}${esc(p.name)}<button type="button" data-tirar="${esc(p.id)}">×</button></span>`).join("") || `<span class="muted">Nenhum escolhido.</span>`;
    $$("[data-tirar]", caixa).forEach((x) =>
      x.addEventListener("click", () => {
        pessoas = pessoas.filter((id) => id !== x.dataset.tirar);
        pintarPessoas();
      }),
    );
    $("#vc-pessoa-q", el).disabled = pessoas.length >= maxPessoas;
  };
  if (campos.has("pessoas")) {
    const q = $("#vc-pessoa-q", el);
    const lista = $("#vc-pessoa-lista", el);
    q.addEventListener("input", () => {
      const r = procurar(q.value, 8).filter((p) => !pessoas.includes(p.id));
      lista.innerHTML = r.map((p) => `<button type="button" class="pesquisa-item" style="width:100%;border:0;background:none;text-align:left" data-id="${esc(p.id)}">${avatar(p, 28)}<span><b>${esc(p.name)}</b><small>${esc(p.category || "")}</small></span></button>`).join("");
      lista.classList.toggle("aberta", r.length > 0);
    });
    lista.addEventListener("click", (e) => {
      const x = e.target.closest("[data-id]");
      if (!x || pessoas.length >= maxPessoas) return;
      pessoas.push(x.dataset.id);
      q.value = "";
      lista.classList.remove("aberta");
      pintarPessoas();
    });
    pintarPessoas();
  }
  $("[data-ok]", el).addEventListener("click", () => {
    const out = { ...b, titulo: form.titulo.value.trim() };
    if (campos.has("texto")) out.texto = form.texto.value;
    if (campos.has("periodo")) {
      const t = form.ptipo.value;
      out.periodo = { tipo: t };
      if (t === "mes") out.periodo.mes = form.pmes.value;
      if (t === "ano") out.periodo.ano = Number(form.pano.value);
      if (t === "ultimos") out.periodo.n = Math.max(2, Math.min(36, Number(form.pn.value) || 6));
      if (t === "intervalo") {
        const [de, ate] = [form.pde.value, form.pate.value].sort();
        out.periodo.de = de;
        out.periodo.ate = ate;
      }
    }
    for (const k of ["metrica", "categoria", "estilo", "animacao", "votacao", "link", "rotuloLink"]) if (campos.has(k) && form[k]) out[k] = form[k].value;
    if (campos.has("n")) out.n = Math.max(1, Math.min(100, Number(form.n.value) || 10));
    if (campos.has("pessoas")) out.pessoas = pessoas;
    if (b.tipo === "duelo" && out.pessoas.length !== 2) return toast("Escolhe os dois Youtubers do duelo.", { erro: true });
    if (out.link && !/^https:\/\/\S+$|^#\/[\w/?=&.-]*$/.test(out.link)) return toast("O endereço do botão tem de começar por https:// (ou ser uma aba, como #/votar).", { erro: true });
    fechar();
    aoGuardar(out);
  });
}

// ---------- Páginas ----------
function seccaoPaginas(alvo) {
  const c = estadoV.cfg;
  const medidas = ["views", "media", "crescimento", "subs", "indice", "subsTotal", "viewsTotal", "tiktok"];
  alvo.innerHTML = `<div class="painel ed-bloco">
      <h3>Ranking</h3>
      <p class="muted">As medidas que os visitantes podem escolher (a primeira marcada é a que abre).</p>
      <div class="vc-checks">${medidas.map((m) => `<label class="ed-check"><input type="checkbox" data-medida="${m}" ${c.ranking.metricas.includes(m) ? "checked" : ""}> ${esc(NOMES_MEDIDA[m])}</label>`).join("")}</div>
      ${interruptor("ranking.escolherPeriodo", "Deixar escolher o período", "Mês, ano ou os últimos meses.")}
      ${interruptor("ranking.filtroCategoria", "Filtro por categoria")}
      ${interruptor("ranking.movimento", "Mostrar quem subiu e desceu (▲▼)")}
      <div class="ed-grelha" style="margin-top:12px">
        <label class="campo"><span>Período ao abrir</span><select class="input" id="vc-rk-per">
          <option value="ultimo">O último mês completo</option><option value="u3">Últimos 3 meses</option><option value="u6">Últimos 6 meses</option><option value="u12">Últimos 12 meses</option>
          ${[...new Set(estado.ds.months.filter((m) => m < estado.ds.currentMonth).map((m) => m.slice(0, 4)))].reverse().map((a) => `<option value="a${a}">${a}</option>`).join("")}
        </select></label>
        <label class="campo"><span>Quantos no máximo</span><input class="input" type="number" min="5" max="400" data-caminho="ranking.n" value="${c.ranking.n}"></label>
        <label class="campo"><span>Animação</span><select class="input" data-caminho="ranking.animacao">${Object.entries(NOMES_ANIMACAO).map(([k, n]) => `<option value="${k}" ${c.ranking.animacao === k ? "selected" : ""}>${esc(n)}</option>`).join("")}</select></label>
      </div>
    </div>
    <div class="painel ed-bloco"><h3>Comparar</h3>
      <label class="campo" style="max-width:260px"><span>Quantos Youtubers de cada vez</span><select class="input" data-caminho="comparar.max">${[2, 3, 4].map((n) => `<option ${c.comparar.max === n ? "selected" : ""}>${n}</option>`).join("")}</select></label></div>
    <div class="painel ed-bloco"><h3>Categorias</h3>${interruptor("categorias.escolherPeriodo", "Deixar escolher o mês")}</div>
    <div class="painel ed-bloco"><h3>Projetos</h3>${interruptor("projetos.trabalho", 'Mostrar "Quem anda a trabalhar"')}</div>
    <div class="painel ed-bloco"><h3>Votar</h3>
      ${interruptor("votar.fechadas", "Mostrar também as votações fechadas", "Com os resultados (se os mostrares).")}
      ${interruptor("votar.explicacao", "Mostrar a explicação no topo")}
      <p class="muted" style="margin-top:12px">As votações em si criam-se em <a href="#/votacoes">Votações</a>.</p></div>`;
  ligarCampos(alvo);
  const per = c.ranking.periodo;
  $("#vc-rk-per", alvo).value = per.tipo === "ultimos" ? `u${per.n}` : per.tipo === "ano" ? `a${per.ano}` : "ultimo";
  $("#vc-rk-per", alvo).addEventListener("change", (e) => {
    const v = e.target.value;
    c.ranking.periodo = v === "ultimo" ? { tipo: "ultimo" } : v.startsWith("u") ? { tipo: "ultimos", n: Number(v.slice(1)) } : { tipo: "ano", ano: Number(v.slice(1)) };
    mudou();
  });
  $$("[data-medida]", alvo).forEach((x) =>
    x.addEventListener("change", () => {
      c.ranking.metricas = $$("[data-medida]", alvo).filter((y) => y.checked).map((y) => y.dataset.medida);
      if (!c.ranking.metricas.length) {
        x.checked = true;
        c.ranking.metricas = [x.dataset.medida];
        toast("O ranking precisa de pelo menos uma medida.");
      }
      mudou();
    }),
  );
}

// ---------- Youtubers e perfis ----------
function seccaoPerfis(alvo) {
  const c = estadoV.cfg;
  alvo.innerHTML = `<div class="painel ed-bloco"><h3>Lista de Youtubers</h3>
      ${interruptor("youtubers.pesquisa", "Pesquisa por nome")}
      ${interruptor("youtubers.categorias", "Filtro por categoria")}
      <label class="campo" style="max-width:300px;margin-top:12px"><span>Ordem</span><select class="input" data-caminho="youtubers.ordem">
        <option value="indice" ${c.youtubers.ordem === "indice" ? "selected" : ""}>Pelo Índice de Influência</option>
        <option value="views" ${c.youtubers.ordem === "views" ? "selected" : ""}>Pelas views do último mês</option>
        <option value="nome" ${c.youtubers.ordem === "nome" ? "selected" : ""}>Por nome</option></select></label></div>
    <div class="painel ed-bloco"><h3>Perfis</h3>
      ${interruptor("perfis.ligado", "Cada Youtuber tem um perfil público", "Desligado: não há perfis nem pesquisa, e os nomes deixam de ser ligações.")}
      <h3 style="margin-top:18px;font-size:var(--t-base)">O que aparece em cada perfil</h3>
      <div class="vc-checks">${SECOES.map(([k, n]) => `<label class="ed-check"><input type="checkbox" data-caminho="perfis.secoes.${k}" ${c.perfis.secoes[k] ? "checked" : ""}> ${esc(n)}</label>`).join("")}</div></div>`;
  ligarCampos(alvo);
}

// ---------- Vídeos e hall ----------
async function seccaoVideos(alvo) {
  alvo.innerHTML = `<div class="painel ed-bloco"><h3>Vídeos e hall da fama</h3>
      ${interruptor("videos.publicacoes", "Mostrar os vídeos gravados no Palco")}
      ${interruptor("videos.hall", "Mostrar o hall da fama")}
      <label class="campo" style="max-width:260px;margin-top:12px"><span>Quantos vídeos</span><input class="input" type="number" min="1" max="60" data-caminho="videos.n" value="${estadoV.cfg.videos.n}"></label></div>
    <div class="painel ed-bloco" id="vc-pubs"><div class="a-carregar" style="min-height:10vh"><div class="roda"></div></div></div>`;
  ligarCampos(alvo);
  const caixa = $("#vc-pubs", alvo);
  let r;
  try {
    r = await api("admin/publicacoes");
  } catch (e) {
    caixa.innerHTML = `<p>${esc(e.message)}</p>`;
    return;
  }
  const lista = r.publicacoes || [];
  caixa.innerHTML = `<h3>Os vídeos gravados</h3><p class="muted">Depois de publicares um vídeo, cola o link para os visitantes o verem. Podes esconder ou apagar cada um.</p>
    ${
      lista.length
        ? `<div class="vc-lista">${lista
            .map(
              (p) => `<div class="vc-item vc-pub ${p.visivel === false ? "desligado" : ""}" data-id="${esc(p.id)}">
          <div class="vc-item-texto"><b>${esc(p.titulo || p.espetaculo)}</b><small class="muted">${esc(ha(p.criado))} · ${esc(p.espetaculo)} · ${esc(p.formato)}</small></div>
          <div class="vc-pub-acoes"><input class="input" placeholder="https://youtube.com/shorts/…" value="${esc(p.link || "")}" data-link>
          <button class="btn btn-pequeno" data-guardar>Guardar link</button>
          <button class="btn btn-pequeno" data-ver>${p.visivel === false ? "Mostrar" : "Esconder"}</button>
          <button class="botao-icone" data-apagar title="Apagar">✕</button></div></div>`,
            )
            .join("")}</div>`
        : `<p class="muted">Ainda não gravaste nenhum vídeo no Palco.</p>`
    }`;
  $$("[data-id]", caixa).forEach((el) => {
    const p = lista.find((x) => String(x.id) === el.dataset.id);
    $("[data-guardar]", el).addEventListener("click", (e) => chamar("publicacao", { id: p.id, link: $("[data-link]", el).value }, { botao: e.currentTarget, recarregar: false, sucesso: "Link guardado." }).catch(() => {}));
    $("[data-ver]", el).addEventListener("click", async (e) => {
      await chamar("publicacao", { id: p.id, visivel: p.visivel === false }, { botao: e.currentTarget, recarregar: false }).catch(() => {});
      seccaoVideos(alvo);
    });
    $("[data-apagar]", el).addEventListener("click", async (e) => {
      if (!(await confirmar("Apagar este vídeo da página pública? Os resultados (rivais, estrelas) ficam.", { sim: "Apagar", perigo: true }))) return;
      await chamar("publicacao/apagar", { id: p.id }, { botao: e.currentTarget, recarregar: false, sucesso: "Apagado." }).catch(() => {});
      seccaoVideos(alvo);
    });
  });
}

// ---------- Dados e ligações ----------
function seccaoDados(alvo) {
  const c = estadoV.cfg;
  const meses = estado.ds.months.filter((m) => m < estado.ds.currentMonth);
  const opcoes = (sel) => `<option value="">Sem limite</option>${[...meses].reverse().map((m) => `<option value="${m}" ${m === sel ? "selected" : ""}>${mesNome(m)}</option>`).join("")}`;
  alvo.innerHTML = `<div class="painel ed-bloco"><h3>Que dados podem aparecer</h3>
      <p class="muted">Meses fora deste intervalo não aparecem em lado nenhum da página pública (rankings, gráficos, perfis). Só muda no site depois de publicares.</p>
      <div class="ed-grelha"><label class="campo"><span>Desde</span><select class="input" data-caminho="dados.desde">${opcoes(c.dados.desde)}</select></label>
      <label class="campo"><span>Até</span><select class="input" data-caminho="dados.ate">${opcoes(c.dados.ate)}</select></label></div></div>
    <div class="painel ed-bloco"><h3>Youtubers escondidos</h3>
      <p class="muted">Não aparecem na página pública: nem nos rankings, nem nos gráficos, nem nos perfis. (Os que marcaste como escondidos em Youtubers também ficam de fora.)</p>
      <div class="vc-pessoas" id="vc-esc"></div>
      <div style="position:relative;max-width:420px"><input class="input" id="vc-esc-q" placeholder="Esconder um Youtuber" autocomplete="off"><div class="pesquisa-lista" id="vc-esc-lista" style="left:0;right:auto;width:100%"></div></div></div>
    <div class="painel ed-bloco"><h3>Votações nos vídeos</h3>
      ${interruptor("ligacoes.avisoVideos", "Aviso de votação nos vídeos", "Quando houver uma votação aberta, os vídeos do Palco mostram antes do fim que podem votar (com o endereço e o código QR).")}
      <div class="ed-grelha" style="margin-top:12px">
        <label class="campo"><span>Endereço para votar (vazio: este site, aba Votar)</span><input class="input" data-caminho="ligacoes.linkVotar" value="${esc(c.ligacoes.linkVotar)}" placeholder="https://placardosyoutubers.netlify.app/#/votar"></label>
        <label class="campo"><span>Texto a dizer onde está o link</span><input class="input" data-caminho="ligacoes.textoBio" value="${esc(c.ligacoes.textoBio)}" maxlength="60" placeholder="Link na bio"></label>
      </div></div>`;
  ligarCampos(alvo);
  const pintar = () => {
    $("#vc-esc", alvo).innerHTML =
      c.dados.escondidos.map((id) => estado.pessoas.get(id) || { id, name: id }).map((p) => `<span class="vt-chip">${avatar(p, 24)}${esc(p.name)}<button type="button" data-tirar="${esc(p.id)}">×</button></span>`).join("") || `<span class="muted">Ninguém escondido.</span>`;
    $$("[data-tirar]", alvo).forEach((x) =>
      x.addEventListener("click", () => {
        c.dados.escondidos = c.dados.escondidos.filter((id) => id !== x.dataset.tirar);
        mudou();
        pintar();
      }),
    );
  };
  const q = $("#vc-esc-q", alvo);
  const lista = $("#vc-esc-lista", alvo);
  q.addEventListener("input", () => {
    const r = procurar(q.value, 8).filter((p) => !c.dados.escondidos.includes(p.id));
    lista.innerHTML = r.map((p) => `<button type="button" class="pesquisa-item" style="width:100%;border:0;background:none;text-align:left" data-id="${esc(p.id)}">${avatar(p, 28)}<span><b>${esc(p.name)}</b><small>${esc(p.category || "")}</small></span></button>`).join("");
    lista.classList.toggle("aberta", r.length > 0);
  });
  lista.addEventListener("click", (e) => {
    const x = e.target.closest("[data-id]");
    if (!x) return;
    c.dados.escondidos.push(x.dataset.id);
    q.value = "";
    lista.classList.remove("aberta");
    mudou();
    pintar();
  });
  pintar();
}
