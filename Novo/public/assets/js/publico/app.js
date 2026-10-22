// Arranque da página pública: pede ao servidor a configuração (o que o painel deixa mostrar)
// e os dados, monta as abas e trata da navegação. Não há nenhuma ligação para o painel.

import { api, usarDataset, estado, procurar } from "../data.js";
import { esc } from "../format.js";
import { $, avatar, toast, esconderDica } from "../ui.js";
import { modo } from "../modo.js";
import { lerRegressoDoLogin } from "../conta.js";
import { ICONES_ABA, ligacaoPessoa } from "./comum.js";

const PAGINAS = {
  inicio: "./inicio.js",
  ranking: "./ranking.js",
  votar: "./votar.js",
  youtubers: "./youtubers.js",
  videos: "./videos.js",
  comparar: "../pages/compare.js",
  categorias: "../pages/categories.js",
  projetos: "../pages/projects.js",
};
// Endereços antigos (e o regresso do login) continuam a funcionar
const ANTIGOS = { votacoes: "votar", hall: "videos", "": "" };

let limpar = null;

function lerHash() {
  const h = decodeURI(location.hash.replace(/^#\/?/, ""));
  const [caminho, qs = ""] = h.split("?");
  return { caminho: caminho.replace(/\/+$/, ""), query: new URLSearchParams(qs) };
}

const naoDisponivel = (main) => {
  main.innerHTML = `<div class="wrap pub-pagina"><div class="vidro pub-vazio"><h2>Esta página não está disponível</h2><p class="muted">Volta ao início para ver o que há de novo.</p><a class="btn btn-primario" href="#/">Ir para o início</a></div></div>`;
};

async function navegar() {
  let { caminho, query } = lerHash();
  const main = $("#conteudo");
  esconderDica();
  if (caminho in ANTIGOS) caminho = ANTIGOS[caminho];
  const abas = modo.cfg.abas;
  if (!caminho) caminho = abas[0]?.id || "inicio";

  let mod = null;
  let params = [];
  let aba = caminho;
  const mPessoa = /^youtuber\/(.+)$/.exec(caminho);
  const mProjeto = /^projeto\/(.+)$/.exec(caminho);
  if (mPessoa) {
    aba = "youtubers";
    if (modo.cfg.perfis.ligado) {
      mod = "../pages/person.js";
      params = [decodeURIComponent(mPessoa[1])];
    }
  } else if (mProjeto) {
    aba = "projetos";
    if (abas.some((a) => a.id === "projetos")) {
      mod = "../pages/project.js";
      params = [decodeURIComponent(mProjeto[1])];
    }
  } else if (PAGINAS[caminho] && abas.some((a) => a.id === caminho)) mod = PAGINAS[caminho];

  for (const a of document.querySelectorAll(".pub-nav a, .pub-abas a, .pub-abas button")) {
    if (a.dataset.aba === aba || (a.dataset.mais && !abas.slice(0, 4).some((x) => x.id === aba) && abas.length > 5)) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  }
  $("#pub-voltar").hidden = !(mPessoa || mProjeto);
  document.body.classList.toggle("pub-sub-pagina", Boolean(mPessoa || mProjeto));
  fecharMais();

  if (typeof limpar === "function") {
    try {
      limpar();
    } catch {
      /* nada */
    }
  }
  limpar = null;
  if (!mod) return naoDisponivel(main);
  try {
    const m = await import(mod);
    main.innerHTML = "";
    window.scrollTo({ top: 0, behavior: "instant" });
    limpar = await m.render(main, { params, query });
    const nomeAba = abas.find((a) => a.id === aba)?.nome;
    document.title = main.dataset.titulo ? `${main.dataset.titulo} · Placar dos Youtubers` : nomeAba && aba !== abas[0]?.id ? `${nomeAba} · Placar dos Youtubers` : "Placar dos Youtubers";
  } catch (e) {
    console.error(e);
    main.innerHTML = `<div class="wrap pub-pagina"><div class="vidro pub-vazio"><h2>Não foi possível abrir esta página</h2><p class="muted">${esc(e.message)}</p><button class="btn" onclick="location.reload()">Tentar de novo</button></div></div>`;
  }
}

// ---------- Abas ----------
function montarAbas() {
  const abas = modo.cfg.abas;
  $("#pub-folha")?.remove();
  $("#nav").innerHTML = abas.map((a) => `<a href="#/${a.id}" data-aba="${a.id}">${esc(a.nome)}</a>`).join("");
  // No telemóvel: até 5 abas em baixo; com mais, as 4 primeiras e "Mais"
  const fixas = abas.length > 5 ? abas.slice(0, 4) : abas;
  const resto = abas.length > 5 ? abas.slice(4) : [];
  $("#abas").innerHTML =
    fixas.map((a) => `<a href="#/${a.id}" data-aba="${a.id}">${ICONES_ABA[a.icone] || ""}<span>${esc(a.nome)}</span></a>`).join("") +
    (resto.length ? `<button type="button" data-mais="1" id="pub-mais">${ICONES_ABA.mais}<span>Mais</span></button>` : "");
  $("#abas").style.setProperty("--n", fixas.length + (resto.length ? 1 : 0));
  if (resto.length) {
    const folha = document.createElement("div");
    folha.className = "pub-folha";
    folha.id = "pub-folha";
    folha.hidden = true;
    folha.innerHTML = `<div class="pub-folha-caixa vidro">${resto.map((a) => `<a href="#/${a.id}" data-aba="${a.id}">${ICONES_ABA[a.icone] || ""}<span>${esc(a.nome)}</span></a>`).join("")}</div>`;
    document.body.appendChild(folha);
    folha.addEventListener("click", (e) => {
      if (e.target === folha) fecharMais();
    });
    $("#pub-mais").addEventListener("click", () => {
      folha.hidden = !folha.hidden;
    });
  }
  // Sem abas: fica só o Início (se até isso estiver desligado, mostra-se um aviso)
  document.body.classList.toggle("pub-sem-abas", abas.length <= 1);
}
function fecharMais() {
  const f = $("#pub-folha");
  if (f) f.hidden = true;
}

// ---------- Pesquisa (só com os perfis ligados) ----------
function montarPesquisa() {
  $("#pub-pesquisa").hidden = !modo.cfg.perfis.ligado;
  const input = $("#pesquisa");
  const lista = $("#pesquisa-lista");
  input.addEventListener("input", () => {
    const r = modo.cfg.perfis.ligado ? procurar(input.value, 8) : [];
    lista.innerHTML = r.length
      ? r.map((p) => `<a class="pesquisa-item" href="${ligacaoPessoa(p)}">${avatar(p, 32)}<span><b>${esc(p.name)}</b><small>${esc(p.category || "")}</small></span></a>`).join("")
      : input.value.trim()
        ? `<div class="pesquisa-item muted">Nenhum Youtuber com esse nome.</div>`
        : "";
    lista.classList.toggle("aberta", Boolean(input.value.trim()));
  });
  lista.addEventListener("click", () =>
    setTimeout(() => {
      lista.classList.remove("aberta");
      input.value = "";
      input.blur();
    }, 0),
  );
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".pesquisa")) lista.classList.remove("aberta");
  });
}

// ---------- Redes do canal ----------
const urlRede = {
  youtube: (h) => `https://www.youtube.com/${h.startsWith("@") ? h : "@" + h}`,
  tiktok: (h) => `https://www.tiktok.com/${h.startsWith("@") ? h : "@" + h}`,
  instagram: (h) => `https://www.instagram.com/${h.replace(/^@/, "")}`,
};
function redes(canal) {
  return ["youtube", "tiktok", "instagram"]
    .filter((r) => canal?.[r])
    .map((r) => `<a class="pub-rede" href="${esc(urlRede[r](canal[r].trim()))}" target="_blank" rel="noopener">${esc(r === "youtube" ? "YouTube" : r === "tiktok" ? "TikTok" : "Instagram")} · ${esc(canal[r])}</a>`)
    .join("");
}

async function iniciar() {
  const regresso = lerRegressoDoLogin();
  if (regresso?.erro) setTimeout(() => toast(`Não foi possível entrar: ${regresso.erro}`, { erro: true, tempo: 6000 }), 600);
  const main = $("#conteudo");
  let r;
  try {
    r = await api("publico");
  } catch (e) {
    main.innerHTML = `<div class="wrap pub-pagina"><div class="vidro pub-vazio"><h2>Não foi possível carregar o Placar</h2><p class="muted">${esc(e.message)}</p><button class="btn" onclick="location.reload()">Tentar de novo</button></div></div>`;
    return;
  }
  modo.publico = true;
  modo.cfg = r.cfg;
  modo.extra = { publicacoes: r.publicacoes || [], hall: r.hall || {}, pessoas: r.pessoas || {}, canal: r.canal || {}, historico: r.historico || null };
  usarDataset(r.ds);
  const previa = ouvirPrevia();
  if (!r.cfg.abas.length && !previa) {
    main.innerHTML = `<div class="wrap pub-pagina"><div class="vidro pub-vazio"><h2>O Placar está a ser preparado</h2><p class="muted">Volta daqui a pouco.</p></div></div>`;
    return;
  }
  montarAbas();
  montarPesquisa();
  $("#pub-rodape-redes").innerHTML = redes(r.canal);
  $("#pub-voltar").addEventListener("click", () => (history.length > 1 ? history.back() : (location.hash = "#/")));
  window.addEventListener("hashchange", navegar);
  navegar();
}

// ---------- Pré-visualização no painel ----------
// O painel (mesmo site) mostra esta página numa moldura de telemóvel e manda-lhe a configuração
// ainda não publicada. Só se aceitam mensagens do próprio site e só dentro de uma moldura.
function ouvirPrevia() {
  if (window.parent === window || !new URLSearchParams(location.search).has("previa")) return false;
  document.body.classList.add("pub-previa");
  addEventListener("message", (e) => {
    if (e.origin !== location.origin || e.source !== window.parent) return;
    if (e.data?.tipo === "placar-previa" && e.data.cfg?.abas) {
      modo.cfg = e.data.cfg;
      montarAbas();
      $("#pub-pesquisa").hidden = !modo.cfg.perfis?.ligado;
      if (!modo.cfg.abas.length) {
        $("#conteudo").innerHTML = `<div class="wrap pub-pagina"><div class="vidro pub-vazio"><h2>Nenhuma aba visível</h2><p class="muted">Liga pelo menos uma aba.</p></div></div>`;
        return;
      }
      navegar();
    } else if (e.data?.tipo === "placar-ir" && typeof e.data.hash === "string" && /^#\/[\w/-]*$/.test(e.data.hash)) {
      if (location.hash !== e.data.hash) location.hash = e.data.hash;
    }
  });
  window.parent.postMessage({ tipo: "placar-previa-pronta" }, location.origin);
  return true;
}

export { estado };
iniciar();
