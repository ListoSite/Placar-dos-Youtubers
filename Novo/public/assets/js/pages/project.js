// Página de um projeto: episódios, impacto face ao canal, quem participou.

import { estado, pessoa, temSessao } from "../data.js";
import { esc, curto, inteiro, data, ha, duracao, decimal, plural, pct } from "../format.js";
import { avatar, linkPessoa, $ } from "../ui.js";
import { barrasEpisodios } from "../charts.js";
import { impactoTexto } from "./projects.js";

export async function render(main, { params }) {
  const pr = estado.projetos.get(params[0]);
  if (!pr) {
    main.innerHTML = `<div class="wrap pagina-topo"><h1>Projeto não encontrado</h1><p><a href="#/projetos">Ver todos os projetos</a></p></div>`;
    return;
  }
  main.dataset.titulo = pr.name;
  const criador = pessoa(pr.personId);
  const convidados = pr.guests.map(pessoa).filter(Boolean);
  const ranking = [...estado.ds.projects].sort((a, b) => b.totalViews - a.totalViews);
  const posViews = ranking.findIndex((x) => x.id === pr.id) + 1;
  const estrelas = (n) => (n ? "★".repeat(Math.round(n / 2)) + "☆".repeat(5 - Math.round(n / 2)) : "");
  const vids = pr.videos || [];
  const melhor = vids.length ? vids.reduce((a, v) => (v.v > a.v ? v : a)) : null;
  const queda = vids.length >= 3 ? vids[vids.length - 1].v / vids[0].v - 1 : null;

  main.innerHTML = `
    <section class="perfil-capa" style="min-height:260px">
      ${pr.cover ? `<div class="fundo" style="background-image:url('${esc(pr.cover)}');opacity:.3"></div>` : `<div class="fundo calcada" style="opacity:1"></div>`}
      <div class="wrap">
        <p class="soft" style="margin-bottom:8px"><a href="#/projetos">Projetos</a> / ${esc(pr.type || "série")}</p>
        <h1 class="placar" style="font-size:clamp(2.4rem,6vw,var(--t-4xl));text-transform:uppercase">${esc(pr.name)}</h1>
        <div class="perfil-linha">
          ${criador ? `<a class="etiqueta" href="${linkPessoa(criador)}">${avatar(criador, 18)} Criado por ${esc(criador.name)}</a>` : ""}
          ${pr.impact ? `<span class="etiqueta ${pr.impact >= 1 ? "ouro" : ""}">${esc(impactoTexto(pr.impact))}</span>` : ""}
          ${pr.ratings?.main ? `<span class="estrelas" title="Avaliação ${pr.ratings.main}/10">${estrelas(pr.ratings.main)}</span>` : ""}
          ${temSessao() ? `<a class="btn btn-pequeno" href="#/editar/projetos?id=${encodeURIComponent(pr.id)}">Editar</a>` : ""}
        </div>
      </div>
    </section>
    <div class="wrap">
      ${pr.description ? `<p class="soft" style="margin-top:24px;font-size:var(--t-md)">${esc(pr.description)}</p>` : ""}
      <div class="numeros" style="margin-top:28px">
        <div class="numero"><span>Views totais</span><strong>${curto(pr.totalViews)}</strong><small>${posViews}.º projeto com mais views</small></div>
        <div class="numero"><span>Episódios</span><strong>${inteiro(pr.episodes)}</strong><small>${pr.duration ? `${decimal(pr.duration / 3600, 1)} horas no total` : ""}</small></div>
        <div class="numero"><span>Média por episódio</span><strong>${curto(pr.avgViews)}</strong><small>${pr.baseline ? `o normal do canal é ${curto(pr.baseline)}` : ""}</small></div>
        ${pr.likes ? `<div class="numero"><span>Gostos e comentários</span><strong>${curto(pr.likes + pr.comments)}</strong><small>${decimal(((pr.likes + pr.comments) / Math.max(1, pr.totalViews)) * 100, 1)} por cada 100 views</small></div>` : ""}
        <div class="numero"><span>Lançado</span><strong>${pr.first ? new Date(pr.first).getFullYear() : pr.year || "–"}</strong><small>${pr.first ? `${data(pr.first)}${pr.last && pr.last !== pr.first ? ` a ${data(pr.last)}` : ""}` : ""}</small></div>
      </div>

      ${vids.length ? `<section class="secao"><div class="secao-cabeca"><div><h2>Views de cada episódio</h2><p>${melhor ? `O episódio mais visto é “${esc(melhor.t)}” com ${curto(melhor.v)} views.` : ""}${queda !== null ? ` Do primeiro ao último episódio, as views ${queda >= 0 ? "subiram" : "desceram"} ${pct(Math.abs(queda))}.` : ""} Clica numa barra para abrir o vídeo.</p></div></div><div id="g-ep" class="vidro caixa-grafico"></div></section>` : `<div class="aviso info" style="margin-top:28px"><p>Este projeto tem números escritos à mão. Para ter as views de cada episódio, liga-o a uma playlist do YouTube na área de edição.</p></div>`}

      <section class="secao grelha-2">
        <div class="painel">
          <h3>Quem participou</h3>
          <p class="muted">${plural(1 + convidados.length, "pessoa", "pessoas")} neste projeto.</p>
          <div class="canal-lista">
            ${criador ? linhaPessoa(criador, "Criador") : ""}
            ${convidados.map((g) => linhaPessoa(g, "Convidado")).join("")}
          </div>
        </div>
        ${pr.ratings?.individual?.length ? `<div class="painel"><h3>Avaliações</h3><p class="muted">Notas de 0 a 10.</p><div class="canal-lista">${pr.ratings.individual.map((r) => `<div class="canal"><b>${esc(r.name)}</b><span class="canal-num"><span class="estrelas">${estrelas(r.rating)}</span> ${r.rating}/10</span></div>`).join("")}</div></div>` : ""}
      </section>

      ${vids.length ? `<section class="secao"><div class="secao-cabeca"><div><h2>Episódios</h2><p>${pr.at ? `Números do YouTube atualizados ${esc(ha(pr.at))}.` : ""}</p></div></div>
        <div class="tabela-caixa"><table class="tabela"><thead><tr><th>Ep.</th><th>Título</th><th class="dir">Views</th><th class="dir esconde-movel">Gostos</th><th class="dir esconde-movel">Duração</th><th class="dir esconde-movel">Publicado</th></tr></thead>
        <tbody>${vids.map((v, i) => `<tr onclick="window.open('https://www.youtube.com/watch?v=${esc(v.id)}','_blank','noopener')"><td class="pos">${i + 1}</td><td>${esc(v.t)}</td><td class="dir"><b>${inteiro(v.v)}</b></td><td class="dir esconde-movel">${inteiro(v.l)}</td><td class="dir esconde-movel">${duracao(v.d)}</td><td class="dir esconde-movel">${data(v.p)}</td></tr>`).join("")}</tbody></table></div></section>` : ""}
    </div>`;

  if (vids.length) return barrasEpisodios($("#g-ep", main), vids, { base: pr.baseline });
}

function linhaPessoa(p, papel) {
  return `<a class="canal" href="${linkPessoa(p)}" style="color:inherit;text-decoration:none">${avatar(p, 40)}<div><b>${esc(p.name)}</b><small class="muted">${papel}</small></div><div class="canal-num">${p.totals?.subs ? `<b>${curto(p.totals.subs)}</b> subs` : ""}</div></a>`;
}
