// Perfil de um Youtuber.

import { estado, pessoa, indice, views, serieMensal, rankingMes, recordes, projetosDe, canaisDe, mediaMeses, api, temSessao } from "../data.js";
import { esc, curto, inteiro, mesNome, pct, data, ha, decimal, duracao, plural } from "../format.js";
import { avatar, linkPessoa, etiquetaCategoria, ICONES, REDES, $, vazio, variacao, contar } from "../ui.js";
import { barrasMensais, barrasDiarias } from "../charts.js";
import { PARTES } from "../score.js";
import { cartaoProjeto } from "./projects.js";
import { encher } from "../motion.js";

export async function render(main, { params }) {
  const p = pessoa(params[0]);
  if (!p) {
    main.innerHTML = `<div class="wrap pagina-topo"><h1>Youtuber não encontrado</h1><p>Pode ter sido removido ou mudado de nome. <a href="#/ranking">Ver o ranking</a>.</p></div>`;
    return;
  }
  main.dataset.titulo = p.name;
  const ds = estado.ds;
  const ind = indice(p.id);
  const pos = estado.posIndice.get(p.id);
  const ref = estado.ref;
  const vRef = views(p, ref);
  const rRef = rankingMes(ref);
  const posRef = rRef.find((x) => x.p.id === p.id);
  const canais = canaisDe(p);
  const main1 = canais[0];
  const rec = recordes(p);
  const media3 = mediaMeses(p, ref, 3);
  const projetos = projetosDe(p.id);
  const classica = estado.classica.get(p.id);
  const parcial = p.monthly[ds.currentMonth];

  const limpeza = [];
  main.innerHTML = `
    <section class="perfil-capa">
      ${p.banner ? `<div class="fundo" style="background-image:url('${esc(p.banner)}')"></div>` : `<div class="fundo calcada" style="opacity:1"></div>`}
      <div class="wrap">
        <div class="perfil-cabeca">
          ${avatar(p, 128)}
          <div>
            <h1>${esc(p.name)}</h1>
            <div class="perfil-linha">
              ${etiquetaCategoria(p.category)}
              ${p.realName ? `<span class="soft">${esc(p.realName)}</span>` : ""}
              ${p.location ? `<span class="muted">${esc(p.location)}</span>` : ""}
              ${p.status && p.status !== "ativo" ? `<span class="etiqueta">${esc(p.status === "pausa" ? "Em pausa" : p.status)}</span>` : ""}
              ${p.tags.map((t) => `<span class="etiqueta azul">${esc(t)}</span>`).join("")}
            </div>
            <div class="perfil-linha">
              ${main1 ? `<a class="btn btn-pequeno" href="https://www.youtube.com/channel/${esc(main1.id)}" target="_blank" rel="noopener">${ICONES.youtube} ${esc(main1.handle || "Canal")}</a>` : ""}
              <a class="btn btn-pequeno" href="#/comparar?ids=${encodeURIComponent(p.id)}">Comparar</a>
              <a class="btn btn-pequeno" href="#/palco/cartao?id=${encodeURIComponent(p.id)}">Mostrar no Palco</a>
              ${temSessao() ? `<a class="btn btn-pequeno" href="#/editar/youtubers?id=${encodeURIComponent(p.id)}">Editar</a>` : ""}
            </div>
          </div>
          <div class="perfil-indice">
            ${ind.total !== null ? `<span class="placar" id="ind-num">${inteiro(ind.total)}</span><span>Índice de Influência${pos ? `, ${pos}.º em Portugal` : ""}</span>` : `<span class="muted">Ainda sem dados para o Índice</span>`}
          </div>
        </div>
      </div>
    </section>
    <div class="wrap">
      ${p.bio ? `<p class="soft" style="margin-top:24px;font-size:var(--t-md)">${esc(p.bio)}</p>` : ""}
      <div class="numeros" style="margin-top:28px">
        <div class="numero"><span>Views em ${esc(mesNome(ref))}</span><strong>${curto(vRef)}</strong><small>${posRef ? `${posRef.pos}.º lugar ` : ""}${variacao(vRef, views(p, estado.ds.months[estado.ds.months.indexOf(ref) - 1] || ""))}</small></div>
        ${parcial ? `<div class="numero"><span>Este mês (até agora)</span><strong>${curto(parcial.v)}</strong><small>projeção ${curto(parcial.est)}</small></div>` : ""}
        <div class="numero"><span>Média de 3 meses</span><strong>${curto(media3)}</strong><small>views por mês</small></div>
        <div class="numero"><span>Subscritores</span><strong>${curto(p.totals?.subs)}</strong><small>${p.totals?.src === "folha" ? "valor da folha antiga" : canais.filter((c) => c.count).length > 1 ? `em ${canais.filter((c) => c.count).length} canais` : ""}</small></div>
        <div class="numero"><span>Views totais</span><strong>${curto(p.totals?.views)}</strong><small>${p.totals?.videos ? plural(p.totals.videos, "vídeo", "vídeos") : ""}</small></div>
        <div class="numero"><span>No YouTube desde</span><strong>${p.since ? new Date(p.since).getFullYear() : "–"}</strong><small>${p.since ? data(p.since) : ""}</small></div>
      </div>

      <section class="secao">
        <div class="secao-cabeca"><div><h2>Views por mês</h2><p>Views ganhas em cada mês, somando os canais principais${canais.some((c) => !c.count) ? " (canais de clips não contam)" : ""}.</p></div></div>
        <div id="g-mensal" class="vidro caixa-grafico"></div>
      </section>

      <section class="secao" id="sec-diario" hidden>
        <div class="secao-cabeca"><div><h2>Últimos dias</h2><p>Views ganhas por dia no canal principal, medidas pela recolha diária.</p></div></div>
        <div id="g-diario" class="vidro caixa-grafico"></div>
      </section>

      <section class="secao grelha-2">
        <div class="painel">
          <h3>Como se calcula o Índice</h3>
          <p class="muted">Cada parte vale de 0 a 100. O Índice é a média com pesos, de 0 a 1000.${ind.cobertura && ind.cobertura < 0.99 ? " Partes sem dados não entram nas contas." : ""}</p>
          <div class="partes">${PARTES.map((pt) => {
            const v = ind.partes[pt.id];
            return `<div class="parte"><span>${pt.nome}</span><div class="trilho${v ? "" : " sem"}"><i style="width:${v ? (v.s * 100).toFixed(0) : 0}%"></i></div><b class="num" style="text-align:right">${v ? Math.round(v.s * 100) : "–"}</b><small>${esc(explicacao(pt.id, v))}</small></div>`;
          }).join("")}</div>
          ${classica ? `<p class="muted" style="margin:18px 0 0;font-size:var(--t-sm)">Pontuação clássica (fórmula da folha antiga): <b class="soft">${inteiro(classica)}</b>${p.legacy?.pontuacao ? `, na folha estava ${inteiro(p.legacy.pontuacao)}` : ""}.</p>` : ""}
        </div>
        <div class="painel">
          <h3>Recordes</h3>
          <p class="muted">Desde que há dados${ds.months[0] ? `, a partir de ${esc(mesNome(ds.months[0]))}` : ""}.</p>
          <div class="recordes">
            <div class="recorde"><span>Melhor mês</span><strong>${rec.melhor ? curto(rec.melhor.v) : "–"}</strong><br><small class="muted">${rec.melhor ? esc(mesNome(rec.melhor.m)) : ""}</small></div>
            <div class="recorde"><span>Melhor posição</span><strong>${rec.melhorPos ? rec.melhorPos.pos + ".º" : "–"}</strong><br><small class="muted">${rec.melhorPos ? esc(mesNome(rec.melhorPos.m)) : ""}</small></div>
            <div class="recorde"><span>Meses no top 10</span><strong>${rec.top10}</strong></div>
            <div class="recorde"><span>Meses no top 50</span><strong>${rec.top50}</strong></div>
            ${p.vid ? `<div class="recorde"><span>Vídeos em 30 dias</span><strong>${p.vid.up30}</strong></div><div class="recorde"><span>Último vídeo</span><strong style="font-size:var(--t-lg)">${esc(ha(p.vid.last))}</strong></div>` : ""}
          </div>
        </div>
      </section>

      <section class="secao" id="sec-videos" hidden>
        <div class="secao-cabeca"><div><h2>Vídeos recentes</h2><p id="videos-resumo"></p></div></div>
        <div class="videos-grelha" id="videos"></div>
      </section>

      ${canais.length ? `<section class="secao"><div class="secao-cabeca"><div><h2>Canais</h2><p>Todos os canais desta pessoa. Os canais de clips não somam nas views.</p></div></div>
        <div class="painel canal-lista">${canais
          .map(
            (c) => `<div class="canal">${avatar({ name: c.title, photo: c.thumb }, 44)}
            <div><b>${esc(c.title)}</b><small class="muted">${esc([c.handle, "canal " + c.role, c.count ? "" : "não conta nas somas", c.country ? "país " + c.country : "", c.missing ? "canal indisponível" : ""].filter(Boolean).join(", "))}</small></div>
            <div class="canal-num"><b>${curto(c.subs)}</b> subs<br><span class="muted">${curto(c.views)} views</span></div>
            <a class="botao-icone" href="https://www.youtube.com/channel/${esc(c.id)}" target="_blank" rel="noopener" aria-label="Abrir ${esc(c.title)} no YouTube">${ICONES.youtube}</a></div>`,
          )
          .join("")}</div></section>`
        : ""}

      ${redesHtml(p)}

      ${projetos.length ? `<section class="secao"><div class="secao-cabeca"><div><h2>Projetos</h2><p>Séries e conteúdos grandes em que participou.</p></div></div><div class="projetos-grelha">${projetos.map(cartaoProjeto).join("")}</div></section>` : ""}
    </div>`;

  encher(main.querySelectorAll(".parte .trilho i"));
  const num = $("#ind-num", main);
  if (num) contar(num, ind.total, { formato: inteiro, duracao: 1300 });

  const serie = serieMensal(p).filter((s, i, arr) => s.tem || arr.slice(0, i).some((x) => x.tem));
  if (serie.some((s) => s.tem)) limpeza.push(barrasMensais($("#g-mensal", main), serie, { destaque: rec.melhor?.m }));
  else $("#g-mensal", main).innerHTML = vazio("Ainda sem views por mês", "Liga o canal do YouTube ou importa os dados do Social Blade na área de edição.");

  if (main1) {
    carregarDiario(main, main1, limpeza);
    carregarVideos(main, main1);
  }
  return () => limpeza.forEach((f) => f && f());
}

function explicacao(id, v) {
  if (!v) return "Sem dados para esta parte.";
  const i = v.info || {};
  switch (id) {
    case "alcance":
      return `Média de ${curto(i.media)} views por mês nos últimos meses com dados.`;
    case "constancia":
      return i.meses > 1 ? `${Math.round(i.ativos * i.meses)} de ${i.meses} meses com views, variação típica de ±${pct(i.cv)}.` : "Só há um mês com dados.";
    case "atividade":
      return i.aprox ? "Estimado pelas views dos últimos meses (falta ligar o canal)." : `${i.up90} vídeos em 90 dias, último há ${i.dias} dias.`;
    case "momento":
      return `Últimos 3 meses ${i.r >= 1 ? "+" : ""}${pct(i.r - 1)} face aos 3 anteriores.`;
    case "historico":
      return `${curto(i.subs)} subscritores e ${curto(i.views)} views no total.`;
    case "envolvimento":
      return `${decimal(i.eng * 100, 1)} gostos e comentários por cada 100 views.`;
    default:
      return "";
  }
}

function redesHtml(p) {
  const itens = REDES.filter((r) => p.socials?.[r.id]?.url || p.socials?.[r.id]?.last);
  if (!itens.length) return "";
  return `<section class="secao"><div class="secao-cabeca"><div><h2>Outras redes</h2><p>Números atualizados à mão na área de edição.</p></div></div>
    <div class="redes">${itens
      .map((r) => {
        const s = p.socials[r.id];
        const last = s.last;
        const prev = s.entries.length > 1 ? s.entries[s.entries.length - 2] : null;
        return `<a class="rede" ${s.url ? `href="${esc(s.url)}" target="_blank" rel="noopener"` : ""}>${ICONES[r.id] || ""}
          <span><strong>${last?.followers ? curto(last.followers) : r.nome}</strong><small>${last?.followers ? `${r.seguidores} no ${r.nome}` : "Ver perfil"}${prev?.followers && last?.followers ? ` ${variacao(last.followers, prev.followers)}` : ""}${last?.date ? `<br>${esc(data(last.date))}` : ""}</small></span></a>`;
      })
      .join("")}</div></section>`;
}

async function carregarDiario(main, canal, limpeza) {
  try {
    const d = await api(`daily?channels=${canal.id}&months=3`);
    const meses = d[canal.id] || {};
    const pontos = [];
    for (const m of Object.keys(meses).sort()) {
      for (const dia of Object.keys(meses[m]).map(Number).sort((a, b) => a - b)) pontos.push({ d: `${m}-${String(dia).padStart(2, "0")}`, total: meses[m][dia][0] });
    }
    const diarios = [];
    for (let i = 1; i < pontos.length; i++) {
      const dias = (Date.parse(pontos[i].d) - Date.parse(pontos[i - 1].d)) / 86400000;
      if (dias === 1) diarios.push({ d: pontos[i].d, v: Math.max(0, pontos[i].total - pontos[i - 1].total) });
    }
    if (diarios.length < 5 || !document.body.contains(main)) return;
    $("#sec-diario", main).hidden = false;
    limpeza.push(barrasDiarias($("#g-diario", main), diarios.slice(-60)));
  } catch {
    /* sem dados diários */
  }
}

async function carregarVideos(main, canal) {
  try {
    const r = await api(`videos?channel=${canal.id}`);
    const items = r.items || [];
    if (!items.length || !document.body.contains(main)) return;
    $("#sec-videos", main).hidden = false;
    const v = canal.vid;
    $("#videos-resumo", main).textContent = v
      ? `Mediana de ${curto(v.med)} views por vídeo${v.medShort ? ` (Shorts: ${curto(v.medShort)})` : ""}. ${v.up90} vídeos nos últimos 90 dias${v.sh90 ? `, ${v.sh90} deles Shorts` : ""}${v.gap ? `, em média um a cada ${decimal(v.gap, 1)} dias` : ""}.`
      : "";
    $("#videos", main).innerHTML = items
      .slice(0, 12)
      .map(
        (x) => `<a class="video" href="https://www.youtube.com/watch?v=${esc(x.id)}" target="_blank" rel="noopener">
        <div class="miniatura">${x.th ? `<img src="${esc(x.th)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ""}<span class="etiqueta">${x.s ? "Short" : x.live ? "Direto" : duracao(x.d)}</span></div>
        <b>${esc(x.t)}</b><small>${curto(x.v)} views, ${esc(ha(x.p))}</small></a>`,
      )
      .join("");
  } catch {
    /* sem vídeos */
  }
}
