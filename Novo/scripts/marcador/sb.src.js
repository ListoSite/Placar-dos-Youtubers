// Marcador (bookmarklet) "Placar ⇄ Social Blade".
//
// Corre dentro de uma página do socialblade.com, no browser de quem o usa. Faz duas coisas:
//   1. "Este canal": lê os números da página aberta e manda-os para o Placar.
//   2. "Todos os canais": recebe a lista de canais copiada no Placar e vai buscar os dados de
//      cada um, um de cada vez, com pausas entre canais. No fim, os resultados vão para o Placar.
//
// Como o Social Blade muda de aspeto de vez em quando, o marcador não depende de um formato fixo.
// Procura séries de datas e views em três sítios:
//   - nas respostas da API interna que a própria página usou (por exemplo /api/trpc/...);
//   - nos dados que vêm dentro do HTML (Next.js: __next_f e __NEXT_DATA__);
//   - nas propriedades dos gráficos (React, ECharts, Highcharts, Chart.js, ApexCharts).
//
// O ficheiro público é gerado com: node scripts/build-marcador.mjs

(() => {
  const ORIGEM = "__ORIGEM__";
  const CHAVE = "placarSBLote";
  if (window.__placarSB) {
    window.__placarSB.mostrar();
    return;
  }

  const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
  const DIA = 864e5;

  // ---------- Datas e números ----------
  function dataISO(x) {
    if (x === null || x === undefined || x === "") return null;
    if (x instanceof Date) return isNaN(x) ? null : x.toISOString().slice(0, 10);
    if (typeof x === "number" || (typeof x === "string" && /^\d{9,13}$/.test(x))) {
      let n = Number(x);
      if (n < 1e8) return null;
      if (n < 1e11) n *= 1000;
      const d = new Date(n);
      const y = d.getUTCFullYear();
      return y < 2005 || y > 2100 ? null : d.toISOString().slice(0, 10);
    }
    if (typeof x !== "string") return null;
    let s = x.trim();
    if (s.startsWith("$D")) s = s.slice(2);
    if (s.length > 40) return null;
    let m = /^(\d{4})-(\d{2})(?:-(\d{2}))?(?:$|[T ])/.exec(s);
    if (m) return `${m[1]}-${m[2]}-${m[3] || "01"}`;
    m = /^(\d{4})(\d{2})(\d{2})$/.exec(s);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    if (!/\d{4}/.test(s) || !/[a-z]/i.test(s)) return null;
    const d = new Date(s);
    if (isNaN(d)) return null;
    const y = d.getFullYear();
    if (y < 2005 || y > 2100) return null;
    return `${y}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  function num(v) {
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    if (typeof v === "string" && /^-?\d+(\.\d+)?$/.test(v.trim())) return Number(v);
    if (v && typeof v === "object" && !Array.isArray(v) && "value" in v) return num(v.value);
    return null;
  }
  const mesDe = (d) => d.slice(0, 7);
  const diasNoMes = (m) => new Date(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5, 7)), 0)).getUTCDate();
  const somarDia = (d, n) => new Date(Date.parse(d + "T00:00:00Z") + n * DIA).toISOString().slice(0, 10);

  // ---------- Procurar séries de views em qualquer objeto ----------
  const K_DATA = /^(date|day|dia|data|time|timestamp|ts|month|mes|period|x|t|label|name|created_?at|recorded_?at|captured_?at)$/i;
  const BOM_NOME = /view|visualiza/i;
  const MAU_NOME = /earn|revenue|\$|per_?video|average|avg|rank|grade|estimat|like|comment|upload|^\s*videos?\s*$|sub(?!.*view)/i;
  const GENERICO = /^\s*(value|values|y|v|count|total|gained|gain|gains|change|delta|amount|data|série)?\s*$/i;
  const partesNome = (nome) => {
    const i = nome.lastIndexOf("|");
    return i < 0 ? { caminho: nome, chave: "" } : { caminho: nome.slice(0, i), chave: nome.slice(i + 1) };
  };
  const escRe = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const reChave = (valor) => new RegExp(`(^|[^\\w-])${escRe(valor)}(?=$|[^\\w-])`, "gi");

  function novaRecolha() {
    return { series: [], ids: new Map(), porUrl: [] };
  }
  function contarIds(rec, texto) {
    const ids = String(texto).match(/UC[\w-]{22}/g) || [];
    for (const id of ids) rec.ids.set(id, (rec.ids.get(id) || 0) + 1);
  }
  function addSerie(rec, nome, pts) {
    const { caminho, chave } = partesNome(nome);
    if (MAU_NOME.test(chave)) return;
    if (!BOM_NOME.test(chave) && !(GENERICO.test(chave) && BOM_NOME.test(caminho))) return;
    const limpos = pts.filter((p) => p[0] && p[1] !== null);
    if (limpos.length < 3) return;
    rec.series.push({ nome: nome.slice(0, 160), pts: limpos });
  }

  function tentarArray(rec, arr, caminho) {
    const amostra = arr.find((e) => e && typeof e === "object");
    if (!amostra) return;
    if (Array.isArray(amostra)) {
      if (amostra.length < 2) return;
      const pts = arr.map((e) => (Array.isArray(e) ? [dataISO(e[0]), num(e[1])] : [null, null]));
      if (pts.filter((p) => p[0]).length >= arr.length * 0.8) addSerie(rec, caminho, pts);
      return;
    }
    const chaves = Object.keys(amostra);
    const kData = chaves.find((k) => K_DATA.test(k) && dataISO(amostra[k])) || chaves.find((k) => /date|time|day|month/i.test(k) && dataISO(amostra[k]));
    if (!kData) return;
    for (const k of chaves.slice(0, 30)) {
      if (k === kData || num(amostra[k]) === null) continue;
      addSerie(rec, `${caminho} | ${k}`, arr.map((e) => [dataISO(e && e[kData]), num(e && e[k])]));
    }
  }

  function tentarEixos(rec, o, caminho) {
    let xs = null;
    try {
      xs = (o.xAxis && (o.xAxis.data || (o.xAxis[0] && o.xAxis[0].data))) || o.labels || o.categories || (o.xaxis && o.xaxis.categories);
    } catch (e) {}
    const series = o.series || o.datasets;
    if (!Array.isArray(xs) || !Array.isArray(series)) return;
    for (const s of series) {
      if (!s || !Array.isArray(s.data)) continue;
      const nome = `${caminho} | ${s.name || s.label || "série"}`;
      addSerie(rec, nome, s.data.map((v, i) => (Array.isArray(v) ? [dataISO(v[0]), num(v[1])] : [dataISO(xs[i]), num(v)])));
    }
  }

  function andarObjeto(rec, raiz, caminhoInicial) {
    const vistos = new WeakSet();
    let passos = 0;
    const andar = (o, caminho, prof) => {
      if (!o || typeof o !== "object" || prof > 16 || passos++ > 80000) return;
      if (vistos.has(o)) return;
      vistos.add(o);
      if (o.nodeType || o === window) return;
      if (Array.isArray(o)) {
        if (o.length >= 3) tentarArray(rec, o, caminho);
        const n = Math.min(o.length, 500);
        for (let i = 0; i < n; i++) andar(o[i], caminho, prof + 1);
        return;
      }
      tentarEixos(rec, o, caminho);
      let rotulo = "";
      try {
        const r = o.name || o.label || o.title;
        if (typeof r === "string" && r.length < 60) rotulo = `[${r}]`;
      } catch (e) {}
      let chaves;
      try {
        chaves = Object.keys(o);
      } catch (e) {
        return;
      }
      for (const k of chaves) {
        if (k === "_owner" || k === "_store" || k === "return" || k === "sibling" || k === "alternate" || k.startsWith("__react")) continue;
        let v;
        try {
          v = o[k];
        } catch (e) {
          continue;
        }
        if (typeof v === "string" && /^[\[{]/.test(v) && v.length > 50 && v.length < 3e6) {
          try {
            andar(JSON.parse(v), `${caminho}${rotulo}.${k}`, prof + 1);
          } catch (e) {}
        } else if (v && typeof v === "object") andar(v, `${caminho}${rotulo}.${k}`, prof + 1);
      }
    };
    andar(raiz, caminhoInicial, 0);
  }

  /** Procura blocos JSON dentro de um texto grande (por exemplo o HTML ou o __next_f). */
  function jsonNoTexto(rec, texto, origem) {
    contarIds(rec, texto);
    const inicio = Date.now();
    const re = /\[\s*\{\s*"|\{\s*"[\w$]+"\s*:\s*\[\s*[\[{]/g;
    let m;
    let blocos = 0;
    while ((m = re.exec(texto)) && Date.now() - inicio < 2500 && blocos < 400) {
      const fim = fimDoJSON(texto, m.index);
      if (fim < 0) continue;
      try {
        andarObjeto(rec, JSON.parse(texto.slice(m.index, fim + 1)), origem);
        blocos++;
        re.lastIndex = fim + 1;
      } catch (e) {}
    }
  }
  function fimDoJSON(t, i) {
    let prof = 0;
    let str = false;
    const max = Math.min(t.length, i + 4e6);
    for (let j = i; j < max; j++) {
      const c = t[j];
      if (str) {
        if (c === "\\") j++;
        else if (c === '"') str = false;
      } else if (c === '"') str = true;
      else if (c === "[" || c === "{") prof++;
      else if (c === "]" || c === "}") {
        prof--;
        if (prof === 0) return j;
      }
    }
    return -1;
  }

  function nextDoHTML(html) {
    const partes = [];
    const re = /self\.__next_f\.push\(\[1,\s*"((?:[^"\\]|\\.)*)"\]\)/g;
    let m;
    while ((m = re.exec(html))) {
      try {
        partes.push(JSON.parse(`"${m[1]}"`));
      } catch (e) {}
    }
    const nd = /<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(html);
    if (nd) partes.push(nd[1]);
    return partes.join("\n");
  }

  // ---------- Fontes de dados de uma janela (a própria página ou um iframe) ----------
  function urlsDaApi(win) {
    let entradas = [];
    try {
      entradas = win.performance.getEntriesByType("resource").map((e) => e.name);
    } catch (e) {}
    const base = win.location.origin;
    return [...new Set(entradas)].filter((u) => u.startsWith(base) && /\/api\//.test(u) && !/\.(js|css|png|jpe?g|webp|svg|gif|woff2?|ico)(\?|$)/i.test(u)).slice(-40);
  }

  class Bloqueado extends Error {}

  async function lerResposta(url) {
    const r = await fetch(url, { credentials: "include", headers: { accept: "application/json, */*" } });
    const tipo = r.headers.get("content-type") || "";
    const texto = await r.text();
    const html = /text\/html/.test(tipo);
    if (r.status === 429 || r.status === 503 || (r.status === 403 && html) || (html && /challenge|cf-chl|captcha|just a moment/i.test(texto))) {
      throw new Bloqueado(`O Social Blade respondeu ${r.status}.`);
    }
    if (!r.ok) return null;
    return texto;
  }
  function analisarTextoApi(rec, texto, origem) {
    contarIds(rec, texto);
    try {
      andarObjeto(rec, JSON.parse(texto), origem);
      return;
    } catch (e) {}
    // Respostas em várias linhas (tRPC em streaming)
    for (const linha of texto.split("\n")) {
      if (!/^\s*[\[{]/.test(linha)) continue;
      try {
        andarObjeto(rec, JSON.parse(linha), origem);
      } catch (e) {}
    }
  }

  function propsDosGraficos(rec, win, doc) {
    const els = [...doc.querySelectorAll("canvas, svg, [_echarts_instance_]")].slice(0, 40);
    const feitos = new Set();
    for (const el of els) {
      let no = el;
      for (let i = 0; i < 7 && no; i++, no = no.parentElement) {
        if (feitos.has(no)) break;
        feitos.add(no);
        for (const k of Object.keys(no)) {
          if (k.startsWith("__reactProps")) andarObjeto(rec, no[k], "react");
          if (k.startsWith("__reactFiber")) {
            let f = no[k];
            for (let j = 0; j < 14 && f; j++, f = f.return) if (f.memoizedProps && typeof f.memoizedProps === "object") andarObjeto(rec, f.memoizedProps, "react");
          }
        }
        try {
          if (win.echarts && no.getAttribute && no.getAttribute("_echarts_instance_")) {
            const inst = win.echarts.getInstanceByDom(no);
            if (inst) andarObjeto(rec, inst.getOption(), "echarts");
          }
        } catch (e) {}
      }
    }
    try {
      if (win.Highcharts && win.Highcharts.charts) win.Highcharts.charts.forEach((c) => c && andarObjeto(rec, { series: c.series.map((s) => ({ name: (c.title && c.title.textStr ? c.title.textStr + " " : "") + s.name, data: s.options.data })) }, "highcharts"));
    } catch (e) {}
    try {
      if (win.Chart && win.Chart.instances) Object.values(win.Chart.instances).forEach((c) => c && andarObjeto(rec, c.data, "chartjs"));
    } catch (e) {}
    try {
      if (win.Apex && win.Apex._chartInstances) win.Apex._chartInstances.forEach((ci) => andarObjeto(rec, ci.chart.w.config, "apex"));
    } catch (e) {}
  }

  async function lerJanela(win, { api = true } = {}) {
    const rec = novaRecolha();
    const doc = win.document;
    if (api) {
      for (const u of urlsDaApi(win)) {
        try {
          const t = await lerResposta(u);
          if (t) {
            analisarTextoApi(rec, t, "api " + u.replace(/^https?:\/\/[^/]+/, "").replace(/\?.*/, ""));
            rec.porUrl.push({ url: u, ids: t.match(/UC[\w-]{22}/g) || [] });
          }
        } catch (e) {
          if (e instanceof Bloqueado) throw e;
        }
      }
    }
    try {
      if (win.self.__next_f) jsonNoTexto(rec, win.self.__next_f.map((p) => (typeof p[1] === "string" ? p[1] : "")).join("\n"), "next");
    } catch (e) {}
    const nd = doc.getElementById("__NEXT_DATA__");
    if (nd) jsonNoTexto(rec, nd.textContent, "next");
    propsDosGraficos(rec, win, doc);
    try {
      contarIds(rec, [...doc.querySelectorAll("a[href*='youtube.com/']")].map((a) => a.href).join(" "));
    } catch (e) {}
    return rec;
  }

  // ---------- Reduzir as séries a meses (para os dados serem pequenos) ----------
  function reduzir(serie) {
    const porDia = new Map();
    for (const [d, v] of serie.pts) porDia.set(d, v);
    const pts = [...porDia.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    if (pts.length < 3) return null;
    const passos = [];
    for (let i = 1; i < pts.length; i++) passos.push((Date.parse(pts[i][0]) - Date.parse(pts[i - 1][0])) / DIA);
    passos.sort((a, b) => a - b);
    const passo = passos[Math.floor(passos.length / 2)];
    let sobe = 0;
    const difs = [];
    for (let i = 1; i < pts.length; i++) {
      if (pts[i][1] >= pts[i - 1][1]) sobe++;
      difs.push(Math.abs(pts[i][1] - pts[i - 1][1]));
    }
    difs.sort((a, b) => a - b);
    const medDif = difs[Math.floor(difs.length / 2)] || 1;
    const minimo = Math.min(...pts.map((p) => p[1]));
    const { caminho, chave } = partesNome(serie.nome);
    const dica = chave || caminho.split(/[.\s]/).pop();
    const total = /total|cumul|lifetime/i.test(dica) ? true : /gain|ganh|change|delta|diff|growth|new/i.test(dica) ? false : sobe / (pts.length - 1) > 0.95 && minimo > 20 * medDif;

    if (passo >= 0.8 && passo <= 1.5) {
      if (total) {
        // Total no início de cada mês
        const ini = new Map();
        for (const [d, v] of pts) if (Number(d.slice(8)) <= 2 && !ini.has(mesDe(d))) ini.set(mesDe(d), v);
        const out = [...ini.entries()].map(([m, v]) => [m + "-01", v]);
        return out.length >= 2 ? { chart: serie.nome + " total", points: out } : null;
      }
      const soma = new Map();
      const conta = new Map();
      for (const [d, v] of pts) {
        soma.set(mesDe(d), (soma.get(mesDe(d)) || 0) + v);
        conta.set(mesDe(d), (conta.get(mesDe(d)) || 0) + 1);
      }
      const out = [...soma.entries()].filter(([m]) => conta.get(m) >= diasNoMes(m) - 1).map(([m, v]) => [m + "-01", v]);
      return out.length >= 1 ? { chart: serie.nome + " monthly gained", points: out } : null;
    }
    if (passo >= 25 && passo <= 35) {
      const fimDoMes = pts.filter((p) => Number(p[0].slice(8)) >= 27).length > pts.length / 2;
      const out = pts.map(([d, v]) => [(total && fimDoMes ? somarDia(d, 1) : d).slice(0, 7) + "-01", v]);
      return { chart: serie.nome + (total ? " total" : " monthly gained"), points: out };
    }
    return null;
  }

  function resultado(rec, extra) {
    const vistos = new Set();
    const series = [];
    for (const s of rec.series) {
      const r = reduzir(s);
      if (!r) continue;
      const chave = r.chart.replace(/^.*\|/, "") + JSON.stringify(r.points);
      if (vistos.has(chave)) continue;
      vistos.add(chave);
      series.push({ lib: "sb2", chart: r.chart, name: "", points: r.points });
    }
    const meses = series.reduce((a, s) => Math.max(a, s.points.length), 0);
    return Object.assign({ kind: "placar-sb-raw", v: 2, series: series.slice(0, 12), rows: [], meses }, extra);
  }

  function idMaisVisto(contagem) {
    let melhor = "";
    let n = 0;
    for (const [id, c] of contagem) if (c > n) (melhor = id), (n = c);
    return melhor;
  }
  /** ID do canal aberto: de preferência o que vem nas respostas aos pedidos feitos com o nome desse canal. */
  function idDaPagina(rec) {
    const chave = chaveDaPagina();
    if (chave && /^UC[\w-]{22}$/.test(chave.valor)) return chave.valor;
    if (chave && chave.valor.length >= 3) {
      const cont = new Map();
      for (const { url, ids } of rec.porUrl) if (trocarNoUrl(url, chave.valor, chave.valor)) for (const id of ids) cont.set(id, (cont.get(id) || 0) + 1);
      if (cont.size) return idMaisVisto(cont);
    }
    return idMaisVisto(rec.ids);
  }

  // ---------- API do Social Blade (formato conhecido, um pedido por canal) ----------
  // youtube.user: dados do canal e redes sociais; youtube.monthly: ganhos de cada mês;
  // youtube.history: totais dos últimos 30 dias; youtube.summary: ganhos das últimas 52 semanas.
  // Rankings, nota e ganhos estimados não são lidos.
  function colunas(linhas, passo) {
    // linhas: [[data, views, subs, videos]] ordenadas; devolve colunas a partir da primeira data
    if (!linhas.length) return null;
    const ini = linhas[0][0];
    const pos = (d) => (passo === "mes" ? (Number(d.slice(0, 4)) - Number(ini.slice(0, 4))) * 12 + Number(d.slice(5, 7)) - Number(ini.slice(5, 7)) : Math.round((Date.parse(d) - Date.parse(ini)) / DIA / (passo === "semana" ? 7 : 1)));
    const n = pos(linhas[linhas.length - 1][0]) + 1;
    if (n > 400) return null;
    const out = { ini, v: new Array(n).fill(null), s: new Array(n).fill(null), n: new Array(n).fill(null) };
    for (const [d, v, sub, vid] of linhas) {
      const i = pos(d);
      if (i < 0 || i >= n) continue;
      out.v[i] = v;
      out.s[i] = sub;
      out.n[i] = vid;
    }
    return out;
  }
  function linhasDe(arr, fmt) {
    if (!Array.isArray(arr)) return [];
    return arr
      .map((x) => [dataISO(x && x.date), num(x && x.views), num(x && x.subscribers), num(x && x.videos)])
      .filter((r) => r[0])
      .map((r) => [fmt(r[0]), r[1], r[2], r[3]])
      .sort((a, b) => a[0].localeCompare(b[0]));
  }
  async function porSB(id) {
    const inp = { 0: { json: { id } }, 1: { json: { id, period: "monthly" } }, 2: { json: { id, limit: 31 } }, 3: { json: { id } } };
    const url = `${location.origin}/api/trpc/youtube.user,youtube.monthly,youtube.history,youtube.summary?batch=1&input=${encodeURIComponent(JSON.stringify(inp))}`;
    const t = await lerResposta(url);
    if (!t) return null;
    let j;
    try {
      j = JSON.parse(t);
    } catch (e) {
      return null;
    }
    if (!Array.isArray(j)) return null;
    const d = (i) => j[i] && j[i].result && j[i].result.data && j[i].result.data.json;
    const user = d(0);
    if (user && user.id && user.id !== id) return { outro: true };
    const sb = { at: new Date().toISOString() };
    if (user && typeof user === "object") {
      const ident = (user.identifier && user.identifier.type === "handle" && user.identifier.identifier) || ((user.identifiers || []).find((x) => x.type === "handle") || {}).identifier || "";
      sb.info = {
        nome: String(user.displayName || "").slice(0, 120),
        handle: String(ident).slice(0, 60),
        pais: String(user.country || "").slice(0, 4),
        tipo: String(user.channelType || "").slice(0, 30),
        criado: dataISO(user.createdAt),
        kids: user.madeForKids === true,
        redes: (Array.isArray(user.socials) ? user.socials : []).map((x) => x && x.url).filter((u) => typeof u === "string" && /^https?:\/\//.test(u)).slice(0, 12),
        subs: num(user.subscribers),
        views: num(user.views),
        videos: num(user.videos),
      };
    }
    const m = colunas(linhasDe(d(1), (x) => x.slice(0, 7)), "mes");
    const dd = colunas(linhasDe(d(2), (x) => x), "dia");
    const w = colunas(linhasDe(d(3), (x) => x), "semana");
    if (m) sb.m = m;
    if (dd) sb.d = dd;
    if (w) sb.w = w;
    return sb.m || sb.d || sb.info ? sb : null;
  }
  const contarMeses = (sb) => (sb && sb.m ? sb.m.v.filter((x) => x !== null).length : 0);
  // ---------- TikTok ----------
  // tiktok.user aceita o nome de utilizador e devolve o id numérico; tiktok.monthly (ganhos por mês)
  // e tiktok.history (totais por dia) só aceitam o id numérico.
  function ttUser(x) {
    if (!x) return "";
    const s = String(x).trim();
    const m = /tiktok\.com\/@([\w.]{2,40})/i.exec(s) || /^@?([\w.]{2,40})$/.exec(s);
    return m ? m[1] : "";
  }
  function ttDasRedes(sb) {
    const redes = (sb && sb.info && sb.info.redes) || [];
    for (const u of redes) {
      const n = ttUser(/tiktok\.com/i.test(u) ? u : "");
      if (n) return n;
    }
    return "";
  }
  function colunasTT(linhas, passo) {
    if (!linhas.length) return null;
    const ini = linhas[0][0];
    const pos = (d) => (passo === "mes" ? (Number(d.slice(0, 4)) - Number(ini.slice(0, 4))) * 12 + Number(d.slice(5, 7)) - Number(ini.slice(5, 7)) : Math.round((Date.parse(d) - Date.parse(ini)) / DIA));
    const n = pos(linhas[linhas.length - 1][0]) + 1;
    if (n > 200) return null;
    const out = { ini, f: new Array(n).fill(null), l: new Array(n).fill(null), n: new Array(n).fill(null) };
    for (const [d, f, l, v] of linhas) {
      const i = pos(d);
      if (i < 0 || i >= n) continue;
      out.f[i] = f;
      out.l[i] = l;
      out.n[i] = v;
    }
    return out;
  }
  function linhasTT(arr, fmt) {
    if (!Array.isArray(arr)) return [];
    return arr
      .map((x) => [dataISO(x && x.date), num(x && x.followers), num(x && x.likes), num(x && x.videos)])
      .filter((r) => r[0])
      .map((r) => [fmt(r[0]), r[1], r[2], r[3]])
      .sort((a, b) => a[0].localeCompare(b[0]));
  }
  async function trpc(procs, inp) {
    const t = await lerResposta(`${location.origin}/api/trpc/${procs}?batch=1&input=${encodeURIComponent(JSON.stringify(inp))}`);
    if (!t) return null;
    try {
      const j = JSON.parse(t);
      return Array.isArray(j) ? j.map((x) => x && x.result && x.result.data && x.result.data.json) : null;
    } catch (e) {
      return null;
    }
  }
  async function porTikTok(nome) {
    if (!nome) return null;
    const a = await trpc("tiktok.user", { 0: { json: { id: nome } } });
    const u = a && a[0];
    if (!u || !u.id) return null;
    const id = String(u.id);
    const b = (await trpc("tiktok.monthly,tiktok.history", { 0: { json: { id, period: "monthly" } }, 1: { json: { id, limit: 31 } } })) || [];
    const tt = {
      at: new Date().toISOString(),
      info: { id, user: String(u.username || nome).slice(0, 40), nome: String(u.displayName || "").slice(0, 120), seg: num(u.followers), gostos: num(u.likes), videos: num(u.videos), criado: dataISO(u.createdAt) },
    };
    const m = colunasTT(linhasTT(b[0], (x) => x.slice(0, 7)), "mes");
    const d = colunasTT(linhasTT(b[1], (x) => x), "dia");
    if (m) tt.m = m;
    if (d) tt.d = d;
    return tt;
  }
  async function juntarTikTok(r, nome) {
    if (!nome) return;
    try {
      const tt = await porTikTok(nome);
      if (tt) r.tt = tt;
    } catch (e) {
      if (e instanceof Bloqueado) throw e;
    }
  }
  const textoTT = (r) => (r.tt ? `, TikTok @${r.tt.info.user} (${r.tt.m ? r.tt.m.f.length : 0} meses)` : "");


  // ---------- Página atual ----------
  function chaveDaPagina() {
    const m = location.pathname.match(/\/youtube\/(handle|c|user|channel)\/([^/?#]+)/);
    return m ? { tipo: m[1], valor: decodeURIComponent(m[2]) } : null;
  }

  async function lerEstaPagina() {
    const pTT = location.pathname.match(/\/tiktok\/user\/([^/?#]+)/);
    if (pTT) {
      const tt = await porTikTok(decodeURIComponent(pTT[1]));
      const raw = { kind: "placar-sb-raw", v: 3, soTikTok: true, url: location.href, title: tt ? tt.info.nome || tt.info.user : "", handle: "", channelId: "", series: [], meses: 0 };
      if (tt) raw.tt = tt;
      return { rec: novaRecolha(), raw };
    }
    const rec = await lerJanela(window);
    const chave = chaveDaPagina();
    const channelId = idDaPagina(rec);
    const h1 = document.querySelector("h1");
    const raw = resultado(rec, {
      url: location.href,
      title: (h1 ? h1.textContent : document.title).trim().slice(0, 200),
      handle: chave && chave.tipo !== "channel" ? chave.valor : "",
      channelId,
    });
    if (channelId) {
      try {
        const sb = await porSB(channelId);
        if (sb && !sb.outro) {
          raw.sb = sb;
          raw.series = [];
          raw.meses = contarMeses(sb);
          if (sb.info && sb.info.nome) raw.title = sb.info.nome;
          await juntarTikTok(raw, ttDasRedes(sb));
        }
      } catch (e) {
        if (e instanceof Bloqueado) throw e;
      }
    }
    return { rec, raw };
  }

  // ---------- Vários canais ----------
  /** Modelos de pedidos à API: os pedidos da página atual que levam o canal aberto. */
  function aprenderModelos(rec) {
    const chave = chaveDaPagina();
    const chaves = [];
    if (chave && chave.tipo !== "channel") chaves.push({ tipo: "handle", valor: chave.valor });
    const id = idDaPagina(rec);
    if (id) chaves.push({ tipo: "id", valor: id });
    const modelos = [];
    for (const u of urlsDaApi(window)) {
      for (const c of chaves) {
        if (c.valor.length >= 3 && trocarNoUrl(u, c.valor, c.valor)) {
          modelos.push({ url: u, tipo: c.tipo, valor: c.valor });
          break;
        }
      }
    }
    return modelos;
  }

  /** Troca o canal num pedido (no caminho ou nos parâmetros). Devolve null se não encontrou. */
  function trocarNoUrl(u, antigo, novo) {
    const url = new URL(u);
    const re = reChave(antigo);
    let mudou = false;
    const troca = (t) => t.replace(re, (m0, p) => ((mudou = true), p + novo));
    url.pathname = url.pathname
      .split("/")
      .map((seg) => {
        try {
          const dec = decodeURIComponent(seg);
          const novoSeg = troca(dec);
          return novoSeg === dec ? seg : encodeURIComponent(novoSeg);
        } catch (e) {
          return seg;
        }
      })
      .join("/");
    for (const [k, v] of [...url.searchParams]) {
      const nv = troca(v);
      if (nv !== v) url.searchParams.set(k, nv);
    }
    return mudou ? url.toString() : null;
  }

  function confirmar(rec, alvo) {
    if (!rec.ids.size) return "sem confirmação";
    return rec.ids.has(alvo.id) ? "ok" : "outro canal";
  }

  async function porApi(alvo, modelos) {
    if (!modelos.length) return null;
    const rec = novaRecolha();
    for (const m of modelos) {
      const valor = m.tipo === "handle" ? alvo.h || alvo.id : alvo.id;
      const url = trocarNoUrl(m.url, m.valor, valor);
      if (!url) continue;
      const t = await lerResposta(url);
      if (t) analisarTextoApi(rec, t, "api " + url.replace(/^https?:\/\/[^/]+/, "").replace(/\?.*/, ""));
    }
    return rec;
  }
  function urlCanal(alvo) {
    return `${location.origin}/youtube/channel/${alvo.id}`;
  }
  async function porHtml(alvo) {
    const html = await lerResposta(urlCanal(alvo));
    if (!html) return null;
    const rec = novaRecolha();
    contarIds(rec, html);
    jsonNoTexto(rec, nextDoHTML(html), "next");
    if (!rec.series.length) jsonNoTexto(rec, html, "html");
    return rec;
  }
  async function porIframe(alvo) {
    const f = document.createElement("iframe");
    Object.assign(f.style, { position: "fixed", left: "-3000px", top: "0", width: "1280px", height: "900px", border: "0", opacity: "0", pointerEvents: "none" });
    const carregou = new Promise((r) => f.addEventListener("load", r, { once: true }));
    f.src = urlCanal(alvo);
    document.body.appendChild(f);
    try {
      await Promise.race([carregou, esperar(30000)]);
      let rec = null;
      for (let i = 0; i < 12; i++) {
        await esperar(1000);
        const w = f.contentWindow;
        if (!w || !w.document) break;
        if (/challenge|just a moment/i.test(w.document.title)) throw new Bloqueado("Verificação do Social Blade.");
        rec = await lerJanela(w);
        if (rec.series.length && confirmar(rec, alvo) !== "outro canal") break;
      }
      return rec;
    } finally {
      f.remove();
    }
  }

  // ---------- Estado guardado (para continuar depois) ----------
  function lerEstado() {
    try {
      return JSON.parse(localStorage.getItem(CHAVE) || "null");
    } catch (e) {
      return null;
    }
  }
  function gravarEstado(e) {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(e));
    } catch (err) {}
  }

  // ---------- Interface ----------
  const C = { fundo: "#1b0910", vidro: "rgba(255,255,255,0.06)", linha: "rgba(255,255,255,0.12)", texto: "#f7e9ee", suave: "#c9a9b4", rubi: "#e0294f", ouro: "#f4b942", verde: "#4fe3a0" };
  function el(tag, estilo, texto) {
    const e = document.createElement(tag);
    if (estilo) Object.assign(e.style, estilo);
    if (texto !== undefined) e.textContent = texto;
    return e;
  }
  function botao(texto, principal) {
    const b = el("button", { font: "600 13px system-ui, sans-serif", padding: "9px 14px", borderRadius: "999px", border: `1px solid ${principal ? "transparent" : C.linha}`, background: principal ? `linear-gradient(135deg,#ff4d70,${C.rubi} 55%,#8e0b2c)` : C.vidro, color: "#fff", cursor: "pointer", margin: "6px 6px 0 0" }, texto);
    return b;
  }

  const caixa = el("div", { position: "fixed", top: "16px", right: "16px", width: "380px", maxWidth: "calc(100vw - 32px)", maxHeight: "calc(100vh - 32px)", overflow: "auto", zIndex: "2147483647", background: C.fundo, color: C.texto, border: `1px solid ${C.linha}`, borderRadius: "22px", boxShadow: "0 24px 70px rgba(0,0,0,.55)", padding: "18px", font: "14px/1.45 system-ui, sans-serif", textAlign: "left" });
  const topo = el("div", { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" });
  topo.appendChild(el("b", { fontSize: "15px" }, "Placar ⇄ Social Blade"));
  const fechar = el("button", { background: "none", border: "0", color: C.suave, fontSize: "20px", cursor: "pointer" }, "×");
  topo.appendChild(fechar);
  caixa.appendChild(topo);

  // Secção: este canal
  const s1 = el("div", { background: C.vidro, border: `1px solid ${C.linha}`, borderRadius: "16px", padding: "12px 14px", marginBottom: "12px" });
  s1.appendChild(el("b", null, "Este canal"));
  const s1txt = el("div", { color: C.suave, fontSize: "13px", marginTop: "4px" }, "A ler a página…");
  s1.appendChild(s1txt);
  const bEnviar1 = botao("Enviar para o Placar", true);
  const bCopiar1 = botao("Copiar dados");
  bEnviar1.style.display = bCopiar1.style.display = "none";
  s1.append(bEnviar1, bCopiar1);
  caixa.appendChild(s1);

  // Secção: vários canais
  const s2 = el("div", { background: C.vidro, border: `1px solid ${C.linha}`, borderRadius: "16px", padding: "12px 14px" });
  s2.appendChild(el("b", null, "Todos os canais da lista"));
  s2.appendChild(el("div", { color: C.suave, fontSize: "13px", marginTop: "4px" }, "No Placar, em Editar > Importar dados, carrega em \"Copiar lista de canais\" e cola aqui."));
  const area = el("textarea", { width: "100%", boxSizing: "border-box", height: "64px", marginTop: "8px", background: "rgba(0,0,0,.3)", color: C.texto, border: `1px solid ${C.linha}`, borderRadius: "12px", padding: "8px", font: "12px ui-monospace, monospace" });
  area.placeholder = '{"kind":"placar-sb-lista",...}';
  s2.appendChild(area);
  const bComecar = botao("Começar", true);
  const bPausar = botao("Pausar");
  const bEnviar2 = botao("Enviar resultados para o Placar", true);
  const bCopiar2 = botao("Copiar resultados");
  const bLimpar = botao("Recomeçar do zero");
  bPausar.style.display = bEnviar2.style.display = bCopiar2.style.display = bLimpar.style.display = "none";
  s2.append(bComecar, bPausar, bEnviar2, bCopiar2, bLimpar);
  const barra = el("div", { height: "8px", borderRadius: "4px", background: "rgba(255,255,255,.08)", overflow: "hidden", marginTop: "12px", display: "none" });
  const barraI = el("i", { display: "block", height: "100%", width: "0%", background: `linear-gradient(90deg,${C.rubi},${C.ouro})`, transition: "width .3s" });
  barra.appendChild(barraI);
  s2.appendChild(barra);
  const estadoTxt = el("div", { fontSize: "13px", marginTop: "8px" });
  const registo = el("div", { fontSize: "12px", color: C.suave, marginTop: "6px", fontFamily: "ui-monospace, monospace", whiteSpace: "pre-wrap" });
  s2.append(estadoTxt, registo);
  caixa.appendChild(s2);
  document.body.appendChild(caixa);

  const linhas = [];
  function log(t) {
    linhas.unshift(t);
    registo.textContent = linhas.slice(0, 7).join("\n");
  }

  function paraB64(obj) {
    return btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
  }
  function abrirPlacar(param, obj) {
    const b64 = paraB64(obj);
    if (b64.length > 1800000) {
      alert("Os dados são grandes demais para enviar diretamente. Usa \"Copiar resultados\" e cola no Placar.");
      return;
    }
    const w = window.open(`${ORIGEM}/#/editar/importar?${param}=${encodeURIComponent(b64)}`, "_blank");
    if (!w) alert("O browser bloqueou a nova janela. Usa \"Copiar\" e cola no Placar, em Editar > Importar dados.");
  }
  async function copiar(obj, botaoEl) {
    const t = JSON.stringify(obj);
    try {
      await navigator.clipboard.writeText(t);
    } catch (e) {
      const ta = el("textarea");
      ta.value = t;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    const antes = botaoEl.textContent;
    botaoEl.textContent = "Copiado ✓";
    setTimeout(() => (botaoEl.textContent = antes), 1800);
  }

  // ---------- Este canal ----------
  let atual = null;
  const leitura = (async () => {
    try {
      atual = await lerEstaPagina();
      const r = atual.raw;
      if (r.soTikTok) {
        if (!r.tt) {
          s1txt.textContent = "Não encontrei os números deste perfil do TikTok.";
          return;
        }
        s1txt.textContent = `TikTok @${r.tt.info.user}: ${r.tt.info.seg !== null ? r.tt.info.seg.toLocaleString("pt-PT") + " seguidores, " : ""}${r.tt.m ? r.tt.m.f.length : 0} meses e ${r.tt.d ? r.tt.d.f.length : 0} dias.`;
        bEnviar1.style.display = bCopiar1.style.display = "";
        return;
      }
      if (!r.series.length && !r.sb) {
        s1txt.textContent = chaveDaPagina() ? "Ainda não encontrei números nesta página. Espera que os gráficos carreguem e carrega outra vez no marcador." : "Abre a página de um canal do YouTube (ou de um perfil do TikTok) no Social Blade.";
        return;
      }
      s1txt.textContent = r.sb ? `${r.title || r.handle}: ${r.meses} meses, ${r.sb.d ? r.sb.d.v.length : 0} dias e ${r.sb.w ? r.sb.w.v.length : 0} semanas (views, subscritores e vídeos)${r.sb.info && r.sb.info.redes.length ? `, ${r.sb.info.redes.length} redes sociais` : ""}.` : `${r.title || r.handle}: encontrei dados de ${r.meses} meses.`;
      bEnviar1.style.display = bCopiar1.style.display = "";
    } catch (e) {
      s1txt.textContent = e instanceof Bloqueado ? "O Social Blade está a travar os pedidos. Espera um minuto, recarrega a página e carrega outra vez no marcador." : "Não consegui ler esta página: " + e.message;
    }
  })();
  bEnviar1.onclick = () => abrirPlacar("sb", atual.raw);
  bCopiar1.onclick = () => copiar(atual.raw, bCopiar1);

  // ---------- Vários canais ----------
  let estado = lerEstado();
  let correr = false;
  function lerLista(txt) {
    const o = JSON.parse(txt);
    if (!o || o.kind !== "placar-sb-lista" || !Array.isArray(o.canais)) throw new Error("Isto não é a lista copiada no Placar.");
    return o.canais.filter((c) => c && /^UC[\w-]{22}$/.test(c.id));
  }
  function resultadosLote() {
    return { kind: "placar-sb-lote", v: 2, at: new Date().toISOString(), itens: estado ? estado.itens : [] };
  }
  function mostrarEstado() {
    if (!estado) return;
    const n = estado.lista.length;
    const feitos = estado.i;
    const ok = estado.itens.filter(temDados).length;
    barra.style.display = "";
    barraI.style.width = `${Math.round((feitos / Math.max(1, n)) * 100)}%`;
    estadoTxt.replaceChildren();
    estadoTxt.append(el("b", null, `${feitos} de ${n} canais`), document.createTextNode(` · ${ok} com dados · ${feitos - ok} sem dados`));
    const temRes = estado.itens.length > 0;
    bEnviar2.style.display = bCopiar2.style.display = temRes ? "" : "none";
    bComecar.textContent = feitos < n ? "Continuar" : "Começar";
    bComecar.style.display = correr || feitos >= n ? "none" : "";
    bPausar.style.display = correr ? "" : "none";
    bLimpar.style.display = correr ? "none" : "";
    area.style.display = "none";
  }
  if (estado) {
    log(`Há uma recolha a meio (${estado.i} de ${estado.lista.length}). Carrega em Continuar.`);
    mostrarEstado();
  }

  let ordem = ["api", "html", "iframe"];
  const temDados = (x) => Boolean((x.sb && (x.sb.m || x.sb.d || x.sb.info)) || (x.series && x.series.length) || x.tt);
  let falhasSB = 0;
  async function umCanal(alvo, modelos) {
    let ultimo = null;
    if (falhasSB < 3) {
      const sb = await porSB(alvo.id);
      if (sb && sb.outro) ultimo = { erro: "Os dados eram de outro canal." };
      else if (sb) {
        falhasSB = 0;
        const r = { kind: "placar-sb-raw", v: 3, channelId: alvo.id, handle: alvo.h || "", title: alvo.n || "", series: [], sb, meses: contarMeses(sb), metodo: "sb" };
        await juntarTikTok(r, ttUser(alvo.tt) || ttDasRedes(sb));
        return r;
      } else falhasSB++;
      if (falhasSB < 3) return Object.assign({ channelId: alvo.id, title: alvo.n || "", series: [], meses: 0 }, ultimo || { erro: "O Social Blade não tem este canal." });
    }
    for (const metodo of ordem) {
      let rec = null;
      if (metodo === "api") rec = await porApi(alvo, modelos);
      else if (metodo === "html") rec = await porHtml(alvo);
      else rec = await porIframe(alvo);
      if (!rec) continue;
      const conf = confirmar(rec, alvo);
      if (conf === "outro canal") {
        ultimo = { erro: "Os dados eram de outro canal." };
        continue;
      }
      const r = resultado(rec, { channelId: alvo.id, handle: alvo.h || "", title: alvo.n || "" });
      if (r.series.length) {
        ordem = [metodo, ...ordem.filter((x) => x !== metodo)];
        return Object.assign(r, { metodo, confirmacao: conf });
      }
      await esperar(400);
    }
    return Object.assign({ channelId: alvo.id, title: alvo.n || "", series: [], meses: 0 }, ultimo || { erro: "Sem dados." });
  }

  async function ciclo() {
    correr = true;
    mostrarEstado();
    await leitura;
    const modelos = aprenderModelos(atual ? atual.rec : novaRecolha());
    if (estado.i === 0) log(modelos.length ? `Aprendi ${modelos.length} pedido(s) da página aberta.` : "Sem pedidos para copiar. Vou abrir cada canal.");
    while (correr && estado.i < estado.lista.length) {
      const alvo = estado.lista[estado.i];
      let r;
      try {
        r = await umCanal(alvo, modelos);
      } catch (e) {
        if (e instanceof Bloqueado) {
          correr = false;
          log("⚠ O Social Blade pediu uma verificação ou travou os pedidos. Recarrega esta página (resolve a verificação se aparecer), espera um minuto e carrega outra vez no marcador para continuar.");
          break;
        }
        r = { channelId: alvo.id, title: alvo.n || "", series: [], meses: 0, erro: String(e.message || e) };
      }
      estado.itens = estado.itens.filter((x) => x.channelId !== alvo.id);
      estado.itens.push(r);
      estado.i++;
      gravarEstado(estado);
      log(`${temDados(r) ? "✓" : "–"} ${alvo.n || alvo.id}: ${temDados(r) ? `${r.meses} meses${r.sb && r.sb.info && r.sb.info.redes.length ? `, ${r.sb.info.redes.length} redes` : ""}${textoTT(r)} (${r.metodo})` : r.erro || "sem dados"}`);
      mostrarEstado();
      if (estado.i < estado.lista.length) await esperar(1500 + Math.random() * 1500);
    }
    correr = false;
    if (estado.i >= estado.lista.length) log("Terminado. Envia os resultados para o Placar.");
    mostrarEstado();
  }

  bComecar.onclick = () => {
    if (!estado) {
      let lista;
      try {
        lista = lerLista(area.value.trim());
      } catch (e) {
        alert(e.message || "Cola primeiro a lista copiada no Placar.");
        return;
      }
      if (!lista.length) return alert("A lista está vazia.");
      estado = { lista, i: 0, itens: [] };
      gravarEstado(estado);
    }
    ciclo();
  };
  bPausar.onclick = () => {
    correr = false;
    log("Em pausa. Carrega em Continuar quando quiseres.");
  };
  bEnviar2.onclick = () => abrirPlacar("sbl", resultadosLote());
  bCopiar2.onclick = () => copiar(resultadosLote(), bCopiar2);
  bLimpar.onclick = () => {
    if (!confirm("Apagar a recolha guardada e começar outra vez?")) return;
    correr = false;
    estado = null;
    try {
      localStorage.removeItem(CHAVE);
    } catch (e) {}
    linhas.length = 0;
    registo.textContent = estadoTxt.textContent = "";
    barra.style.display = "none";
    area.style.display = "";
    bComecar.style.display = "";
    bComecar.textContent = "Começar";
    bPausar.style.display = bEnviar2.style.display = bCopiar2.style.display = bLimpar.style.display = "none";
  };

  fechar.onclick = () => {
    caixa.style.display = "none";
  };
  window.__placarSB = {
    mostrar() {
      caixa.style.display = "";
    },
  };
})();
