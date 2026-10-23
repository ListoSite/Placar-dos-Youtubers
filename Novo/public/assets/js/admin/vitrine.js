// Centro de controlo da página pública: tudo o que lá aparece liga-se, desliga-se e escolhe-se aqui.
// As mudanças aparecem logo na pré-visualização (telemóvel) e só chegam aos visitantes com "Publicar".

import { api, estado, procurar } from "../data.js";
import { esc, mesNome, ha } from "../format.js";
import { $, $$, avatar, toast, janela, confirmar } from "../ui.js";
import { chamar } from "./common.js";
import { quemAparece, regraQuem, valorQuem, MEDIDAS_QUEM } from "../quem.js";

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
  { id: "quem", nome: "Quem aparece" },
  { id: "paginas", nome: "Páginas" },
  { id: "perfis", nome: "Perfis" },
  { id: "videos", nome: "Vídeos e hall" },
  { id: "exclusivos", nome: "Exclusivos" },
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
  const enviar = () => {
    const q = calcQuem();
    iframe.contentWindow?.postMessage({ tipo: "placar-previa", cfg: publicaDe(estadoV.cfg), quem: { aparece: [...q.aparece], semPerfil: [...q.aparece].filter((id) => !q.perfil.has(id)) } }, location.origin);
  };
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
  const f = { abas: seccaoAbas, inicio: seccaoInicio, quem: seccaoQuem, paginas: seccaoPaginas, perfis: seccaoPerfis, videos: seccaoVideos, exclusivos: seccaoExclusivos, dados: seccaoDados }[estadoV.seccao];
  f(alvo, main);
  const hash = { abas: "#/", inicio: "#/inicio", quem: "#/youtubers", paginas: "#/ranking", perfis: "#/youtubers", videos: "#/videos", exclusivos: "#/exclusivos", dados: "#/votar" }[estadoV.seccao];
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
  if (campos.has("n")) base.n = tipo === "subidas" ? 3 : tipo === "videos" || tipo === "exclusivos" ? 4 : tipo === "evolucao" ? 5 : 10;
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
  exclusivos: "Os teus exclusivos, para verem com play ali mesmo.",
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
    <div class="painel ed-bloco"><h3>Votações nos vídeos</h3>
      ${interruptor("ligacoes.avisoVideos", "Aviso de votação nos vídeos", "Quando houver uma votação aberta, os vídeos do Palco mostram antes do fim que podem votar (com o endereço e o código QR).")}
      <div class="ed-grelha" style="margin-top:12px">
        <label class="campo"><span>Endereço para votar (vazio: este site, aba Votar)</span><input class="input" data-caminho="ligacoes.linkVotar" value="${esc(c.ligacoes.linkVotar)}" placeholder="https://placardosyoutubers.netlify.app/#/votar"></label>
        <label class="campo"><span>Texto a dizer onde está o link</span><input class="input" data-caminho="ligacoes.textoBio" value="${esc(c.ligacoes.textoBio)}" maxlength="60" placeholder="Link na bio"></label>
      </div></div>`;
  ligarCampos(alvo);
}

// ---------- Quem aparece ----------
/** Quem aparece e quem tem perfil, com as regras ainda por publicar (as mesmas contas do servidor). */
function calcQuem() {
  const indices = new Map([...estado.indices].map(([id, x]) => [id, x?.total ?? null]));
  return quemAparece(estado.ds, estadoV.cfg.dados, estadoV.cfg.perfis, { ref: estado.ref, indices });
}
const vq = { q: "", filtro: "todos", cat: "", ordem: "medida", sel: new Set(), limite: 60 };

function seccaoQuem(alvo) {
  const c = estadoV.cfg;
  c.dados.quem = regraQuem(c.dados.quem);
  const r = c.dados.quem;
  const cats = estado.ds.categories;
  const modoBotao = (v, titulo, sub) => `<button type="button" class="pl-grande" data-qmodo="${v}" aria-pressed="${r.modo === v}"><b>${titulo}</b><small>${sub}</small></button>`;
  alvo.innerHTML = `<div class="painel ed-bloco">
      <h3>Quem aparece no site</h3>
      <p class="muted">Quem não aparece não está em nenhum ranking, gráfico, lista ou perfil da página pública.</p>
      <div class="vq-modos">
        ${modoBotao("todos", "Todos", "Todos os Youtubers, menos os que esconderes.")}
        ${modoBotao("top", "Os melhores", "Só os primeiros de um ranking. Muda sozinho todos os meses.")}
        ${modoBotao("lista", "Só os que eu escolher", "Escolhes um a um na lista de baixo.")}
      </div>
      ${
        r.modo === "top"
          ? `<div class="vq-top">
        <label class="campo"><span>Ranking por</span><select class="input" id="vq-medida">${Object.entries(MEDIDAS_QUEM).map(([k, n]) => `<option value="${k}" ${r.medida === k ? "selected" : ""}>${esc(n)}</option>`).join("")}</select></label>
        <label class="campo"><span>Quantos</span><input class="input" type="number" min="1" max="400" id="vq-n" value="${r.n}"></label>
        <div class="campo"><span>Atalhos</span><div class="segmentos">${[10, 20, 50, 100].map((n) => `<button type="button" data-qn="${n}" aria-pressed="${r.n === n}">Top ${n}</button>`).join("")}</div></div>
      </div>
      <p class="muted vq-nota">O último mês completo agora é ${esc(mesNome(estado.ref))}. Quando entrar o mês seguinte, a lista atualiza-se sozinha. Os que marcares com "Sempre" aparecem mesmo fora do top.</p>`
          : ""
      }
      ${
        r.modo !== "lista"
          ? `<div class="campo vq-cats"><span>Categorias ${r.categorias.length ? `(${r.categorias.length})` : "(todas)"}</span><div class="vq-chips">
        <button type="button" class="vq-chip" data-qcat="" aria-pressed="${!r.categorias.length}">Todas</button>
        ${cats.map((k) => `<button type="button" class="vq-chip" data-qcat="${esc(k)}" aria-pressed="${r.categorias.includes(k)}">${esc(k)}</button>`).join("")}</div></div>`
          : ""
      }
    </div>
    <div class="painel ed-bloco">
      <h3>Quem tem perfil</h3>
      ${
        c.perfis.ligado
          ? `<p class="muted">O perfil é a página de cada Youtuber, com os números dele. Quem não tem perfil aparece nos rankings, mas o nome não abre nada.</p>
      <div class="segmentos" role="group">
        <button type="button" data-qperfil="todos" aria-pressed="${c.perfis.quem !== "lista"}">Todos os que aparecem</button>
        <button type="button" data-qperfil="lista" aria-pressed="${c.perfis.quem === "lista"}">Só os que eu escolher</button>
      </div>`
          : `<p class="muted">Os perfis estão desligados para todos. Liga-os em <a href="#/publica/perfis" data-ir-seccao="perfis">Perfis</a>.</p>`
      }
    </div>
    <div class="painel ed-bloco vq-caixa">
      <div class="vq-resumo" id="vq-resumo"></div>
      <div class="vq-barra">
        <input class="input" type="search" id="vq-q" placeholder="Procurar Youtuber" value="${esc(vq.q)}">
        <div class="segmentos" role="group">${[["todos", "Todos"], ["sim", "Aparecem"], ["nao", "Não aparecem"], ["esc", "Escondidos"]].map(([k, n]) => `<button type="button" data-qfiltro="${k}" aria-pressed="${vq.filtro === k}">${n}</button>`).join("")}</div>
        <select class="input" id="vq-cat"><option value="">Todas as categorias</option>${cats.map((k) => `<option ${vq.cat === k ? "selected" : ""}>${esc(k)}</option>`).join("")}</select>
        <select class="input" id="vq-ordem"><option value="medida">Ordenar: ${esc(MEDIDAS_QUEM[r.medida])}</option><option value="indice">Ordenar: Índice</option><option value="nome">Ordenar: nome</option></select>
      </div>
      <div class="vq-acoes" id="vq-acoes"></div>
      <div class="vq-tabela" id="vq-tabela"></div>
    </div>`;

  $$("[data-qmodo]", alvo).forEach((b) => b.addEventListener("click", () => {
    r.modo = b.dataset.qmodo;
    if (r.modo === "lista" && !r.lista.length) r.lista = [...calcQuem().aparece];
    mudou();
    seccaoQuem(alvo);
  }));
  $("#vq-medida", alvo)?.addEventListener("change", (e) => ((r.medida = e.target.value), mudou(), seccaoQuem(alvo)));
  $("#vq-n", alvo)?.addEventListener("change", (e) => ((r.n = Math.min(400, Math.max(1, Number(e.target.value) || 10))), mudou(), seccaoQuem(alvo)));
  $$("[data-qn]", alvo).forEach((b) => b.addEventListener("click", () => ((r.n = Number(b.dataset.qn)), mudou(), seccaoQuem(alvo))));
  $$("[data-qcat]", alvo).forEach((b) => b.addEventListener("click", () => {
    const k = b.dataset.qcat;
    if (!k) r.categorias = [];
    else r.categorias = r.categorias.includes(k) ? r.categorias.filter((x) => x !== k) : [...r.categorias, k];
    mudou();
    seccaoQuem(alvo);
  }));
  $$("[data-qperfil]", alvo).forEach((b) => b.addEventListener("click", () => {
    c.perfis.quem = b.dataset.qperfil;
    if (c.perfis.quem === "lista" && !c.perfis.lista?.length) c.perfis.lista = [...calcQuem().aparece];
    mudou();
    seccaoQuem(alvo);
  }));
  $("[data-ir-seccao]", alvo)?.addEventListener("click", (e) => {
    e.preventDefault();
    $(`[data-seccao="perfis"]`)?.click();
  });
  $("#vq-q", alvo).addEventListener("input", (e) => ((vq.q = e.target.value), (vq.limite = 60), tabelaQuem(alvo)));
  $$("[data-qfiltro]", alvo).forEach((b) => b.addEventListener("click", () => {
    vq.filtro = b.dataset.qfiltro;
    vq.limite = 60;
    $$("[data-qfiltro]", alvo).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    tabelaQuem(alvo);
  }));
  $("#vq-cat", alvo).addEventListener("change", (e) => ((vq.cat = e.target.value), (vq.limite = 60), tabelaQuem(alvo)));
  $("#vq-ordem", alvo).value = vq.ordem;
  $("#vq-ordem", alvo).addEventListener("change", (e) => ((vq.ordem = e.target.value), tabelaQuem(alvo)));
  tabelaQuem(alvo);
}

function tabelaQuem(alvo) {
  const c = estadoV.cfg;
  const r = c.dados.quem;
  const res = calcQuem();
  const indices = new Map([...estado.indices].map(([id, x]) => [id, x?.total ?? null]));
  const esc_ = new Set(c.dados.escondidos);
  const sempre = new Set(r.sempre);
  const naLista = new Set(r.lista);
  const perfisLista = c.perfis.ligado && c.perfis.quem === "lista";
  const comPerfil = new Set(c.perfis.lista || []);
  const valor = (p) => valorQuem(p, r.medida, estado.ds, { ref: estado.ref, indices });
  const fmt = (v) => (v === null || v === undefined ? "—" : r.medida === "indice" ? Math.round(v) : new Intl.NumberFormat("pt-PT", { notation: "compact", maximumFractionDigits: 1 }).format(v));
  // Posição de cada um na medida (para se ver logo quem está no top)
  const pos = new Map(
    estado.ds.people
      .map((p) => ({ p, v: valor(p) }))
      .filter((x) => x.v !== null && x.v !== undefined)
      .sort((a, b) => b.v - a.v)
      .map((x, i) => [x.p.id, i + 1]),
  );
  const t = vq.q.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  let lista = estado.ds.people.filter((p) => {
    if (vq.cat && p.category !== vq.cat) return false;
    if (t && !p.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(t)) return false;
    if (vq.filtro === "sim") return res.aparece.has(p.id);
    if (vq.filtro === "nao") return !res.aparece.has(p.id);
    if (vq.filtro === "esc") return esc_.has(p.id) || p.hidden;
    return true;
  });
  lista.sort((a, b) => (vq.ordem === "nome" ? a.name.localeCompare(b.name, "pt") : vq.ordem === "indice" ? (indices.get(b.id) ?? -1) - (indices.get(a.id) ?? -1) : (pos.get(a.id) ?? 1e9) - (pos.get(b.id) ?? 1e9)));
  const total = estado.ds.people.length;
  const nEsc = estado.ds.people.filter((p) => esc_.has(p.id) || p.hidden).length;
  $("#vq-resumo", alvo).innerHTML = `<div><b>${res.aparece.size}</b><small>aparecem</small></div><div><b>${res.perfil.size}</b><small>com perfil</small></div><div><b>${nEsc}</b><small>escondidos</small></div><div><b>${total}</b><small>no total</small></div>`;

  const estadoDe = (p) => {
    if (p.hidden) return `<span class="vq-estado esc" title="Marcado como escondido em Youtubers">Escondido (Youtubers)</span>`;
    if (esc_.has(p.id)) return `<span class="vq-estado esc">Escondido</span>`;
    if (res.aparece.has(p.id)) return `<span class="vq-estado sim">Aparece</span>${r.modo === "top" && sempre.has(p.id) ? ` <span class="vq-estado fixo">Sempre</span>` : ""}`;
    return `<span class="vq-estado nao">${r.modo === "lista" ? "Fora da lista" : r.modo === "top" ? "Fora do top" : "Fora das categorias"}</span>`;
  };
  const icone = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const OLHO = icone(`<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>`);
  const OLHO_NAO = icone(`<path d="M3 3l18 18"/><path d="M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.7 8.4 2 12 2 12s3.6 7 10 7a9.7 9.7 0 0 0 4.4-1"/>`);
  const visiveis = lista.slice(0, vq.limite);
  const todosSel = visiveis.length && visiveis.every((p) => vq.sel.has(p.id));
  $("#vq-tabela", alvo).innerHTML = lista.length
    ? `<table class="vq-t"><thead><tr>
        <th class="vq-c"><input type="checkbox" id="vq-todos" ${todosSel ? "checked" : ""} aria-label="Selecionar todos"></th>
        <th class="dir">#</th><th>Youtuber</th><th class="dir">${{ views: "Views", media3: "Média 3 m", indice: "Índice", subs: "Subs", total: "Views totais" }[r.medida]}</th><th>No site</th><th class="dir">Ações</th></tr></thead>
      <tbody>${visiveis
        .map((p) => {
          const ap = res.aparece.has(p.id);
          const perfilOk = res.perfil.has(p.id);
          return `<tr data-p="${esc(p.id)}" class="${ap ? "" : "fora"} ${vq.sel.has(p.id) ? "sel" : ""}">
          <td class="vq-c"><input type="checkbox" data-sel ${vq.sel.has(p.id) ? "checked" : ""} aria-label="Selecionar ${esc(p.name)}"></td>
          <td class="dir vq-pos">${pos.get(p.id) || "—"}</td>
          <td><span class="vq-quem">${avatar(p, 30)}<span><b>${esc(p.name)}</b><small>${esc(p.category || "Sem categoria")}</small></span></span></td>
          <td class="dir">${fmt(valor(p))}</td>
          <td><div class="vq-estados">${estadoDe(p)}${c.perfis.ligado && ap && !perfilOk ? `<span class="vq-estado nao">Sem perfil</span>` : ""}</div></td>
          <td class="dir"><div class="vq-btns">
            ${p.hidden ? "" : `<button type="button" class="botao-icone" data-a="esconder" title="${esc_.has(p.id) ? "Deixar de esconder" : "Esconder"}">${esc_.has(p.id) ? OLHO_NAO : OLHO}</button>`}
            ${r.modo === "lista" ? `<button type="button" class="btn btn-pequeno ${naLista.has(p.id) ? "ativo" : ""}" data-a="lista">${naLista.has(p.id) ? "✓ Na lista" : "+ Lista"}</button>` : ""}
            ${r.modo === "top" ? `<button type="button" class="btn btn-pequeno ${sempre.has(p.id) ? "ativo" : ""}" data-a="sempre" title="Aparece mesmo fora do top">${sempre.has(p.id) ? "★" : "☆"} Sempre</button>` : ""}
            ${perfisLista && ap ? `<button type="button" class="btn btn-pequeno ${comPerfil.has(p.id) ? "ativo" : ""}" data-a="perfil">${comPerfil.has(p.id) ? "Perfil ✓" : "Perfil"}</button>` : ""}
          </div></td></tr>`;
        })
        .join("")}</tbody></table>
      ${lista.length > vq.limite ? `<div class="vq-mais"><button type="button" class="btn" id="vq-mais">Mostrar mais (${lista.length - vq.limite})</button></div>` : ""}`
    : `<p class="muted" style="padding:16px 0">Ninguém com estes filtros.</p>`;

  // Ações em massa
  const n = vq.sel.size;
  const botoes = [
    ["esconder", "Esconder"],
    ["mostrar", "Deixar de esconder"],
    ...(r.modo === "lista" ? [["lista+", "Pôr na lista"], ["lista-", "Tirar da lista"]] : []),
    ...(r.modo === "top" ? [["sempre+", "Mostrar sempre"], ["sempre-", "Tirar de sempre"]] : []),
    ...(perfisLista ? [["perfil+", "Abrir perfil"], ["perfil-", "Fechar perfil"]] : []),
  ];
  $("#vq-acoes", alvo).innerHTML = n
    ? `<b>${n} ${n === 1 ? "selecionado" : "selecionados"}</b>${botoes.map(([k, t]) => `<button type="button" class="btn btn-pequeno" data-massa="${k}">${t}</button>`).join("")}<button type="button" class="btn btn-pequeno btn-texto" data-massa="limpar">Limpar seleção</button>`
    : `<button type="button" class="btn btn-pequeno" data-massa="todos">Selecionar os ${lista.length} da lista</button><span class="muted">Seleciona Youtubers para os esconder${r.modo === "lista" ? ", pôr na lista" : r.modo === "top" ? ", mostrar sempre" : ""}${perfisLista ? " ou abrir o perfil" : ""} de uma vez.</span>`;

  const alterar = (k, ids) => {
    const juntar = (l, add) => [...new Set(add ? [...l, ...ids] : l.filter((x) => !ids.includes(x)))];
    if (k === "esconder") c.dados.escondidos = juntar(c.dados.escondidos, true);
    if (k === "mostrar") c.dados.escondidos = juntar(c.dados.escondidos, false);
    if (k === "lista+") r.lista = juntar(r.lista, true);
    if (k === "lista-") r.lista = juntar(r.lista, false);
    if (k === "sempre+") r.sempre = juntar(r.sempre, true);
    if (k === "sempre-") r.sempre = juntar(r.sempre, false);
    if (k === "perfil+") c.perfis.lista = juntar(c.perfis.lista || [], true);
    if (k === "perfil-") c.perfis.lista = juntar(c.perfis.lista || [], false);
    mudou();
    tabelaQuem(alvo);
  };
  $$("[data-massa]", alvo).forEach((b) => b.addEventListener("click", () => {
    if (b.dataset.massa === "limpar") {
      vq.sel.clear();
      return tabelaQuem(alvo);
    }
    if (b.dataset.massa === "todos") {
      for (const p of lista) vq.sel.add(p.id);
      return tabelaQuem(alvo);
    }
    alterar(b.dataset.massa, [...vq.sel]);
  }));
  $("#vq-todos", alvo)?.addEventListener("change", (e) => {
    for (const p of visiveis) e.target.checked ? vq.sel.add(p.id) : vq.sel.delete(p.id);
    tabelaQuem(alvo);
  });
  $("#vq-mais", alvo)?.addEventListener("click", () => ((vq.limite += 100), tabelaQuem(alvo)));
  $$("tr[data-p]", alvo).forEach((tr) => {
    const id = tr.dataset.p;
    $("[data-sel]", tr).addEventListener("change", (e) => {
      e.target.checked ? vq.sel.add(id) : vq.sel.delete(id);
      tabelaQuem(alvo);
    });
    $$("[data-a]", tr).forEach((b) => b.addEventListener("click", () => {
      const a = b.dataset.a;
      if (a === "esconder") alterar(esc_.has(id) ? "mostrar" : "esconder", [id]);
      if (a === "lista") alterar(naLista.has(id) ? "lista-" : "lista+", [id]);
      if (a === "sempre") alterar(sempre.has(id) ? "sempre-" : "sempre+", [id]);
      if (a === "perfil") alterar(comPerfil.has(id) ? "perfil-" : "perfil+", [id]);
    }));
  });
}

// ---------- Exclusivos ----------
async function seccaoExclusivos(alvo) {
  const c = estadoV.cfg;
  const aba = c.abas.find((a) => a.id === "exclusivos");
  const bloco = c.inicio.blocos.some((b) => b.tipo === "exclusivos" && b.visivel);
  alvo.innerHTML = `<div class="painel ed-bloco">
      <h3>Exclusivos</h3>
      <p class="muted">Espetáculos do Palco que os visitantes veem a correr no site: carregam em play e veem a batalha, o torneio ou o top, com a música e os efeitos. Não são vídeos gravados.</p>
      <div class="vx-onde">
        ${interruptorAba(aba)}
        <div class="vx-onde-texto"><b>Bloco no Início</b><small>${bloco ? "Há um bloco Exclusivos no Início." : "Podes juntar um bloco Exclusivos ao Início (em Início, + Adicionar bloco)."}</small></div>
      </div>
    </div>
    <div class="painel ed-bloco">
      <div class="vc-cabeca"><div><h3>Os teus exclusivos</h3><p class="muted">Para criar um: escolhe um espetáculo no Palco, ajusta-o e carrega em <b>☆ Publicar como exclusivo</b>.</p></div><a class="btn btn-primario btn-pequeno" href="#/palco?para=video">+ Criar no Palco</a></div>
      <div id="vx-lista"><div class="a-carregar" style="min-height:10vh"><div class="roda"></div></div></div>
    </div>`;
  $("[data-aba-excl]", alvo)?.addEventListener("change", (e) => {
    aba.visivel = e.target.checked;
    mudou();
    seccaoExclusivos(alvo);
  });
  let r;
  try {
    r = await api("admin/exclusivos");
  } catch (e) {
    $("#vx-lista", alvo).innerHTML = `<p>${esc(e.message)}</p>`;
    return;
  }
  const lista = r.exclusivos || [];
  const agora = Date.now();
  const estadoDe = (x) =>
    !x.visivel ? `<span class="vq-estado nao">Escondido</span>` : x.desde && Date.parse(x.desde) > agora ? `<span class="vq-estado fixo">A partir de ${new Date(x.desde).toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" })}</span>` : x.ate && Date.parse(x.ate) <= agora ? `<span class="vq-estado esc">Terminou</span>` : `<span class="vq-estado sim">No site</span>${x.ate ? ` <span class="vq-estado">até ${new Date(x.ate).toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" })}</span>` : ""}`;
  const palco = (x) => `#/palco/${x.esp}?${new URLSearchParams({ ...x.opts, tema: x.tema, fmt: x.formato, vel: x.velocidade, efeitos: x.efeitos, para: "video", excl: x.id })}`;
  $("#vx-lista", alvo).innerHTML = lista.length
    ? `<div class="vc-lista">${lista
        .map(
          (x, i) => `<div class="vc-item vx-item ${x.visivel ? "" : "desligado"}" data-x="${esc(x.id)}">
        <label class="vc-interruptor so" title="Visível no site"><input type="checkbox" data-visivel ${x.visivel ? "checked" : ""}><span class="vc-bola"></span></label>
        <span class="vx-capa ${x.formato === "9x16" ? "v" : ""}" style="background:linear-gradient(150deg, ${x.cores?.[0] || "#8f0d2c"}, ${x.cores?.[2] || x.cores?.[1] || "#f4b942"})">▶</span>
        <div class="vc-item-texto"><b>${esc(x.titulo)}</b><small class="muted">${esc(x.nomeEsp || x.esp)} · ${x.formato === "9x16" ? "9:16" : "16:9"}</small><div class="vq-estados" style="margin-top:6px">${estadoDe(x)}</div></div>
        <span class="vc-mover">
          <button class="botao-icone" data-subir title="Subir" ${i === 0 ? "disabled" : ""}>↑</button>
          <button class="botao-icone" data-descer title="Descer" ${i === lista.length - 1 ? "disabled" : ""}>↓</button>
          <button class="btn btn-pequeno" data-texto>Texto e datas</button>
          <a class="btn btn-pequeno" href="${palco(x)}">Mudar no Palco</a>
          <button class="botao-icone" data-apagar title="Apagar">✕</button>
        </span></div>`,
        )
        .join("")}</div>`
    : `<p class="muted">Ainda não há exclusivos.</p>`;
  const guardar = (x, mudar, msg) => chamar("exclusivo", { exclusivo: { ...x, ...mudar } }, { recarregar: false, sucesso: msg }).then(() => seccaoExclusivos(alvo)).catch(() => {});
  const ordem = (ids) => chamar("exclusivos/ordem", { ids }, { recarregar: false }).then(() => seccaoExclusivos(alvo)).catch(() => {});
  $$("[data-x]", alvo).forEach((el) => {
    const i = lista.findIndex((x) => x.id === el.dataset.x);
    const x = lista[i];
    $("[data-visivel]", el).addEventListener("change", (e) => guardar(x, { visivel: e.target.checked }, e.target.checked ? "Já está no site." : "Escondido."));
    $("[data-subir]", el).addEventListener("click", () => {
      const ids = lista.map((y) => y.id);
      [ids[i - 1], ids[i]] = [ids[i], ids[i - 1]];
      ordem(ids);
    });
    $("[data-descer]", el).addEventListener("click", () => {
      const ids = lista.map((y) => y.id);
      [ids[i + 1], ids[i]] = [ids[i], ids[i + 1]];
      ordem(ids);
    });
    $("[data-apagar]", el).addEventListener("click", async () => {
      if (!(await confirmar(`Apagar o exclusivo "${x.titulo}"?`, { sim: "Apagar", perigo: true }))) return;
      chamar("exclusivo/apagar", { id: x.id }, { recarregar: false, sucesso: "Apagado." }).then(() => seccaoExclusivos(alvo)).catch(() => {});
    });
    $("[data-texto]", el).addEventListener("click", () => {
      const local = (iso) => (iso ? new Date(Date.parse(iso) - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");
      const { el: j, fechar } = janela(
        `<h2>${esc(x.titulo)}</h2><form class="vc-form" id="vx-form">
          <label class="campo"><span>Título</span><input class="input" name="titulo" maxlength="100" value="${esc(x.titulo)}"></label>
          <label class="campo"><span>Texto</span><textarea class="input" name="texto" rows="3" maxlength="400">${esc(x.texto || "")}</textarea></label>
          <div class="ed-grelha"><label class="campo"><span>Disponível a partir de</span><input class="input" type="datetime-local" name="desde" value="${local(x.desde)}"></label>
          <label class="campo"><span>Até</span><input class="input" type="datetime-local" name="ate" value="${local(x.ate)}"></label></div>
        </form><div class="janela-acoes"><button class="btn" data-fechar>Cancelar</button><button class="btn btn-primario" data-ok>Guardar</button></div>`,
      );
      const f = $("#vx-form", j);
      $("[data-ok]", j).addEventListener("click", () => {
        fechar();
        guardar(x, { titulo: f.titulo.value, texto: f.texto.value, desde: f.desde.value ? new Date(f.desde.value).toISOString() : null, ate: f.ate.value ? new Date(f.ate.value).toISOString() : null }, "Guardado.");
      });
    });
  });
}

function interruptorAba(aba) {
  if (!aba) return "";
  return `<label class="vc-interruptor"><input type="checkbox" data-aba-excl ${aba.visivel ? "checked" : ""}><span class="vc-bola"></span><span><b>Aba "${esc(aba.nome)}"</b><small>${aba.visivel ? "Os exclusivos têm a sua aba no site." : "A aba está desligada: liga-a para os visitantes verem os exclusivos (e carrega em Publicar)."}</small></span></label>`;
}
