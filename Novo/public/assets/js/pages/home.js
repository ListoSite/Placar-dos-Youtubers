// Página inicial: o placar do mês, as grandes perguntas, subidas e descidas, categorias.

import { estado, rankingMes, indice, mesesComDados, cobertura, views } from "../data.js";
import { esc, curto, inteiro, mesNome, mesNomeMaiuscula, pct, anos, plural } from "../format.js";
import { avatar, linkPessoa, movimento, contar, $, $$ } from "../ui.js";
import { som } from "../audio.js";
import { grelhaPontos, luzQueSegue, tituloEmLinhas, placarEntra, saltar } from "../motion.js";
import { cartaoProjeto } from "./projects.js";

export async function render(main) {
  const ds = estado.ds;
  const meses = mesesComDados(5).filter((m) => m < ds.currentMonth);
  let mes = estado.ref;
  main.dataset.titulo = "";

  main.innerHTML = `
    <section class="heroi">
      <div class="pontos" aria-hidden="true"></div>
      <div class="heroi-luz" aria-hidden="true"></div>
      <div class="wrap heroi-grelha">
        <div class="heroi-titulo">
          <h1><span class="linha-titulo"><span>O placar</span></span><span class="linha-titulo"><span class="grad">do mês</span></span></h1>
          <p>Quantas views fez cada Youtuber português num mês. Dados do YouTube e do Social Blade, recolhidos todos os dias.</p>
          <div class="mes-escolha">
            <button class="botao-icone" data-mes="-1" aria-label="Mês anterior"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 6-6 6 6 6"/></svg></button>
            <strong id="mes-atual" aria-live="polite"></strong>
            <button class="botao-icone" data-mes="1" aria-label="Mês seguinte"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 6 6 6-6 6"/></svg></button>
          </div>
          <p class="muted" id="mes-cobertura" style="margin-top:10px;font-size:var(--t-sm)"></p>
          <p style="margin-top:18px;display:flex;gap:10px;flex-wrap:wrap">
            <a class="btn btn-primario" id="ver-ranking" href="#/ranking">Ver o ranking completo</a>
            <a class="btn" href="#/palco/revelacao">Revelar no Palco</a>
          </p>
        </div>
        <div class="quadro podio" id="quadro" aria-label="Top 10 do mês"></div>
      </div>
    </section>
    <div class="wrap">
      ${avisoDados()}
      <section class="secao">
        <div class="secao-cabeca"><div><h2>As grandes perguntas</h2><p>Respostas calculadas com os dados de ${esc(mesNome(estado.ref))} e o Índice de Influência.</p></div></div>
        <div class="perguntas" id="perguntas"></div>
      </section>
      <section class="secao" id="movimentos"></section>
      <section class="secao" id="categorias"></section>
      <section class="secao" id="projetos-destaque"></section>
    </div>`;

  const desenharQuadro = (animarSom) => {
    $("#mes-atual", main).textContent = mesNomeMaiuscula(mes);
    const n = cobertura(mes);
    $("#mes-cobertura", main).textContent = `${plural(n, "Youtuber", "Youtubers")} com dados neste mês.`;
    $("#ver-ranking", main).href = `#/ranking?m=${mes}`;
    const lista = rankingMes(mes).slice(0, 10);
    const max = lista[0]?.v || 1;
    const quadro = $("#quadro", main);
    quadro.innerHTML = lista
      .map(
        (x) => `<a class="quadro-linha" href="${linkPessoa(x.p)}">
          <span class="barra-fundo" style="width:100%;transform:scaleX(0)" data-k="${x.v / max}"></span>
          <span class="quadro-pos">${x.pos}</span>
          ${avatar(x.p, 40)}
          <span class="quadro-nome"><b>${esc(x.p.name)}</b><small>${esc(x.p.category || "")}</small></span>
          <span class="quadro-valor"><span data-v="${x.v}">${curto(x.v)}</span><small>views</small></span>
          ${movimento(x.pos, x.ant)}
        </a>`,
      )
      .join("");
    placarEntra(quadro);
    $$("[data-v]", quadro).forEach((el, i) => contar(el, Number(el.dataset.v), { atraso: 150 + i * 55 }));
    if (animarSom) lista.forEach((_, i) => som.tocar("virar", {}, i * 0.06));
    const i = meses.indexOf(mes);
    $('[data-mes="-1"]', main).disabled = i <= 0;
    $('[data-mes="1"]', main).disabled = i >= meses.length - 1;
  };

  $$("[data-mes]", main).forEach((b) =>
    b.addEventListener("click", () => {
      const i = meses.indexOf(mes) + Number(b.dataset.mes);
      if (i < 0 || i >= meses.length) return;
      mes = meses[i];
      pontos.onda(Number(b.dataset.mes) < 0 ? "first" : "last");
      saltar($("#mes-atual", main));
      desenharQuadro(true);
    }),
  );
  const pontos = grelhaPontos($(".pontos", main), { colunas: innerWidth < 700 ? 14 : 30, linhas: innerWidth < 700 ? 18 : 12 });
  const pararLuz = luzQueSegue($(".heroi", main), $(".heroi-luz", main));
  tituloEmLinhas($(".heroi-titulo h1", main));
  desenharQuadro(false);

  $("#perguntas", main).innerHTML = perguntas().join("");
  $("#movimentos", main).innerHTML = movimentos();
  $("#categorias", main).innerHTML = categorias();
  $("#projetos-destaque", main).innerHTML = projetosDestaque();
  return () => {
    pontos.parar();
    pararLuz();
  };
}

function avisoDados() {
  const ds = estado.ds;
  const [ry, rm] = estado.ref.split("-").map(Number);
  const [cy, cm] = ds.currentMonth.split("-").map(Number);
  const atraso = (cy - ry) * 12 + (cm - rm);
  if (atraso <= 2) return "";
  return `<div class="aviso info" style="margin-top:28px"><p>Os dados mais completos são de <b>${esc(mesNome(estado.ref))}</b>. Os meses seguintes vão sendo preenchidos pela recolha automática do YouTube e pelas importações do Social Blade.</p></div>`;
}

function resposta(p, valor, legenda) {
  if (!p) return `<span class="muted">Ainda sem dados suficientes.</span>`;
  return `<a class="pergunta-resposta" href="${linkPessoa(p)}">
    ${avatar(p, 56)}
    <span><b>${esc(p.name)}</b><span class="muted">${esc(p.category || "")}</span></span>
    <span class="placar">${valor}<small>${legenda}</small></span>
  </a>`;
}

function maiorPor(f, filtro = () => true) {
  let melhor = null;
  let mv = -Infinity;
  for (const p of estado.ds.people) {
    if (!filtro(p)) continue;
    const v = f(p);
    if (v !== null && v !== undefined && Number.isFinite(v) && v > mv) {
      mv = v;
      melhor = p;
    }
  }
  return melhor ? { p: melhor, v: mv } : null;
}

function perguntas() {
  const ref = estado.ref;
  const out = [];
  const q = (titulo, html) => out.push(`<div class="pergunta"><h3>${titulo}</h3>${html}</div>`);

  const top = maiorPor((p) => indice(p.id).total);
  q("Quem é o maior Youtuber de Portugal?", resposta(top?.p, top ? inteiro(top.v) : "", "Índice de Influência"));

  const mes = rankingMes(ref)[0];
  q(`Quem fez mais views em ${esc(mesNome(ref, { ano: false }))}?`, resposta(mes?.p, mes ? curto(mes.v) : "", `views em ${esc(mesNome(ref))}`));

  const total = maiorPor((p) => p.totals?.views);
  q("Quem tem mais views no total?", resposta(total?.p, total ? curto(total.v) : "", "views desde sempre"));

  const subs = maiorPor((p) => p.totals?.subs);
  q("Quem tem mais subscritores?", resposta(subs?.p, subs ? curto(subs.v) : "", "subscritores"));

  const cresce = maiorPor(
    (p) => indice(p.id).partes.momento?.info.r ?? null,
    (p) => (indice(p.id).partes.momento?.info.antes || 0) >= 50000,
  );
  q("Quem está a crescer mais?", resposta(cresce?.p, cresce ? pct(cresce.v - 1, { sinal: true }) : "", "últimos 3 meses face aos 3 anteriores"));

  const constante = maiorPor(
    (p) => indice(p.id).partes.constancia?.s ?? null,
    (p) => (indice(p.id).partes.alcance?.info.media || 0) >= 100000 && (indice(p.id).partes.constancia?.info.meses || 0) >= 6,
  );
  if (constante) {
    const cv = indice(constante.p.id).partes.constancia.info.cv;
    q("Quem é o mais constante?", resposta(constante.p, "±" + pct(cv), "de variação típica entre meses"));
  }

  const publica = maiorPor((p) => p.vid?.up30 ?? null);
  if (publica) q("Quem publica mais vídeos?", resposta(publica.p, inteiro(publica.v), "vídeos nos últimos 30 dias"));

  const antigo = maiorPor(
    (p) => anos(p.since),
    (p) => views(p, ref) > 0 && p.since,
  );
  if (antigo) q("Quem está há mais tempo no YouTube e continua ativo?", resposta(antigo.p, String(new Date(antigo.p.since).getFullYear()), "ano em que começou"));
  return out;
}

function movimentos() {
  const ref = estado.ref;
  const r = rankingMes(ref).filter((x) => x.ant !== null && (x.pos <= 150 || x.ant <= 150));
  if (r.length < 6) return "";
  const sobem = [...r].sort((a, b) => b.ant - b.pos - (a.ant - a.pos)).slice(0, 5);
  const descem = [...r].sort((a, b) => a.ant - a.pos - (b.ant - b.pos)).slice(0, 5);
  const linha = (x) => `<a class="quadro-linha" href="${linkPessoa(x.p)}" style="grid-template-columns:52px 36px minmax(0,1fr) auto">
      <span class="quadro-pos">${x.pos}</span>${avatar(x.p, 36)}
      <span class="quadro-nome"><b style="font-size:var(--t-base)">${esc(x.p.name)}</b><small>era ${x.ant}.º, ${curto(x.v)} views</small></span>
      ${movimento(x.pos, x.ant)}</a>`;
  return `<div class="secao-cabeca"><div><h2>Subidas e descidas</h2><p>Lugares ganhos e perdidos em ${esc(mesNome(ref))} face ao mês anterior.</p></div></div>
    <div class="grelha-2">
      <div class="quadro"><h3 style="padding:10px 12px 6px;font-size:var(--t-base)" class="soft">Os que mais subiram</h3>${sobem.map(linha).join("")}</div>
      <div class="quadro"><h3 style="padding:10px 12px 6px;font-size:var(--t-base)" class="soft">Os que mais desceram</h3>${descem.map(linha).join("")}</div>
    </div>`;
}

function categorias() {
  const ref = estado.ref;
  const mapa = new Map();
  for (const x of rankingMes(ref)) {
    const c = x.p.category || "Sem categoria";
    const e = mapa.get(c) || { c, v: 0, n: 0, top: x.p };
    e.v += x.v;
    e.n++;
    mapa.set(c, e);
  }
  const lista = [...mapa.values()].sort((a, b) => b.v - a.v).slice(0, 10);
  if (!lista.length) return "";
  const total = [...mapa.values()].reduce((a, b) => a + b.v, 0);
  const max = lista[0].v;
  return `<div class="secao-cabeca"><div><h2>Que tipo de conteúdo faz mais views</h2><p>Views de ${esc(mesNome(ref))} somadas por categoria.</p></div><a class="btn" href="#/categorias">Todas as categorias</a></div>
    <div class="tabela-caixa"><table class="tabela"><thead><tr><th>Categoria</th><th class="esconde-movel">Youtubers</th><th>Views no mês</th><th class="dir">Parte do total</th><th class="esconde-movel">Quem lidera</th></tr></thead><tbody>
    ${lista
      .map(
        (e) => `<tr onclick="location.hash='#/ranking?cat=${encodeURIComponent(e.c)}&m=${ref}'">
        <td><b>${esc(e.c)}</b></td><td class="esconde-movel">${e.n}</td>
        <td><div class="mini-barra"><span style="min-width:72px;text-align:left">${curto(e.v)}</span><div class="trilho"><i style="width:${((e.v / max) * 100).toFixed(1)}%;background:var(--rubi)"></i></div></div></td>
        <td class="dir">${pct(e.v / total, { casas: 1 })}</td>
        <td class="esconde-movel"><span class="quem">${avatar(e.top, 28)}<span>${esc(e.top.name)}</span></span></td></tr>`,
      )
      .join("")}
    </tbody></table></div>`;
}

function projetosDestaque() {
  const lista = [...estado.ds.projects].filter((p) => p.totalViews).sort((a, b) => (b.impact || 0) - (a.impact || 0) || b.totalViews - a.totalViews).slice(0, 4);
  if (!lista.length) {
    return `<div class="secao-cabeca"><div><h2>Projetos</h2><p>Séries e conteúdos grandes de cada Youtuber, com as views de cada episódio.</p></div></div>
      <div class="vazio"><h3>Ainda não há projetos</h3><p>Adiciona uma série a partir de uma playlist do YouTube na área de edição.</p><a class="btn btn-primario" href="#/editar/projetos">Adicionar projeto</a></div>`;
  }
  return `<div class="secao-cabeca"><div><h2>Projetos que mais se destacaram</h2><p>Séries com mais views por episódio face ao normal do canal.</p></div><a class="btn" href="#/projetos">Ver todos os projetos</a></div>
    <div class="projetos-grelha">${lista.map(cartaoProjeto).join("")}</div>`;
}

