// Arranque do painel (só para o dono do site): pede a palavra-passe, carrega os dados,
// trata da navegação, da pesquisa e do som. O painel controla a página pública (publico/app.js).

import { api, carregar, estado, guardarToken, procurar, temSessao } from "./data.js";
import { esc, ha } from "./format.js";
import { avatar, linkPessoa, $, esconderDica } from "./ui.js";
import { som } from "./audio.js";
import { revelarAoScroll, pilulaNav, logoEntra } from "./motion.js";

const ROTAS = [
  { re: /^$/, mod: "./admin/vitrine.js", nav: "#/" },
  { re: /^publica(?:\/([a-z]+))?$/, mod: "./admin/vitrine.js", nav: "#/" },
  { re: /^votacoes$/, mod: "./admin/votacoes.js", nav: "#/votacoes" },
  { re: /^sugestoes$/, mod: "./admin/sugestoes.js", nav: "#/sugestoes" },
  { re: /^caso(?:\/(karma|noticias))?$/, mod: "./admin/caso.js", nav: "#/caso" },
  { re: /^palco(?:\/([a-z-]+))?$/, mod: "./stage/stage.js", nav: "#/palco" },
  { re: /^editar(?:\/([a-z-]+))?$/, mod: "./admin/admin.js", nav: "#/editar" },
];
// O painel só controla: ver os números é na página pública. Endereços antigos levam ao sítio certo.
const REDIRECIONAR = [
  [/^youtuber\/(.+)$/, (id) => `#/editar/youtubers?id=${encodeURIComponent(id)}`],
  [/^projeto\/(.+)$/, (id) => `#/editar/projetos?id=${encodeURIComponent(id)}`],
  [/^projetos$/, () => "#/editar/projetos"],
  [/^(ranking|comparar|categorias)$/, () => "#/"],
];

let limpar = null;
let limparScroll = null;
let carregado = false;
let sessaoConfirmada = false;

function lerHash() {
  const h = decodeURI(location.hash.replace(/^#\/?/, ""));
  const [caminho, qs = ""] = h.split("?");
  return { caminho: caminho.replace(/\/+$/, ""), query: new URLSearchParams(qs) };
}

async function navegar() {
  const { caminho, query } = lerHash();
  for (const [re, para] of REDIRECIONAR) {
    const m = re.exec(caminho);
    if (m) return location.replace(para(decodeURIComponent(m[1] || "")));
  }
  const main = $("#conteudo");
  esconderDica();
  const rota = ROTAS.find((r) => r.re.test(caminho));
  marcarNavegacao(caminho);
  limparScroll?.();
  limparScroll = null;
  if (typeof limpar === "function") {
    try {
      limpar();
    } catch {
      /* ignorar */
    }
  }
  limpar = null;
  document.body.classList.remove("modo-palco");

  // Sem sessão não se vê nada: só o ecrã de entrada
  document.body.classList.toggle("sem-sessao", !temSessao());
  if (!temSessao()) {
    const { login } = await import("./admin/admin.js");
    login(main);
    document.title = "Entrar · Painel do Placar";
    return;
  }
  // A sessão guardada pode já não valer (expirou ou a palavra-passe mudou): confirma-se uma vez, antes de pedir dados
  if (!sessaoConfirmada) {
    const r = await api("sessao").catch(() => ({ valida: true }));
    if (!r.valida) {
      guardarToken("");
      document.body.classList.add("sem-sessao");
      const { login } = await import("./admin/admin.js");
      document.title = "Entrar · Painel do Placar";
      return login(main, "A sessão expirou. Entra outra vez.");
    }
    sessaoConfirmada = true;
  }
  if (!rota) {
    main.innerHTML = `<div class="wrap pagina-topo"><h1>Página não encontrada</h1><p>Este endereço não existe. <a href="#/">Voltar ao início</a>.</p></div>`;
    return;
  }
  try {
    if (!carregado) {
      main.innerHTML = `<div class="a-carregar"><div class="roda" aria-label="A carregar"></div></div>`;
      await carregar();
      carregado = true;
      atualizarRodape();
    }
    const mod = await import(rota.mod);
    const params = rota.re.exec(caminho).slice(1).map((p) => (p ? decodeURIComponent(p) : p));
    main.innerHTML = "";
    window.scrollTo({ top: 0, behavior: "instant" });
    limpar = await mod.render(main, { params, query });
    limparScroll = revelarAoScroll(main);
    document.title = (main.dataset.titulo ? main.dataset.titulo + " · " : "") + "Painel do Placar";
    const titulo = $("#pn-barra-titulo");
    if (titulo) titulo.textContent = main.dataset.titulo || "";
    atualizarPorDecidir();
  } catch (e) {
    if (e.status === 401) {
      document.body.classList.add("sem-sessao");
      const { login } = await import("./admin/admin.js");
      return login(main, "A sessão expirou. Entra outra vez.");
    }
    console.error(e);
    main.innerHTML = `<div class="wrap pagina-topo"><h1>Não foi possível abrir esta página</h1><p>${esc(e.message)}</p><p><button class="btn" onclick="location.reload()">Tentar de novo</button></p></div>`;
  }
}

/** Marca a secção atual na barra lateral (computador) e nas abas (telemóvel). */
function marcarNavegacao(caminho) {
  const c = caminho === "editar" ? "editar/youtubers" : caminho;
  const atual = "#/" + c;
  const lateral = (h) => h === atual || (h === "#/" && (c === "" || c.startsWith("publica"))) || (h !== "#/" && atual.startsWith(h + "/"));
  // Nas abas do telemóvel, "Dados" junta todas as partes de edição
  // Nas abas do telemóvel, "Público" junta as votações, as sugestões e O Caso
  const aba = (h) => (h.startsWith("#/editar") ? c.startsWith("editar") : h === "#/votacoes" ? ["votacoes", "sugestoes", "caso"].includes(c.split("/")[0]) : lateral(h));
  for (const a of document.querySelectorAll(".pn-nav a")) a.toggleAttribute("aria-current", lateral(a.getAttribute("href")));
  for (const a of document.querySelectorAll(".abas a")) {
    if (aba(a.getAttribute("href"))) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  }
  for (const a of document.querySelectorAll(".pn-nav a[aria-current]")) a.setAttribute("aria-current", "page");
  pilulaNav($("#abas"), ".abas-pilula");
}

/** O número ao lado de "Sugestões": quantas acabaram e esperam pela tua decisão. */
let ultimaContagem = 0;
export async function atualizarPorDecidir({ forcar = false } = {}) {
  if (!forcar && Date.now() - ultimaContagem < 60000) return;
  ultimaContagem = Date.now();
  try {
    const { porDecidir } = await api("admin/sugestoes/contagem");
    for (const el of document.querySelectorAll("[data-por-decidir]")) {
      el.hidden = !porDecidir;
      el.textContent = porDecidir > 99 ? "99+" : String(porDecidir);
      el.title = `${porDecidir} ${porDecidir === 1 ? "sugestão acabou" : "sugestões acabaram"} e ${porDecidir === 1 ? "espera" : "esperam"} pela tua decisão`;
    }
  } catch {
    /* sem Supabase ou sem sessão: sem número */
  }
}

function atualizarRodape() {
  const m = estado.ds?.meta;
  const el = $("#rodape-atualizado");
  if (!el) return;
  el.textContent = m?.lastDaily ? `Números do YouTube atualizados ${ha(m.lastDaily)}.` : "A recolha automática do YouTube ainda não começou.";
}

// ---------- Pesquisa ----------
function iniciarPesquisa() {
  const input = $("#pesquisa");
  const lista = $("#pesquisa-lista");
  let ativo = 0;
  let resultados = [];
  const desenhar = () => {
    if (!resultados.length) {
      lista.innerHTML = input.value.trim() ? `<div class="pesquisa-item muted">Nenhum Youtuber com esse nome.</div>` : "";
      lista.classList.toggle("aberta", Boolean(input.value.trim()));
      return;
    }
    lista.innerHTML = resultados
      .map((p, i) => `<a class="pesquisa-item${i === ativo ? " ativo" : ""}" href="${linkPessoa(p)}" role="option">${avatar(p, 32)}<span><b>${esc(p.name)}</b><small>${esc(p.category || "Sem categoria")}</small></span></a>`)
      .join("");
    lista.classList.add("aberta");
  };
  input.addEventListener("input", async () => {
    if (!carregado) await carregar();
    resultados = procurar(input.value, 8);
    ativo = 0;
    desenhar();
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") {
      ativo = Math.min(resultados.length - 1, ativo + 1);
      desenhar();
      e.preventDefault();
    } else if (e.key === "ArrowUp") {
      ativo = Math.max(0, ativo - 1);
      desenhar();
      e.preventDefault();
    } else if (e.key === "Enter" && resultados[ativo]) {
      location.hash = linkPessoa(resultados[ativo]);
      fechar();
    } else if (e.key === "Escape") fechar();
  });
  const fechar = () => {
    lista.classList.remove("aberta");
    input.value = "";
    input.blur();
  };
  lista.addEventListener("click", () => setTimeout(fechar, 0));
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".pesquisa")) lista.classList.remove("aberta");
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && !/input|textarea|select/i.test(document.activeElement?.tagName)) {
      e.preventDefault();
      input.focus();
    }
  });
}

// ---------- Som ----------
function iniciarSom() {
  const b = $("#som");
  const atualizar = () => {
    b.setAttribute("aria-pressed", String(som.ligado));
    b.title = som.ligado ? "Desligar som" : "Ligar som";
    b.classList.toggle("ligado", som.ligado);
  };
  b.addEventListener("click", () => {
    som.alternar();
    if (som.ligado) som.tocar("clique");
    atualizar();
  });
  som.aoMudar(atualizar);
  atualizar();
}


window.addEventListener("hashchange", navegar);
window.addEventListener("placar:recarregar", async () => {
  await carregar({ forcar: true });
  atualizarRodape();
});
addEventListener("resize", () => pilulaNav($("#abas"), ".abas-pilula"));
if ("serviceWorker" in navigator && location.protocol === "https:") {
  addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
}
logoEntra(document.querySelector(".pn-marca svg"));
iniciarPesquisa();
iniciarSom();
$("#link-editar")?.classList.toggle("ativo", temSessao());
navegar();
