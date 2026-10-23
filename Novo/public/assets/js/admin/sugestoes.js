// Sugestões do público (painel): o que os visitantes sugeriram e votaram (tudo anónimo).
// Quando o prazo acaba, a sugestão vem para "Por decidir" e aqui aceitas ou recusas.
// Também se tiram sugestões do ar, se abre uma no Palco e se mudam as regras.

import { api, pessoa } from "../data.js";
import { esc, inteiro } from "../format.js";
import { $, $$, avatar, toast, janela, confirmar } from "../ui.js";
import { chamar } from "./common.js";
import { subnav } from "./caso.js";
import { atualizarPorDecidir } from "../app.js";

const ESTADOS = {
  acabou: { nome: "Por decidir", selo: "Acabou: decide", classe: "decidir" },
  ativa: { nome: "No ar", selo: "No ar", classe: "aberta" },
  aceite: { nome: "Aceites", selo: "Aceite", classe: "aceite" },
  recusada: { nome: "Recusadas", selo: "Recusada", classe: "" },
  removida: { nome: "Saíram", selo: "Saiu do ar", classe: "" },
};

let filtro = null;

export async function render(main) {
  main.dataset.titulo = "Sugestões";
  main.innerHTML = `<div class="wrap sgp">${subnav("sugestoes")}<div class="vc-topo"><div><h1>Sugestões do público</h1><p class="muted">Quem tem conta Google sugere vídeos na aba Sugerir e vota nas sugestões dos outros. É tudo anónimo. Quando o prazo acaba, a sugestão vem para <b>Por decidir</b> e tu aceitas ou recusas.</p></div>
    <div class="vc-acoes"><a class="btn" href="/#/sugestoes" target="_blank" rel="noopener">Ver no site</a><button class="btn" id="sgp-regras">Regras</button></div></div>
    <div id="sgp-corpo"><div class="a-carregar"><div class="roda"></div></div></div></div>`;
  await desenhar(main);
}

async function desenhar(main) {
  const corpo = $("#sgp-corpo", main);
  let r;
  try {
    r = await api("admin/sugestoes");
  } catch (e) {
    corpo.innerHTML = `<div class="aviso"><p>${esc(e.message)}</p></div>`;
    return;
  }
  $("#sgp-regras", main).onclick = () => regras(r, () => desenhar(main));
  if (!r.ligado) {
    corpo.innerHTML = `<div class="painel ed-bloco"><h3>Falta ligar o Supabase</h3><p class="muted">As sugestões usam o Supabase (login com Google). Liga-o em <a href="#/editar/definicoes">Editar, Definições</a>.</p></div>`;
    return;
  }
  const c = r.contagem || {};
  if (!filtro) filtro = c.acabou ? "acabou" : "ativa";
  const lista = filtro === "todas" ? r.lista : r.lista.filter((s) => s.estado === filtro);
  const reg = r.regras;
  const aviso = !r.aba?.visivel
    ? `<div class="aviso"><p><b>A aba "${esc(r.aba?.nome || "Sugerir")}" está desligada:</b> os visitantes não veem as sugestões nem podem sugerir.</p><button class="btn btn-primario btn-pequeno" id="sgp-ligar">Ligar a aba no site</button></div>`
    : !reg.novas
      ? `<div class="aviso info"><p>As sugestões novas estão fechadas (nas Regras). Os visitantes ainda votam nas que estão no ar.</p></div>`
      : "";
  corpo.innerHTML = `${aviso}
    <div class="sgp-resumo">
      ${resumo("Por decidir", c.acabou || 0, "acabou", c.acabou ? "destaque" : "")}
      ${resumo("No ar", `${c.ativa || 0}<small> de ${reg.max}</small>`, "ativa")}
      ${resumo("Aceites", c.aceite || 0, "aceite")}
      ${resumo("Saíram ou recusadas", (c.removida || 0) + (c.recusada || 0), "removida")}
    </div>
    <div class="filtros"><div class="segmentos" role="group" aria-label="Mostrar">
      ${[...Object.entries(ESTADOS).map(([k, e]) => [k, `${e.nome} (${c[k] || 0})`]), ["todas", "Todas"]].map(([k, n]) => `<button data-filtro="${k}" aria-pressed="${filtro === k}">${n}</button>`).join("")}
    </div></div>
    ${filtro === "acabou" && lista.length ? `<div class="aviso info"><p>Estas sugestões acabaram o prazo. Aceita as que vais fazer (aparecem no site como "O canal aceitou") ou recusa.</p></div>` : ""}
    <div class="sgp-lista">${lista.map((s) => cartao(s, r)).join("") || `<p class="muted">${filtro === "acabou" ? "Nenhuma sugestão à espera de decisão." : "Nada aqui."}</p>`}</div>
    <p class="muted sgp-regras-txt">Regras: no máximo ${reg.max} no ar · ${reg.dias} dias cada · saem com ${reg.percentagem}% de "não quero" (a partir de ${reg.minVotos} votos) · uma sugestão por conta a cada ${reg.horas} horas.</p>`;

  $$("[data-filtro]", corpo).forEach((b) => b.addEventListener("click", () => ((filtro = b.dataset.filtro), desenhar(main))));
  $$("[data-ir]", corpo).forEach((b) => b.addEventListener("click", () => ((filtro = b.dataset.ir), desenhar(main))));
  $("#sgp-ligar", corpo)?.addEventListener("click", async (e) => {
    const v = await api("admin/vitrine");
    const aba = v.config.abas.find((a) => a.id === "sugestoes");
    if (!aba) return toast("Atualiza a página e tenta outra vez.", { erro: true });
    aba.visivel = true;
    await chamar("vitrine", { config: v.config }, { botao: e.currentTarget, recarregar: false, sucesso: "A aba Sugerir já está no site." }).catch(() => {});
    desenhar(main);
  });

  const mudar = async (s, estado, botao, sucesso) => {
    await chamar("sugestao/estado", { id: s.id, estado }, { botao, recarregar: false, sucesso }).catch(() => {});
    atualizarPorDecidir({ forcar: true });
    desenhar(main);
  };
  $$("[data-s]", corpo).forEach((el) => {
    const s = r.lista.find((x) => x.id === el.dataset.s);
    el.querySelector("[data-aceitar]")?.addEventListener("click", (e) => mudar(s, "aceite", e.currentTarget, "Aceite. Aparece no site em \"O canal aceitou\"."));
    el.querySelector("[data-recusar]")?.addEventListener("click", (e) => mudar(s, "recusada", e.currentTarget, "Recusada."));
    el.querySelector("[data-acabar]")?.addEventListener("click", async (e) => {
      if (!(await confirmar(`Acabar já "${s.titulo}"? Sai do site e fica à espera da tua decisão.`, { sim: "Acabar já" }))) return;
      mudar(s, "acabou", e.currentTarget, "Acabou: está em Por decidir.");
    });
    el.querySelector("[data-tirar]")?.addEventListener("click", async (e) => {
      if (!(await confirmar(`Tirar "${s.titulo}" do site? Abre um lugar para outra sugestão.`, { sim: "Tirar do ar", perigo: true }))) return;
      mudar(s, "removida", e.currentTarget, "Tirada do ar.");
    });
    el.querySelector("[data-voltar]")?.addEventListener("click", (e) => mudar(s, "ativa", e.currentTarget, "Voltou para o site."));
    el.querySelector("[data-apagar]")?.addEventListener("click", async (e) => {
      if (!(await confirmar(`Apagar "${s.titulo}" e os votos? Não dá para desfazer.`, { sim: "Apagar", perigo: true }))) return;
      mudar(s, "apagar", e.currentTarget, "Apagada.");
    });
  });
}

const resumo = (nome, valor, ir, extra = "") => `<button class="painel sgp-num ${extra}" data-ir="${ir}"><b>${valor}</b><span>${nome}</span></button>`;

/** O endereço do Palco com as escolhas da sugestão já postas. */
export function ligacaoPalco(s) {
  const d = s.dados || {};
  const q = new URLSearchParams({ para: "video" });
  let esp = "";
  if (s.tipo === "top") {
    esp = "revelacao";
    q.set("metric", d.medida || "views");
    if (d.pessoas?.length) q.set("pessoas", d.pessoas.join(","));
    else {
      q.set("n", String(d.n || 10));
      if (d.cat) q.set("cat", d.cat);
    }
  } else if (s.tipo === "batalha") {
    esp = "batalha";
    q.set("a", d.a);
    q.set("b", d.b);
  } else if (s.tipo === "torneio") {
    esp = "torneio";
    q.set("pessoas", (d.pessoas || []).join(","));
  } else if (s.tipo === "simulacao") {
    esp = d.jogo;
    q.set("pessoas", (d.pessoas || []).join(","));
  } else if (s.tipo === "historia") {
    esp = "historia";
    q.set("id", d.id);
  }
  return esp ? `#/palco/${esp}?${q}` : "";
}

function cartao(s, r) {
  const t = r.tipos?.[s.tipo] || { nome: s.tipo, icone: "💡" };
  const e = ESTADOS[s.estado] || { selo: s.estado, classe: "" };
  const d = s.dados || {};
  const total = s.quero + s.nao;
  const pq = total ? Math.round((s.quero / total) * 100) : 0;
  const ids = [...(d.pessoas || []), d.a, d.b, d.id].filter(Boolean);
  const gente = ids
    .map((id) => pessoa(id))
    .filter(Boolean)
    .slice(0, 12)
    .map((p) => `<span class="sgp-pessoa">${avatar(p, 24)}${esc(p.name)}</span>`)
    .join("");
  const dt = (x) => (x ? new Date(x).toLocaleString("pt-PT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "");
  const datas = s.estado === "ativa" ? `Sugerida a ${dt(s.criado)} · acaba a ${dt(s.fecha)}` : `Sugerida a ${dt(s.criado)}${s.decidido ? ` · decidida a ${dt(s.decidido)}` : ` · prazo até ${dt(s.fecha)}`}`;
  const extra = s.tipo === "top" ? `Top ${d.n}${d.pessoas ? " só entre os escolhidos" : d.cat ? ` de ${esc(d.cat)}` : ""} · ${esc(r.medidas?.[d.medida] || d.medida)}` : s.tipo === "simulacao" ? esc(r.jogos?.[d.jogo]?.nome || d.jogo) : "";
  const palco = ligacaoPalco(s);
  const botoes = [];
  if (s.estado === "acabou") botoes.push(`<button class="btn btn-primario btn-pequeno" data-aceitar>✓ Aceitar</button>`, `<button class="btn btn-pequeno" data-recusar>✕ Recusar</button>`);
  if (s.estado === "ativa") botoes.push(`<button class="btn btn-pequeno" data-acabar>Acabar já</button>`, `<button class="btn btn-pequeno" data-tirar>Tirar do ar</button>`);
  if (s.estado === "aceite") botoes.push(`<button class="btn btn-pequeno" data-recusar>Mudar para recusada</button>`);
  if (s.estado === "recusada") botoes.push(`<button class="btn btn-pequeno" data-aceitar>Mudar para aceite</button>`);
  if (s.estado === "removida" && /painel/.test(s.motivo || "") && Date.parse(s.fecha) > Date.now()) botoes.push(`<button class="btn btn-pequeno" data-voltar>Pôr de volta no site</button>`);
  if (palco) botoes.push(`<a class="btn btn-pequeno" href="${esc(palco)}">▶ Abrir no Palco</a>`);
  return `<article class="painel ed-bloco sgp-cartao ${e.classe}" data-s="${esc(s.id)}">
    <div class="vv-cabeca"><span class="vt-tipo">${t.icone} ${esc(t.nome)}</span><span class="vt-selo ${e.classe}">${esc(e.selo)}</span><small class="muted">${datas}</small></div>
    <h3>${esc(s.titulo)}</h3>
    ${extra ? `<p class="muted">${extra}</p>` : ""}
    ${gente ? `<div class="sgp-gente">${gente}${ids.length > 12 ? `<small class="muted">e mais ${ids.length - 12}</small>` : ""}</div>` : ""}
    <div class="sgp-votos"><div class="sg-barra"><i class="q" style="width:${total ? pq : 0}%"></i><i class="n" style="width:${total ? 100 - pq : 0}%"></i></div>
      <span><b class="q">👍 ${inteiro(s.quero)}</b> querem ver · <b class="n">👎 ${inteiro(s.nao)}</b> não querem${total ? ` · ${pq}% a favor` : ""}</span></div>
    ${s.motivo && s.estado !== "aceite" && s.estado !== "recusada" ? `<p class="sgp-motivo">${esc(s.motivo)}</p>` : ""}
    <div class="sgp-acoes">${botoes.join("")}<button class="botao-icone" data-apagar title="Apagar">✕</button></div>
  </article>`;
}

function regras(r, depois) {
  const g = r.regras;
  const caixa = (nome, rotulo, v, ajuda) => `<label class="vc-interruptor"><input type="checkbox" name="${nome}" ${v ? "checked" : ""}><span class="vc-bola"></span><span><b>${rotulo}</b><small>${ajuda}</small></span></label>`;
  const numero = (nome, rotulo, v, min, max, ajuda) => `<label class="campo"><span>${rotulo}</span><input class="input" type="number" name="${nome}" value="${v}" min="${min}" max="${max}"><small class="muted">${ajuda}</small></label>`;
  const { el, fechar } = janela(
    `<h2>Regras das sugestões</h2>
    <form class="vc-form sgp-form">
      ${caixa("novas", "Aceitar sugestões novas", g.novas, "Desligado: ninguém sugere, mas continua a votar nas que estão no ar.")}
      ${caixa("aceites", 'Mostrar no site as aceites ("O canal aceitou")', g.aceites, "As que aceitaste nos últimos 30 dias (até 3).")}
      <div class="ed-grelha">
        ${numero("max", "No máximo no site", g.max, 1, 10, "Sugestões no ar ao mesmo tempo.")}
        ${numero("dias", "Dias no ar", g.dias, 1, 60, "Depois vêm para Por decidir.")}
        ${numero("percentagem", '% de "não quero" para sair', g.percentagem, 50, 100, "Sai do ar logo que chega aqui.")}
        ${numero("minVotos", "Só a partir de", g.minVotos, 1, 1000, "Votos precisos antes de poder sair.")}
        ${numero("horas", "Horas entre sugestões", g.horas, 0, 720, "Da mesma conta (anónima).")}
      </div>
      <div class="campo"><span>Tipos que se podem sugerir</span><div class="sgp-checks">${Object.entries(r.tipos || {})
        .map(([k, t]) => `<label class="ed-check"><input type="checkbox" name="tipo" value="${k}" ${g.tipos.includes(k) ? "checked" : ""}> ${t.icone} ${esc(t.nome)}</label>`)
        .join("")}</div></div>
      <div class="campo"><span>Jogos das simulações</span><div class="sgp-checks">${Object.entries(r.jogos || {})
        .map(([k, j]) => `<label class="ed-check"><input type="checkbox" name="jogo" value="${k}" ${g.jogos.includes(k) ? "checked" : ""}> ${esc(j.nome)}</label>`)
        .join("")}</div></div>
    </form>
    <div class="janela-acoes"><button class="btn" data-fechar>Cancelar</button><button class="btn btn-primario" data-ok>Guardar</button></div>`,
    { larga: true },
  );
  $("[data-ok]", el).addEventListener("click", async (e) => {
    const f = $("form", el);
    const n = (k) => Number(f.elements[k].value);
    const regrasNovas = {
      novas: f.elements.novas.checked,
      aceites: f.elements.aceites.checked,
      max: n("max"),
      dias: n("dias"),
      percentagem: n("percentagem"),
      minVotos: n("minVotos"),
      horas: n("horas"),
      tipos: $$("input[name=tipo]:checked", f).map((x) => x.value),
      jogos: $$("input[name=jogo]:checked", f).map((x) => x.value),
    };
    if (!regrasNovas.tipos.length) return toast("Escolhe pelo menos um tipo.", { erro: true });
    try {
      await chamar("sugestoes/regras", { regras: regrasNovas }, { botao: e.currentTarget, recarregar: false, sucesso: "Regras guardadas." });
      fechar();
      depois();
    } catch {
      /* o erro já apareceu */
    }
  });
}
