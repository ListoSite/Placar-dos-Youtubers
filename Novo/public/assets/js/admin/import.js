// Importar dados: marcador do Social Blade e colar tabelas da folha de cálculo.

import { estado, carregar } from "../data.js";
import { esc, curto, inteiro, mesNome, norm, plural } from "../format.js";
import { $, $$, toast } from "../ui.js";
import { adm, chamar, escolherPessoa, pessoasOrdenadas, lerDb, linkSocialBlade, avisarMudanca } from "./common.js";
import { blocoEstimativa } from "./estimate-ui.js";
import { blocoAbout, escolhas } from "./youtube.js";

const MESES_PT = { jan: 1, janeiro: 1, fev: 2, fevereiro: 2, favereiro: 2, mar: 3, marco: 3, março: 3, abr: 4, abril: 4, mai: 5, maio: 5, may: 5, jun: 6, junho: 6, juno: 6, jul: 7, julho: 7, ago: 8, agosto: 8, set: 9, setembro: 9, out: 10, outubro: 10, octobro: 10, nov: 11, novembro: 11, dez: 12, dezembro: 12 };

export async function render(alvo, query) {
  const [marcador, marcadorYT] = await Promise.all([codigoMarcador("sb"), codigoMarcador("yt")]);
  alvo.innerHTML = `
    <div class="painel ed-bloco" id="yt">
      <h3>YouTube: o "Acerca de" de cada canal</h3>
      <p class="soft">Outro marcador, para o YouTube. Lê a janela "Acerca de" do canal (a que abre em "…mais"): descrição, links do Instagram, TikTok e outros sites, email escrito na descrição, país, data de entrada, subscritores, views e vídeos. Depois escolhes o que passa para o perfil de cada Youtuber.</p>
      <ol class="ed-passos">
        <li>Arrasta este botão para a barra de marcadores: <a class="btn btn-ouro btn-pequeno" id="yt-link" href="${esc(marcadorYT)}" onclick="event.preventDefault();alert('Arrasta este botão para a barra de marcadores. Depois usa-o numa página do YouTube.')">Placar ⇄ YouTube</a></li>
        <li><b>Um canal:</b> abre o canal no YouTube (ou um vídeo dele) e carrega no marcador. Na ficha de cada Youtuber, o link "Ler no YouTube" abre a página certa.</li>
        <li><b>Todos de uma vez:</b> <button class="btn btn-pequeno" id="ytl-copiar">Copiar lista para o YouTube</button>
          <label class="ed-check" style="margin-top:8px"><input type="checkbox" id="ytl-faltam" checked> Só canais que ainda não foram lidos</label>
          <label class="ed-check" style="margin-top:4px"><input type="checkbox" id="ytl-sug"> Incluir os canais sugeridos que ainda estão por confirmar (ajuda a ver se é a pessoa certa)</label>
          <small class="muted" id="ytl-n"></small><br>
          Abre uma página qualquer do YouTube, carrega no marcador, cola a lista em "Todos os canais da lista" e carrega em <b>Começar</b>. No fim, <b>Enviar resultados para o Placar</b>.</li>
      </ol>
      <p class="muted" style="font-size:var(--t-sm)">Conta com 2 a 4 segundos por canal e não gasta quota da API. O email para empresas que o YouTube esconde atrás de "Ver endereço de email" não vem: só o que estiver escrito na descrição.</p>
      <label class="campo" style="margin-top:10px"><span>Ou cola aqui o que o marcador copiou</span><textarea class="input" id="yt-colar" rows="2" placeholder='{"kind":"placar-yt",...}'></textarea></label>
      <div class="ed-acoes" style="justify-content:flex-start"><button class="btn" id="yt-ler">Ler dados colados</button></div>
      <div id="yt-resultado"></div>
    </div>

    <div class="painel ed-bloco" id="sb">
      <h3>Social Blade: todos os canais de uma vez</h3>
      <p class="soft">Um marcador do browser percorre o Social Blade e traz os meses que lá aparecem (views ganhas em cada mês). Corre no teu computador, lê vários canais ao mesmo tempo e vai guardando o que já fez.</p>
      <ol class="ed-passos">
        <li>Arrasta este botão para a barra de marcadores do browser: <a class="btn btn-ouro btn-pequeno" id="sb-link" href="${esc(marcador)}" onclick="event.preventDefault();alert('Arrasta este botão para a barra de marcadores. Depois usa-o numa página de canal do Social Blade.')">Placar ⇄ Social Blade</a><br><small class="muted">Se já tinhas o marcador antigo, apaga-o e usa este.</small></li>
        <li>Copia a lista de canais: <button class="btn btn-pequeno" id="sbl-copiar">Copiar lista de canais</button>
          <label class="ed-check" style="margin-top:8px"><input type="checkbox" id="sbl-faltam" checked> Só canais que ainda não têm meses do Social Blade</label>
          <small class="muted" id="sbl-n"></small></li>
        <li>Abre a página de um canal qualquer no Social Blade (por exemplo <b>socialblade.com/youtube/handle/wuant</b>) e espera que os gráficos apareçam. Carrega no marcador, cola a lista na caixa "Todos os canais da lista" e carrega em <b>Começar</b>.</li>
        <li>No fim, carrega em <b>Enviar resultados para o Placar</b>. Abre-se esta página com tudo pronto para confirmares antes de gravar.</li>
      </ol>
      <p class="muted" style="font-size:var(--t-sm)"><b>Velocidade:</b> no marcador escolhes <b>Rápida</b> (4 canais de cada vez), <b>Normal</b> (3 de cada vez, a que vem por defeito) ou <b>Cuidadosa</b> (um de cada vez, com pausas, como antes). Conta com cerca de 1 segundo por canal na Rápida, 1 a 2 na Normal e uns 5 na Cuidadosa (mais quando o Youtuber tem TikTok, Instagram ou Twitch). Se o Social Blade pedir calma, o marcador espera e abranda sozinho, e volta a acelerar depois. Podes mudar de separador enquanto corre, pausar e continuar mais tarde, mesmo depois de fechar o browser. Se o Social Blade pedir uma verificação, o marcador para e passa para uma velocidade mais lenta: recarrega a página do Social Blade, espera um pouco e carrega outra vez no marcador para continuar de onde ficou. O mesmo marcador também lê só o canal que tens aberto. <b>Depois de mudar o marcador, apaga o antigo da barra e arrasta este outra vez.</b></p>
      <p class="muted" style="font-size:var(--t-sm)"><b>Instagram e Twitch:</b> quando o Youtuber tem link do Instagram ou da Twitch (no perfil ou nas redes que o Social Blade mostra no canal), o marcador traz também os seguidores, as publicações, o envolvimento (gostos e comentários por publicação) e os seguidores ganhos em cada mês. No Instagram, o Social Blade só mostra o histórico de cada mês a quem tem sessão iniciada lá (a conta gratuita chega); sem sessão vêm só os números de hoje. Também podes abrir um perfil (<b>socialblade.com/instagram/user/nome</b> ou <b>/twitch/user/nome</b>) e carregar no marcador.</p>
      <p class="muted" style="font-size:var(--t-sm)"><b>TikTok:</b> quando o Youtuber tem TikTok (no link das redes do perfil ou nas redes que o Social Blade mostra no canal do YouTube), o marcador traz também os seguidores, gostos e vídeos do TikTok e os ganhos de cada mês. Para um TikTok que não aparece ligado, abre o perfil no Social Blade (<b>socialblade.com/tiktok/user/nome</b>) e carrega no marcador.</p>
      <label class="campo" style="margin-top:10px"><span>Ou cola aqui o que o marcador copiou</span><textarea class="input" id="sb-colar" rows="3" placeholder='{"kind":"placar-sb-lote",...}'></textarea></label>
      <div class="ed-acoes" style="justify-content:flex-start"><button class="btn" id="sb-ler">Ler dados colados</button></div>
      <div id="sb-resultado"></div>
    </div>

    <div class="painel ed-bloco" id="fl">
      <h3>Colar da folha de cálculo</h3>
      <p class="soft">Copia uma tabela do Excel ou do Google Sheets e cola aqui. A primeira coluna é o nome do Youtuber e as outras são meses. A primeira linha tem os meses, por exemplo <b>Agosto 2025</b>, <b>08/25</b> ou <b>2025-08</b>.</p>
      <textarea class="input" id="fl-texto" rows="7" placeholder="Nome&#9;Agosto 2025&#9;Setembro 2025&#10;Wuant&#9;1 200 000&#9;1 350 000"></textarea>
      <div class="ed-acoes" style="justify-content:flex-start"><button class="btn" id="fl-ler">Ver o que vai ser importado</button></div>
      <div id="fl-resultado"></div>
    </div>`;

  blocoEstimativa(alvo, $("#fl", alvo));

  const contarLista = () => {
    const n = listaCanais($("#sbl-faltam", alvo).checked).length;
    $("#sbl-n", alvo).textContent = `${plural(n, "canal", "canais")} na lista.`;
  };
  contarLista();
  $("#sbl-faltam", alvo).addEventListener("change", contarLista);
  $("#sbl-copiar", alvo).addEventListener("click", async (e) => {
    const botao = e.currentTarget;
    const canais = listaCanais($("#sbl-faltam", alvo).checked);
    if (!canais.length) return toast("Não há canais para pôr na lista. Liga primeiro os canais em Ligar canais.", { erro: true });
    await copiarTexto(JSON.stringify({ kind: "placar-sb-lista", v: 1, canais }));
    botao.textContent = "Lista copiada ✓";
    toast(`${plural(canais.length, "canal copiado", "canais copiados")}. Agora cola no marcador, no Social Blade.`);
  });

  $("#sb-ler", alvo).addEventListener("click", () => {
    let raw;
    try {
      raw = JSON.parse($("#sb-colar", alvo).value);
    } catch {
      return toast("Isso não parece vir do marcador.", { erro: true });
    }
    if (raw?.kind === "placar-sb-lote") mostrarLote($("#sb-resultado", alvo), raw);
    else mostrarSocialBlade($("#sb-resultado", alvo), raw);
  });
  $("#fl-ler", alvo).addEventListener("click", () => mostrarFolha($("#fl-resultado", alvo), $("#fl-texto", alvo).value));

  // YouTube
  const contarYT = () => {
    const n = listaYouTube($("#ytl-faltam", alvo).checked, $("#ytl-sug", alvo).checked).length;
    $("#ytl-n", alvo).textContent = `${plural(n, "canal", "canais")} na lista.`;
  };
  contarYT();
  $("#ytl-faltam", alvo).addEventListener("change", contarYT);
  $("#ytl-sug", alvo).addEventListener("change", contarYT);
  $("#ytl-copiar", alvo).addEventListener("click", async (e) => {
    const botao = e.currentTarget;
    const canais = listaYouTube($("#ytl-faltam", alvo).checked, $("#ytl-sug", alvo).checked);
    if (!canais.length) return toast("Não há canais para pôr na lista.", { erro: true });
    await copiarTexto(JSON.stringify({ kind: "placar-yt-lista", v: 1, canais }));
    botao.textContent = "Lista copiada ✓";
    toast(`${plural(canais.length, "canal copiado", "canais copiados")}. Agora cola no marcador, no YouTube.`);
  });
  $("#yt-ler", alvo).addEventListener("click", () => {
    let raw;
    try {
      raw = JSON.parse($("#yt-colar", alvo).value);
    } catch {
      return toast("Isso não parece vir do marcador do YouTube.", { erro: true });
    }
    mostrarYouTube($("#yt-resultado", alvo), raw);
  });

  for (const [param, mostrar, onde] of [
    ["sb", mostrarSocialBlade, "#sb-resultado"],
    ["sbl", mostrarLote, "#sb-resultado"],
    ["yt", mostrarYouTube, "#yt-resultado"],
  ]) {
    const v = query.get(param);
    if (!v) continue;
    try {
      const raw = JSON.parse(decodeURIComponent(escape(atob(v))));
      history.replaceState(null, "", "#/editar/importar");
      mostrar($(onde, alvo), raw);
      $(onde, alvo).scrollIntoView({ block: "start" });
    } catch {
      toast("Não consegui ler os dados do marcador.", { erro: true });
    }
  }
}

async function copiarTexto(t) {
  try {
    await navigator.clipboard.writeText(t);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = t;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
}

/** Canais ligados, para o marcador percorrer no Social Blade. */
function listaCanais(soFaltam) {
  const stats = estado.canais || new Map();
  return Object.values(adm.db.channels)
    .filter((c) => c.personId && adm.db.people[c.personId])
    .filter((c) => !soFaltam || !Object.values(c.monthly || {}).some((m) => m.src === "socialblade"))
    .sort((a, b) => (a.role === "principal" ? 0 : 1) - (b.role === "principal" ? 0 : 1) || adm.db.people[a.personId].name.localeCompare(adm.db.people[b.personId].name, "pt"))
    .map((c) => {
      const p = adm.db.people[c.personId];
      const tt = p.socials?.tiktok;
      const ig = p.socials?.instagram;
      const tw = p.socials?.twitch;
      const principal = c.role === "principal" || p.channels?.length === 1;
      return {
        id: c.id,
        h: String(c.handle || stats.get(c.id)?.handle || "").replace(/^@/, ""),
        n: p.name + (c.role === "principal" ? "" : ` (${c.title || c.role})`),
        p: c.personId,
        // As redes da pessoa vão só com o canal principal (o marcador lê-as uma vez)
        ...(principal && (tt?.handle || tt?.url) ? { tt: tt.handle || tt.url } : {}),
        ...(principal && (ig?.handle || ig?.url) ? { ig: ig.handle || ig.url } : {}),
        ...(principal && (tw?.handle || tw?.url) ? { tw: tw.handle || tw.url } : {}),
      };
    });
}

async function codigoMarcador(nome) {
  const src = await fetch(`/assets/js/admin/${nome}-marcador.txt`).then((r) => r.text());
  const min = src.replace("__ORIGEM__", location.origin).replace(/\n/g, "");
  return "javascript:" + encodeURIComponent(min);
}

// ---------- Social Blade ----------

function numero(tok) {
  const t = tok.replace(/^[+]/, "");
  const m = /^(-?)([\d.,]+)([KMB])?$/i.exec(t);
  if (!m) return null;
  if (m[3]) {
    const v = parseFloat(m[2].replace(/,/g, ""));
    return { v: (m[1] ? -1 : 1) * v * { K: 1e3, M: 1e6, B: 1e9 }[m[3].toUpperCase()], abrev: true };
  }
  const v = Number(m[2].replace(/[,.]/g, ""));
  return Number.isFinite(v) ? { v: (m[1] ? -1 : 1) * v, abrev: false, sinal: /^[+-]/.test(tok) } : null;
}

function paraData(x) {
  if (typeof x === "number") return new Date(x > 1e11 ? x : x * 1000);
  const d = new Date(x);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Transforma os dados em bruto do marcador em meses e dias. */
export function interpretarSocialBlade(raw) {
  const res = { channelId: raw.channelId || "", handle: raw.handle || "", title: raw.title || "", daily: [], monthly: [], notas: [], sb: raw.sb || null };

  // Formato da API do Social Blade (marcador v3): colunas por mês e por dia
  if (raw.sb && (raw.sb.m || raw.sb.d)) {
    const { m, d } = raw.sb;
    if (m) {
      const [y0, m0] = m.ini.split("-").map(Number);
      m.v.forEach((v, i) => {
        if (v === null || v === undefined || v < 0) return;
        const t = new Date(Date.UTC(y0, m0 - 1 + i, 1));
        res.monthly.push({ month: t.toISOString().slice(0, 7), views: Math.round(v) });
      });
    }
    if (d) {
      const ini = Date.parse(d.ini + "T00:00:00Z");
      d.v.forEach((v, i) => v && res.daily.push({ date: new Date(ini + i * 86400000).toISOString().slice(0, 10), views: v, subs: d.s?.[i] ?? null }));
    }
    res.notas.push("Lido da API do Social Blade: views, subscritores e vídeos de cada mês, totais dos últimos 30 dias e ganhos por semana.");
    return res;
  }

  // Tabela dos últimos dias (data, alterações e totais)
  for (const row of raw.rows || []) {
    const md = /(\d{4}-\d{2}-\d{2})/.exec(row);
    if (!md) continue;
    const toks = row.replace(md[0], " ").replace(/\$[\d.,KM]+\s*-\s*\$[\d.,KM]+/gi, " ").split(/\s+/).filter(Boolean);
    const nums = toks.map(numero).filter(Boolean);
    const exatos = nums.filter((n) => !n.abrev && !n.sinal && n.v >= 1000);
    if (!exatos.length) continue;
    const views = Math.max(...exatos.map((n) => n.v));
    const abrev = nums.find((n) => n.abrev && n.v > 0);
    res.daily.push({ date: md[1], views, subs: abrev ? Math.round(abrev.v) : null });
  }

  // Séries dos gráficos
  const series = (raw.series || [])
    .map((s) => {
      const pts = s.points
        .map(([x, y]) => [paraData(x), Number(y)])
        .filter(([d, y]) => d && Number.isFinite(y))
        .sort((a, b) => a[0] - b[0]);
      const nome = norm(`${s.chart} ${s.name}`);
      const dif = [];
      for (let i = 1; i < pts.length; i++) dif.push((pts[i][0] - pts[i - 1][0]) / 86400000);
      dif.sort((a, b) => a - b);
      const passo = dif.length ? dif[Math.floor(dif.length / 2)] : 0;
      let sobe = 0;
      for (let i = 1; i < pts.length; i++) if (pts[i][1] >= pts[i - 1][1]) sobe++;
      const crescente = pts.length > 3 && sobe / (pts.length - 1) > 0.95;
      const difs = [];
      for (let i = 1; i < pts.length; i++) difs.push(Math.abs(pts[i][1] - pts[i - 1][1]));
      difs.sort((a, b) => a - b);
      const medDif = difs[Math.floor(difs.length / 2)] || 1;
      const minimo = Math.min(...pts.map((p) => p[1]));
      // É uma série de totais (acumulados) ou de views ganhas em cada período?
      let monotona;
      if (/total/.test(nome)) monotona = true;
      else if (/gain|ganh|monthly|daily|weekly|mensal|diari|por mes|por dia/.test(nome)) monotona = false;
      else monotona = crescente && minimo > 20 * medDif;
      return { pts, nome, passo, monotona };
    })
    .filter((s) => s.pts.length > 2 && /view|visualiza/.test(s.nome) && !/sub|earn|ganho|ganhos|revenue|\$/.test(s.nome));

  const porMes = new Map();
  const mesDe = (d) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  // 1) Séries mensais
  for (const s of series.filter((x) => x.passo >= 25 && x.passo <= 35)) {
    if (s.monotona) {
      for (let i = 1; i < s.pts.length; i++) {
        const [a, b] = [s.pts[i - 1][0], s.pts[i][0]];
        const seguidos = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + b.getUTCMonth() - a.getUTCMonth() === 1;
        if (seguidos) porMes.set(mesDe(a), s.pts[i][1] - s.pts[i - 1][1]);
      }
      res.notas.push("Meses calculados a partir do total mensal.");
    } else {
      for (const [d, y] of s.pts) if (!porMes.has(mesDe(d))) porMes.set(mesDe(d), y);
      res.notas.push("Meses lidos do gráfico de views ganhas por mês.");
    }
  }
  // 2) Séries diárias: totais ou ganhos por dia, somados por mês completo
  if (!porMes.size) {
    for (const s of series.filter((x) => x.passo >= 0.8 && x.passo <= 1.5)) {
      const dias = new Map();
      if (s.monotona) {
        for (const [d, y] of s.pts) dias.set(d.toISOString().slice(0, 10), y);
        for (const [dt, y] of dias) res.daily.push({ date: dt, views: y, subs: null });
        const chaves = [...dias.keys()].sort();
        const meses = [...new Set(chaves.map((k) => k.slice(0, 7)))];
        for (let i = 0; i < meses.length - 1; i++) {
          const ini = chaves.find((k) => k.startsWith(meses[i]));
          const fim = chaves.find((k) => k.startsWith(meses[i + 1]));
          if (ini && fim && Number(ini.slice(8)) <= 2 && Number(fim.slice(8)) <= 2) porMes.set(meses[i], dias.get(fim) - dias.get(ini));
        }
        res.notas.push("Meses calculados a partir do total diário.");
      } else {
        const soma = new Map();
        const conta = new Map();
        for (const [d, y] of s.pts) {
          const m = mesDe(d);
          soma.set(m, (soma.get(m) || 0) + y);
          conta.set(m, (conta.get(m) || 0) + 1);
        }
        for (const [m, v] of soma) {
          const [yy, mm] = m.split("-").map(Number);
          const dim = new Date(Date.UTC(yy, mm, 0)).getUTCDate();
          if (conta.get(m) >= dim - 1) porMes.set(m, v);
        }
        res.notas.push("Meses somados a partir das views ganhas por dia.");
      }
      if (porMes.size) break;
    }
  }
  res.monthly = [...porMes.entries()].filter(([, v]) => v >= 0).sort((a, b) => a[0].localeCompare(b[0])).map(([month, views]) => ({ month, views: Math.round(views) }));
  const vistos = new Set();
  res.daily = res.daily.filter((d) => !vistos.has(d.date) && vistos.add(d.date)).sort((a, b) => a.date.localeCompare(b.date));
  return res;
}

/** Resumo do TikTok lido pelo marcador. */
function textoTikTok(tt) {
  if (!tt?.info) return "";
  const i = tt.info;
  return `TikTok @${i.user}: ${[i.seg !== null ? `${curto(i.seg)} seguidores` : "", i.gostos !== null ? `${curto(i.gostos)} gostos` : "", i.videos !== null ? `${i.videos} vídeos` : "", tt.m ? `${plural(tt.m.f.length, "mês", "meses")} de ganhos` : ""].filter(Boolean).join(", ")}.`;
}

const NOME_REDE = { instagram: "Instagram", twitch: "Twitch" };
/** Resumo do Instagram e da Twitch lidos pelo marcador. */
function textoRedes(redes) {
  return Object.values(redes || {})
    .map((x) => `${NOME_REDE[x.rede]} @${x.info.user}: ${[x.info.seg !== null ? `${curto(x.info.seg)} seguidores` : "", x.info.posts ? `${inteiro(x.info.posts)} publicações` : "", x.info.eng ? `${String(x.info.eng).replace(".", ",")}% de envolvimento` : "", x.m?.c?.followers ? plural(x.m.c.followers.filter((v) => v !== null).length, "mês", "meses") + " de ganhos" : x.semSessao ? "sem histórico (falta a sessão no Social Blade)" : ""].filter(Boolean).join(", ")}.`)
    .join(" ");
}

/** Só Instagram ou Twitch: o marcador foi usado na página desse perfil no Social Blade. */
function mostrarRede(alvo, raw) {
  const x = raw.redes?.[raw.soRede];
  if (!x) {
    alvo.innerHTML = `<div class="aviso"><p>Não vieram números d${raw.soRede === "twitch" ? "a Twitch" : "o Instagram"}.</p></div>`;
    return;
  }
  const user = x.info.user.toLowerCase();
  const re = x.rede === "instagram" ? /instagram\.com\/([\w.]+)/i : /twitch\.tv\/(\w+)/i;
  let pessoa = pessoasOrdenadas().find((p) => {
    const s = p.socials?.[x.rede];
    return (s?.handle || "").replace(/^@/, "").toLowerCase() === user || re.exec(s?.url || "")?.[1]?.toLowerCase() === user;
  });
  alvo.innerHTML = `<hr class="ed-linha">
    <h3>${esc(x.info.nome || "@" + x.info.user)}</h3>
    <p class="soft">${esc(textoRedes(raw.redes))}</p>
    <p class="muted" style="font-size:var(--t-sm)">Fica no perfil do Youtuber: o link (se ainda não houver), os seguidores de hoje e do fim de cada um dos últimos 12 meses (nas Outras redes) e uma secção ${NOME_REDE[x.rede]} com o envolvimento e o gráfico dos ganhos por mês.</p>
    <div class="ed-grelha" style="margin-top:14px;align-items:end">
      <label class="campo"><span>Guardar em</span><span style="position:relative"><input class="input" id="rd-pessoa" placeholder="Escolher Youtuber" value="${esc(pessoa?.name || "")}"></span></label>
      <div><button class="btn btn-primario" id="rd-importar" data-a-esperar="A importar" ${pessoa ? "" : "disabled"}>Importar ${NOME_REDE[x.rede]}</button></div>
    </div>`;
  const input = $("#rd-pessoa", alvo);
  escolherPessoa(input, (p) => {
    pessoa = p;
    input.value = p.name;
    $("#rd-importar", alvo).disabled = false;
  });
  $("#rd-importar", alvo).addEventListener("click", async (e) => {
    const res = await chamar("import/socialblade", { payload: { soRede: x.rede, redes: raw.redes }, personId: pessoa?.id }, { botao: e.currentTarget }).catch(() => null);
    if (!res) return;
    if (res.needsTarget) return toast("Escolhe primeiro o Youtuber.", { erro: true });
    toast(`${NOME_REDE[x.rede]} @${res.user} guardado.`);
    alvo.innerHTML = `<div class="aviso info" style="margin-top:14px"><p>Feito: ${NOME_REDE[x.rede]} guardado em <a href="#/editar/youtubers?id=${encodeURIComponent(res.personId)}">${esc(adm.db.people[res.personId]?.name || "")}</a>.</p></div>`;
  });
}

/** Só TikTok: o marcador foi usado na página de um perfil do TikTok no Social Blade. */
function mostrarTikTok(alvo, raw) {
  const tt = raw.tt;
  if (!tt) {
    alvo.innerHTML = `<div class="aviso"><p>Não vieram números do TikTok.</p></div>`;
    return;
  }
  const user = tt.info.user.toLowerCase();
  let pessoa = pessoasOrdenadas().find((p) => {
    const s = p.socials?.tiktok;
    return (s?.handle || "").toLowerCase() === user || /tiktok\.com\/@([\w.]+)/i.exec(s?.url || "")?.[1]?.toLowerCase() === user;
  });
  alvo.innerHTML = `<hr class="ed-linha">
    <h3>${esc(tt.info.nome || "@" + tt.info.user)}</h3>
    <p class="soft">${esc(textoTikTok(tt))}</p>
    <p class="muted" style="font-size:var(--t-sm)">Fica no perfil do Youtuber: o link do TikTok (se ainda não houver), os seguidores, gostos e vídeos de hoje e do fim de cada um dos últimos 12 meses, e o gráfico de crescimento.</p>
    <div class="ed-grelha" style="margin-top:14px;align-items:end">
      <label class="campo"><span>Guardar em</span><span style="position:relative"><input class="input" id="tt-pessoa" placeholder="Escolher Youtuber" value="${esc(pessoa?.name || "")}"></span></label>
      <div><button class="btn btn-primario" id="tt-importar" data-a-esperar="A importar" ${pessoa ? "" : "disabled"}>Importar TikTok</button></div>
    </div>`;
  const input = $("#tt-pessoa", alvo);
  escolherPessoa(input, (p) => {
    pessoa = p;
    input.value = p.name;
    $("#tt-importar", alvo).disabled = false;
  });
  $("#tt-importar", alvo).addEventListener("click", async (e) => {
    const res = await chamar("import/socialblade", { payload: { soTikTok: true, tt }, personId: pessoa?.id }, { botao: e.currentTarget }).catch(() => null);
    if (!res) return;
    if (res.needsTarget) return toast("Escolhe primeiro o Youtuber.", { erro: true });
    toast(`TikTok @${res.tiktok} guardado.`);
    alvo.innerHTML = `<div class="aviso info" style="margin-top:14px"><p>Feito: TikTok guardado em <a href="#/youtuber/${encodeURIComponent(res.personId)}">${esc(adm.db.people[res.personId]?.name || "")}</a>.</p></div>`;
  });
}

function mostrarSocialBlade(alvo, raw) {
  if (raw?.soRede) return mostrarRede(alvo, raw);
  if (raw?.soTikTok) return mostrarTikTok(alvo, raw);
  const r = interpretarSocialBlade(raw);
  const curMes = estado.ds.currentMonth;
  const canal = r.channelId && adm.db.channels[r.channelId];
  let pessoaEscolhida = canal ? adm.db.people[canal.personId] : null;
  if (!pessoaEscolhida && r.handle) {
    const h = norm(r.handle);
    pessoaEscolhida = pessoasOrdenadas().find((p) => norm(p.name).replace(/\s/g, "") === h) || null;
  }
  const meses = r.monthly.filter((m) => m.month < curMes);
  alvo.innerHTML = `<hr class="ed-linha">
    <h3>${esc(r.title || r.handle || "Canal")}</h3>
    <p class="soft">${r.channelId ? `Canal ${esc(r.channelId)}. ` : ""}${canal ? `Já está ligado a <b>${esc(adm.db.people[canal.personId]?.name)}</b>.` : "Este canal ainda não está ligado a ninguém no placar."}</p>
    <p class="muted" style="font-size:var(--t-sm)">${plural(meses.length, "mês", "meses")} e ${plural(r.daily.length, "dia", "dias")} encontrados. ${esc(r.notas.join(" "))} ${esc(textoTikTok(raw.tt))} ${esc(textoRedes(raw.redes))}</p>
    ${!meses.length && !r.daily.length ? `<div class="aviso"><p>Não encontrei números nesta página. Abre os gráficos detalhados no Social Blade e volta a usar o marcador. Se continuar a falhar, copia o texto da caixa abaixo e manda-mo para eu ajustar o marcador.</p></div><textarea class="input" rows="4" readonly>${esc(JSON.stringify({ libs: raw.libs, series: (raw.series || []).map((s) => ({ chart: s.chart, name: s.name, n: s.points.length, ex: s.points.slice(0, 3) })), rows: (raw.rows || []).slice(0, 3), erro: raw.erro }))}</textarea>` : ""}
    ${meses.length ? `<div class="sb-meses">${meses.map((m) => `<span><small>${esc(mesNome(m.month, { curto: true }))}</small><b>${curto(m.views)}</b></span>`).join("")}</div>` : ""}
    ${meses.length || r.daily.length ? `<div class="ed-grelha" style="margin-top:14px;align-items:end">
      <label class="campo"><span>Guardar em</span><span style="position:relative"><input class="input" id="sb-pessoa" placeholder="Escolher Youtuber" value="${esc(pessoaEscolhida?.name || "")}"></span><small>${canal ? "Os meses ficam no canal ligado." : "Se a pessoa não tiver canal, o canal é ligado automaticamente."}</small></label>
      <div><button class="btn btn-primario" id="sb-importar" data-a-esperar="A importar" ${pessoaEscolhida || canal ? "" : "disabled"}>Importar ${plural(meses.length, "mês", "meses")}</button></div>
    </div>` : ""}`;
  const input = $("#sb-pessoa", alvo);
  if (input)
    escolherPessoa(input, (p) => {
      pessoaEscolhida = p;
      input.value = p.name;
      $("#sb-importar", alvo).disabled = false;
    });
  $("#sb-importar", alvo)?.addEventListener("click", async (e) => {
    const payload = { channelId: r.channelId, handle: r.handle, title: r.title, monthly: r.monthly, daily: r.daily, sb: r.sb, tt: raw.tt || undefined, redes: raw.redes || undefined };
    const corpo = { payload };
    if (canal) corpo.channelId = r.channelId;
    else if (pessoaEscolhida) corpo.personId = pessoaEscolhida.id;
    const res = await chamar("import/socialblade", corpo, { botao: e.currentTarget }).catch(() => null);
    if (!res) return;
    if (res.needsTarget) return toast("Escolhe primeiro o Youtuber.", { erro: true });
    toast(`Importados ${res.months} meses e ${res.days} dias${res.extra ? ", com subscritores e vídeos" : ""}${res.redes ? ` e ${plural(res.redes, "rede social", "redes sociais")}` : ""}${res.tiktok ? `, mais o TikTok @${res.tiktok}` : ""}${res.outras?.length ? `, ${res.outras.map((r) => NOME_REDE[r]).join(" e ")}` : ""}.`);
    alvo.innerHTML = `<div class="aviso info" style="margin-top:14px"><p>Feito: ${res.months} meses e ${res.days} dias guardados${res.personId ? ` em <a href="#/youtuber/${encodeURIComponent(res.personId)}">${esc(adm.db.people[res.personId]?.name || "")}</a>` : ""}. Podes passar ao canal seguinte.</p></div>`;
  });
}

// ---------- Social Blade em lote ----------

function mostrarLote(alvo, lote) {
  const curMes = estado.ds.currentMonth;
  const linhas = (lote.itens || []).map((it) => {
    const r = interpretarSocialBlade(it);
    const link = adm.db.channels[it.channelId];
    const pessoa = link ? adm.db.people[link.personId] : null;
    return { it, link, pessoa, meses: r.monthly.filter((m) => m.month < curMes), notas: r.notas, sb: r.sb, tt: it.tt || null, redes: it.redes || null };
  });
  let substituirFolha = false;

  const aImportar = (l) =>
    l.meses.filter((m) => {
      if (!l.link || l.link.monthly?.[m.month]?.lock) return false;
      const daPessoa = l.pessoa?.monthly?.[m.month];
      if (!substituirFolha && daPessoa && daPessoa.src !== "estimativa") return false;
      return true;
    });

  const desenhar = () => {
    const comDados = linhas.filter((l) => l.meses.length || l.sb || l.tt || l.redes);
    const prontos = linhas.filter((l) => l.link && (aImportar(l).length || l.sb || l.tt || l.redes));
    const comTT = prontos.filter((l) => l.tt).length;
    const comIG = prontos.filter((l) => l.redes?.instagram).length;
    const comTW = prontos.filter((l) => l.redes?.twitch).length;
    const comExtra = prontos.filter((l) => l.sb).length;
    const redes = prontos.reduce((a, l) => a + (l.sb?.info?.redes?.length || 0), 0);
    const total = prontos.reduce((a, l) => a + aImportar(l).length, 0);
    const semCanal = linhas.filter((l) => !l.link).length;
    alvo.innerHTML = `<hr class="ed-linha">
      <h3>Resultados do Social Blade</h3>
      <p class="soft">${plural(linhas.length, "canal lido", "canais lidos")}, ${comDados.length} com meses. ${prontos.length ? `Vou gravar <b>${plural(total, "mês", "meses")}</b> de views em ${plural(prontos.length, "canal", "canais")}${comExtra ? `, mais subscritores e vídeos por mês, os últimos 30 dias e as últimas 52 semanas de ${plural(comExtra, "canal", "canais")}${redes ? ` e ${plural(redes, "link", "links")} de redes sociais (só entram onde ainda não há link)` : ""}` : ""}${comTT ? `, e os números do TikTok de ${plural(comTT, "Youtuber", "Youtubers")}` : ""}${comIG ? `, do Instagram de ${plural(comIG, "Youtuber", "Youtubers")}` : ""}${comTW ? `, da Twitch de ${plural(comTW, "Youtuber", "Youtubers")}` : ""}.` : "Nada de novo para gravar."}${semCanal ? ` ${plural(semCanal, "canal já não está", "canais já não estão")} no placar e fica${semCanal > 1 ? "m" : ""} de fora.` : ""}</p>
      <label class="ed-check"><input type="checkbox" id="lt-folha" ${substituirFolha ? "checked" : ""}> Substituir também os meses que já vêm da folha ou foram escritos à mão</label>
      <p class="muted" style="font-size:var(--t-sm);margin-top:6px">Sem esta opção, só entram os meses que ainda não têm dados reais (o buraco). Meses fixados (com cadeado) nunca são alterados. As estimativas (≈) são sempre substituídas.</p>
      <div class="ed-acoes" style="justify-content:flex-start"><button class="btn btn-primario" id="lt-importar" data-a-esperar="A gravar" ${prontos.length ? "" : "disabled"}>Gravar ${plural(prontos.length, "canal", "canais")}</button><span class="muted" id="lt-estado"></span></div>
      <div class="tabela-caixa" style="margin-top:12px;max-height:420px;overflow:auto"><table class="tabela"><thead><tr><th>Youtuber</th><th class="dir">Meses lidos</th><th class="dir">A gravar</th><th>Período</th><th>Mais</th><th></th></tr></thead><tbody>
      ${linhas
        .sort((a, b) => aImportar(b).length - aImportar(a).length || b.meses.length - a.meses.length)
        .map((l) => {
          const n = aImportar(l).length;
          const nome = l.pessoa ? esc(l.pessoa.name) + (l.link.role === "principal" ? "" : ` <small class="muted">${esc(l.link.title || l.link.role)}</small>`) : `<span class="muted">${esc(l.it.title || l.it.channelId)}</span>`;
          const periodo = l.meses.length ? `${mesNome(l.meses[0].month, { curto: true })} a ${mesNome(l.meses[l.meses.length - 1].month, { curto: true })}` : `<span class="muted">${esc(l.it.erro || "sem dados")}</span>`;
          const extraRedes = Object.values(l.redes || {}).map((x) => `${NOME_REDE[x.rede]} @${x.info?.user}`);
          const mais = [...(l.sb ? [l.sb.m ? "subs e vídeos" : "", l.sb.d ? "30 dias" : "", l.sb.w ? "52 semanas" : "", l.sb.info?.redes?.length ? plural(l.sb.info.redes.length, "rede", "redes") : ""] : []), l.tt ? `TikTok @${l.tt.info?.user}` : "", ...extraRedes].filter(Boolean).join(", ");
          return `<tr style="cursor:default;${n || l.sb || l.tt || l.redes ? "" : "opacity:.6"}"><td>${nome}</td><td class="dir">${l.meses.length}</td><td class="dir"><b>${n}</b></td><td>${periodo}</td><td class="muted" style="font-size:var(--t-xs)">${esc(mais)}</td><td>${linkSocialBlade(l.it.channelId)}</td></tr>`;
        })
        .join("")}</tbody></table></div>`;

    $("#lt-folha", alvo).addEventListener("change", (e) => {
      substituirFolha = e.target.checked;
      desenhar();
    });
    $("#lt-importar", alvo).addEventListener("click", async (e) => {
      const botao = e.currentTarget;
      const itens = prontos.map((l) => ({ channelId: l.it.channelId, monthly: aImportar(l), sb: l.sb || undefined, tt: l.tt || undefined, redes: l.redes || undefined }));
      let canais = 0;
      let meses = 0;
      let redesGravadas = 0;
      let ig = 0;
      let tw = 0;
      botao.disabled = true;
      try {
        for (let i = 0; i < itens.length; i += 25) {
          $("#lt-estado", alvo).textContent = `A gravar ${Math.min(i + 25, itens.length)} de ${itens.length} canais…`;
          const r = await chamar("import/socialblade-lote", { itens: itens.slice(i, i + 25) }, { recarregar: false });
          canais += r.canais;
          meses += r.meses;
          redesGravadas += r.redes || 0;
          ig += r.instagram || 0;
          tw += r.twitch || 0;
        }
      } catch {
        botao.disabled = false;
        return;
      }
      await lerDb();
      await carregar({ forcar: true });
      avisarMudanca();
      toast(`Gravados ${plural(canais, "canal", "canais")}.`);
      alvo.innerHTML = `<div class="aviso info" style="margin-top:14px"><p>Feito: ${plural(canais, "canal atualizado", "canais atualizados")} com dados do Social Blade, ${plural(meses, "mês", "meses")} de views${redesGravadas ? ` e ${plural(redesGravadas, "link novo", "links novos")} de redes sociais` : ""}${ig ? `, Instagram de ${plural(ig, "Youtuber", "Youtubers")}` : ""}${tw ? `, Twitch de ${plural(tw, "Youtuber", "Youtubers")}` : ""}. Os gráficos e o ranking já usam estes números.</p>${voltarJanela()}</div>`;
    });
  };
  desenhar();
}

// ---------- YouTube ("Acerca de") ----------

const PAPEIS_YT = ["principal", "secundário", "clips", "gaming", "podcast", "shorts", "música", "outro"];

/** Canais para o marcador do YouTube ler: os ligados e, se pedido, os sugeridos por confirmar. */
function listaYouTube(soFaltam, comSugestoes) {
  const out = Object.values(adm.db.channels)
    .filter((c) => c.personId && adm.db.people[c.personId])
    .filter((c) => !soFaltam || !c.about)
    .map((c) => {
      const p = adm.db.people[c.personId];
      return { id: c.id, n: p.name + (c.role === "principal" ? "" : ` (${c.title || c.role})`), p: c.personId };
    });
  if (comSugestoes)
    for (const [pid, s] of Object.entries(adm.db.suggestions || {})) {
      const p = adm.db.people[pid];
      if (!p || p.channels.length) continue;
      for (const c of s.list || []) if (!c.linkedTo && !adm.db.channels[c.id] && !out.some((x) => x.id === c.id)) out.push({ id: c.id, n: `${p.name}? (${c.title})`, p: pid, sug: 1 });
    }
  return out.sort((a, b) => a.n.localeCompare(b.n, "pt"));
}

/** De quem é este canal: ligado, sugerido, vindo da lista ou com o mesmo nome. */
function donoProvavel(c) {
  const link = adm.db.channels[c.id];
  if (link && adm.db.people[link.personId]) return { pessoa: adm.db.people[link.personId], como: "ligado" };
  const sug = Object.keys(adm.db.suggestions || {}).find((pid) => adm.db.suggestions[pid].list?.some((x) => x.id === c.id));
  if (sug && adm.db.people[sug]) return { pessoa: adm.db.people[sug], como: "sugestão" };
  if (c.p && adm.db.people[c.p]) return { pessoa: adm.db.people[c.p], como: "lista" };
  const t = norm(c.titulo).replace(/\s/g, "");
  const h = norm(String(c.handle || "").replace(/^@/, ""));
  const p = pessoasOrdenadas().find((x) => {
    const n = norm(x.name).replace(/\s/g, "");
    return n && (n === t || n === h);
  });
  return p ? { pessoa: p, como: "nome" } : { pessoa: null, como: "" };
}

export function mostrarYouTube(alvo, raw) {
  const canais = raw?.kind === "placar-yt" && Array.isArray(raw.canais) ? raw.canais.filter((c) => /^UC[\w-]{22}$/.test(c?.id || "")) : [];
  if (!canais.length) {
    alvo.innerHTML = `<div class="aviso" style="margin-top:14px"><p>Não vieram canais do marcador do YouTube.</p></div>`;
    return;
  }
  const itens = canais.map((c, i) => {
    const { pessoa, como } = donoProvavel(c);
    const link = adm.db.channels[c.id];
    return { i, c: { emails: [], links: [], ...c }, pessoa, como, link, incluir: true, ligar: !link && Boolean(pessoa) && (como !== "nome" || !pessoa.channels.length), papel: pessoa?.channels.length ? "secundário" : "principal" };
  });
  const COMO = { ligado: "", "sugestão": "Era uma das sugestões para esta pessoa.", lista: "Veio da lista para esta pessoa.", nome: "Tem o mesmo nome. Confirma se é a pessoa certa." };

  const dono = (it) => {
    if (it.link) return `<p class="soft yt-dono">Ligado a <a href="#/editar/youtubers?id=${encodeURIComponent(it.pessoa.id)}"><b>${esc(it.pessoa.name)}</b></a>.</p>`;
    return `<div class="yt-dono">
      <div class="ed-grelha" style="align-items:end">
        <label class="campo"><span>Youtuber</span><span style="position:relative"><input class="input" data-pessoa placeholder="Escolher Youtuber" value="${esc(it.pessoa?.name || "")}"></span>${it.como && COMO[it.como] ? `<small>${esc(COMO[it.como])}</small>` : ""}</label>
        <label class="campo"><span>Papel do canal</span><select class="input" data-papel>${PAPEIS_YT.map((r) => `<option ${it.papel === r ? "selected" : ""}>${r}</option>`).join("")}</select></label>
      </div>
      <label class="ed-check"><input type="checkbox" data-ligar ${it.ligar ? "checked" : ""} ${it.pessoa ? "" : "disabled"}> Ligar este canal ${it.pessoa ? `a ${esc(it.pessoa.name)}` : "(escolhe primeiro o Youtuber)"}</label>
      <div class="ed-acoes" style="justify-content:flex-start;margin-top:8px"><button class="btn btn-pequeno" data-criar data-a-esperar="A criar">Criar Youtuber novo com este canal</button></div>
    </div>`;
  };

  const item = (it) => `<div class="painel ed-bloco yt-item" data-i="${it.i}">
      <label class="ed-check yt-incluir"><input type="checkbox" data-incluir ${it.incluir ? "checked" : ""}> Guardar</label>
      ${blocoAbout(it.c, it.pessoa, { id: "yt" + it.i })}
      ${dono(it)}
    </div>`;

  const ligarItem = (el, it) => {
    $("[data-incluir]", el).addEventListener("change", (e) => {
      it.incluir = e.target.checked;
      el.classList.toggle("yt-fora", !it.incluir);
      contar();
    });
    const input = $("[data-pessoa]", el);
    if (input)
      escolherPessoa(input, (p) => {
        it.pessoa = p;
        it.como = "";
        it.ligar = true;
        it.papel = p.channels.length ? "secundário" : "principal";
        redesenhar(it);
      });
    $("[data-ligar]", el)?.addEventListener("change", (e) => {
      it.ligar = e.target.checked;
      contar();
    });
    $("[data-papel]", el)?.addEventListener("change", (e) => (it.papel = e.target.value));
    $("[data-criar]", el)?.addEventListener("click", async (e) => {
      const r = await chamar("person/from-channel", { channel: { id: it.c.id }, name: it.c.titulo }, { botao: e.currentTarget, sucesso: (x) => `${x.person.name} criado.` }).catch(() => null);
      if (!r) return;
      it.pessoa = adm.db.people[r.person.id];
      it.link = adm.db.channels[it.c.id];
      it.como = "ligado";
      redesenhar(it);
    });
  };
  const redesenhar = (it) => {
    const el = $(`.yt-item[data-i="${it.i}"]`, alvo);
    el.outerHTML = item(it);
    ligarItem($(`.yt-item[data-i="${it.i}"]`, alvo), it);
    contar();
  };
  const prontos = () => itens.filter((it) => it.incluir && it.pessoa && (it.link || it.ligar));
  const contar = () => {
    const n = prontos().length;
    const faltam = itens.filter((it) => it.incluir && !(it.pessoa && (it.link || it.ligar))).length;
    $("#yt-gravar", alvo).disabled = !n;
    $("#yt-gravar", alvo).textContent = `Gravar ${plural(n, "canal", "canais")}`;
    $("#yt-falta", alvo).textContent = faltam ? `${plural(faltam, "canal fica", "canais ficam")} de fora: falta escolher o Youtuber ou ligar o canal.` : "";
  };

  alvo.innerHTML = `<hr class="ed-linha">
    <h3>${canais.length === 1 ? "Canal lido no YouTube" : `${plural(canais.length, "canal lido", "canais lidos")} no YouTube`}</h3>
    <p class="soft">Escolhe para onde vai cada link. As redes que já têm link ficam como estão, a não ser que escolhas outra coisa. Os emails e os outros links vão para as notas privadas (só aparecem no painel). Os dados lidos ficam também guardados no canal.</p>
    <div id="yt-itens">${itens.map(item).join("")}</div>
    <div class="ed-acoes yt-gravar-barra" style="justify-content:flex-start"><button class="btn btn-primario" id="yt-gravar" data-a-esperar="A gravar"></button><span class="muted" id="yt-falta"></span></div>`;
  itens.forEach((it) => ligarItem($(`.yt-item[data-i="${it.i}"]`, alvo), it));
  contar();

  $("#yt-gravar", alvo).addEventListener("click", async (e) => {
    const botao = e.currentTarget;
    const lote = prontos().map((it) => {
      const el = $(`.yt-item[data-i="${it.i}"]`, alvo);
      return { channelId: it.c.id, personId: it.pessoa.id, ligar: !it.link && it.ligar, papel: it.papel, about: it.c, ...escolhas(el, it.c) };
    });
    const total = { canais: 0, ligados: 0, redes: 0, bios: 0, notas: 0, erros: [] };
    botao.disabled = true;
    try {
      for (let i = 0; i < lote.length; i += 25) {
        $("#yt-falta", alvo).textContent = `A gravar ${Math.min(i + 25, lote.length)} de ${lote.length}…`;
        const r = await chamar("import/youtube", { itens: lote.slice(i, i + 25) }, { recarregar: false });
        for (const k of ["canais", "ligados", "redes", "bios", "notas"]) total[k] += r[k] || 0;
        total.erros.push(...(r.erros || []));
      }
    } catch {
      botao.disabled = false;
      return;
    }
    await lerDb();
    await carregar({ forcar: true });
    avisarMudanca();
    toast(`${plural(total.canais, "canal guardado", "canais guardados")}.`);
    const pessoas = [...new Map(lote.map((l) => [l.personId, adm.db.people[l.personId]])).values()].filter(Boolean);
    alvo.innerHTML = `<div class="aviso info" style="margin-top:14px"><p>Feito: ${plural(total.canais, "canal atualizado", "canais atualizados")}${total.ligados ? `, ${plural(total.ligados, "canal novo ligado", "canais novos ligados")}` : ""}${total.redes ? `, ${plural(total.redes, "link de rede social", "links de redes sociais")}` : ""}${total.bios ? `, ${plural(total.bios, "descrição", "descrições")}` : ""}${total.notas ? `, ${plural(total.notas, "linha nova", "linhas novas")} nas notas` : ""}.</p>
      ${total.erros.length ? `<p>${esc(total.erros.join(" "))}</p>` : ""}
      ${pessoas.length <= 12 ? `<p>${pessoas.map((p) => `<a href="#/editar/youtubers?id=${encodeURIComponent(p.id)}">${esc(p.name)}</a>`).join(" · ")}</p>` : ""}${voltarJanela()}</div>`;
  });
}

/** Esta janela foi aberta pelo marcador: a do painel que já estava aberta atualiza-se sozinha. */
function voltarJanela() {
  if (!window.opener) return "";
  setTimeout(() => document.querySelector("[data-fechar-janela]")?.addEventListener("click", () => window.close()), 0);
  return `<p class="muted" style="margin-top:10px">A outra janela do painel já recebeu estes dados, não precisas de carregar em F5. <button class="btn btn-pequeno" data-fechar-janela>Fechar esta janela</button></p>`;
}

// ---------- Colar da folha ----------

function lerMes(txt) {
  const t = norm(txt).replace(/\(.*?\)/g, "").trim();
  let m = /^(\d{4})-(\d{1,2})$/.exec(t);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}`;
  m = /^(\d{1,2})[/.-](\d{2}|\d{4})$/.exec(t);
  if (m) return `${m[2].length === 2 ? "20" + m[2] : m[2]}-${m[1].padStart(2, "0")}`;
  m = /^([a-zç]+)\.?\s*(?:de\s+)?(\d{2}|\d{4})$/.exec(t);
  if (m && MESES_PT[m[1]]) return `${m[2].length === 2 ? "20" + m[2] : m[2]}-${String(MESES_PT[m[1]]).padStart(2, "0")}`;
  return null;
}

function lerNumero(txt) {
  const t = String(txt || "").replace(/[\s  .]/g, "").replace(/,/g, "");
  if (!t || t === "-") return null;
  const v = Number(t);
  return Number.isFinite(v) ? v : null;
}

function mostrarFolha(alvo, texto) {
  const linhas = texto.split(/\r?\n/).map((l) => l.split("\t")).filter((l) => l.some((c) => c.trim()));
  if (linhas.length < 2) {
    alvo.innerHTML = `<p class="muted">Cola pelo menos a linha dos meses e uma linha com dados.</p>`;
    return;
  }
  const cab = linhas[0].map(lerMes);
  const colunas = cab.map((m, i) => (m ? i : -1)).filter((i) => i > 0);
  if (!colunas.length) {
    alvo.innerHTML = `<div class="aviso"><p>Não reconheci os meses na primeira linha. Usa por exemplo "Agosto 2025", "08/25" ou "2025-08".</p></div>`;
    return;
  }
  const porNome = new Map(pessoasOrdenadas().map((p) => [norm(p.name), p]));
  const itens = [];
  const falhas = [];
  for (const l of linhas.slice(1)) {
    const nome = (l[0] || "").trim();
    if (!nome) continue;
    const p = porNome.get(norm(nome));
    const entries = colunas.map((i) => ({ month: cab[i], v: lerNumero(l[i]) })).filter((e) => e.v !== null);
    if (!entries.length) continue;
    if (p) itens.push({ personId: p.id, nome: p.name, entries });
    else falhas.push(nome);
  }
  const total = itens.reduce((a, b) => a + b.entries.length, 0);
  alvo.innerHTML = `<hr class="ed-linha">
    <p class="soft">${plural(itens.length, "Youtuber encontrado", "Youtubers encontrados")}, ${plural(total, "valor", "valores")} para importar, meses de ${esc(mesNome(cab[colunas[0]]))} a ${esc(mesNome(cab[colunas[colunas.length - 1]]))}.</p>
    ${falhas.length ? `<div class="aviso"><p>Estes nomes não existem no placar e vão ficar de fora: ${esc(falhas.slice(0, 30).join(", "))}${falhas.length > 30 ? "…" : ""}. Confirma se estão escritos como no placar.</p></div>` : ""}
    <p class="muted" style="font-size:var(--t-sm);margin-top:10px">Quando houver dados medidos pelo YouTube para o mesmo mês, esses têm prioridade. Valores que escreveste à mão no editor não são substituídos.</p>
    <div class="ed-acoes" style="justify-content:flex-start"><button class="btn btn-primario" id="fl-importar" data-a-esperar="A importar" ${itens.length ? "" : "disabled"}>Importar ${plural(total, "valor", "valores")}</button></div>`;
  $("#fl-importar", alvo).addEventListener("click", async (e) => {
    const r = await chamar("monthly/bulk", { items: itens.map(({ personId, entries }) => ({ personId, entries })) }, { botao: e.currentTarget }).catch(() => null);
    if (r) {
      toast(`${inteiro(r.saved)} valores importados.`);
      alvo.innerHTML = `<div class="aviso info" style="margin-top:14px"><p>Importados ${inteiro(r.saved)} valores.</p></div>`;
    }
  });
}
