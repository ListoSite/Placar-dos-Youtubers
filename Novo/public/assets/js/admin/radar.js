// O Caso, Radar (painel): vídeos recentes dos Youtubers que podem dar notícia.
// Cada um mostra porquê (palavras, Youtubers mencionados, velocidade, tendências, casos a crescer,
// o que o radar aprendeu contigo), fica marcado quando já foi visto, pode ser removido (não volta),
// marcado como útil (com etiquetas: o radar aprende) e vira notícia com um clique.

import { api, pessoa, procurar } from "../data.js";
import { esc, curto, inteiro, ha } from "../format.js";
import { $, $$, avatar, toast, janela } from "../ui.js";
import { chamar } from "./common.js";
import { novaNoticiaCom } from "./noticias.js";

// O que se vê (fica entre visitas à página)
const vista = { grupo: "escolhidos", filtro: "novo", tema: "", pessoa: "", sinal: "", caso: "", ordem: "parati" };
let aParar = false;
// Os vídeos marcados como úteis ficam à vista (para escolher as etiquetas) até se mudar de filtro
const aVista = new Set();

const urlVideo = (it) => (it.s ? `https://www.youtube.com/shorts/${it.id}` : `https://www.youtube.com/watch?v=${it.id}`);
const calor = (p) => (p >= 20 ? "ferve" : p >= 12 ? "quente" : "morno");
const sinal = (n) => (n > 0 ? `+${String(n).replace(".", ",")}` : String(n).replace(".", ","));

// Os filtros por sinal (marcas do servidor, mais casos e úteis)
const SINAIS = [
  ["caso", "🔥", "Em casos"],
  ["rapido", "⚡", "A disparar"],
  ["explodiu", "💥", "Explodiram"],
  ["tendencias", "📈", "Tendências"],
  ["regresso", "🔙", "Regressos"],
  ["pt", "🇵🇹", "Youtubers portugueses"],
  ["util", "👍", "Úteis"],
];
const temSinal = (it, k) => (k === "caso" ? Boolean(it.caso) : k === "util" ? Boolean(it.util) : (it.marcas || []).includes(k));

const VARIANTES = { a: "aàáâãä", e: "eéèêë", i: "iíìîï", o: "oóòôõö", u: "uúùûü", c: "cç" };
/** Destaca as palavras encontradas num texto (sem HTML vindo de fora), com ou sem acentos. */
function destacar(texto, palavras) {
  const lista = palavras.filter((p) => p.length >= 3).sort((a, b) => b.length - a.length);
  if (!lista.length) return esc(texto);
  const padrao = lista
    .map((p) => [...p].map((ch) => (VARIANTES[ch] ? `[${VARIANTES[ch]}]` : ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))).join(""))
    .join("|");
  const re = new RegExp(`(^|[^\\p{L}\\p{N}])(${padrao})(?=$|[^\\p{L}\\p{N}])`, "giu");
  return esc(texto).replace(re, (m, a, b) => `${a}<mark>${b}</mark>`);
}

export async function desenharRadar(main) {
  const corpo = $("#csp-corpo", main);
  let r;
  try {
    r = await api("admin/caso/radar");
  } catch (e) {
    corpo.innerHTML = `<div class="aviso"><p>${esc(e.message)}</p></div>`;
    return;
  }
  const recarregar = () => (aVista.clear(), desenharRadar(main));
  const nome = (id) => pessoa(id)?.name || r.nomes[id] || r.nomesCanais?.[id] || id;
  // As regras mostram o que o radar aprendeu até agora (lido outra vez)
  $("#csp-regras", main).onclick = async () => regras(await api("admin/caso/radar").catch(() => r), recarregar, nome);
  const extrasIds = new Set((r.regras.extras || []).map((e) => e.id));
  const escolhidos = new Set(r.regras.escolhidos || []);
  const doGrupo = (it) => vista.grupo === "todos" || escolhidos.has(it.personId) || extrasIds.has(it.ch);
  const temaNome = (k) => r.temas[k]?.nome || k;

  /** O que o radar aprendeu, em palavras. */
  const porqueTxt = ({ f, pts }) => {
    const [tipo, k] = [f[0], f.slice(2)];
    if (tipo === "q") return pts > 0 ? `gostas dos vídeos de ${nome(k)}` : `costumas remover os de ${nome(k)}`;
    if (tipo === "p") return pts > 0 ? `fala de ${nome(k)}` : `fala de ${nome(k)} (costumas remover)`;
    if (tipo === "w") return `"${k}"`;
    if (tipo === "t") return `tema ${temaNome(k)}`;
    return r.sinaisNome?.[k] || k;
  };

  // ---------- Botão de procurar (só no grupo da aba aberta) ----------
  const nCanais = r.canais?.[vista.grupo] || 0;
  const botao = $("#csp-procurar", main);
  const rotulo = botao.querySelector("span");
  rotulo.innerHTML = `Procurar agora <em class="csp-conta" title="${nCanais} canais">${nCanais}</em>`;
  botao.title = `Lê já ${vista.grupo === "todos" ? "todos os canais" : "os canais dos escolhidos"} (${nCanais}) pelo feed, que não gasta quota. Da API só os detalhes dos vídeos recentes (1 unidade por cada 50 vídeos), alguns comentários e as tendências.`;
  // Escolhidos ou todos: na barra do topo, ao lado das ações
  $("#csp-esq", main).innerHTML = `<div class="segmentos csp-grupos" role="group" aria-label="Que Youtubers">${[["escolhidos", "⭐", "Escolhidos"], ["todos", "👥", 'Todos<span class="csp-longo"> os Youtubers</span>']].map(([k, ic, n]) => `<button data-grupo="${k}" aria-pressed="${vista.grupo === k}"><span aria-hidden="true">${ic}</span> ${n}<em>${r.canais?.[k] || 0}</em></button>`).join("")}</div>`;
  $$("[data-grupo]", main).forEach((b) => b.addEventListener("click", () => ((vista.grupo = b.dataset.grupo), (vista.tema = ""), (vista.pessoa = ""), (vista.sinal = ""), (vista.caso = ""), recarregar())));
  botao.onclick = async () => {
    if (!nCanais) return toast(vista.grupo === "todos" ? "Ainda não há canais ligados." : "Escolhe primeiro os Youtubers (ou canais extra) a vigiar.", { erro: true });
    aParar = false;
    botao.disabled = true;
    const caixa = $("#rdr-progresso", main);
    caixa.hidden = false;
    let desde = 0;
    let novos = 0;
    try {
      while (desde !== null && !aParar) {
        caixa.innerHTML = `<div class="rdr-prog-linha"><b>📡 A ler ${desde} de ${nCanais} canais…</b><span class="muted">${novos ? `${novos} ${novos === 1 ? "vídeo novo" : "vídeos novos"}` : ""}</span><button class="btn btn-pequeno" id="rdr-parar">Parar</button></div><div class="ed-progresso"><i style="width:${Math.round((desde / nCanais) * 100)}%"></i></div>`;
        $("#rdr-parar", caixa).onclick = () => (aParar = true);
        const res = await chamar("caso/radar/procurar", { grupo: vista.grupo, desde }, { recarregar: false });
        novos += res.novos;
        desde = res.proximo;
      }
      toast(novos ? `${novos} ${novos === 1 ? "vídeo novo" : "vídeos novos"} no radar.` : "Nada de novo.");
    } catch {
      /* o erro já apareceu */
    }
    botao.disabled = false;
    recarregar();
  };

  // ---------- Mudar o estado (sem voltar a carregar tudo) ----------
  const mudar = async (ids, estado, extra = {}) => {
    try {
      await chamar("caso/radar/estado", { ids, estado, ...extra }, { recarregar: false });
    } catch {
      return false;
    }
    if (estado === "remover") {
      r.itens = r.itens.filter((x) => !ids.includes(x.id));
      r.nRemovidos = (r.nRemovidos || 0) + ids.length;
    } else for (const it of r.itens) if (ids.includes(it.id)) it.estado = estado;
    desenhar();
    return true;
  };
  const util = async (it, ligar, tags = it.tags || []) => {
    let res;
    try {
      res = await chamar("caso/radar/util", { id: it.id, util: ligar, tags }, { recarregar: false });
    } catch {
      return;
    }
    Object.assign(it, { util: res.util, tags: res.tags, estado: res.estado });
    if (res.util) aVista.add(it.id);
    if (ligar && !(tags || []).length) toast("Marcado como útil. Diz porquê, se quiseres: o radar aprende com isso.");
    desenhar();
  };

  const cartao = (it) => {
    const t = r.temas[it.tema] || r.temas.noticia;
    const dono = pessoa(it.personId);
    const quem = it.personId ? nome(it.personId) : it.chNome || "Canal extra";
    const mencionados = (it.pessoas || []).map(nome);
    const ap = it.aprendido || { pts: 0, porque: [] };
    const motivos = [
      it.caso ? `<span class="rdr-motivo caso" title="Vários canais a falar do mesmo nos últimos dias">🔥 Caso: <b>${esc(it.caso.titulo)}</b> ${it.bCaso ? sinal(it.bCaso) : ""}</span>` : "",
      Math.abs(ap.pts) >= 0.5 ? `<span class="rdr-motivo ${ap.pts > 0 ? "aprendeu" : "aprendeu-mal"}" title="Aprendido com o que marcas como útil, viras notícia ou removes">🧠 ${sinal(ap.pts)}${ap.porque.length ? `: ${esc(ap.porque.slice(0, 2).map(porqueTxt).join(", "))}` : ""}</span>` : "",
      ...(it.sinais || []).map((s) => `<span class="rdr-motivo">${/^\p{Extended_Pictographic}/u.test(s) ? "" : "📈 "}${esc(s)}</span>`),
      (it.nasEtiquetas || []).length ? `<span class="rdr-motivo">🏷️ Nas etiquetas: ${it.nasEtiquetas.map((id) => esc(nome(id))).join(", ")}</span>` : "",
      (it.nosComentarios || []).length ? `<span class="rdr-motivo">💬 Nos comentários: ${it.nosComentarios.map((id) => `<b>${esc(nome(id))}</b>`).join(", ")}</span>` : "",
      (it.quentesCom || []).length ? `<span class="rdr-motivo">💬 Comentários com "${esc(it.quentesCom.join('", "'))}"</span>` : "",
    ].filter(Boolean);
    const vh = it.vh || [];
    const ganho = vh.length >= 2 ? vh.at(-1)[1] - vh.at(-2)[1] : 0;
    const pts = it.final ?? it.pontos;
    return `<article class="rdr-cartao ${it.estado}${it.util ? " util" : ""}" data-v="${esc(it.id)}" style="--tc:${t.cor}">
      <a class="rdr-mini" href="${urlVideo(it)}" target="_blank" rel="noopener" data-abrir aria-label="Ver o vídeo no YouTube">
        ${it.th ? `<img src="${esc(it.th)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ""}
        <span class="rdr-calor ${calor(pts)}" title="Quanto parece notícia (${String(it.pontos).replace(".", ",")} do vídeo${it.bCaso ? `, ${sinal(it.bCaso)} do caso` : ""}${ap.pts ? `, ${sinal(ap.pts)} aprendido` : ""})">🔥 ${inteiro(Math.round(pts))}</span>
        ${it.s ? `<span class="rdr-short">Short</span>` : ""}
        ${it.estado === "visto" ? `<span class="rdr-selo">✓ Visto</span>` : it.estado === "noticia" ? `<span class="rdr-selo noticia">📰 Notícia</span>` : ""}
      </a>
      <div class="rdr-info">
        <div class="rdr-topo"><span class="rdr-tema">${t.icone} ${esc(t.nome)}</span><span class="rdr-quem">${dono ? avatar(dono, 20) : ""}${esc(quem)}${it.chNome && it.personId && it.chNome.toLowerCase() !== quem.toLowerCase() ? ` <small>· ${esc(it.chNome)}</small>` : ""}</span><span class="rdr-quando">${esc(ha(it.p))}</span></div>
        <h3><a href="${urlVideo(it)}" target="_blank" rel="noopener" data-abrir>${destacar(it.t, it.palavras || [])}</a></h3>
        ${mencionados.length ? `<div class="rdr-fala">Fala de ${mencionados.map((n) => `<b>${esc(n)}</b>`).join(", ")}</div>` : ""}
        ${motivos.length || (it.palavras || []).length ? `<div class="rdr-porque">${(it.palavras || []).map((p) => `<span class="rdr-palavra">${esc(p)}</span>`).join("")}${motivos.join("")}</div>` : ""}
        <div class="rdr-numeros"><span>👁 ${curto(it.v)}</span>${ganho > 0 ? `<span class="rdr-ganho" title="Views ganhas desde a leitura anterior">+${curto(ganho)} desde ontem</span>` : ""}${Number.isFinite(it.c) ? `<span>💬 ${curto(it.c)}</span>` : ""}${it.desc ? `<span class="rdr-desc" title="${esc(it.desc)}">${esc(it.desc.slice(0, 120))}${it.desc.length > 120 ? "…" : ""}</span>` : ""}</div>
        ${it.util ? `<div class="rdr-tags" role="group" aria-label="Porque foi útil">${Object.entries(r.etiquetas || {}).map(([k, n]) => `<button type="button" class="rdr-tag" data-tag="${k}" aria-pressed="${(it.tags || []).includes(k)}">${esc(n)}</button>`).join("")}</div>` : ""}
      </div>
      <div class="rdr-acoes">
        ${it.estado !== "noticia" ? `<button class="btn btn-primario btn-pequeno" data-noticia>📰 Fazer notícia</button>` : `<span class="rdr-feita">Já é notícia</span>`}
        <button class="btn btn-pequeno rdr-util" data-util aria-pressed="${Boolean(it.util)}" title="Este vídeo foi útil: o radar aprende a mostrar mais destes">👍 Útil</button>
        ${it.estado === "novo" ? `<button class="btn btn-pequeno" data-estado="visto" title="Marcar como visto">✓ Visto</button>` : it.estado === "visto" ? `<button class="btn btn-pequeno" data-estado="novo" title="Voltar a pôr por ver">↺ Por ver</button>` : ""}
        <button class="botao-icone rdr-remover" data-remover title="Remover do radar (não volta a aparecer, e o radar aprende)" aria-label="Remover do radar">🗑</button>
      </div>
    </article>`;
  };

  const cartaoCaso = (c) => {
    const b = r.bolha?.[c.id];
    const temYoutuber = c.chaves.some((k) => k.startsWith("p:"));
    const minis = c.videos.slice(0, 4);
    return `<article class="rdr-caso" data-caso="${esc(c.id)}">
      <div class="rdr-caso-topo"><span class="rdr-caso-tipo">🔥 A crescer</span><span class="rdr-caso-nat">🇵🇹 Português</span></div>
      <h3>${esc(c.titulo)}</h3>
      <p class="rdr-caso-num"><b>${c.canais}</b> canais · <b>${c.nVideos}</b> vídeos · ${esc(ha(c.desde))} · 👁 ${curto(c.views)}</p>
      <div class="rdr-caso-minis">${minis.map((v) => `<a href="https://www.youtube.com/${v.s ? "shorts/" : "watch?v="}${esc(v.id)}" target="_blank" rel="noopener" title="${esc(v.t)} (${esc(v.n || "")})">${v.th ? `<img src="${esc(v.th)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ""}</a>`).join("")}</div>
      ${
        b
          ? `<button type="button" class="rdr-bolha ${b.fora ? "fora" : ""}" data-ver-bolha>${b.fora ? `🌍 Saiu da bolha: <b>${b.fora}</b> ${b.fora === 1 ? "vídeo" : "vídeos"} lá fora${b.paises.length ? ` (${esc(b.paises.join(", "))})` : ""}` : "🏠 Ainda não saiu da bolha"} <small>· ${esc(ha(b.at))}</small></button>`
          : temYoutuber
            ? `<button type="button" class="rdr-bolha" data-bolha title="Procura vídeos sobre isto em canais de fora (100 unidades da quota)">🌍 Ver se saiu da bolha <small>· 100 unidades</small></button>`
            : ""
      }
      <div class="rdr-caso-acoes">
        <button class="btn btn-pequeno" data-ver-caso aria-pressed="${vista.caso === c.id}">${vista.caso === c.id ? "✕ Fechar" : "Ver vídeos"}</button>
        <button class="btn btn-primario btn-pequeno" data-noticia-caso>📰 Notícia do caso</button>
        <button class="botao-icone" data-ignorar-caso title="Ignorar este caso (os assuntos dele deixam de formar casos)" aria-label="Ignorar caso">🔕</button>
      </div>
    </article>`;
  };

  function desenhar() {
    const doGrupoTodos = r.itens.filter(doGrupo);
    const conta = { novo: 0, visto: 0, noticia: 0 };
    for (const it of doGrupoTodos) conta[it.estado] = (conta[it.estado] || 0) + 1;
    const porEstado = doGrupoTodos.filter((x) => vista.filtro === "todos" || x.estado === vista.filtro || aVista.has(x.id));
    // Em alta: quem mais aparece (mencionado ou a falar de alguém) nos últimos 7 dias
    const semana = Date.now() - 7 * 864e5;
    const alta = new Map();
    for (const it of doGrupoTodos) {
      if (Date.parse(it.p || 0) < semana) continue;
      const envolvidos = new Set([...(it.pessoas || []), ...((it.pessoas || []).length && it.personId ? [it.personId] : [])]);
      for (const id of envolvidos) alta.set(id, (alta.get(id) || 0) + 1);
    }
    const emAlta = [...alta.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const temas = [...new Set(porEstado.map((x) => x.tema))];
    const sinaisAqui = SINAIS.map(([k, ic, n]) => [k, ic, n, porEstado.filter((x) => temSinal(x, k)).length]).filter(([k, , , n]) => n || vista.sinal === k);
    const casoAberto = vista.caso && (r.casos || []).find((c) => c.id === vista.caso);
    if (vista.caso && !casoAberto) vista.caso = "";
    const idade = (x) => (Date.now() - Date.parse(x.p || 0)) / 864e5;
    const lista = porEstado
      .filter((x) => !vista.tema || x.tema === vista.tema)
      .filter((x) => !vista.pessoa || x.personId === vista.pessoa || (x.pessoas || []).includes(vista.pessoa))
      .filter((x) => !vista.sinal || temSinal(x, vista.sinal))
      .filter((x) => !vista.caso || x.caso?.id === vista.caso)
      .sort((a, b) => (vista.ordem === "quentes" ? b.final - a.final : vista.ordem === "parati" ? b.final - idade(b) * 0.4 - (a.final - idade(a) * 0.4) : 0) || (b.p || "").localeCompare(a.p || ""));
    const novosNaLista = lista.filter((x) => x.estado === "novo");
    const casosPt = (r.casos || []).filter((c) => c.nat === "pt");
    const casosMundo = (r.casos || []).filter((c) => c.nat !== "pt");
    // Os vídeos do caso aberto que não estão no radar (não chegaram aos pontos)
    const naLista = new Set(lista.map((x) => x.id));
    const outrosDoCaso = casoAberto ? casoAberto.videos.filter((v) => !naLista.has(v.id) && !r.itens.some((x) => x.id === v.id)) : [];

    corpo.innerHTML = `
      <div class="rdr-cabeca">
        <div class="rdr-resumo">
          ${[["novo", "👀", "Por ver", conta.novo], ["visto", "✓", "Vistos", conta.visto], ["noticia", "📰", "Viraram notícia", conta.noticia], ["todos", "🗂️", "Todos", doGrupoTodos.length]].map(([k, ic, n, v]) => `<button class="rdr-num k-${k} ${k === "novo" && v ? "destaque" : ""}" data-filtro="${k}" aria-pressed="${vista.filtro === k}"><span class="rdr-num-ic" aria-hidden="true">${ic}</span><b>${inteiro(v)}</b><span class="rdr-num-n">${n}</span></button>`).join("")}
        </div>
      </div>
      ${vista.grupo === "escolhidos" ? blocoEscolhidos(r) : `<p class="muted rdr-nota">Aqui estão os vídeos de todos os Youtubers do Placar, incluindo os escolhidos.</p>`}
      <div id="rdr-progresso" class="painel ed-bloco rdr-progresso" hidden></div>
      ${
        casosPt.length || casosMundo.length
          ? `<section class="rdr-casos-bloco">
        <div class="rdr-sec-titulo"><h3>🔥 Casos a crescer</h3><span class="muted">Assuntos de que vários canais começaram a falar nos últimos 4 dias. Os vídeos destes casos sobem no radar e o radar fica mais atento a eles.</span></div>
        ${casosPt.length ? `<div class="rdr-casos">${casosPt.map(cartaoCaso).join("")}</div>` : `<p class="muted">Nenhum caso português a crescer agora.</p>`}
        ${casosMundo.length ? `<div class="rdr-mundo"><span title="Assuntos sem Youtubers do Placar: podem ser mundiais, por isso não sobem no radar">🌍 Assuntos gerais (não contam):</span>${casosMundo.map((c) => `<span class="rdr-mundo-c">${esc(c.titulo)} <small>${c.canais} canais</small><button type="button" data-ignorar-caso="${esc(c.id)}" aria-label="Ignorar ${esc(c.titulo)}" title="Ignorar">✕</button></span>`).join("")}</div>` : ""}
      </section>`
          : ""
      }
      ${emAlta.length ? `<div class="rdr-alta"><span class="rdr-alta-titulo">⭐ Mais falados esta semana</span>${emAlta.map(([id, n]) => `<button class="rdr-alta-p" data-pessoa="${esc(id)}" aria-pressed="${vista.pessoa === id}">${pessoa(id) ? avatar(pessoa(id), 22) : ""}${esc(nome(id))}<b>${n}</b></button>`).join("")}</div>` : ""}
      ${sinaisAqui.length ? `<div class="rdr-sinais" role="group" aria-label="Filtrar por sinal">${sinaisAqui.map(([k, ic, n, v]) => `<button class="rdr-sinal" data-sinal="${k}" aria-pressed="${vista.sinal === k}">${ic} ${esc(n)}<b>${v}</b></button>`).join("")}</div>` : ""}
      <div class="rdr-barra">
        <select class="input" id="rdr-tema" aria-label="Tema"><option value="">Todos os temas</option>${temas.map((k) => `<option value="${k}" ${vista.tema === k ? "selected" : ""}>${r.temas[k]?.icone || ""} ${esc(temaNome(k))}</option>`).join("")}</select>
        <select class="input" id="rdr-ordem" aria-label="Ordem">${[["parati", "🧠 Para ti"], ["quentes", "🔥 Mais quentes"], ["recentes", "🕒 Mais recentes"]].map(([k, n]) => `<option value="${k}" ${vista.ordem === k ? "selected" : ""}>${n}</option>`).join("")}</select>
        ${vista.pessoa ? `<button class="btn btn-pequeno" data-pessoa="">✕ ${esc(nome(vista.pessoa))}</button>` : ""}
        ${casoAberto ? `<button class="btn btn-pequeno" data-fechar-caso>✕ Caso: ${esc(casoAberto.titulo)}</button>` : ""}
        <span class="rdr-barra-fim">${novosNaLista.length > 1 ? `<button class="btn btn-pequeno" id="rdr-todos-vistos">✓ Marcar ${novosNaLista.length} como vistos</button>` : ""}</span>
      </div>
      <div class="rdr-lista">${lista.map(cartao).join("") || (outrosDoCaso.length ? "" : `<div class="painel ed-bloco rdr-vazio"><h3>${r.itens.length ? "Nada aqui" : "O radar ainda está vazio"}</h3><p class="muted">${r.itens.length ? (vista.filtro === "novo" && !vista.sinal && !vista.caso ? "Já viste tudo. 🎉" : "Experimenta outro filtro.") : `Carrega em "Procurar agora" para ler já os vídeos.`}</p></div>`)}</div>
      ${outrosDoCaso.length ? `<div class="painel ed-bloco rdr-outros"><h4 class="ed-sub">Outros vídeos do caso</h4><p class="muted">Falam do mesmo, mas não chegaram aos pontos para entrar no radar.</p>${outrosDoCaso.map((v) => `<a class="rdr-outro" href="https://www.youtube.com/${v.s ? "shorts/" : "watch?v="}${esc(v.id)}" target="_blank" rel="noopener">${v.th ? `<img src="${esc(v.th)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : "<span></span>"}<span><b>${esc(v.t)}</b><small>${esc(v.dono ? nome(v.dono) : v.n || "")} · ${esc(ha(v.p))} · 👁 ${curto(v.v || 0)}</small></span></a>`).join("")}</div>` : ""}
      <p class="muted sgp-regras-txt">${rodape(r)}</p>`;

    $$("[data-filtro]", corpo).forEach((b) => b.addEventListener("click", () => (aVista.clear(), (vista.filtro = b.dataset.filtro), (vista.tema = ""), desenhar())));
    $$("[data-pessoa]", corpo).forEach((b) => b.addEventListener("click", () => ((vista.pessoa = vista.pessoa === b.dataset.pessoa ? "" : b.dataset.pessoa), desenhar())));
    $$("[data-sinal]", corpo).forEach((b) => b.addEventListener("click", () => ((vista.sinal = vista.sinal === b.dataset.sinal ? "" : b.dataset.sinal), desenhar())));
    $("#rdr-tema", corpo).addEventListener("change", (e) => ((vista.tema = e.target.value), desenhar()));
    $("#rdr-ordem", corpo).addEventListener("change", (e) => ((vista.ordem = e.target.value), desenhar()));
    $("[data-fechar-caso]", corpo)?.addEventListener("click", () => ((vista.caso = ""), desenhar()));
    $("#rdr-todos-vistos", corpo)?.addEventListener("click", () => mudar(novosNaLista.map((x) => x.id), "visto"));
    ligarEscolhidos(corpo, r, recarregar);
    // Casos
    $$("[data-caso]", corpo).forEach((el) => {
      const c = r.casos.find((x) => x.id === el.dataset.caso);
      el.querySelector("[data-ver-caso]").addEventListener("click", () => {
        vista.caso = vista.caso === c.id ? "" : c.id;
        // Para ver tudo do caso, incluindo o que já foi visto
        if (vista.caso) Object.assign(vista, { filtro: "todos", sinal: "", tema: "", pessoa: "" });
        desenhar();
        if (vista.caso) $(".rdr-barra", corpo)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      el.querySelector("[data-noticia-caso]").addEventListener("click", () => noticiaDoCaso(c, r, nome));
      el.querySelector("[data-bolha]")?.addEventListener("click", async (e) => {
        const res = await chamar("caso/radar/bolha", { caso: c.id }, { botao: e.currentTarget, recarregar: false }).catch(() => null);
        if (!res) return;
        r.bolha = { ...(r.bolha || {}), [c.id]: res.bolha };
        toast(res.bolha.fora ? `Saiu da bolha: ${res.bolha.fora} ${res.bolha.fora === 1 ? "vídeo" : "vídeos"} de canais de fora.` : "Ainda não há vídeos de fora sobre isto.");
        desenhar();
      });
      el.querySelector("[data-ver-bolha]")?.addEventListener("click", () => verBolha(c, r.bolha[c.id], r, desenhar));
    });
    $$("[data-ignorar-caso]", corpo).forEach((b) =>
      b.addEventListener("click", async () => {
        const id = b.dataset.ignorarCaso || b.closest("[data-caso]").dataset.caso;
        const res = await chamar("caso/radar/caso", { id }, { recarregar: false }).catch(() => null);
        if (!res) return;
        toast("Caso ignorado. Os assuntos dele deixam de formar casos (dá para voltar atrás nas regras).");
        recarregar();
      }),
    );
    // Vídeos
    $$("[data-v]", corpo).forEach((el) => {
      const it = r.itens.find((x) => x.id === el.dataset.v);
      // Abrir o vídeo marca-o como visto
      $$("[data-abrir]", el).forEach((a) => a.addEventListener("click", () => it.estado === "novo" && setTimeout(() => mudar([it.id], "visto"), 300)));
      el.querySelector("[data-estado]")?.addEventListener("click", (e) => mudar([it.id], e.currentTarget.dataset.estado));
      el.querySelector("[data-util]").addEventListener("click", () => util(it, !it.util));
      $$("[data-tag]", el).forEach((b) =>
        b.addEventListener("click", () => {
          const tags = new Set(it.tags || []);
          tags.has(b.dataset.tag) ? tags.delete(b.dataset.tag) : tags.add(b.dataset.tag);
          util(it, true, [...tags]);
        }),
      );
      el.querySelector("[data-remover]").addEventListener("click", async () => {
        if (await mudar([it.id], "remover")) toast("Removido do radar. O radar aprende a mostrar menos destes.");
      });
      el.querySelector("[data-noticia]")?.addEventListener("click", () => fazerNoticia(it, nome, mudar));
    });
  }
  desenhar();
}

function rodape(r) {
  const partes = [];
  const ronda = r.ronda || {};
  partes.push("O radar lê sozinho todos os Youtubers duas vezes por dia (de manhã e ao fim do dia), pelo feed de cada canal, que não gasta quota.");
  if (ronda.dia) partes.push(ronda.fim ? `Última ronda: ${esc(ha(ronda.fim))}.` : `Ronda a meio: ${inteiro(ronda.desde || 0)} de ${inteiro(ronda.total || 0)} canais.`);
  else if (r.ultima) partes.push(`Última leitura: ${esc(ha(r.ultima))}.`);
  if (r.nRemovidos) partes.push(`${inteiro(r.nRemovidos)} ${r.nRemovidos === 1 ? "vídeo removido" : "vídeos removidos"} (não voltam a aparecer).`);
  if (r.nEscondidos) partes.push(`${inteiro(r.nEscondidos)} ${r.nEscondidos === 1 ? "vídeo guardado" : "vídeos guardados"} abaixo do mínimo (podem subir com um caso ou com o que o radar aprende).`);
  partes.push(`Mínimo para entrar: ${r.regras.minimo} pontos. Abrir um vídeo marca-o como visto.`);
  return partes.join(" ");
}

/** Abre o editor das notícias já preenchido com o vídeo. */
async function fazerNoticia(it, nome, mudar) {
  const pessoas = [it.personId, ...(it.pessoas || [])].filter((id) => id && pessoa(id)).slice(0, 8);
  const polemica = it.tema === "stress";
  await novaNoticiaCom(
    {
      tema: it.tema,
      titulo: it.t,
      texto: `${it.personId ? nome(it.personId) : it.chNome || "Um canal"} publicou "${it.t}"${(it.pessoas || []).length ? `, onde fala de ${it.pessoas.map(nome).join(", ")}` : ""}.${it.desc ? `\n\n${it.desc.slice(0, 400)}` : ""}`,
      pessoas,
      link: urlVideo(it),
      imagem: it.th || "",
      pergunta: polemica && pessoas.length >= 2 ? "Quem tem razão?" : "",
      opcoes: polemica && pessoas.length >= 2 ? [...pessoas.slice(0, 2).map(nome), "Ninguém"] : [],
      estado: "rascunho",
      fixada: false,
      votar: true,
    },
    (n) => n && mudar([it.id], "noticia", { noticia: n.id }),
  );
}

/** Uma notícia sobre um caso inteiro (os vídeos de vários canais sobre o mesmo assunto). */
async function noticiaDoCaso(c, r, nome) {
  const doCaso = r.itens.filter((x) => x.caso?.id === c.id);
  const pessoas = [...new Set([...c.chaves.filter((k) => k.startsWith("p:")).map((k) => k.slice(2)), ...doCaso.flatMap((x) => [x.personId, ...(x.pessoas || [])])])].filter((id) => id && pessoa(id)).slice(0, 8);
  const temas = doCaso.map((x) => x.tema);
  const tema = ["stress", "noticia", "colab", "boa", "marco", "evento", "pausa", "rumor"].find((t) => temas.includes(t)) || "noticia";
  const v0 = c.videos[0];
  await novaNoticiaCom({
    tema,
    titulo: `Toda a gente está a falar de ${c.titulo}`,
    texto: `Nos últimos dias, ${c.canais} canais publicaram ${c.nVideos} vídeos sobre ${c.titulo}:\n\n${c.videos
      .slice(0, 6)
      .map((v) => `• ${v.dono ? nome(v.dono) : v.n || "Um canal"}: "${v.t}"`)
      .join("\n")}`,
    pessoas,
    link: v0 ? `https://www.youtube.com/${v0.s ? "shorts/" : "watch?v="}${v0.id}` : "",
    imagem: v0?.th || "",
    pergunta: tema === "stress" && pessoas.length >= 2 ? "Quem tem razão?" : "",
    opcoes: tema === "stress" && pessoas.length >= 2 ? [...pessoas.slice(0, 2).map(nome), "Ninguém"] : [],
    estado: "rascunho",
    fixada: false,
    votar: true,
  });
}

/** Os vídeos encontrados fora da bolha (e voltar a procurar). */
function verBolha(c, b, r, depois) {
  const { el, fechar } = janela(
    `<h2>🌍 ${esc(c.titulo)} fora da bolha</h2>
    <p class="muted">Vídeos de canais que não estão no Placar e que falam mesmo do Youtuber do caso. Contam como "lá fora" os canais de outro país ou os vídeos noutra língua (incluindo português do Brasil). Procura feita ${esc(ha(b.at))} com "${esc(b.q)}".</p>
    <div class="rdr-bolha-lista">${
      b.videos.length
        ? b.videos.map((v) => `<a class="rdr-outro ${v.fora ? "fora" : ""}" href="https://www.youtube.com/watch?v=${esc(v.id)}" target="_blank" rel="noopener">${v.th ? `<img src="${esc(v.th)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : "<span></span>"}<span><b>${esc(v.t)}</b><small>${esc(v.n)} · ${v.fora ? `🌍 ${esc(v.onde || v.pais || v.lingua)}` : `🇵🇹 ${esc(v.pais || v.lingua || "?")}`} · ${esc(ha(v.p))} · 👁 ${curto(v.v || 0)}</small></span></a>`).join("")
        : `<p class="muted">Nenhum vídeo de fora a falar disto.</p>`
    }</div>
    <div class="janela-acoes"><button class="btn" data-fechar>Fechar</button><button class="btn btn-primario" data-outra data-a-esperar="A procurar" title="100 unidades da quota">Procurar outra vez</button></div>`,
    { larga: true },
  );
  $("[data-outra]", el).addEventListener("click", async (e) => {
    const res = await chamar("caso/radar/bolha", { caso: c.id }, { botao: e.currentTarget, recarregar: false }).catch(() => null);
    if (!res) return;
    r.bolha = { ...(r.bolha || {}), [c.id]: res.bolha };
    fechar();
    depois();
  });
}

/** Os Youtubers escolhidos (ficam à frente e com os comentários lidos primeiro) e os canais extra a vigiar. */
function blocoEscolhidos(r) {
  const pessoas = (r.regras.escolhidos || []).map((id) => pessoa(id) || { id, name: r.nomes[id] || id });
  const extras = r.regras.extras || [];
  const vazio = !pessoas.length && !extras.length;
  return `<details class="painel ed-bloco rdr-escolhidos" ${vazio ? "open" : ""}>
    <summary><span><b>⭐ ${pessoas.length} ${pessoas.length === 1 ? "Youtuber escolhido" : "Youtubers escolhidos"}</b>${extras.length ? ` e ${extras.length} ${extras.length === 1 ? "canal extra" : "canais extra"}` : ""}</span><span class="rdr-mini-av">${pessoas.slice(0, 8).map((p) => avatar(p, 26)).join("")}</span><span class="muted rdr-editar">Editar</span></summary>
    <p class="muted">Os que costumam dar notícias. São lidos primeiro em cada ronda, os comentários deles são lidos primeiro, e esta aba mostra só os vídeos deles (os canais de clips de cada um também entram).</p>
    <div class="rdr-chips">${pessoas.map((p) => `<span class="rdr-chip">${avatar(p, 24)}${esc(p.name)}<button type="button" data-tirar-p="${esc(p.id)}" aria-label="Tirar ${esc(p.name)}">✕</button></span>`).join("") || `<span class="muted">Ainda ninguém.</span>`}</div>
    <div class="rdr-juntar"><span><input class="input" id="rdr-procura" placeholder="Juntar Youtuber…" autocomplete="off"><span class="ntp-resultados" id="rdr-resultados"></span></span></div>
    <h4 class="ed-sub">Canais extra a vigiar</h4>
    <p class="muted">Canais de clips ou de notícias que não estão no Placar (também de fora de Portugal). Os Youtubers que eles mencionam aparecem no radar.</p>
    <div class="rdr-chips">${extras.map((e) => `<span class="rdr-chip">${e.thumb ? `<img src="${esc(e.thumb)}" alt="" referrerpolicy="no-referrer">` : ""}${esc(e.title)}<button type="button" data-tirar-e="${esc(e.id)}" aria-label="Tirar ${esc(e.title)}">✕</button></span>`).join("") || `<span class="muted">Nenhum.</span>`}</div>
    <div class="rdr-juntar"><input class="input" id="rdr-extra" placeholder="Link do canal ou @handle"><button class="btn btn-pequeno" id="rdr-extra-ok" data-a-esperar="A procurar">Juntar canal</button></div>
  </details>`;
}

function ligarEscolhidos(corpo, r, recarregar) {
  const guardar = async (escolhidos) => {
    await chamar("caso/radar/regras", { escolhidos }, { recarregar: false }).catch(() => {});
    recarregar();
  };
  $$("[data-tirar-p]", corpo).forEach((b) => b.addEventListener("click", () => guardar(r.regras.escolhidos.filter((id) => id !== b.dataset.tirarP))));
  $$("[data-tirar-e]", corpo).forEach((b) =>
    b.addEventListener("click", async () => {
      await chamar("caso/radar/extra", { tirar: b.dataset.tirarE }, { recarregar: false }).catch(() => {});
      recarregar();
    }),
  );
  const procura = $("#rdr-procura", corpo);
  procura?.addEventListener("input", () => {
    const l = procura.value.trim() ? procurar(procura.value, 8).filter((p) => !r.regras.escolhidos.includes(p.id)) : [];
    $("#rdr-resultados", corpo).innerHTML = l.map((p) => `<button type="button" data-por="${esc(p.id)}">${avatar(p, 24)}${esc(p.name)}</button>`).join("");
    $$("[data-por]", corpo).forEach((b) => b.addEventListener("click", () => guardar([...r.regras.escolhidos, b.dataset.por])));
  });
  $("#rdr-extra-ok", corpo)?.addEventListener("click", async (e) => {
    const input = $("#rdr-extra", corpo).value.trim();
    if (!input) return toast("Cola o link do canal.", { erro: true });
    const res = await chamar("caso/radar/extra", { input }, { botao: e.currentTarget, recarregar: false }).catch(() => null);
    if (res) recarregar();
  });
}

function regras(r, depois, nome) {
  const g = r.regras;
  const temaNome = (k) => r.temas[k]?.nome || k;
  const nomeF = (f) => {
    const [tipo, k] = [f[0], f.slice(2)];
    return tipo === "q" ? `Vídeos de ${nome(k)}` : tipo === "p" ? `Falam de ${nome(k)}` : tipo === "w" ? `Palavra "${k}"` : tipo === "t" ? `Tema ${temaNome(k)}` : r.sinaisNome?.[k] || k;
  };
  const linha = (x) => `<li class="rdr-ap-linha"><span class="rdr-ap-peso ${x.peso > 0 ? "mais" : "menos"}">${x.peso > 0 ? "+" : ""}${String(x.peso).replace(".", ",")}</span><span>${esc(nomeF(x.f))}${x.f.startsWith("q:") && r.gosto.tags?.[x.f.slice(2)] ? ` <small class="muted">(${Object.entries(r.gosto.tags[x.f.slice(2)]).map(([t, n]) => `${esc((r.etiquetas[t] || t).toLowerCase())}: ${n}`).join(", ")})</small>` : ""}</span><small class="muted">${x.bom ? `👍 ${String(x.bom).replace(".", ",")}` : ""} ${x.mau ? `🗑 ${x.mau}` : ""}</small><button type="button" class="botao-icone" data-esquecer="${esc(x.f)}" aria-label="Esquecer" title="Esquecer">✕</button></li>`;
  const resumo = r.gosto?.resumo || [];
  const mais = resumo.filter((x) => x.peso > 0).slice(0, 12);
  const menos = resumo.filter((x) => x.peso < 0).slice(0, 8);
  const mudos = r.casosMudos || [];
  const { el, fechar } = janela(
    `<h2>Regras do radar</h2>
    <form class="vc-form">
      <label class="campo"><span>Pontos mínimos para um vídeo aparecer</span><input class="input" type="number" name="minimo" min="2" max="15" value="${g.minimo}"><small>Mais baixo apanha mais vídeos (e mais falsos alarmes). Cada Youtuber mencionado no título vale 4, cada palavra 1 a 3, e os sinais 1 a 3,5 (velocidade, tendências, regressos). Os casos a crescer e o que o radar aprendeu somam por cima.</small></label>
      <label class="campo"><span>Palavras a vigiar, além das que já vêm (uma por linha)</span><textarea class="input" name="palavras" rows="4" placeholder="sparking&#10;bomba=stress&#10;novo podcast=noticia">${esc((g.palavras || []).join("\n"))}</textarea><small>Podes dizer o tema depois de =: stress (polémica), pausa, colab, marco, evento, boa, noticia ou rumor.</small></label>
      <label class="ed-check"><input type="checkbox" name="comentarios" ${g.comentarios !== false ? "checked" : ""}> Ler os comentários dos vídeos que já parecem notícia</label>
      <label class="campo"><span>Máximo de comentários lidos por dia nas rondas automáticas</span><input class="input" type="number" name="comentariosDia" min="0" max="300" value="${g.comentariosDia ?? 60}"><small>1 unidade da quota por vídeo (a quota é de 10 000 por dia). Os escolhidos vão primeiro.</small></label>
      <label class="ed-check"><input type="checkbox" name="bolhaAuto" ${g.bolhaAuto !== false ? "checked" : ""}> Ver sozinho se o caso português mais forte saiu da bolha (1 vez por dia, cerca de 100 unidades)</label>
    </form>
    <p class="muted">Gasto normal por dia: cerca de 100 a 250 unidades das 10 000 (os vídeos vêm do feed, que é grátis).</p>
    <h3 class="ed-sub">🧠 O que o radar aprendeu contigo</h3>
    <p class="muted">Aprende com o que marcas como 👍 útil (com as etiquetas), o que vira notícia e o que removes. Os vídeos parecidos sobem ou descem até 5 pontos.</p>
    ${
      resumo.length
        ? `<div class="rdr-ap">${mais.length ? `<div><h4>Mostra mais</h4><ul>${mais.map(linha).join("")}</ul></div>` : ""}${menos.length ? `<div><h4>Mostra menos</h4><ul>${menos.map(linha).join("")}</ul></div>` : ""}</div>
           <button type="button" class="btn btn-pequeno" data-repor data-a-esperar="A esquecer">Esquecer tudo o que aprendeu</button>`
        : `<p class="muted">Ainda não aprendeu nada. Marca vídeos como 👍 útil ou remove os que não interessam.</p>`
    }
    ${mudos.length ? `<h3 class="ed-sub">🔕 Assuntos ignorados</h3><div class="rdr-chips">${mudos.map((k) => `<span class="rdr-chip">${esc(k.startsWith("p:") ? nome(k.slice(2)) : k.slice(2))}<button type="button" data-ouvir="${esc(k)}" aria-label="Voltar a ouvir">✕</button></span>`).join("")}</div>` : ""}
    <div class="janela-acoes"><button class="btn" data-fechar>Cancelar</button><button class="btn btn-primario" data-ok data-a-esperar="A guardar">Guardar</button></div>`,
    { larga: true },
  );
  $("[data-ok]", el).addEventListener("click", async (e) => {
    const f = $("form", el);
    const res = await chamar(
      "caso/radar/regras",
      { minimo: Number(f.elements.minimo.value), palavras: f.elements.palavras.value, comentarios: f.elements.comentarios.checked, comentariosDia: Number(f.elements.comentariosDia.value), bolhaAuto: f.elements.bolhaAuto.checked },
      { botao: e.currentTarget, recarregar: false, sucesso: "Regras guardadas. Valem para os próximos vídeos lidos." },
    ).catch(() => null);
    if (res) {
      fechar();
      depois();
    }
  });
  $$("[data-esquecer]", el).forEach((b) =>
    b.addEventListener("click", async () => {
      await chamar("caso/radar/aprender", { esquecer: b.dataset.esquecer }, { recarregar: false }).catch(() => {});
      b.closest("li").remove();
    }),
  );
  $("[data-repor]", el)?.addEventListener("click", async (e) => {
    const res = await chamar("caso/radar/aprender", { repor: true }, { botao: e.currentTarget, recarregar: false, sucesso: "O radar esqueceu o que tinha aprendido." }).catch(() => null);
    if (res) {
      fechar();
      depois();
    }
  });
  $$("[data-ouvir]", el).forEach((b) =>
    b.addEventListener("click", async () => {
      await chamar("caso/radar/caso", { id: b.dataset.ouvir, ignorar: false }, { recarregar: false }).catch(() => {});
      b.closest(".rdr-chip").remove();
    }),
  );
}
