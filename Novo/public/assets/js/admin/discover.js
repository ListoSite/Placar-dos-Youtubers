// Descobrir canais portugueses novos. Tu decides quem entra.

import { esc, data } from "../format.js";
import { $, $$, toast, janela } from "../ui.js";
import { adm, chamar, cartaoCanal, categorias, escolherPessoa } from "./common.js";

const MOTIVOS = ["Empresa ou marca", "TV, rádio ou jornal", "Canal só de música", "Não é de Portugal", "Não fala português de Portugal", "Canal de clips de terceiros", "Pouco relevante", "Outro"];
const SUGESTOES = ["youtuber português", "vlog portugal", "gameplay português", "podcast português", "humor português", "reacts portugal", "receitas portuguesas", "carros portugal", "tecnologia português", "futebol português"];

let ultimos = [];
let proximaPagina = null;
let ultimaPesquisa = "";

export async function render(alvo) {
  alvo.innerHTML = `
    <div class="painel ed-bloco">
      <h3>Procurar canais</h3>
      <p class="muted">A pesquisa dá prioridade a canais de Portugal e em português, mas a API não garante: confirma sempre o país e a língua. Cada pesquisa gasta 100 unidades da quota (cerca de 90 pesquisas por dia).</p>
      <form id="ds-form" style="display:flex;gap:8px;flex-wrap:wrap"><input class="input" id="ds-q" placeholder="Ex.: vlog portugal" style="flex:1;min-width:220px" value="${esc(ultimaPesquisa)}"><button class="btn btn-primario" data-a-esperar="A procurar">Procurar</button></form>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">${SUGESTOES.map((s) => `<button class="etiqueta" data-sug="${esc(s)}" style="border:0;cursor:pointer">${esc(s)}</button>`).join("")}</div>
      <hr class="ed-linha">
      <h3>Canais recomendados pelos teus canais</h3>
      <p class="muted">Muitos Youtubers destacam canais de amigos na página do canal. Isto lê essas listas em 25 dos teus canais de cada vez (25 unidades) e mostra os que ainda não estão no placar, com quantos dos teus canais os recomendam.</p>
      <button class="btn" id="ds-destacados" data-a-esperar="A ler canais">Ver recomendados</button>
    </div>
    <div id="ds-resultados"></div>
    <details class="painel ed-bloco" style="margin-top:20px"><summary><b>Canais rejeitados (${Object.keys(adm.db.rejected).length})</b></summary><div id="ds-rejeitados" style="margin-top:12px"></div></details>`;

  const mostrar = (lista, titulo) => {
    ultimos = lista;
    const visiveis = lista.filter((c) => !c.linkedTo && !c.rejected);
    const escondidos = lista.length - visiveis.length;
    $("#ds-resultados", alvo).innerHTML = `<div class="secao-cabeca" style="margin-top:24px"><div><h2 style="font-size:var(--t-lg)">${esc(titulo)}</h2><p>${visiveis.length} canais novos${escondidos ? `, ${escondidos} já no placar ou rejeitados` : ""}.</p></div></div>
      ${visiveis.map((c) => cartaoCanal(c, acoes())).join("") || `<div class="vazio"><h3>Nenhum canal novo</h3><p>Experimenta outra pesquisa.</p></div>`}
      ${proximaPagina && titulo.startsWith("Resultados") ? `<p style="text-align:center"><button class="btn" id="ds-mais" data-a-esperar="A procurar">Mais resultados (100 unidades)</button></p>` : ""}`;
    ligar();
    $("#ds-mais", alvo)?.addEventListener("click", async (e) => {
      const r = await chamar("discover/search", { q: ultimaPesquisa, pageToken: proximaPagina }, { botao: e.currentTarget, recarregar: false }).catch(() => null);
      if (!r) return;
      proximaPagina = r.nextPageToken;
      mostrar([...ultimos, ...r.candidates], titulo);
    });
  };

  const acoes = () => `<button class="btn btn-primario btn-pequeno" data-add>Adicionar</button><button class="btn btn-pequeno" data-juntar>Juntar a alguém</button><button class="btn btn-pequeno btn-perigo" data-rejeitar>Rejeitar</button>`;

  const ligar = () => {
    $$("#ds-resultados .candidato", alvo).forEach((card) => {
      const c = ultimos.find((x) => x.id === card.dataset.canal);
      $("[data-add]", card)?.addEventListener("click", () => adicionar(c, card));
      $("[data-juntar]", card)?.addEventListener("click", () => juntar(c, card));
      $("[data-rejeitar]", card)?.addEventListener("click", () => rejeitar(c, card));
    });
  };

  $("#ds-form", alvo).addEventListener("submit", async (e) => {
    e.preventDefault();
    ultimaPesquisa = $("#ds-q", alvo).value.trim();
    if (!ultimaPesquisa) return;
    const r = await chamar("discover/search", { q: ultimaPesquisa }, { botao: e.submitter, recarregar: false }).catch(() => null);
    if (!r) return;
    proximaPagina = r.nextPageToken;
    mostrar(r.candidates, `Resultados para "${ultimaPesquisa}"`);
  });
  $$("[data-sug]", alvo).forEach((b) =>
    b.addEventListener("click", () => {
      $("#ds-q", alvo).value = b.dataset.sug;
      $("#ds-form", alvo).requestSubmit();
    }),
  );
  $("#ds-destacados", alvo).addEventListener("click", async (e) => {
    if (!Object.keys(adm.db.channels).length) return toast("Primeiro liga alguns canais na secção Ligar canais.", { erro: true });
    const r = await chamar("discover/featured", { limit: 25 }, { botao: e.currentTarget, recarregar: false }).catch(() => null);
    if (r) mostrar(r.candidates, `Recomendados por ${r.scanned} dos teus canais`);
  });

  const rej = Object.entries(adm.db.rejected).sort((a, b) => (b[1].at || "").localeCompare(a[1].at || ""));
  $("#ds-rejeitados", alvo).innerHTML = rej.length
    ? `<div class="ed-hist">${rej.map(([id, r]) => `<div><span><a href="https://www.youtube.com/channel/${esc(id)}" target="_blank" rel="noopener">${esc(r.title || id)}</a> <span class="muted">${esc(r.reason || "")}, ${esc(data(r.at))}</span></span><button class="btn btn-texto btn-pequeno" data-desfazer="${esc(id)}">Voltar a aceitar</button></div>`).join("")}</div>`
    : `<p class="muted">Ainda não rejeitaste nenhum canal.</p>`;
  $$("[data-desfazer]", alvo).forEach((b) =>
    b.addEventListener("click", async () => {
      await chamar("unreject", { channelId: b.dataset.desfazer }, { sucesso: "Canal pode voltar a aparecer." }).catch(() => {});
      b.closest("div").remove();
    }),
  );
  if (ultimos.length) mostrar(ultimos, "Últimos resultados");
}

function adicionar(c, card) {
  const { el, fechar } = janela(`<h2>Adicionar ${esc(c.title)}</h2>
    <div class="ed-grelha">
      <label class="campo"><span>Nome no placar</span><input class="input" id="ad-nome" value="${esc(c.title)}"></label>
      <label class="campo"><span>Categoria</span><input class="input" id="ad-cat" list="ad-cats" autofocus></label>
    </div>
    <datalist id="ad-cats">${categorias().map((x) => `<option value="${esc(x)}">`).join("")}</datalist>
    <div class="janela-acoes"><button class="btn" data-fechar>Cancelar</button><button class="btn btn-primario" id="ad-ok" data-a-esperar="A adicionar">Adicionar ao placar</button></div>`);
  $("#ad-ok", el).addEventListener("click", async (e) => {
    const r = await chamar("person/from-channel", { channel: { id: c.id }, name: $("#ad-nome", el).value.trim(), category: $("#ad-cat", el).value.trim() }, { botao: e.currentTarget, sucesso: `${c.title} entrou no placar.` }).catch(() => null);
    if (r) {
      fechar();
      card.remove();
    }
  });
}

function juntar(c, card) {
  const { el, fechar } = janela(`<h2>Juntar ${esc(c.title)} a um Youtuber</h2>
    <p class="soft">Para quando é um segundo canal de alguém que já está no placar.</p>
    <div class="ed-grelha"><label class="campo"><span>Youtuber</span><span style="position:relative"><input class="input" id="jt-q" placeholder="Procurar" autofocus></span></label>
    <label class="campo"><span>Tipo de canal</span><select class="input" id="jt-papel">${["secundário", "clips", "gaming", "podcast", "shorts", "música", "outro"].map((r) => `<option>${r}</option>`).join("")}</select></label></div>
    <div class="janela-acoes"><button class="btn" data-fechar>Cancelar</button></div>`);
  escolherPessoa($("#jt-q", el), async (p) => {
    const r = await chamar("channel/link", { personId: p.id, channelId: c.id, role: $("#jt-papel", el).value }, { sucesso: `Canal juntado a ${p.name}.` }).catch(() => null);
    if (r) {
      fechar();
      card.remove();
    }
  });
}

function rejeitar(c, card) {
  const { el, fechar } = janela(`<h2>Rejeitar ${esc(c.title)}</h2><p class="soft">Não volta a aparecer nas sugestões.</p>
    <div class="ed-motivos">${MOTIVOS.map((m, i) => `<label class="ed-check"><input type="radio" name="motivo" value="${esc(m)}" ${i === 0 ? "checked" : ""}> ${esc(m)}</label>`).join("")}</div>
    <div class="janela-acoes"><button class="btn" data-fechar>Cancelar</button><button class="btn btn-perigo" id="rj-ok">Rejeitar</button></div>`);
  $("#rj-ok", el).addEventListener("click", async () => {
    const reason = el.querySelector("input[name=motivo]:checked")?.value || "";
    await chamar("reject", { channelId: c.id, title: c.title, reason }, { recarregar: false }).catch(() => {});
    adm.db.rejected[c.id] = { title: c.title, reason, at: new Date().toISOString() };
    fechar();
    card.remove();
  });
}
