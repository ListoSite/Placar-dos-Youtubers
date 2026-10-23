// O Caso, Notícias: o que anda a acontecer, com um tema (polémica, coisas boas…).
// O público reage, responde à pergunta (se houver) e dá karma aos Youtubers envolvidos.

import { api, estado } from "../data.js";
import { esc, inteiro } from "../format.js";
import { $, $$, avatar, toast } from "../ui.js";
import { temConta, tokenConta } from "../conta.js";
import { ligacaoPessoa } from "./comum.js";

/** "há 3 horas", "ontem", "12 de outubro". */
export function quando(iso) {
  const ms = Date.now() - Date.parse(iso);
  const min = Math.round(ms / 60000);
  if (min < 1) return "agora mesmo";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} ${h === 1 ? "hora" : "horas"}`;
  const d = Math.round(h / 24);
  if (d === 1) return "ontem";
  if (d < 7) return `há ${d} dias`;
  return new Date(iso).toLocaleDateString("pt-PT", { day: "numeric", month: "long", ...(d > 300 ? { year: "numeric" } : {}) });
}

/** Texto com parágrafos (sem HTML vindo de fora). */
const paragrafos = (t) =>
  esc(t)
    .split(/\n{2,}/)
    .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
    .join("");

const dominio = (u) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

/** Termómetro de stress: 0 a 1. */
export function termometro(q) {
  const v = Math.round((q || 0) * 100);
  const nome = v >= 60 ? "A ferver" : v >= 35 ? "Quente" : v >= 15 ? "Morno" : "Calmo";
  return `<div class="nt-termo" title="Termómetro de stress: a parte das reações quentes (🔥 😡 😮 🍿)"><span>🌡️ ${nome}</span><div class="nt-termo-barra"><i style="width:${Math.max(4, v)}%"></i></div></div>`;
}

/**
 * Monta as notícias dentro de alvo.
 * karma: { resumo, meus, pontos(k), votar(id, karma, botoes), ouvir(f) } — o karma do Caso, partilhado.
 */
export async function montarNoticias(alvo, { cfg, conta, karma, regrasKarma }) {
  alvo.innerHTML = `<div class="a-carregar"><div class="roda"></div></div>`;
  let dados;
  try {
    dados = await api("caso/noticias");
  } catch {
    alvo.innerHTML = `<div class="vidro pub-vazio"><p class="muted">Não foi possível abrir as notícias.</p></div>`;
    return;
  }
  let minhas = {};
  if (conta.eu) {
    const t = await tokenConta(cfg);
    if (t) minhas = (await api("caso/noticias/eu", { metodo: "POST", corpo: { token: t } }).catch(() => ({ minhas: {} }))).minhas || {};
  }
  const lista = dados.noticias;
  const temas = dados.temas;
  let tema = "todas";

  const pessoaLinha = (id) => {
    const p = estado.pessoas.get(id);
    if (!p) return "";
    const k = karma.resumo[id];
    const v = karma.pontos(k);
    const meu = karma.meus[id]?.karma || 0;
    const href = ligacaoPessoa(p);
    return `<div class="nt-pessoa" data-np="${esc(id)}">${avatar(p, 34)}<span class="nt-pnome">${href ? `<a href="${href}">${esc(p.name)}</a>` : esc(p.name)}<small class="${v > 0 ? "pos" : v < 0 ? "neg" : ""}">${k ? `Karma ${v > 0 ? "+" : ""}${v}` : "Sem karma"}</small></span>
      ${regrasKarma.votar ? `<button class="nt-k pos" data-k="1" aria-pressed="${meu === 1}" title="Apoiar">👍</button><button class="nt-k neg" data-k="-1" aria-pressed="${meu === -1}" title="Estou farto">👎</button>` : ""}</div>`;
  };

  const perguntaHtml = (n) => {
    if (!n.pergunta) return "";
    const meu = minhas[n.id]?.opcao ?? -1;
    const total = Object.values(n.conta.o || {}).reduce((a, b) => a + b, 0);
    const mostrar = meu >= 0 || !n.votar;
    return `<div class="nt-pergunta"><b>${esc(n.pergunta)}</b><div class="nt-opcoes">${n.opcoes
      .map((o, i) => {
        const c = n.conta.o?.[i] || 0;
        const pct = total ? Math.round((c / total) * 100) : 0;
        return `<button class="nt-opcao ${meu === i ? "minha" : ""}" data-o="${i}" ${n.votar ? "" : "disabled"}>${mostrar ? `<i style="width:${pct}%"></i>` : ""}<span>${esc(o)}</span>${mostrar ? `<b>${pct}%</b>` : ""}</button>`;
      })
      .join("")}</div><small>${mostrar ? `${inteiro(total)} ${total === 1 ? "resposta" : "respostas"}${meu >= 0 ? " · carrega outra vez para tirar a tua" : ""}` : "Responde para ver o que os outros acham."}</small></div>`;
  };

  const cartao = (n) => {
    const t = temas[n.tema] || temas.noticia;
    const meu = minhas[n.id]?.reacao || "";
    const reacoes = Object.entries(dados.reacoes)
      .map(([id, r]) => `<button class="nt-reacao" data-r="${id}" aria-pressed="${meu === id}" title="${esc(r.nome)}" ${n.votar ? "" : "disabled"}><span>${r.emoji}</span>${n.conta.r?.[id] ? `<b>${inteiro(n.conta.r[id])}</b>` : ""}</button>`)
      .join("");
    const pessoas = n.pessoas.map(pessoaLinha).filter(Boolean).join("");
    return `<article class="vidro nt-cartao" data-n="${esc(n.id)}" data-tema="${esc(n.tema)}" style="--tc:${t.cor}" data-anim-item>
      <div class="nt-topo"><span class="nt-tema">${t.icone} ${esc(t.nome)}</span>${n.fixada ? `<span class="nt-fixa">📌 Em destaque</span>` : ""}<small>${esc(quando(n.data))}</small></div>
      ${n.imagem ? `<img class="nt-img" src="${esc(n.imagem)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ""}
      <h2>${esc(n.titulo)}</h2>
      ${n.texto ? `<div class="nt-texto">${paragrafos(n.texto)}</div>` : ""}
      ${n.link ? `<a class="nt-fonte" href="${esc(n.link)}" target="_blank" rel="noopener nofollow">Ver a fonte · ${esc(dominio(n.link))} ↗</a>` : ""}
      ${pessoas ? `<div class="nt-pessoas"><small>Isto muda o que pensas de…</small>${pessoas}</div>` : ""}
      ${perguntaHtml(n)}
      <div class="nt-fundo"><div class="nt-reacoes">${reacoes}</div>${n.conta.n ? termometro(n.conta.quente) : ""}</div>
      ${n.votar ? "" : `<small class="nt-fechada">Já não aceita votos.</small>`}
    </article>`;
  };

  const usados = Object.keys(temas).filter((k) => lista.some((n) => n.tema === k));
  alvo.innerHTML = lista.length
    ? `${usados.length > 1 ? `<div class="nt-temas" role="group" aria-label="Temas"><button data-t="todas" aria-pressed="true">Todas</button>${usados.map((k) => `<button data-t="${k}" aria-pressed="false" style="--tc:${temas[k].cor}">${temas[k].icone} ${esc(temas[k].nome)}</button>`).join("")}</div>` : ""}<div class="nt-lista" id="nt-lista"></div>`
    : `<div class="vidro pub-vazio"><h3>Ainda não há notícias</h3><p class="muted">Volta em breve: aqui aparece o que anda a acontecer no YouTube português.</p></div>`;
  if (!lista.length) return;

  const listaEl = $("#nt-lista", alvo);
  const desenhar = () => {
    const l = tema === "todas" ? lista : lista.filter((n) => n.tema === tema);
    listaEl.innerHTML = l.map(cartao).join("") || `<p class="muted">Nada neste tema.</p>`;
    $$(".nt-cartao", listaEl).forEach(ligar);
  };

  const trocar = (id) => {
    const n = lista.find((x) => x.id === id);
    const el = $(`.nt-cartao[data-n="${CSS.escape(id)}"]`, listaEl);
    if (!n || !el) return;
    el.outerHTML = cartao(n);
    ligar($(`.nt-cartao[data-n="${CSS.escape(id)}"]`, listaEl));
  };

  const votar = async (n, mudanca, botoes) => {
    if (!temConta()) return conta.pedir("votar");
    botoes.forEach((b) => (b.disabled = true));
    try {
      const t = await tokenConta(cfg);
      if (!t) return conta.pedir("votar");
      const r = await api("caso/noticia/voto", { metodo: "POST", corpo: { token: t, id: n.id, ...mudanca } });
      minhas[n.id] = r.meu;
      n.conta = r.conta;
      trocar(n.id);
    } catch (e) {
      toast(e.message, { erro: true });
      botoes.forEach((b) => (b.disabled = false));
    }
  };

  const ligar = (el) => {
    if (!el) return;
    const n = lista.find((x) => x.id === el.dataset.n);
    const botoes = $$(".nt-reacao, .nt-opcao", el);
    $$("[data-r]", el).forEach((b) => b.addEventListener("click", () => votar(n, { reacao: minhas[n.id]?.reacao === b.dataset.r ? "" : b.dataset.r }, botoes)));
    $$("[data-o]", el).forEach((b) => b.addEventListener("click", () => votar(n, { opcao: (minhas[n.id]?.opcao ?? -1) === Number(b.dataset.o) ? -1 : Number(b.dataset.o) }, botoes)));
    $$("[data-np]", el).forEach((linha) => {
      const id = linha.dataset.np;
      const bs = $$("[data-k]", linha);
      bs.forEach((b) => b.addEventListener("click", () => karma.votar(id, (karma.meus[id]?.karma || 0) === Number(b.dataset.k) ? 0 : Number(b.dataset.k), bs)));
    });
  };

  // Quando o karma de alguém muda (aqui ou na lista de Youtubers), as notícias onde aparece atualizam
  karma.ouvir((id) => lista.filter((n) => n.pessoas.includes(id)).forEach((n) => trocar(n.id)));

  $$("[data-t]", alvo).forEach((b) =>
    b.addEventListener("click", () => {
      tema = b.dataset.t;
      $$("[data-t]", alvo).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      desenhar();
    }),
  );
  desenhar();
}
