// Projetos (séries e conteúdos grandes) e o placar de quem anda a trabalhar.

import { estado, pessoa, temSessao } from "../data.js";
import { modo } from "../modo.js";
import { esc, curto, inteiro, decimal, norm, plural } from "../format.js";
import { avatar, linkPessoa, $, $$ } from "../ui.js";

export function impactoTexto(x) {
  if (!x) return "";
  return `${decimal(x, x >= 10 ? 0 : 1)}× o normal do canal`;
}

export function cartaoProjeto(pr) {
  const criador = pessoa(pr.personId);
  const convidados = pr.guests.map(pessoa).filter(Boolean);
  return `<a class="projeto" href="#/projeto/${encodeURIComponent(pr.id)}">
    <div class="capa">${pr.cover ? `<img src="${esc(pr.cover)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : `<div class="calcada" style="width:100%;height:100%"></div>`}
      ${pr.impact ? `<span class="etiqueta ${pr.impact >= 1 ? "ouro" : ""} impacto">${esc(impactoTexto(pr.impact))}</span>` : ""}</div>
    <h3>${esc(pr.name)}</h3>
    <div class="projeto-meta"><span>${curto(pr.totalViews)} views</span><span>${plural(pr.episodes || 0, "episódio", "episódios")}</span>${pr.year ? `<span>${pr.year}</span>` : ""}</div>
    <div class="quem-fez">${criador ? `<span class="pilha">${[criador, ...convidados.slice(0, 4)].map((x) => avatar(x, 26)).join("")}</span><span>${esc(criador.name)}${convidados.length ? ` e mais ${convidados.length}` : ""}</span>` : `<span class="muted">Sem criador definido</span>`}</div>
  </a>`;
}

const ORDENS = [
  { id: "views", nome: "Views totais", f: (p) => p.totalViews || 0 },
  { id: "impacto", nome: "Impacto face ao canal", f: (p) => p.impact || 0 },
  { id: "episodio", nome: "Views por episódio", f: (p) => p.avgViews || 0 },
  { id: "recente", nome: "Mais recentes", f: (p) => Date.parse(p.last || p.first || "") || (p.year ? Date.UTC(p.year, 0) : 0) },
];

export async function render(main, { query }) {
  main.dataset.titulo = "Projetos";
  const ds = estado.ds;
  const comTrabalho = !modo.publico || modo.cfg.projetos.trabalho;
  const vista = comTrabalho && query.get("ver") === "trabalho" ? "trabalho" : "projetos";
  const tipos = [...new Set(ds.projects.map((p) => p.type).filter(Boolean))].sort();
  main.innerHTML = `<div class="wrap">
    <div class="pagina-topo"><h1>Projetos</h1><p>Séries, formatos e conteúdos grandes. As views de cada episódio vêm do YouTube e o impacto compara a média por episódio com o normal do canal.</p></div>
    <div class="filtros" style="justify-content:space-between">
      ${comTrabalho ? `<div class="segmentos" role="group" aria-label="Vista">
        <button data-ver="projetos" aria-pressed="${vista === "projetos"}">Projetos</button>
        <button data-ver="trabalho" aria-pressed="${vista === "trabalho"}">Quem anda a trabalhar</button>
      </div>` : "<span></span>"}
      ${!modo.publico && temSessao() ? `<a class="btn btn-primario" href="#/editar/projetos">Adicionar projeto</a>` : ""}
    </div>
    <div id="pj-conteudo"></div></div>`;
  $$("[data-ver]", main).forEach((b) => b.addEventListener("click", () => (location.hash = b.dataset.ver === "trabalho" ? "#/projetos?ver=trabalho" : "#/projetos")));

  const alvo = $("#pj-conteudo", main);
  if (!ds.projects.length) {
    alvo.innerHTML = `<div class="vazio"><h3>Ainda não há projetos</h3><p>Um projeto é uma série ou um formato grande. Cola o link de uma playlist do YouTube e o site vai buscar as views de cada episódio.</p>${modo.publico ? "" : `<a class="btn btn-primario" href="#/editar/projetos">Adicionar o primeiro projeto</a>`}</div>`;
    return;
  }
  if (vista === "trabalho") return trabalho(alvo);

  alvo.innerHTML = `<div class="filtros">
      <label class="campo"><span>Ordenar por</span><select class="input" id="pj-ordem">${ORDENS.map((o) => `<option value="${o.id}">${o.nome}</option>`).join("")}</select></label>
      <label class="campo"><span>Tipo</span><select class="input" id="pj-tipo"><option value="">Todos</option>${tipos.map((t) => `<option>${esc(t)}</option>`).join("")}</select></label>
      <label class="campo cresce"><span>Procurar</span><input class="input" type="search" id="pj-q" placeholder="Nome do projeto ou do Youtuber"></label>
    </div><div class="projetos-grelha" id="pj-lista"></div>`;
  const desenhar = () => {
    const ordem = ORDENS.find((o) => o.id === $("#pj-ordem", alvo).value);
    const tipo = $("#pj-tipo", alvo).value;
    const q = norm($("#pj-q", alvo).value);
    const lista = ds.projects
      .filter((p) => !tipo || p.type === tipo)
      .filter((p) => !q || norm(p.name).includes(q) || [p.personId, ...p.guests].some((id) => norm(pessoa(id)?.name).includes(q)))
      .sort((a, b) => ordem.f(b) - ordem.f(a));
    $("#pj-lista", alvo).innerHTML = lista.length ? lista.map(cartaoProjeto).join("") : `<p class="muted">Nenhum projeto com estes filtros.</p>`;
  };
  $$("select,input", alvo).forEach((el) => el.addEventListener("input", desenhar));
  desenhar();
}

function trabalho(alvo) {
  const mapa = new Map();
  const add = (id, pr, papel) => {
    const p = pessoa(id);
    if (!p) return;
    const e = mapa.get(id) || { p, criados: 0, convidado: 0, eps: 0, views: 0, colegas: new Set(), anos: new Set() };
    if (papel === "criador") {
      e.criados++;
      e.eps += pr.episodes || 0;
      e.views += pr.totalViews || 0;
    } else e.convidado++;
    for (const o of [pr.personId, ...pr.guests]) if (o && o !== id) e.colegas.add(o);
    if (pr.year) e.anos.add(pr.year);
    mapa.set(id, e);
  };
  for (const pr of estado.ds.projects) {
    add(pr.personId, pr, "criador");
    for (const g of pr.guests) add(g, pr, "convidado");
  }
  const lista = [...mapa.values()].sort((a, b) => b.criados * 3 + b.convidado - (a.criados * 3 + a.convidado) || b.views - a.views);
  alvo.innerHTML = `<p class="muted" style="margin-bottom:16px">Ordenado por projetos criados (valem 3) e participações como convidado (valem 1).</p>
    <div class="tabela-caixa"><table class="tabela"><thead><tr><th>#</th><th>Youtuber</th><th class="dir">Projetos criados</th><th class="dir">Participações</th><th class="dir esconde-movel">Episódios</th><th class="dir">Views dos projetos</th><th class="dir esconde-movel">Colaborou com</th></tr></thead>
    <tbody>${lista
      .map(
        (e, i) => `<tr onclick="location.hash='${linkPessoa(e.p)}'"><td class="pos">${i + 1}</td>
        <td><span class="quem">${avatar(e.p, 36)}<span><b>${esc(e.p.name)}</b><small>${esc(e.p.category || "")}</small></span></span></td>
        <td class="dir"><span class="valor-grande">${e.criados}</span></td><td class="dir">${e.convidado}</td>
        <td class="dir esconde-movel">${inteiro(e.eps)}</td><td class="dir">${curto(e.views)}</td><td class="dir esconde-movel">${plural(e.colegas.size, "pessoa", "pessoas")}</td></tr>`,
      )
      .join("")}</tbody></table></div>`;
}
