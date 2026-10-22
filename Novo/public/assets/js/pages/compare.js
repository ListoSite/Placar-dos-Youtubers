// Comparar até 4 Youtubers lado a lado.

import { estado, pessoa, indice, views, mediaMeses, recordes, procurar, projetosDe } from "../data.js";
import { esc, curto, inteiro, mesNome, decimal } from "../format.js";
import { avatar, linkPessoa, $, $$ } from "../ui.js";
import { linhasMensais, SERIES } from "../charts.js";
import { PARTES } from "../score.js";

export async function render(main, { query }) {
  main.dataset.titulo = "Comparar";
  let ids = (query.get("ids") || "").split(",").filter((id) => pessoa(id)).slice(0, 4);
  let pararGrafico = null;

  main.innerHTML = `<div class="wrap">
    <div class="pagina-topo"><h1>Comparar</h1><p>Escolhe até 4 Youtubers. Cada um fica com a sua cor em todos os gráficos.</p></div>
    <div class="filtros">
      <div id="cmp-escolhidos" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"></div>
      <div class="pesquisa" style="flex:1;min-width:220px">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input id="cmp-q" type="search" placeholder="Adicionar Youtuber" autocomplete="off" style="width:100%">
        <div class="pesquisa-lista" id="cmp-lista" style="left:0;right:auto"></div>
      </div>
      <button class="btn" id="cmp-aleatorio">Escolher ao acaso</button>
      <a class="btn btn-ouro" id="cmp-batalha" href="#/palco">Batalha no Palco</a>
    </div>
    <div id="cmp-conteudo"></div></div>`;

  const atualizar = () => {
    history.replaceState(null, "", "#/comparar" + (ids.length ? "?ids=" + ids.map(encodeURIComponent).join(",") : ""));
    $("#cmp-escolhidos", main).innerHTML = ids
      .map((id, i) => {
        const p = pessoa(id);
        return `<span class="etiqueta" style="height:36px;padding:0 6px 0 4px;gap:8px"><i style="width:10px;height:10px;border-radius:3px;background:${SERIES[i]};display:inline-block"></i>${avatar(p, 26)}<b style="color:var(--texto)">${esc(p.name)}</b><button class="btn-texto btn" data-tirar="${esc(id)}" aria-label="Tirar ${esc(p.name)}" style="padding:0 6px">✕</button></span>`;
      })
      .join("");
    $$("[data-tirar]", main).forEach((b) =>
      b.addEventListener("click", () => {
        ids = ids.filter((x) => x !== b.dataset.tirar);
        atualizar();
      }),
    );
    const bat = $("#cmp-batalha", main);
    bat.style.display = ids.length === 2 ? "" : "none";
    bat.href = `#/palco/batalha?a=${encodeURIComponent(ids[0] || "")}&b=${encodeURIComponent(ids[1] || "")}`;
    $("#cmp-q", main).disabled = ids.length >= 4;
    $("#cmp-q", main).placeholder = ids.length >= 4 ? "Máximo de 4" : "Adicionar Youtuber";
    if (pararGrafico) pararGrafico();
    pararGrafico = desenhar($("#cmp-conteudo", main), ids.map(pessoa));
  };

  const input = $("#cmp-q", main);
  const lista = $("#cmp-lista", main);
  input.addEventListener("input", () => {
    const r = procurar(input.value, 8).filter((p) => !ids.includes(p.id));
    lista.innerHTML = r.map((p) => `<button class="pesquisa-item" style="width:100%;border:0;background:none;text-align:left" data-id="${esc(p.id)}">${avatar(p, 30)}<span><b>${esc(p.name)}</b><small>${esc(p.category || "")}</small></span></button>`).join("");
    lista.classList.toggle("aberta", r.length > 0);
  });
  lista.addEventListener("click", (e) => {
    const b = e.target.closest("[data-id]");
    if (!b || ids.length >= 4) return;
    ids.push(b.dataset.id);
    input.value = "";
    lista.classList.remove("aberta");
    atualizar();
    input.focus();
  });
  $("#cmp-aleatorio", main).addEventListener("click", () => {
    const top = [...estado.posIndice.entries()].filter(([, p]) => p <= 120).map(([id]) => id);
    const escolha = [];
    while (escolha.length < 2 && top.length >= 2) {
      const id = top[Math.floor(Math.random() * top.length)];
      if (!escolha.includes(id)) escolha.push(id);
    }
    ids = escolha;
    atualizar();
  });
  atualizar();
  return () => pararGrafico && pararGrafico();
}

function desenhar(alvo, pessoas) {
  if (!pessoas.length) {
    alvo.innerHTML = `<div class="vazio"><h3>Escolhe quem queres comparar</h3><p>Procura um nome em cima ou deixa o site escolher dois ao acaso.</p></div>`;
    return null;
  }
  const ds = estado.ds;
  const ref = estado.ref;
  const primeiro = ds.months.find((m) => pessoas.some((p) => p.monthly[m]));
  const ultimo = [...ds.months].reverse().find((m) => m < ds.currentMonth && pessoas.some((p) => views(p, m) !== null));
  const meses = ds.months.filter((m) => m >= primeiro && m <= (ultimo || ds.currentMonth) && m < ds.currentMonth);
  const recs = pessoas.map(recordes);

  const linhas = [
    { nome: "Índice de Influência", v: (p) => indice(p.id).total, f: inteiro },
    { nome: `Views em ${mesNome(ref)}`, v: (p) => views(p, ref), f: curto },
    { nome: "Média de 3 meses", v: (p) => mediaMeses(p, ref, 3), f: curto },
    { nome: "Melhor mês", v: (p, i) => recs[i].melhor?.v ?? null, f: curto, extra: (p, i) => (recs[i].melhor ? mesNome(recs[i].melhor.m, { curto: true }) : "") },
    { nome: "Meses no top 10", v: (p, i) => recs[i].top10, f: inteiro },
    { nome: "Subscritores", v: (p) => p.totals?.subs ?? null, f: curto },
    { nome: "Views totais", v: (p) => p.totals?.views ?? null, f: curto },
    { nome: "Vídeos em 30 dias", v: (p) => p.vid?.up30 ?? null, f: inteiro },
    { nome: "Mediana de views por vídeo", v: (p) => p.vid?.med ?? null, f: curto },
    { nome: "Envolvimento (por 100 views)", v: (p) => (p.vid?.eng ? p.vid.eng * 100 : null), f: (x) => decimal(x, 1) },
    { nome: "Projetos", v: (p) => projetosDe(p.id).length, f: inteiro },
    { nome: "No YouTube desde", v: (p) => (p.since ? -new Date(p.since).getFullYear() : null), f: (x) => String(-x) },
  ];

  alvo.innerHTML = `
    <section class="secao" style="margin-top:12px"><div class="secao-cabeca"><div><h2>Views por mês</h2></div></div><div id="cmp-graf" class="vidro caixa-grafico"></div></section>
    <section class="secao"><div class="secao-cabeca"><div><h2>Frente a frente</h2><p>O melhor de cada linha fica a dourado.</p></div></div>
      <div class="tabela-caixa"><table class="tabela tabela-frente"><thead><tr><th></th>${pessoas.map((p, i) => `<th class="dir"><a href="${linkPessoa(p)}" style="color:var(--texto);display:inline-flex;align-items:center;gap:8px"><i style="width:10px;height:10px;border-radius:3px;background:${SERIES[i]};display:inline-block"></i>${esc(p.name)}</a></th>`).join("")}</tr></thead>
      <tbody>${linhas
        .map((l) => {
          const vals = pessoas.map((p, i) => l.v(p, i));
          const validos = vals.filter((v) => v !== null && v !== undefined);
          const max = validos.length > 1 ? Math.max(...validos) : null;
          return `<tr style="cursor:default"><td class="soft">${esc(l.nome)}</td>${vals
            .map((v, i) => `<td class="dir"><b class="placar" style="font-size:var(--t-lg);${max !== null && v === max ? "color:var(--ouro)" : ""}">${v === null || v === undefined ? "–" : esc(l.f(v))}</b>${l.extra ? `<br><small class="muted">${esc(l.extra(pessoas[i], i))}</small>` : ""}</td>`)
            .join("")}</tr>`;
        })
        .join("")}</tbody></table></div></section>
    <section class="secao"><div class="secao-cabeca"><div><h2>Partes do Índice</h2><p>De 0 a 100 em cada parte.</p></div></div>
      <div class="painel"><div class="legenda">${pessoas.map((p, i) => `<span><i style="background:${SERIES[i]}"></i>${esc(p.name)}</span>`).join("")}</div>
      <div class="partes">${PARTES.map(
        (pt) => `<div><div class="soft" style="font-size:var(--t-sm);margin-bottom:6px">${pt.nome}</div>${pessoas
          .map((p, i) => {
            const v = indice(p.id).partes[pt.id];
            return `<div class="parte" style="grid-template-columns:minmax(0,1fr) 40px;margin-bottom:4px"><div class="trilho" style="height:8px"><i style="width:${v ? (v.s * 100).toFixed(0) : 0}%;background:${SERIES[i]}"></i></div><b class="num" style="text-align:right;font-size:var(--t-xs)">${v ? Math.round(v.s * 100) : "–"}</b></div>`;
          })
          .join("")}</div>`,
      ).join("")}</div></div></section>`;

  return linhasMensais(
    $("#cmp-graf", alvo),
    pessoas.map((p, i) => ({ nome: p.name, cor: SERIES[i], pontos: meses.map((m) => ({ m, v: views(p, m) })) })),
    meses,
  );
}
