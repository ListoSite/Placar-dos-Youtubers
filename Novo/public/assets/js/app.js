// Arranque do painel (só para o dono do site): pede a palavra-passe, carrega os dados,
// trata da navegação, da pesquisa e do som. A página pública é outra (publico/publico.js).

import { carregar, estado, procurar, temSessao } from "./data.js";
import { esc, ha } from "./format.js";
import { avatar, linkPessoa, $, esconderDica } from "./ui.js";
import { som } from "./audio.js";
import { revelarAoScroll, pilulaNav, logoEntra } from "./motion.js";

const ROTAS = [
  { re: /^$/, mod: "./pages/home.js", nav: "#/" },
  { re: /^ranking$/, mod: "./pages/ranking.js", nav: "#/ranking" },
  { re: /^youtuber\/(.+)$/, mod: "./pages/person.js", nav: "" },
  { re: /^comparar$/, mod: "./pages/compare.js", nav: "#/comparar" },
  { re: /^categorias$/, mod: "./pages/categories.js", nav: "#/categorias" },
  { re: /^projetos$/, mod: "./pages/projects.js", nav: "#/projetos" },
  { re: /^projeto\/(.+)$/, mod: "./pages/project.js", nav: "#/projetos" },
  { re: /^palco(?:\/([a-z-]+))?$/, mod: "./stage/stage.js", nav: "#/palco" },
  { re: /^editar(?:\/([a-z-]+))?$/, mod: "./admin/admin.js", nav: "" },
];

let limpar = null;
let limparScroll = null;
let carregado = false;

function lerHash() {
  const h = decodeURI(location.hash.replace(/^#\/?/, ""));
  const [caminho, qs = ""] = h.split("?");
  return { caminho: caminho.replace(/\/+$/, ""), query: new URLSearchParams(qs) };
}

async function navegar() {
  const { caminho, query } = lerHash();
  const main = $("#conteudo");
  esconderDica();
  const rota = ROTAS.find((r) => r.re.test(caminho));
  for (const a of document.querySelectorAll(".nav a, .abas a")) {
    if (rota && a.getAttribute("href") === rota.nav) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  }
  pilulaNav($("#nav"));
  pilulaNav($("#abas"), ".abas-pilula");
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
    document.title = (main.dataset.titulo ? main.dataset.titulo + " · " : "") + "Placar dos Youtubers";
  } catch (e) {
    console.error(e);
    if (e.status === 401) {
      const { login } = await import("./admin/admin.js");
      return login(main, "A sessão expirou. Entra outra vez.");
    }
    main.innerHTML = `<div class="wrap pagina-topo"><h1>Não foi possível abrir esta página</h1><p>${esc(e.message)}</p><p><button class="btn" onclick="location.reload()">Tentar de novo</button></p></div>`;
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
addEventListener("resize", () => {
  pilulaNav($("#nav"));
  pilulaNav($("#abas"), ".abas-pilula");
});
if ("serviceWorker" in navigator && location.protocol === "https:") {
  addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
}
logoEntra(document.querySelector(".marca svg"));
iniciarPesquisa();
iniciarSom();
$("#link-editar").classList.toggle("ativo", temSessao());
navegar();
