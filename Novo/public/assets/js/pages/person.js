// Perfil de um Youtuber, ou de um dos seus canais visto à parte (pages/channel.js).

import { estado, pessoa, indice, views, serieMensal, rankingMes, recordes, projetosDe, canaisDe, mediaMeses, api, temSessao, indiceCanal, posicaoCanal } from "../data.js";
import { esc, curto, inteiro, mesNome, pct, data, ha, decimal, duracao, plural } from "../format.js";
import { avatar, linkPessoa, etiquetaCategoria, ICONES, REDES, $, vazio, variacao, contar } from "../ui.js";
import { barrasMensais, barrasDiarias, barrasSimples } from "../charts.js";
import { PARTES, pontuacaoClassica } from "../score.js";
import { ligacaoCanal } from "../publico/comum.js";
import { cartaoProjeto } from "./projects.js";
import { encher } from "../motion.js";
import { carregarHistorico, dadosPessoa, rivaisDe } from "../stage/historico.js";
import { modo, ligado } from "../modo.js";

export async function render(main, { params, entidade = null }) {
  const p = entidade || pessoa(params[0]);
  if (!p) {
    main.innerHTML = `<div class="wrap pagina-topo"><h1>Youtuber não encontrado</h1><p>Pode ter sido removido ou mudado de nome. <a href="#/ranking">Ver o ranking</a>.</p></div>`;
    return;
  }
  main.dataset.titulo = p.name;
  const ds = estado.ds;
  // Um canal visto à parte: as posições são "onde ficaria" entre os Youtubers (sem contar o dono)
  const ehCanal = Boolean(p.dono);
  const dono = ehCanal ? pessoa(p.dono) : null;
  const ind = ehCanal ? indiceCanal(p) : indice(p.id);
  const pos = ehCanal ? posicaoCanal(p, "indice", ind.total) : estado.posIndice.get(p.id);
  const ref = estado.ref;
  const vRef = views(p, ref);
  const posRef = ehCanal ? (vRef === null ? null : { pos: posicaoCanal(p, ref) }) : rankingMes(ref).find((x) => x.p.id === p.id);
  const canais = canaisDe(p);
  const todosCanais = ehCanal ? (dono ? canaisDe(dono) : []) : canais;
  const main1 = canais[0];
  const rec = recordes(p, ehCanal ? (m) => posicaoCanal(p, m) : null);
  const media3 = mediaMeses(p, ref, 3);
  const projetos = ehCanal ? [] : projetosDe(p.id);
  const classica = ehCanal ? pontuacaoClassica(p, estado.janela) : estado.classica.get(p.id);
  const linkDono = dono ? (modo.publico ? (!modo.cfg?.perfis?.ligado || dono.semPerfil ? null : `#/youtuber/${encodeURIComponent(dono.id)}`) : `#/youtuber/${encodeURIComponent(dono.id)}`) : null;
  const parcial = p.monthly[ds.currentMonth];

  const limpeza = [];
  const ve = (s) => ligado("perfis.secoes." + s);
  const comparar = !modo.publico || modo.cfg.abas.some((a) => a.id === "comparar");
  main.innerHTML = `
    <section class="perfil-capa">
      ${p.banner ? `<div class="fundo" style="background-image:url('${esc(p.banner)}')"></div>` : `<div class="fundo calcada" style="opacity:1"></div>`}
      <div class="wrap">
        <div class="perfil-cabeca">
          ${avatar(p, 128)}
          <div>
            <h1>${esc(p.name)}</h1>
            ${ehCanal && dono ? `<p class="perfil-dono">${p.canal.principal ? "Canal principal" : `Canal ${esc(p.canal.role && p.canal.role !== "outro" ? p.canal.role : "")}`.replace(/\s+$/, "")} de ${linkDono ? `<a href="${linkDono}">${esc(dono.name)}</a>` : `<b>${esc(dono.name)}</b>`}${p.canal.count ? "" : " · não conta nas somas do Youtuber"}</p>` : ""}
            <div class="perfil-linha">
              ${etiquetaCategoria(p.category)}
              ${p.realName ? `<span class="soft">${esc(p.realName)}</span>` : ""}
              ${p.location ? `<span class="muted">${esc(p.location)}</span>` : ""}
              ${p.status && p.status !== "ativo" ? `<span class="etiqueta">${esc(p.status === "pausa" ? "Em pausa" : p.status)}</span>` : ""}
              ${p.tags.map((t) => `<span class="etiqueta azul">${esc(t)}</span>`).join("")}
            </div>
            <div class="perfil-linha">
              ${main1 ? `<a class="btn btn-pequeno" href="https://www.youtube.com/channel/${esc(main1.id)}" target="_blank" rel="noopener">${ICONES.youtube} ${esc(main1.handle || "Canal")}</a>` : ""}
              ${comparar && ve("comparar") && !ehCanal ? `<a class="btn btn-pequeno" href="#/comparar?ids=${encodeURIComponent(p.id)}">Comparar</a>` : ""}
              ${modo.publico || ehCanal ? "" : `<a class="btn btn-pequeno" href="#/palco/cartao?id=${encodeURIComponent(p.id)}">Mostrar no Palco</a>`}
              ${!modo.publico && temSessao() ? `<a class="btn btn-pequeno" href="#/editar/youtubers?id=${encodeURIComponent(p.dono || p.id)}">Editar</a>` : ""}
            </div>
          </div>
          <div class="perfil-indice" ${ve("indice") ? "" : "hidden"}>
            ${ind.total !== null ? `<span class="placar" id="ind-num">${inteiro(ind.total)}</span><span>Índice de Influência${ehCanal ? " deste canal" : ""}${pos ? `, ${ehCanal ? "seria o " : ""}${pos}.º em Portugal` : ""}</span>` : `<span class="muted">Ainda sem dados para o Índice</span>`}
          </div>
        </div>
      </div>
    </section>
    <div class="wrap">
      ${p.bio ? `<p class="soft" style="margin-top:24px;font-size:var(--t-md)">${esc(p.bio)}</p>` : ""}
      <div class="numeros" style="margin-top:28px" ${ve("numeros") ? "" : "hidden"}>
        <div class="numero"><span>Views em ${esc(mesNome(ref))}</span><strong>${curto(vRef)}</strong><small>${posRef?.pos ? `${ehCanal ? "seria " : ""}${posRef.pos}.º lugar ` : ""}${variacao(vRef, views(p, estado.ds.months[estado.ds.months.indexOf(ref) - 1] || ""))}</small></div>
        ${parcial ? `<div class="numero"><span>Este mês (até agora)</span><strong>${curto(parcial.v)}</strong><small>projeção ${curto(parcial.est)}</small></div>` : ""}
        <div class="numero"><span>Média de 3 meses</span><strong>${curto(media3)}</strong><small>views por mês</small></div>
        <div class="numero"><span>Subscritores</span><strong>${curto(p.totals?.subs)}</strong><small>${p.totals?.src === "folha" ? "valor da folha antiga" : !ehCanal && canais.filter((c) => c.count).length > 1 ? `em ${canais.filter((c) => c.count).length} canais` : ""}</small></div>
        <div class="numero"><span>Views totais</span><strong>${curto(p.totals?.views)}</strong><small>${p.totals?.videos ? plural(p.totals.videos, "vídeo", "vídeos") : ""}</small></div>
        <div class="numero"><span>No YouTube desde</span><strong>${p.since ? new Date(p.since).getFullYear() : "–"}</strong><small>${p.since ? data(p.since) : ""}</small></div>
      </div>

      <section class="secao" ${ve("mensal") ? "" : "hidden"}>
        <div class="secao-cabeca"><div><h2>Views por mês</h2><p>${ehCanal ? `Views ganhas em cada mês neste canal${p.canal.principal && todosCanais.filter((c) => c.count).length > 1 ? " (os meses da folha antiga do Youtuber contam como deste canal)" : ""}.` : `Views ganhas em cada mês, somando os canais principais${canais.some((c) => !c.count) ? " (canais de clips não contam)" : ""}.`}${notaEstimativa(p)}</p></div></div>
        <div id="g-mensal" class="vidro caixa-grafico"></div>
      </section>

      <section class="secao" id="sec-diario" hidden>
        <div class="secao-cabeca"><div><h2>Últimos dias</h2><p>Views ganhas por dia ${ehCanal ? "neste canal" : "no canal principal"}, medidas pela recolha diária e pelo Social Blade.</p></div></div>
        <div id="g-diario" class="vidro caixa-grafico"></div>
      </section>

      <section class="secao" id="sec-sb" hidden>
        <div class="secao-cabeca"><div><h2>Crescimento</h2><p id="sb-nota"></p></div></div>
        <div class="grelha-2">
          <div class="vidro caixa-grafico"><h3 class="grafico-titulo">Subscritores ganhos por mês</h3><div id="g-sb-subs"></div></div>
          <div class="vidro caixa-grafico"><h3 class="grafico-titulo">Vídeos publicados por mês</h3><div id="g-sb-vids"></div></div>
        </div>
        <div class="vidro caixa-grafico" style="margin-top:18px" id="sb-semanas"><h3 class="grafico-titulo">Views por semana, no último ano</h3><div id="g-sb-sem"></div></div>
      </section>

      ${ve("tiktok") && p.tt && Object.keys(p.tt.f || {}).length ? `<section class="secao" id="sec-tt">
        <div class="secao-cabeca"><div><h2>TikTok</h2><p>${p.tt.user ? `<a href="https://www.tiktok.com/@${esc(p.tt.user)}" target="_blank" rel="noopener">@${esc(p.tt.user)}</a>. ` : ""}Ganhos de cada mês, segundo o Social Blade${p.tt.at ? `, atualizados em ${esc(data(p.tt.at))}` : ""}.</p></div></div>
        <div class="grelha-2">
          <div class="vidro caixa-grafico"><h3 class="grafico-titulo">Seguidores ganhos por mês</h3><div id="g-tt-seg"></div></div>
          <div class="vidro caixa-grafico"><h3 class="grafico-titulo">Gostos ganhos por mês</h3><div id="g-tt-gostos"></div></div>
        </div>
      </section>` : ""}

      ${["instagram", "twitch"].map((r) => (ve(r) && p.rs?.[r] ? redeSBHtml(p, r) : "")).join("")}

      <section class="secao grelha-2" ${ve("indice") || ve("recordes") ? "" : "hidden"}>
        <div class="painel" ${ve("indice") ? "" : "hidden"}>
          <h3>Como se calcula o Índice</h3>
          <p class="muted">Cada parte vale de 0 a 100. O Índice é a média com pesos, de 0 a 1000.${ind.cobertura && ind.cobertura < 0.99 ? " Partes sem dados não entram nas contas." : ""}</p>
          <div class="partes">${PARTES.map((pt) => {
            const v = ind.partes[pt.id];
            return `<div class="parte"><span>${pt.nome}</span><div class="trilho${v ? "" : " sem"}"><i style="width:${v ? (v.s * 100).toFixed(0) : 0}%"></i></div><b class="num" style="text-align:right">${v ? Math.round(v.s * 100) : "–"}</b><small>${esc(explicacao(pt.id, v))}</small></div>`;
          }).join("")}</div>
          ${ind.semRedes !== undefined ? `<p class="muted" style="margin:18px 0 0;font-size:var(--t-sm)">As outras redes subiram o Índice em <b class="soft">+${inteiro(ind.ganhoRedes)}</b> (${inteiro(ind.semRedes)} só com o YouTube${ind.bonusCanais || ind.semKarma !== undefined ? ", antes dos outros ajustes" : ""}).</p>` : ""}
          ${ind.bonusCanais ? `<p class="muted" style="margin:18px 0 0;font-size:var(--t-sm)">Bónus por ter ${ind.bonusCanais.canais} canais que contam: <b class="soft">+${ind.bonusCanais.pct}%</b> (${inteiro(ind.semBonus)} sem o bónus). Os números dos canais juntam-se como se fosse um canal só.</p>` : ""}
          ${ind.semKarma !== undefined && ind.semKarma !== ind.total ? `<p class="muted" style="margin:18px 0 0;font-size:var(--t-sm)">O Índice inclui o karma do público (O Caso): <b class="soft">${ind.total > ind.semKarma ? "+" : ""}${inteiro(ind.total - ind.semKarma)}</b>. Só com os números seria ${inteiro(ind.semKarma)}.</p>` : ""}
          ${classica ? `<p class="muted" style="margin:18px 0 0;font-size:var(--t-sm)">Pontuação clássica (fórmula da folha antiga): <b class="soft">${inteiro(classica)}</b>${p.legacy?.pontuacao ? `, na folha estava ${inteiro(p.legacy.pontuacao)}` : ""}.</p>` : ""}
        </div>
        <div class="painel" ${ve("recordes") ? "" : "hidden"}>
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

      ${ve("canais") && todosCanais.length && (!ehCanal || todosCanais.length > 1) ? `<section class="secao"><div class="secao-cabeca"><div><h2>${ehCanal ? `Os canais de ${esc(dono?.name || "")}` : "Canais"}</h2><p>${ehCanal ? "Carrega num canal para o ver à parte." : `Todos os canais desta pessoa${todosCanais.length > 1 ? ": carrega num para o ver à parte" : ""}. Os canais de clips não somam nas views.`}</p></div></div>
        <div class="painel canal-lista">${todosCanais
          .map(
            (c) => `<div class="canal${ehCanal && c.id === p.id ? " atual" : ""}">${avatar({ name: c.title, photo: c.thumb }, 44)}
            <div>${ligacaoCanal(c) && !(ehCanal && c.id === p.id) ? `<a class="canal-nome" href="${ligacaoCanal(c)}"><b>${esc(c.nome || c.title)}</b></a>` : `<b>${esc(c.nome || c.title)}</b>`}${c.category ? ` <span class="etiqueta">${esc(c.category)}</span>` : ""}<small class="muted">${esc([c.handle, "canal " + c.role, c.count ? "" : "não conta nas somas", c.country ? "país " + c.country : "", c.missing ? "canal indisponível" : ""].filter(Boolean).join(", "))}</small></div>
            <div class="canal-num"><b>${curto(c.subs)}</b> subs<br><span class="muted">${curto(c.views)} views</span></div>
            <a class="botao-icone" href="https://socialblade.com/youtube/channel/${esc(c.id)}" target="_blank" rel="noopener" aria-label="Ver ${esc(c.title)} no Social Blade" title="Social Blade"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M5 20v-7M11 20V5M17 20v-10M3 20h18"/></svg></a>
            <a class="botao-icone" href="https://www.youtube.com/channel/${esc(c.id)}" target="_blank" rel="noopener" aria-label="Abrir ${esc(c.title)} no YouTube" title="YouTube">${ICONES.youtube}</a></div>`,
          )
          .join("")}</div></section>`
        : ""}

      ${ehCanal ? "" : `<section class="secao" id="sec-palco" hidden></section>`}

      ${ve("redes") ? redesHtml(p) : ""}

      ${ve("projetos") && projetos.length ? `<section class="secao"><div class="secao-cabeca"><div><h2>Projetos</h2><p>Séries e conteúdos grandes em que participou.</p></div></div><div class="projetos-grelha">${projetos.map(cartaoProjeto).join("")}</div></section>` : ""}
    </div>`;

  encher(main.querySelectorAll(".parte .trilho i"));
  const num = $("#ind-num", main);
  if (num) contar(num, ind.total, { formato: inteiro, duracao: 1300 });

  const serie = serieMensal(p).filter((s, i, arr) => s.tem || arr.slice(0, i).some((x) => x.tem));
  if (serie.some((s) => s.tem)) limpeza.push(barrasMensais($("#g-mensal", main), serie, { destaque: rec.melhor?.m }));
  else $("#g-mensal", main).innerHTML = vazio("Ainda sem views por mês", "Liga o canal do YouTube ou importa os dados do Social Blade na área de edição.");

  if ($("#sec-tt", main)) {
    const pontos = (o, unidade) =>
      Object.keys(o || {})
        .sort()
        .map((m) => ({ k: m, v: Math.max(0, o[m]), dica: `<b>${mesNome(m)}</b><br>${inteiro(o[m])} ${unidade}` }));
    const rot = (m) => mesNome(m, { curto: true });
    limpeza.push(barrasSimples($("#g-tt-seg", main), pontos(p.tt.f, "seguidores ganhos"), { rotulo: rot, cor: "#25f4ee", nome: "Seguidores ganhos por mês no TikTok" }));
    if (Object.keys(p.tt.l || {}).length) limpeza.push(barrasSimples($("#g-tt-gostos", main), pontos(p.tt.l, "gostos ganhos"), { rotulo: rot, cor: "#fe2c55", nome: "Gostos ganhos por mês no TikTok" }));
    else $("#g-tt-gostos", main).innerHTML = `<p class="muted">Sem dados.</p>`;
  }
  for (const r of ["instagram", "twitch"]) {
    const x = p.rs?.[r];
    if (!x || !$(`#sec-${r}`, main)) continue;
    const rot = (m) => mesNome(m, { curto: true });
    const pontos = (o, unidade) => Object.keys(o || {}).sort().map((m) => ({ k: m, v: Math.max(0, o[m]), dica: `<b>${mesNome(m)}</b><br>${inteiro(o[m])} ${unidade}` }));
    if (Object.keys(x.f || {}).length) limpeza.push(barrasSimples($(`#g-${r}-seg`, main), pontos(x.f, "seguidores ganhos"), { rotulo: rot, cor: COR_REDE[r], nome: `Seguidores ganhos por mês ${r === "twitch" ? "na Twitch" : "no Instagram"}` }));
    if (Object.keys(x.n || {}).length && $(`#g-${r}-posts`, main)) limpeza.push(barrasSimples($(`#g-${r}-posts`, main), pontos(x.n, "publicações novas"), { rotulo: rot, cor: "#c98500", nome: "Publicações por mês no Instagram" }));
  }
  if (ve("palco") && !ehCanal) carregarPalco(main, p);
  const contados = ehCanal ? canais : canais.filter((c) => c.count);
  if (contados.length && ve("crescimento")) carregarSocialBlade(main, contados, limpeza);
  if (main1) {
    if (ve("diario")) carregarDiario(main, main1, limpeza);
    if (ve("videos")) carregarVideos(main, main1);
  }
  return () => limpeza.forEach((f) => f && f());
}

function notaEstimativa(p) {
  const est = Object.values(p.monthly).filter((v) => v.src === "estimativa");
  if (!est.length) return "";
  const erro = est.find((v) => v.erro !== undefined)?.erro;
  return ` ${est.length} ${est.length === 1 ? "mês é uma estimativa" : "meses são estimativas"} feitas a partir dos vídeos do canal (barras a tracejado)${erro !== undefined ? `, com erro típico de ±${erro}%` : ""}.`;
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
      return i.aprox ? "Estimado pelas views dos últimos meses (falta ligar o canal)." : `${i.up90} vídeos em 90 dias${i.canais > 1 ? " (os dos outros canais contam a metade)" : ""}, último há ${i.dias} dias.`;
    case "momento":
      return `Últimos 3 meses ${i.r >= 1 ? "+" : ""}${pct(i.r - 1)} face aos 3 anteriores.`;
    case "historico":
      return i.canais > 1 ? `${curto(i.subs)} subscritores sem repetidos (${i.canais} canais) e ${curto(i.views)} views no total.` : `${curto(i.subs)} subscritores e ${curto(i.views)} views no total.`;
    case "envolvimento":
      return `${decimal(i.eng * 100, 1)} gostos e comentários por cada 100 views.`;
    case "redes": {
      const nomes = { instagram: "Instagram", twitch: "Twitch", tiktok: "TikTok" };
      const lista = (i.redes || []).map((x) => `${curto(x.f)} no ${nomes[x.r]}`).join(", ");
      return `${lista}${i.extra > 0.01 ? ", a crescer" : ""}. ${v.ajudou ? "Entrou nas contas." : "Não entrou: só conta quando sobe o Índice."}`;
    }
    default:
      return "";
  }
}

const COR_REDE = { instagram: "#e1306c", twitch: "#9146ff" };
const NOME_REDE = { instagram: "Instagram", twitch: "Twitch" };
const URL_REDE = { instagram: (u) => `https://www.instagram.com/${u}/`, twitch: (u) => `https://www.twitch.tv/${u}` };

/** Instagram ou Twitch (Social Blade): o perfil de hoje e os ganhos de cada mês. */
function redeSBHtml(p, r) {
  const x = p.rs[r];
  const i = x.info || {};
  const temMeses = Object.keys(x.f || {}).length > 0;
  const temPosts = Object.keys(x.n || {}).length > 0;
  const fatos = [
    i.seg !== null && i.seg !== undefined ? ["Seguidores", curto(i.seg)] : null,
    i.posts ? ["Publicações", inteiro(i.posts)] : null,
    i.seguindo ? ["A seguir", inteiro(i.seguindo)] : null,
    i.eng ? ["Envolvimento", `${decimal(i.eng, 2)}%`] : null,
    i.mediaGostos ? ["Gostos por publicação", curto(i.mediaGostos)] : null,
    i.mediaComent ? ["Comentários por publicação", curto(i.mediaComent)] : null,
    i.criado ? ["Na plataforma desde", String(new Date(i.criado).getFullYear())] : null,
    i.nota ? ["Nota no Social Blade", i.nota] : null,
  ].filter(Boolean);
  return `<section class="secao rede-sb" id="sec-${r}" style="--cor-rede:${COR_REDE[r]}">
    <div class="secao-cabeca"><div><h2>${ICONES[r] || ""} ${NOME_REDE[r]}</h2><p><a href="${esc(URL_REDE[r](i.user))}" target="_blank" rel="noopener">@${esc(i.user)}</a>${i.verificado ? " ✓" : ""}. Números do Social Blade${x.at ? `, atualizados em ${esc(data(x.at))}` : ""}.${!temMeses && x.semSessao ? " O histórico de cada mês ainda não foi lido." : ""}</p></div></div>
    <div class="numeros rede-sb-numeros">${fatos.map(([k, v]) => `<div class="numero"><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`).join("")}</div>
    ${temMeses ? `<div class="${temPosts ? "grelha-2" : ""}" style="margin-top:18px">
      <div class="vidro caixa-grafico"><h3 class="grafico-titulo">Seguidores ganhos por mês</h3><div id="g-${r}-seg"></div></div>
      ${temPosts ? `<div class="vidro caixa-grafico"><h3 class="grafico-titulo">Publicações por mês</h3><div id="g-${r}-posts"></div></div>` : ""}
    </div>` : ""}
  </section>`;
}

function redesHtml(p) {
  const itens = REDES.filter((r) => p.socials?.[r.id]?.url || p.socials?.[r.id]?.last);
  if (!itens.length) return "";
  return `<section class="secao"><div class="secao-cabeca"><div><h2>Outras redes</h2><p>Links e números das redes sociais.</p></div></div>
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

/** Subscritores e vídeos por mês e views por semana, recolhidos do Social Blade. */
async function carregarSocialBlade(main, canais, limpeza) {
  let dados;
  try {
    dados = modo.publico
      ? Object.fromEntries(await Promise.all(canais.map(async (c) => [c.id, (await canalPublico(c.id))?.sb || null])))
      : await api(`sb?channels=${canais.map((c) => c.id).join(",")}`);
  } catch {
    return;
  }
  const lista = canais.map((c) => dados[c.id]).filter(Boolean);
  if (!lista.length || !document.body.contains(main)) return;
  const somaMes = { s: new Map(), n: new Map() };
  const semanas = new Map();
  const mesDe = (ini, i) => {
    const [y, m] = ini.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1 + i, 1)).toISOString().slice(0, 7);
  };
  for (const x of lista) {
    if (x.m) {
      const vids = limparVideos(x.m.n);
      x.m.s.forEach((v, i) => v !== null && somaMes.s.set(mesDe(x.m.ini, i), (somaMes.s.get(mesDe(x.m.ini, i)) || 0) + Math.max(0, v)));
      vids.forEach((v, i) => v !== null && somaMes.n.set(mesDe(x.m.ini, i), (somaMes.n.get(mesDe(x.m.ini, i)) || 0) + v));
    }
    if (x.w) {
      const ini = Date.parse(x.w.ini + "T00:00:00Z");
      x.w.v.forEach((v, i) => {
        if (v === null) return;
        const k = new Date(ini + i * 7 * 86400000).toISOString().slice(0, 10);
        semanas.set(k, (semanas.get(k) || 0) + v);
      });
    }
  }
  const pontosMes = (mapa, unidade) => {
    const meses = [...mapa.keys()].sort();
    if (!meses.length) return [];
    const todos = [];
    for (let m = meses[0]; m <= meses[meses.length - 1]; m = mesDe(m, 1)) todos.push(m);
    return todos.map((m) => ({ k: m, v: mapa.has(m) ? mapa.get(m) : null, dica: `<b>${mesNome(m)}</b><br>${mapa.has(m) ? `${inteiro(mapa.get(m))} ${unidade}` : "Sem dados"}` }));
  };
  const subs = pontosMes(somaMes.s, "subscritores ganhos");
  const vids = pontosMes(somaMes.n, "vídeos publicados");
  const sem = [...semanas.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-52).map(([k, v]) => ({ k, v, dica: `<b>Semana de ${data(k)}</b><br>${inteiro(v)} views` }));
  if (!subs.length && !vids.length && !sem.length) return;
  const at = lista.map((x) => x.at).sort().pop();
  $("#sb-nota", main).textContent = `Dados do Social Blade${lista.length > 1 ? `, somando ${lista.length} canais` : ""}, atualizados em ${data(at)}. O YouTube arredonda os subscritores, por isso os ganhos aparecem em saltos.`;
  $("#sec-sb", main).hidden = false;
  const rotMes = (m) => mesNome(m, { curto: true });
  if (subs.length) limpeza.push(barrasSimples($("#g-sb-subs", main), subs, { rotulo: rotMes, nome: "Subscritores ganhos por mês" }));
  else $("#g-sb-subs", main).innerHTML = `<p class="muted">Sem dados.</p>`;
  if (vids.some((p) => p.v !== null)) limpeza.push(barrasSimples($("#g-sb-vids", main), vids, { rotulo: rotMes, cor: "#c98500", nome: "Vídeos publicados por mês" }));
  else $("#g-sb-vids", main).innerHTML = `<p class="muted">Sem dados.</p>`;
  if (sem.length >= 4) limpeza.push(barrasSimples($("#g-sb-sem", main), sem, { rotulo: (k) => `${+k.slice(8)}/${+k.slice(5, 7)}`, nome: "Views por semana" }));
  else $("#sb-semanas", main).hidden = true;
}

/**
 * O Social Blade só começou a contar vídeos a certa altura: os meses antes disso vêm a 0
 * e o primeiro mês contado traz o total do canal. Esses valores não são uploads reais.
 */
function limparVideos(arr) {
  const n = [...(arr || [])];
  const f = n.findIndex((v) => v > 0);
  if (f < 0) return n.map(() => null);
  const resto = n.slice(f + 1).filter((v) => v !== null).sort((a, b) => a - b);
  const mediana = resto.length ? resto[Math.floor(resto.length / 2)] : 0;
  if (n[f] > 50 && n[f] > 5 * Math.max(1, mediana)) for (let i = 0; i <= f; i++) n[i] = null;
  return n;
}

async function carregarDiario(main, canal, limpeza) {
  try {
    const d = modo.publico ? { [canal.id]: (await canalPublico(canal.id))?.diario || {} } : await api(`daily?channels=${canal.id}&months=3`);
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
    // Um salto absurdo num só dia vem de fontes diferentes a medir o total (não é um dia real)
    const ordenados = diarios.map((x) => x.v).sort((a, b) => a - b);
    const mediana = ordenados[Math.floor(ordenados.length / 2)] || 0;
    if (mediana > 0) for (let i = diarios.length - 1; i >= 0; i--) if (diarios[i].v > mediana * 20) diarios.splice(i, 1);
    if (diarios.length < 5 || !document.body.contains(main)) return;
    $("#sec-diario", main).hidden = false;
    limpeza.push(barrasDiarias($("#g-diario", main), diarios.slice(-60)));
  } catch {
    /* sem dados diários */
  }
}

async function carregarVideos(main, canal) {
  try {
    const r = modo.publico ? (await canalPublico(canal.id))?.videos || { items: [] } : await api(`videos?channel=${canal.id}`);
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

/** Estrelas, coroas e rivais no Palco (vídeos gravados). */
async function carregarPalco(main, p) {
  const h = await carregarHistorico();
  const d = dadosPessoa(h, p.id);
  const alvo = $("#sec-palco", main);
  if (!alvo || !(d.v || d.d || d.estrelas || d.coroas)) return;
  const rivais = rivaisDe(h, p.id, 4);
  alvo.hidden = false;
  alvo.innerHTML = `<div class="secao-cabeca"><div><h2>No Palco</h2><p>Os resultados dos vídeos do Placar: torneios, batalhas e rankings.</p></div>${modo.publico ? "" : `<a class="btn btn-pequeno" href="#/palco">Ir ao Palco</a>`}</div>
    <div class="palco-feitos">
      <div class="vidro pf"><span class="pf-icone estrela">★</span><b>${inteiro(d.estrelas)}</b><small>${d.estrelas === 1 ? "torneio ganho" : "torneios ganhos"}</small></div>
      <div class="vidro pf"><span class="pf-icone">👑</span><b>${inteiro(d.coroas)}</b><small>${d.coroas === 1 ? "vez em 1.º lugar" : "vezes em 1.º lugar"}</small></div>
      <div class="vidro pf"><span class="pf-icone">⚔️</span><b>${inteiro(d.v)}–${inteiro(d.d)}</b><small>vitórias e derrotas em duelos${d.ko ? `, ${d.ko} por K.O.` : ""}</small></div>
      <div class="vidro pf"><span class="pf-icone">🔥</span><b>${inteiro(d.melhorSeq)}</b><small>melhor sequência de vitórias${d.seq >= 2 ? ` (agora: ${d.seq})` : ""}</small></div>
    </div>
    ${
      rivais.length
        ? `<h3 class="soft" style="margin:22px 0 10px;font-size:var(--t-base)">Maiores rivais</h3><div class="palco-rivais">${rivais
            .map((r) => `<a class="vidro rival" href="#/youtuber/${encodeURIComponent(r.p.id)}">${avatar(r.p, 44)}<span><b>${esc(r.p.name)}</b><small>${r.n} ${r.n === 1 ? "confronto" : "confrontos"}${r.n >= 3 ? " · clássico" : ""}</small></span><strong class="${r.eu > r.ele ? "ganha" : r.eu < r.ele ? "perde" : ""}">${r.eu}–${r.ele}</strong></a>`)
            .join("")}</div>`
        : ""
    }`;
}

// Na página pública, os dados extra de um canal vêm de um só pedido (guardado para as três secções)
const pedidosCanal = new Map();
function canalPublico(id) {
  if (!pedidosCanal.has(id)) pedidosCanal.set(id, api(`publico/canal/${id}`).catch(() => null));
  return pedidosCanal.get(id);
}
