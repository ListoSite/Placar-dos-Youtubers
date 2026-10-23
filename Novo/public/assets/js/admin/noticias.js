// O Caso, Notícias (painel): escrever, publicar, fixar, arquivar e apagar notícias,
// e ver as reações, as respostas e o termómetro de stress de cada uma.

import { api, pessoa, procurar } from "../data.js";
import { esc, inteiro } from "../format.js";
import { $, $$, avatar, toast, janela, confirmar } from "../ui.js";
import { chamar } from "./common.js";

const ESTADOS = { publicada: "Publicada", rascunho: "Rascunho", arquivada: "Arquivada" };
let filtro = "todas";

const quando = (iso) => new Date(iso).toLocaleString("pt-PT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const termo = (q) => {
  const v = Math.round((q || 0) * 100);
  return `<span class="nt-termo">🌡️ ${v >= 60 ? "A ferver" : v >= 35 ? "Quente" : v >= 15 ? "Morno" : "Calmo"}<span class="nt-termo-barra"><i style="width:${Math.max(4, v)}%"></i></span></span>`;
};

export async function desenharNoticias(main) {
  const corpo = $("#csp-corpo", main);
  let r;
  try {
    r = await api("admin/caso/noticias");
  } catch (e) {
    corpo.innerHTML = `<div class="aviso"><p>${esc(e.message)}</p></div>`;
    return;
  }
  const recarregar = () => desenharNoticias(main);
  $("#csp-nova", main).onclick = () => editor(r, null, recarregar);
  const conta = Object.fromEntries(Object.keys(ESTADOS).map((k) => [k, r.noticias.filter((n) => n.estado === k).length]));
  const lista = filtro === "todas" ? r.noticias : r.noticias.filter((n) => n.estado === filtro);
  let aba = null;
  try {
    aba = (await api("admin/vitrine")).config.abas.find((a) => a.id === "caso");
  } catch {
    /* sem a configuração: não avisa */
  }

  const cartao = (n) => {
    const t = r.temas[n.tema] || r.temas.noticia;
    const totalR = Object.values(n.conta.r || {}).reduce((a, b) => a + b, 0);
    const totalO = Object.values(n.conta.o || {}).reduce((a, b) => a + b, 0);
    const reacoes = Object.entries(n.conta.r || {})
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${r.reacoes[k]?.emoji || ""} ${inteiro(v)}`)
      .join(" · ");
    const gente = n.pessoas
      .map((id) => pessoa(id))
      .filter(Boolean)
      .map((p) => `<span class="sgp-pessoa">${avatar(p, 22)}${esc(p.name)}</span>`)
      .join("");
    return `<article class="painel ed-bloco ntp-cartao ${n.estado}" data-n="${esc(n.id)}" style="--tc:${t.cor}">
      <div class="vv-cabeca"><span class="ntp-tema">${t.icone} ${esc(t.nome)}</span><span class="vt-selo ${n.estado === "publicada" ? "aberta" : ""}">${ESTADOS[n.estado]}</span>${n.fixada ? `<span class="vt-selo previsao">📌 Fixada</span>` : ""}${n.votar ? "" : `<span class="vt-selo">Votos fechados</span>`}<small class="muted">${esc(quando(n.data))}</small></div>
      <h3>${esc(n.titulo)}</h3>
      ${n.texto ? `<p class="ntp-texto">${esc(n.texto)}</p>` : ""}
      ${gente ? `<div class="sgp-gente">${gente}</div>` : ""}
      <div class="ntp-numeros"><span><b>${inteiro(n.conta.n || 0)}</b> ${n.conta.n === 1 ? "pessoa votou" : "pessoas votaram"}</span>${totalR ? `<span>${reacoes}</span>${termo(n.conta.quente)}` : ""}</div>
      ${n.pergunta ? `<p class="muted" style="margin:0 0 6px;font-size:var(--t-sm)"><b>${esc(n.pergunta)}</b> · ${inteiro(totalO)} ${totalO === 1 ? "resposta" : "respostas"}</p><div class="ntp-respostas">${n.opcoes
        .map((o, i) => {
          const c = n.conta.o?.[i] || 0;
          const pct = totalO ? Math.round((c / totalO) * 100) : 0;
          return `<div><i style="width:${pct}%"></i><span>${esc(o)}</span><b>${pct}% · ${inteiro(c)}</b></div>`;
        })
        .join("")}</div>` : ""}
      <div class="sgp-acoes">
        <button class="btn btn-pequeno" data-editar>Editar</button>
        ${n.estado !== "publicada" ? `<button class="btn btn-primario btn-pequeno" data-estado="publicada">Publicar</button>` : `<button class="btn btn-pequeno" data-estado="arquivada">Arquivar</button>`}
        <button class="btn btn-pequeno" data-fixar>${n.fixada ? "Desafixar" : "📌 Fixar no topo"}</button>
        <button class="btn btn-pequeno" data-votar>${n.votar ? "Fechar votos" : "Abrir votos"}</button>
        <button class="botao-icone" data-apagar title="Apagar">✕</button>
      </div>
    </article>`;
  };

  corpo.innerHTML = `${aba && !aba.visivel ? `<div class="aviso"><p><b>A aba "${esc(aba.nome)}" está desligada:</b> o público não vê as notícias. Podes escrever e publicar já, e ligar a aba quando quiseres (em Karma ou em Página pública → Abas).</p></div>` : ""}
    <div class="filtros"><div class="segmentos" role="group" aria-label="Mostrar">${[["todas", `Todas (${r.noticias.length})`], ...Object.entries(ESTADOS).map(([k, n]) => [k, `${n}s (${conta[k]})`])].map(([k, n]) => `<button data-filtro="${k}" aria-pressed="${filtro === k}">${n}</button>`).join("")}</div></div>
    <div class="ntp-lista">${lista.map(cartao).join("") || `<div class="painel ed-bloco"><p class="muted">${r.noticias.length ? "Nada aqui." : "Ainda não há notícias. Carrega em \"+ Nova notícia\" para escrever a primeira."}</p></div>`}</div>
    <p class="muted sgp-regras-txt">No site, as fixadas aparecem primeiro e depois as mais recentes. O termómetro de stress mede a parte das reações quentes (🔥 😡 😮 🍿). O Início pode mostrar as últimas com o bloco "Notícias do Caso".</p>`;

  $$("[data-filtro]", corpo).forEach((b) => b.addEventListener("click", () => ((filtro = b.dataset.filtro), recarregar())));
  const guardar = async (n, mud, botao, sucesso) => {
    await chamar("caso/noticia", { noticia: { ...n, ...mud } }, { botao, recarregar: false, sucesso }).catch(() => {});
    recarregar();
  };
  $$("[data-n]", corpo).forEach((el) => {
    const n = r.noticias.find((x) => x.id === el.dataset.n);
    el.querySelector("[data-editar]").addEventListener("click", () => editor(r, n, recarregar));
    el.querySelector("[data-estado]")?.addEventListener("click", (e) => guardar(n, { estado: e.currentTarget.dataset.estado }, e.currentTarget, e.currentTarget.dataset.estado === "publicada" ? "Publicada: já está no site." : "Arquivada: saiu do site."));
    el.querySelector("[data-fixar]").addEventListener("click", (e) => guardar(n, { fixada: !n.fixada }, e.currentTarget, n.fixada ? "Desafixada." : "Fixada no topo."));
    el.querySelector("[data-votar]").addEventListener("click", (e) => guardar(n, { votar: !n.votar }, e.currentTarget, n.votar ? "Votos fechados." : "Votos abertos."));
    el.querySelector("[data-apagar]").addEventListener("click", async (e) => {
      if (!(await confirmar(`Apagar "${n.titulo}" e todos os votos? Não dá para desfazer.`, { sim: "Apagar", perigo: true }))) return;
      await chamar("caso/noticia/apagar", { id: n.id }, { botao: e.currentTarget, recarregar: false, sucesso: "Apagada." }).catch(() => {});
      recarregar();
    });
  });
}

/** Escrever ou editar uma notícia. */
function editor(r, n, depois) {
  const d = n || { tema: "noticia", titulo: "", texto: "", pessoas: [], link: "", imagem: "", pergunta: "", opcoes: [], estado: "publicada", fixada: false, votar: true };
  let tema = d.tema;
  let pessoas = [...(d.pessoas || [])];
  const local = (iso) => {
    const x = new Date(iso || Date.now());
    return new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };
  const opcoes = [...(d.opcoes || []), "", "", "", ""].slice(0, 4);
  const { el, fechar } = janela(
    `<h2>${n ? "Editar notícia" : "Nova notícia"}</h2>
    <form class="vc-form ntp-form">
      <div class="campo"><span>Tema</span><div class="ntp-temas">${Object.entries(r.temas)
        .map(([k, t]) => `<button type="button" data-tema="${k}" aria-pressed="${tema === k}" style="--tc:${t.cor}">${t.icone} ${esc(t.nome)}</button>`)
        .join("")}</div></div>
      <label class="campo"><span>Título</span><input class="input" name="titulo" maxlength="160" required value="${esc(d.titulo)}" placeholder="O que aconteceu?"></label>
      <label class="campo"><span>Texto</span><textarea class="input" name="texto" rows="5" maxlength="3000" placeholder="Conta o que se passou. Uma linha em branco faz um novo parágrafo.">${esc(d.texto || "")}</textarea></label>
      <div class="campo"><span>Youtubers envolvidos (o público pode dar-lhes karma na notícia)</span>
        <input class="input" id="ntp-procura" placeholder="Procurar Youtuber" autocomplete="off">
        <div class="ntp-resultados" id="ntp-resultados"></div>
        <div class="ntp-pessoas" id="ntp-pessoas"></div></div>
      <div class="ed-grelha">
        <label class="campo"><span>Fonte (link, opcional)</span><input class="input" name="link" type="url" placeholder="https://…" value="${esc(d.link || "")}"></label>
        <label class="campo"><span>Imagem (link, opcional)</span><input class="input" name="imagem" type="url" placeholder="https://…/imagem.jpg" value="${esc(d.imagem || "")}"></label>
      </div>
      <label class="campo"><span>Pergunta ao público (opcional)</span><input class="input" name="pergunta" maxlength="140" placeholder="Por exemplo: Quem tem razão?" value="${esc(d.pergunta || "")}"></label>
      <div class="ntp-opcoes">${opcoes.map((o, i) => `<input class="input" name="opcao${i}" maxlength="60" placeholder="Resposta ${i + 1}${i < 2 ? "" : " (opcional)"}" value="${esc(o)}">`).join("")}</div>
      <div class="ed-grelha">
        <label class="campo"><span>Data</span><input class="input" name="data" type="datetime-local" value="${local(d.data)}"></label>
        <label class="campo"><span>Estado</span><select class="input" name="estado">${Object.entries(ESTADOS).map(([k, v]) => `<option value="${k}" ${d.estado === k ? "selected" : ""}>${v}</option>`).join("")}</select></label>
      </div>
      <label class="ed-check"><input type="checkbox" name="fixada" ${d.fixada ? "checked" : ""}> Fixar no topo</label>
      <label class="ed-check"><input type="checkbox" name="votar" ${d.votar !== false ? "checked" : ""}> Aceitar reações e respostas</label>
    </form>
    <div class="janela-acoes"><button class="btn" data-fechar>Cancelar</button><button class="btn btn-primario" data-ok>${n ? "Guardar" : "Publicar"}</button></div>`,
    { larga: true },
  );
  const f = $("form", el);
  $$("[data-tema]", el).forEach((b) =>
    b.addEventListener("click", () => {
      tema = b.dataset.tema;
      $$("[data-tema]", el).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    }),
  );
  const pintarPessoas = () => {
    $("#ntp-pessoas", el).innerHTML = pessoas
      .map((id) => pessoa(id))
      .filter(Boolean)
      .map((p) => `<button type="button" data-tirar="${esc(p.id)}" title="Tirar">${avatar(p, 24)}${esc(p.name)} ✕</button>`)
      .join("");
    $$("[data-tirar]", el).forEach((b) => b.addEventListener("click", () => ((pessoas = pessoas.filter((x) => x !== b.dataset.tirar)), pintarPessoas())));
  };
  const procura = $("#ntp-procura", el);
  procura.addEventListener("input", () => {
    const l = procura.value.trim() ? procurar(procura.value, 8).filter((p) => !pessoas.includes(p.id)) : [];
    $("#ntp-resultados", el).innerHTML = l.map((p) => `<button type="button" data-por="${esc(p.id)}">${avatar(p, 24)}${esc(p.name)}</button>`).join("");
    $$("[data-por]", el).forEach((b) =>
      b.addEventListener("click", () => {
        if (pessoas.length >= 8) return toast("No máximo 8 Youtubers por notícia.", { erro: true });
        pessoas.push(b.dataset.por);
        procura.value = "";
        $("#ntp-resultados", el).innerHTML = "";
        pintarPessoas();
        procura.focus();
      }),
    );
  });
  pintarPessoas();
  $("[data-ok]", el).addEventListener("click", async (e) => {
    const v = (k) => f.elements[k].value;
    const noticia = {
      ...(n ? { id: n.id } : {}),
      tema,
      titulo: v("titulo"),
      texto: v("texto"),
      pessoas,
      link: v("link"),
      imagem: v("imagem"),
      pergunta: v("pergunta"),
      opcoes: [0, 1, 2, 3].map((i) => v(`opcao${i}`)),
      data: v("data") ? new Date(v("data")).toISOString() : undefined,
      estado: v("estado"),
      fixada: f.elements.fixada.checked,
      votar: f.elements.votar.checked,
    };
    if (!noticia.titulo.trim()) return toast("Escreve um título.", { erro: true });
    if (noticia.pergunta.trim() && noticia.opcoes.filter((o) => o.trim()).length < 2) return toast("A pergunta precisa de pelo menos 2 respostas.", { erro: true });
    try {
      await chamar("caso/noticia", { noticia }, { botao: e.currentTarget, recarregar: false, sucesso: noticia.estado === "publicada" ? "Notícia no site." : "Guardada." });
      fechar();
      depois();
    } catch {
      /* o erro já apareceu */
    }
  });
}

