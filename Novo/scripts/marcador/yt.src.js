// Marcador (bookmarklet) "Placar ⇄ YouTube".
//
// Corre dentro de uma página do youtube.com, no browser de quem o usa. Lê o "Acerca de" do canal
// (a mesma janela que aparece em "…mais"): descrição, links (Instagram, TikTok, sites…), país,
// data de entrada, subscritores, views, vídeos, emails escritos na descrição, foto e banner.
//   1. "Este canal": lê o canal da página aberta.
//   2. "Todos os canais da lista": recebe a lista copiada no Placar e lê o "Acerca de" de cada
//      canal, um de cada vez, com pausas. Não é preciso abrir cada canal.
// No fim, os dados vão para o Placar (Editar > Importar dados), onde se escolhe o que guardar.
//
// O YouTube não deixa usar innerHTML nas suas páginas: a interface é feita só com elementos.
// O ficheiro público é gerado com: node scripts/build-marcador.mjs

(() => {
  const ORIGEM = "__ORIGEM__";
  const CHAVE = "placarYTLote";
  if (window.__placarYT) {
    window.__placarYT.mostrar();
    return;
  }
  const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

  // ---------- Ler o "Acerca de" ----------
  /** O JSON ytInitialData que vem dentro do HTML de uma página do YouTube. */
  function dadosDoHtml(html) {
    const m = /ytInitialData\s*=\s*\{/.exec(html);
    if (!m) return null;
    const ini = m.index + m[0].length - 1;
    // Fecho do objeto: contar chavetas (fora de strings)
    let nivel = 0;
    let dentro = false;
    for (let i = ini; i < html.length; i++) {
      const c = html[i];
      if (dentro) {
        if (c === "\\") i++;
        else if (c === '"') dentro = false;
        continue;
      }
      if (c === '"') dentro = true;
      else if (c === "{") nivel++;
      else if (c === "}" && --nivel === 0) {
        try {
          return JSON.parse(html.slice(ini, i + 1));
        } catch (e) {
          return null;
        }
      }
    }
    return null;
  }

  /** Procura a primeira chave com este nome em qualquer sítio do objeto. */
  function achar(o, chave, fundo = 0) {
    if (!o || typeof o !== "object" || fundo > 40) return null;
    if (chave in o) return o[chave];
    for (const v of Object.values(o)) {
      const r = achar(v, chave, fundo + 1);
      if (r) return r;
    }
    return null;
  }

  const texto = (x) => (typeof x === "string" ? x : x?.content || x?.simpleText || (x?.runs || []).map((r) => r.text).join("") || "");

  /** "79,3 mil subscritores", "13 339 080 visualizações", "79.3K subscribers", "1,639 videos". */
  function numero(t) {
    const s = String(t || "").toLowerCase().replace(/[  ]/g, " ");
    const m = /(\d[\d\s.,]*)\s*(mil milh(?:õ|o)es|milh(?:õ|o)es|milhão|mil|mi|bi|[kmb])?\b/.exec(s);
    if (!m) return null;
    const suf = m[2] || "";
    const mult = { k: 1e3, mil: 1e3, m: 1e6, mi: 1e6, "milhão": 1e6, "milhões": 1e6, milhoes: 1e6, b: 1e9, bi: 1e9, "mil milhões": 1e9, "mil milhoes": 1e9 }[suf] || 1;
    let n = m[1].trim();
    if (mult > 1) {
      n = n.replace(/\s/g, "");
      // "79,3" ou "79.3": a última vírgula ou ponto é a parte decimal
      n = n.replace(/[.,](?=\d{1,2}$)/, "#").replace(/[.,]/g, "").replace("#", ".");
      return Math.round(parseFloat(n) * mult);
    }
    const v = Number(n.replace(/[\s.,]/g, ""));
    return Number.isFinite(v) ? v : null;
  }

  const MESES = { jan: 1, fev: 2, feb: 2, mar: 3, abr: 4, apr: 4, mai: 5, may: 5, jun: 6, jul: 7, ago: 8, aug: 8, set: 9, sep: 9, out: 10, oct: 10, nov: 11, dez: 12, dec: 12 };
  /** "Aderiu a 12/07/2007", "Joined Jul 13, 2007", "Aderiu a 13 de jul. de 2007". */
  function data(t) {
    const s = String(t || "").toLowerCase();
    let m = /(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/.exec(s);
    if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
    m = /(\d{1,2})\s*(?:de\s*)?([a-zç]{3})[a-zç.]*\s*(?:de\s*)?(\d{4})/.exec(s);
    if (m && MESES[m[2]]) return `${m[3]}-${String(MESES[m[2]]).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
    m = /([a-z]{3})[a-z.]*\s+(\d{1,2}),?\s+(\d{4})/.exec(s);
    if (m && MESES[m[1]]) return `${m[3]}-${String(MESES[m[1]]).padStart(2, "0")}-${m[2].padStart(2, "0")}`;
    m = /(\d{4})/.exec(s);
    return m ? `${m[1]}-01-01` : null;
  }

  /** O link verdadeiro (o YouTube embrulha-os em /redirect?q=…). */
  function linkReal(l) {
    const cmd = l?.link?.commandRuns?.[0]?.onTap?.innertubeCommand;
    const u = cmd?.urlEndpoint?.url || cmd?.commandMetadata?.webCommandMetadata?.url || "";
    try {
      if (u) {
        const x = new URL(u, location.origin);
        if (x.pathname === "/redirect" && x.searchParams.get("q")) return x.searchParams.get("q");
        if (!/youtube\.com$/.test(x.hostname) || !x.pathname.startsWith("/redirect")) return x.href;
      }
    } catch (e) {}
    const c = texto(l?.link);
    return c ? (/^https?:/i.test(c) ? c : "https://" + c) : "";
  }

  /** Tudo o que interessa de uma página "Acerca de". */
  function extrair(d) {
    if (!d) return null;
    const meta = d?.metadata?.channelMetadataRenderer || achar(d, "channelMetadataRenderer") || {};
    const a = achar(d, "aboutChannelViewModel") || {};
    const h = achar(d, "pageHeaderViewModel") || {};
    const id = a.channelId || meta.externalId || "";
    if (!id) return null;
    const descricao = a.description || meta.description || "";
    const links = (a.links || [])
      .map((x) => x.channelExternalLinkViewModel)
      .filter(Boolean)
      .map((l) => ({ titulo: texto(l.title), url: linkReal(l) }))
      .filter((l) => l.url);
    // Links e emails escritos na descrição
    for (const u of descricao.match(/https?:\/\/[^\s)<>"']+/gi) || []) if (!links.some((l) => l.url.replace(/\/$/, "") === u.replace(/\/$/, ""))) links.push({ titulo: "", url: u, daDescricao: true });
    const emails = [...new Set(descricao.match(/[\w.+-]+@[\w-]+\.[\w.]+/g) || [])];
    const handle = (/@[\w.-]+/.exec(a.canonicalChannelUrl || meta.vanityChannelUrl || "") || [""])[0];
    const fotos = (x) => (x?.sources || x?.thumbnails || []).slice(-1)[0]?.url || "";
    return {
      id,
      titulo: meta.title || texto(h?.title?.dynamicTextViewModel?.text) || "",
      handle,
      descricao: descricao.slice(0, 5000),
      pais: a.country || "",
      subs: numero(a.subscriberCountText),
      subsTexto: a.subscriberCountText || "",
      views: numero(a.viewCountText),
      videos: numero(a.videoCountText),
      desde: data(texto(a.joinedDateText)),
      links: links.slice(0, 30),
      emails,
      temEmailNegocio: Boolean(a.signInForBusinessEmail || a.businessEmailLabel),
      foto: fotos(meta.avatar) || fotos(h?.image?.decoratedAvatarViewModel?.avatar?.avatarViewModel?.image),
      banner: fotos(h?.banner?.imageBannerViewModel?.image),
      palavras: meta.keywords || "",
      familia: meta.isFamilySafe !== false,
      lido: new Date().toISOString(),
    };
  }

  async function lerCanal(caminho) {
    const r = await fetch(caminho, { credentials: "include" });
    if (r.status === 404) return { erro: "O canal não existe (404)." };
    if (!r.ok) return { erro: `Erro ${r.status}.` };
    const html = await r.text();
    if (/consent\.youtube\.com|before you continue|antes de continuar/i.test(r.url + html.slice(0, 3000))) return { erro: "O YouTube está a pedir para aceitar os cookies. Aceita na página e tenta outra vez.", parar: true };
    const c = extrair(dadosDoHtml(html));
    return c || { erro: "Não encontrei o \"Acerca de\" deste canal." };
  }

  /** O canal da página aberta: /@handle, /channel/UC…, /c/nome ou /user/nome (qualquer separador). */
  function caminhoDaPagina() {
    const p = location.pathname;
    const m = /^\/(@[^/]+|channel\/UC[\w-]{22}|c\/[^/]+|user\/[^/]+)/.exec(p);
    if (m) return `/${m[1]}/about`;
    // Numa página de vídeo: o canal de quem publicou
    const dono = document.querySelector("ytd-video-owner-renderer a[href^='/@'], ytd-video-owner-renderer a[href^='/channel/']");
    if (dono) {
      const h = new URL(dono.href).pathname.split("/").slice(0, dono.href.includes("/channel/") ? 3 : 2).join("/");
      return `${h}/about`;
    }
    return null;
  }

  // ---------- Estado do lote (fica guardado para continuar mais tarde) ----------
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

  // ---------- Interface (só com elementos: o YouTube proíbe innerHTML) ----------
  const C = { fundo: "#1b0910", vidro: "rgba(255,255,255,0.06)", linha: "rgba(255,255,255,0.12)", texto: "#f7e9ee", suave: "#c9a9b4", rubi: "#e0294f", ouro: "#f4b942", verde: "#4fe3a0" };
  function el(tag, estilo, txt) {
    const e = document.createElement(tag);
    if (estilo) Object.assign(e.style, estilo);
    if (txt !== undefined) e.textContent = txt;
    return e;
  }
  function botao(txt, principal) {
    return el("button", { font: "600 13px system-ui, sans-serif", padding: "9px 14px", borderRadius: "999px", border: `1px solid ${principal ? "transparent" : C.linha}`, background: principal ? `linear-gradient(135deg,#ff4d70,${C.rubi} 55%,#8e0b2c)` : C.vidro, color: "#fff", cursor: "pointer", margin: "6px 6px 0 0" }, txt);
  }
  const caixa = el("div", { position: "fixed", top: "70px", right: "16px", width: "380px", maxWidth: "calc(100vw - 32px)", maxHeight: "calc(100vh - 90px)", overflow: "auto", zIndex: "2147483647", background: C.fundo, color: C.texto, border: `1px solid ${C.linha}`, borderRadius: "22px", boxShadow: "0 24px 70px rgba(0,0,0,.55)", padding: "18px", font: "14px/1.45 system-ui, sans-serif", textAlign: "left" });
  const topo = el("div", { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" });
  topo.appendChild(el("b", { fontSize: "15px" }, "Placar ⇄ YouTube"));
  const fechar = el("button", { background: "none", border: "0", color: C.suave, fontSize: "20px", cursor: "pointer" }, "×");
  topo.appendChild(fechar);
  caixa.appendChild(topo);

  const s1 = el("div", { background: C.vidro, border: `1px solid ${C.linha}`, borderRadius: "16px", padding: "12px 14px", marginBottom: "12px" });
  s1.appendChild(el("b", null, "Este canal"));
  const s1txt = el("div", { color: C.suave, fontSize: "13px", marginTop: "4px", whiteSpace: "pre-wrap" }, "A ler o \"Acerca de\"…");
  s1.appendChild(s1txt);
  const bEnviar1 = botao("Enviar para o Placar", true);
  const bCopiar1 = botao("Copiar dados");
  bEnviar1.style.display = bCopiar1.style.display = "none";
  s1.append(bEnviar1, bCopiar1);
  caixa.appendChild(s1);

  const s2 = el("div", { background: C.vidro, border: `1px solid ${C.linha}`, borderRadius: "16px", padding: "12px 14px" });
  s2.appendChild(el("b", null, "Todos os canais da lista"));
  s2.appendChild(el("div", { color: C.suave, fontSize: "13px", marginTop: "4px" }, "No Placar, em Editar > Importar dados, carrega em \"Copiar lista para o YouTube\" e cola aqui. Não precisas de abrir cada canal."));
  const area = el("textarea", { width: "100%", boxSizing: "border-box", height: "60px", marginTop: "8px", background: "rgba(0,0,0,.3)", color: C.texto, border: `1px solid ${C.linha}`, borderRadius: "12px", padding: "8px", font: "12px ui-monospace, monospace" });
  area.placeholder = '{"kind":"placar-yt-lista",...}';
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
  const log = (t) => {
    linhas.unshift(t);
    registo.textContent = linhas.slice(0, 7).join("\n");
  };
  const paraB64 = (obj) => btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
  function abrirPlacar(obj) {
    const b64 = paraB64(obj);
    if (b64.length > 1800000) return alert("Os dados são grandes demais para enviar diretamente. Usa \"Copiar\" e cola no Placar, em Editar > Importar dados.");
    const w = window.open(`${ORIGEM}/painel/#/editar/importar?yt=${encodeURIComponent(b64)}`, "_blank");
    if (!w) alert("O browser bloqueou a nova janela. Usa \"Copiar\" e cola no Placar, em Editar > Importar dados.");
  }
  async function copiar(obj, b) {
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
    const antes = b.textContent;
    b.textContent = "Copiado ✓";
    setTimeout(() => (b.textContent = antes), 1800);
  }
  const pacote = (canais) => ({ kind: "placar-yt", v: 1, canais });
  const fmt = (n) => (n === null || n === undefined ? "?" : n >= 1e6 ? (n / 1e6).toFixed(1).replace(".", ",") + " M" : n >= 1e3 ? Math.round(n / 1e3) + " mil" : String(n));

  // ---------- Este canal ----------
  let atual = null;
  (async () => {
    const caminho = caminhoDaPagina();
    if (!caminho) {
      s1txt.textContent = "Abre a página de um canal (ou de um vídeo) para ler este canal.";
      return;
    }
    const r = await lerCanal(caminho).catch((e) => ({ erro: String(e.message || e) }));
    if (r.erro) {
      s1txt.textContent = r.erro;
      return;
    }
    atual = r;
    const redes = r.links.map((l) => {
      try {
        return new URL(l.url).hostname.replace(/^www\./, "");
      } catch (e) {
        return "";
      }
    });
    s1txt.textContent = `${r.titulo} ${r.handle}\n${fmt(r.subs)} subs · ${fmt(r.views)} views · ${r.videos ?? "?"} vídeos${r.pais ? " · " + r.pais : ""}${r.desde ? " · desde " + r.desde.slice(0, 4) : ""}\n${r.links.length} links${redes.length ? ": " + [...new Set(redes.filter(Boolean))].slice(0, 6).join(", ") : ""}${r.emails.length ? "\nEmail na descrição: " + r.emails.join(", ") : ""}`;
    bEnviar1.style.display = bCopiar1.style.display = "";
  })();
  bEnviar1.onclick = () => atual && abrirPlacar(pacote([atual]));
  bCopiar1.onclick = () => atual && copiar(pacote([atual]), bCopiar1);

  // ---------- Lote ----------
  let aCorrer = false;
  let est = lerEstado();
  function mostrarEstado() {
    if (!est) {
      barra.style.display = "none";
      bEnviar2.style.display = bCopiar2.style.display = bLimpar.style.display = bPausar.style.display = "none";
      bComecar.style.display = "";
      estadoTxt.textContent = "";
      return;
    }
    const total = est.lista.length;
    const feitos = est.i;
    barra.style.display = "";
    barraI.style.width = `${total ? (feitos / total) * 100 : 0}%`;
    estadoTxt.textContent = `${feitos} de ${total} canais lidos · ${est.canais.length} com dados${est.erros.length ? ` · ${est.erros.length} com erro` : ""}${aCorrer ? "" : feitos < total ? " · em pausa" : " · terminado"}`;
    bComecar.style.display = aCorrer ? "none" : "";
    bComecar.textContent = feitos ? (feitos < total ? "Continuar" : "Ler outra vez") : "Começar";
    bPausar.style.display = aCorrer ? "" : "none";
    bEnviar2.style.display = bCopiar2.style.display = est.canais.length && !aCorrer ? "" : "none";
    bLimpar.style.display = aCorrer ? "none" : "";
  }
  async function correr() {
    aCorrer = true;
    mostrarEstado();
    while (aCorrer && est.i < est.lista.length) {
      const c = est.lista[est.i];
      const r = await lerCanal(`/channel/${c.id}/about`).catch((e) => ({ erro: String(e.message || e) }));
      if (r.parar) {
        log(r.erro);
        aCorrer = false;
        break;
      }
      if (r.erro) {
        est.erros.push({ id: c.id, n: c.n, erro: r.erro });
        log(`✗ ${c.n}: ${r.erro}`);
      } else {
        est.canais = est.canais.filter((x) => x.id !== r.id).concat([{ ...r, p: c.p }]);
        log(`✓ ${c.n}: ${r.links.length} links${r.emails.length ? ", email" : ""}`);
      }
      est.i++;
      gravarEstado(est);
      mostrarEstado();
      // Pausa entre canais (para o YouTube não achar que é um robô)
      if (aCorrer && est.i < est.lista.length) await esperar(1500 + Math.random() * 2000);
    }
    aCorrer = false;
    mostrarEstado();
  }
  bComecar.onclick = () => {
    if (!est || (est.i >= est.lista.length && area.value.trim())) {
      let lista;
      try {
        lista = JSON.parse(area.value);
      } catch (e) {
        return alert("Cola primeiro a lista copiada no Placar.");
      }
      if (lista?.kind !== "placar-yt-lista" || !Array.isArray(lista.canais)) return alert("Isso não parece a lista do Placar.");
      est = { lista: lista.canais, i: 0, canais: [], erros: [] };
      gravarEstado(est);
    } else if (est.i >= est.lista.length) {
      est.i = 0;
      est.erros = [];
    }
    correr();
  };
  bPausar.onclick = () => {
    aCorrer = false;
    estadoTxt.textContent = "A parar depois deste canal…";
  };
  bEnviar2.onclick = () => abrirPlacar(pacote(est.canais));
  bCopiar2.onclick = () => copiar(pacote(est.canais), bCopiar2);
  bLimpar.onclick = () => {
    if (!confirm("Apagar o que já foi lido e recomeçar?")) return;
    est = null;
    try {
      localStorage.removeItem(CHAVE);
    } catch (e) {}
    linhas.length = 0;
    registo.textContent = "";
    mostrarEstado();
  };
  mostrarEstado();

  fechar.onclick = () => {
    aCorrer = false;
    caixa.remove();
    delete window.__placarYT;
  };
  window.__placarYT = { mostrar: () => document.body.contains(caixa) || document.body.appendChild(caixa) };
})();
