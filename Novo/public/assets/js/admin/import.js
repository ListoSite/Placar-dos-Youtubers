// Importar dados: marcador do Social Blade e colar tabelas da folha de cálculo.

import { estado, carregar } from "../data.js";
import { esc, curto, inteiro, mesNome, norm, plural } from "../format.js";
import { $, $$, toast } from "../ui.js";
import { adm, chamar, escolherPessoa, pessoasOrdenadas, lerDb, linkSocialBlade } from "./common.js";
import { blocoEstimativa } from "./estimate-ui.js";

const MESES_PT = { jan: 1, janeiro: 1, fev: 2, fevereiro: 2, favereiro: 2, mar: 3, marco: 3, março: 3, abr: 4, abril: 4, mai: 5, maio: 5, may: 5, jun: 6, junho: 6, juno: 6, jul: 7, julho: 7, ago: 8, agosto: 8, set: 9, setembro: 9, out: 10, outubro: 10, octobro: 10, nov: 11, novembro: 11, dez: 12, dezembro: 12 };

export async function render(alvo, query) {
  const marcador = await codigoMarcador();
  alvo.innerHTML = `
    <div class="painel ed-bloco" id="sb">
      <h3>Social Blade: todos os canais de uma vez</h3>
      <p class="soft">Um marcador do browser percorre o Social Blade canal a canal e traz os meses que lá aparecem (views ganhas em cada mês). Corre no teu computador, com pausas entre canais, e vai guardando o que já fez.</p>
      <ol class="ed-passos">
        <li>Arrasta este botão para a barra de marcadores do browser: <a class="btn btn-ouro btn-pequeno" id="sb-link" href="${esc(marcador)}" onclick="event.preventDefault();alert('Arrasta este botão para a barra de marcadores. Depois usa-o numa página de canal do Social Blade.')">Placar ⇄ Social Blade</a><br><small class="muted">Se já tinhas o marcador antigo, apaga-o e usa este.</small></li>
        <li>Copia a lista de canais: <button class="btn btn-pequeno" id="sbl-copiar">Copiar lista de canais</button>
          <label class="ed-check" style="margin-top:8px"><input type="checkbox" id="sbl-faltam" checked> Só canais que ainda não têm meses do Social Blade</label>
          <small class="muted" id="sbl-n"></small></li>
        <li>Abre a página de um canal qualquer no Social Blade (por exemplo <b>socialblade.com/youtube/handle/wuant</b>) e espera que os gráficos apareçam. Carrega no marcador, cola a lista na caixa "Todos os canais da lista" e carrega em <b>Começar</b>.</li>
        <li>No fim, carrega em <b>Enviar resultados para o Placar</b>. Abre-se esta página com tudo pronto para confirmares antes de gravar.</li>
      </ol>
      <p class="muted" style="font-size:var(--t-sm)">Conta com 3 a 8 segundos por canal. Podes pausar e continuar mais tarde, mesmo depois de fechar o browser. Se o Social Blade pedir uma verificação, o marcador para: recarrega a página do Social Blade, espera um pouco e carrega outra vez no marcador para continuar de onde ficou. O mesmo marcador também lê só o canal que tens aberto.</p>
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

  for (const [param, mostrar] of [
    ["sb", mostrarSocialBlade],
    ["sbl", mostrarLote],
  ]) {
    const v = query.get(param);
    if (!v) continue;
    try {
      const raw = JSON.parse(decodeURIComponent(escape(atob(v))));
      history.replaceState(null, "", "#/editar/importar");
      mostrar($("#sb-resultado", alvo), raw);
      $("#sb-resultado", alvo).scrollIntoView({ block: "start" });
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
    .map((c) => ({ id: c.id, h: String(c.handle || stats.get(c.id)?.handle || "").replace(/^@/, ""), n: adm.db.people[c.personId].name + (c.role === "principal" ? "" : ` (${c.title || c.role})`), p: c.personId }));
}

async function codigoMarcador() {
  const src = await fetch("/assets/js/admin/sb-marcador.txt").then((r) => r.text());
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

function mostrarSocialBlade(alvo, raw) {
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
    <p class="muted" style="font-size:var(--t-sm)">${plural(meses.length, "mês", "meses")} e ${plural(r.daily.length, "dia", "dias")} encontrados. ${esc(r.notas.join(" "))}</p>
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
    const payload = { channelId: r.channelId, handle: r.handle, title: r.title, monthly: r.monthly, daily: r.daily, sb: r.sb };
    const corpo = { payload };
    if (canal) corpo.channelId = r.channelId;
    else if (pessoaEscolhida) corpo.personId = pessoaEscolhida.id;
    const res = await chamar("import/socialblade", corpo, { botao: e.currentTarget }).catch(() => null);
    if (!res) return;
    if (res.needsTarget) return toast("Escolhe primeiro o Youtuber.", { erro: true });
    toast(`Importados ${res.months} meses e ${res.days} dias${res.extra ? ", com subscritores e vídeos" : ""}${res.redes ? ` e ${plural(res.redes, "rede social", "redes sociais")}` : ""}.`);
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
    return { it, link, pessoa, meses: r.monthly.filter((m) => m.month < curMes), notas: r.notas, sb: r.sb };
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
    const comDados = linhas.filter((l) => l.meses.length || l.sb);
    const prontos = linhas.filter((l) => l.link && (aImportar(l).length || l.sb));
    const comExtra = prontos.filter((l) => l.sb).length;
    const redes = prontos.reduce((a, l) => a + (l.sb?.info?.redes?.length || 0), 0);
    const total = prontos.reduce((a, l) => a + aImportar(l).length, 0);
    const semCanal = linhas.filter((l) => !l.link).length;
    alvo.innerHTML = `<hr class="ed-linha">
      <h3>Resultados do Social Blade</h3>
      <p class="soft">${plural(linhas.length, "canal lido", "canais lidos")}, ${comDados.length} com meses. ${prontos.length ? `Vou gravar <b>${plural(total, "mês", "meses")}</b> de views em ${plural(prontos.length, "canal", "canais")}${comExtra ? `, mais subscritores e vídeos por mês, os últimos 30 dias e as últimas 52 semanas de ${plural(comExtra, "canal", "canais")}${redes ? ` e ${plural(redes, "link", "links")} de redes sociais (só entram onde ainda não há link)` : ""}` : ""}.` : "Nada de novo para gravar."}${semCanal ? ` ${plural(semCanal, "canal já não está", "canais já não estão")} no placar e fica${semCanal > 1 ? "m" : ""} de fora.` : ""}</p>
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
          const mais = l.sb ? [l.sb.m ? "subs e vídeos" : "", l.sb.d ? "30 dias" : "", l.sb.w ? "52 semanas" : "", l.sb.info?.redes?.length ? plural(l.sb.info.redes.length, "rede", "redes") : ""].filter(Boolean).join(", ") : "";
          return `<tr style="cursor:default;${n || l.sb ? "" : "opacity:.6"}"><td>${nome}</td><td class="dir">${l.meses.length}</td><td class="dir"><b>${n}</b></td><td>${periodo}</td><td class="muted" style="font-size:var(--t-xs)">${esc(mais)}</td><td>${linkSocialBlade(l.it.channelId)}</td></tr>`;
        })
        .join("")}</tbody></table></div>`;

    $("#lt-folha", alvo).addEventListener("change", (e) => {
      substituirFolha = e.target.checked;
      desenhar();
    });
    $("#lt-importar", alvo).addEventListener("click", async (e) => {
      const botao = e.currentTarget;
      const itens = prontos.map((l) => ({ channelId: l.it.channelId, monthly: aImportar(l), sb: l.sb || undefined }));
      let canais = 0;
      let meses = 0;
      let redesGravadas = 0;
      botao.disabled = true;
      try {
        for (let i = 0; i < itens.length; i += 25) {
          $("#lt-estado", alvo).textContent = `A gravar ${Math.min(i + 25, itens.length)} de ${itens.length} canais…`;
          const r = await chamar("import/socialblade-lote", { itens: itens.slice(i, i + 25) }, { recarregar: false });
          canais += r.canais;
          meses += r.meses;
          redesGravadas += r.redes || 0;
        }
      } catch {
        botao.disabled = false;
        return;
      }
      await lerDb();
      await carregar({ forcar: true });
      toast(`Gravados ${plural(canais, "canal", "canais")}.`);
      alvo.innerHTML = `<div class="aviso info" style="margin-top:14px"><p>Feito: ${plural(canais, "canal atualizado", "canais atualizados")} com dados do Social Blade, ${plural(meses, "mês", "meses")} de views${redesGravadas ? ` e ${plural(redesGravadas, "link novo", "links novos")} de redes sociais` : ""}. Os gráficos e o ranking já usam estes números.</p></div>`;
    });
  };
  desenhar();
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
