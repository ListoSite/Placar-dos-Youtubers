// Votações na página pública. Qualquer pessoa vê; para votar entra-se com a conta Google
// (um voto por pessoa em cada votação; num torneio, um voto em cada confronto).
// Tipos: pergunta livre, Youtuber do mês, favorito, confronto, próximo desafiante, torneio e previsão.

import { api, estado } from "../data.js";
import { esc, inteiro, norm } from "../format.js";
import { $, $$, avatar, toast, confirmar } from "../ui.js";
import { temConta, entrarComGoogle, sairDaConta, quemSou, meusVotos, votar, novoNonce, entrarComTokenGoogle, carregarGoogle } from "../conta.js";

const GOOGLE = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z"/><path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z"/><path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8z"/><path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z"/></svg>`;

export const TIPOS_VOTACAO = {
  escolha: { nome: "Votação", icone: "🗳️" },
  melhor: { nome: "Youtuber do mês", icone: "🏆" },
  favorito: { nome: "Youtuber favorito", icone: "❤️" },
  confronto: { nome: "Confronto", icone: "⚔️" },
  desafiante: { nome: "Próximo desafiante", icone: "🥊" },
  torneio: { nome: "Torneio", icone: "🏟️" },
  previsao: { nome: "Previsão", icone: "🎯" },
};
const NOME_RONDA = (n, total) => (total - n === 0 ? "Final" : total - n === 1 ? "Meias-finais" : total - n === 2 ? "Quartos de final" : total - n === 3 ? "Oitavos de final" : `Ronda ${n}`);

function quandoFecha(v) {
  if (!v.fecha) return "";
  const ms = Date.parse(v.fecha) - Date.now();
  if (ms <= 0) return "Fechou";
  const h = Math.round(ms / 3600000);
  if (h < 1) return "Fecha em menos de 1 hora";
  if (h < 48) return `Fecha em ${h} ${h === 1 ? "hora" : "horas"}`;
  return `Fecha em ${Math.round(h / 24)} dias`;
}

let pedido = null;
/** Pede as votações uma vez por visita (vários blocos usam a mesma resposta). */
export function lerVotacoes({ forcar = false } = {}) {
  if (!pedido || forcar) pedido = api(`votacoes${forcar ? "?t=" + Date.now() : ""}`).catch(() => ({ ligado: false, votacoes: [] }));
  return pedido;
}

/**
 * Mostra as votações dentro de alvo.
 * filtro: "abertas" | "todas" | id de uma votação. compacto: versão para um bloco do Início.
 */
export async function montarVotacoes(alvo, { filtro = "todas", compacto = false, mostrarFechadas = true } = {}) {
  alvo.innerHTML = `<div class="vt-conta"></div><div class="vt-lista"><div class="a-carregar"><div class="roda"></div></div></div>`;
  const conta = $(".vt-conta", alvo);
  const listaEl = $(".vt-lista", alvo);
  let dados = await lerVotacoes();
  const cfg = dados.supabase;
  if (!dados.ligado || !cfg) {
    conta.innerHTML = "";
    listaEl.innerHTML = compacto ? "" : `<div class="vidro vt-vazio"><h3>As votações ainda não abriram</h3><p class="muted">Volta em breve.</p></div>`;
    return;
  }
  const pessoaDe = (id) => estado.pessoas?.get(id) || (dados.pessoas?.[id] ? { id, ...dados.pessoas[id] } : null);
  const [eu, votosIni] = await Promise.all([quemSou(cfg), meusVotos(cfg)]);
  let votos = votosIni;

  const escolher = () => {
    let l = dados.votacoes;
    if (filtro === "abertas") l = l.filter((v) => v.aberta);
    else if (filtro && filtro !== "todas") l = l.filter((v) => v.id === filtro || v.grupo === filtro);
    else if (!mostrarFechadas) l = l.filter((v) => v.aberta);
    return l;
  };

  const desenharConta = () => {
    if (!escolher().some((v) => v.aberta)) {
      conta.innerHTML = "";
      return;
    }
    conta.innerHTML = eu
      ? `<div class="vidro vt-eu ${compacto ? "compacto" : ""}">${eu.foto ? `<img src="${esc(eu.foto)}" alt="" referrerpolicy="no-referrer">` : ""}<span><b>${esc(eu.nome)}</b><small>Podes votar uma vez em cada votação.</small></span><button class="btn btn-pequeno" data-sair>Sair</button></div>`
      : `<div class="vidro vt-eu ${compacto ? "compacto" : ""}"><span><b>Entra para votar</b><small>Usamos a conta Google só para garantir um voto por pessoa. Não publicamos nada em teu nome.</small></span><div class="vt-gbotao"></div><button class="btn vt-google" data-entrar ${cfg.google ? "hidden" : ""}>${GOOGLE} Entrar com Google</button></div>`;
    $("[data-entrar]", conta)?.addEventListener("click", () => entrarComGoogle(cfg));
    $("[data-sair]", conta)?.addEventListener("click", async () => {
      await sairDaConta(cfg);
      location.reload();
    });
    if (!eu && cfg.google) botaoGoogle();
  };

  // O botão do próprio Google (a janela de login mostra este site). Se não carregar, fica o botão de sempre.
  const botaoGoogle = async () => {
    try {
      const g = await carregarGoogle();
      const nonce = await novoNonce();
      g.accounts.id.initialize({
        client_id: cfg.google,
        nonce: nonce.hash,
        callback: async ({ credential }) => {
          try {
            await entrarComTokenGoogle(cfg, credential, nonce.bruto);
            toast("Entraste. Já podes votar!");
            setTimeout(() => location.reload(), 600);
          } catch (e) {
            toast(e.message, { erro: true, tempo: 6000 });
          }
        },
      });
      const el = $(".vt-gbotao", conta);
      if (el) g.accounts.id.renderButton(el, { theme: "filled_black", size: "large", shape: "pill", text: "signin_with", locale: "pt-PT" });
    } catch {
      const b = $("[data-entrar]", conta);
      if (b) b.hidden = false;
    }
  };

  // ---------- Peças ----------
  const pct = (v, o) => (v.total ? Math.round(((v.votos?.[o.id] || 0) / v.total) * 100) : 0);
  const lider = (v) => (v.votos ? Object.entries(v.votos).sort((a, b) => b[1] - a[1])[0]?.[0] : null);
  const imagem = (o, tam) => {
    const p = o.pessoa ? pessoaDe(o.pessoa) : null;
    return p ? avatar(p, tam) : `<span class="vt-letra" style="--tam:${tam}px">${esc(o.nome.slice(0, 1).toUpperCase())}</span>`;
  };
  const cabecaVotacao = (v) => {
    const t = TIPOS_VOTACAO[v.tipo] || TIPOS_VOTACAO.escolha;
    const estadoTxt = v.aberta ? `<span class="vt-selo aberta">Aberta</span>` : `<span class="vt-selo">Fechada</span>`;
    const modo = v.modo === "previsao" ? `<span class="vt-selo previsao">Previsão</span>` : v.modo === "decide" ? `<span class="vt-selo decide">O público decide</span>` : "";
    return `<div class="vt-topo"><span class="vt-tipo">${t.icone} ${esc(t.nome)}</span>${estadoTxt}${modo}<small>${esc(quandoFecha(v))}${v.votos ? ` · ${inteiro(v.total)} ${v.total === 1 ? "voto" : "votos"}` : ""}</small></div>`;
  };
  const notaResultado = (v) => {
    if (!v.resultado) return v.votos ? "" : `<p class="muted vt-nota">Os resultados aparecem quando a votação fechar.</p>`;
    const certo = v.opcoes.find((o) => o.id === v.resultado);
    const meu = votos[v.id];
    const p = v.total ? pct(v, certo) : null;
    const previsao = v.tipo === "previsao" || v.modo === "previsao";
    return `<div class="vt-resultado">${previsao ? "🎯 A resposta certa" : "🏆 Ganhou"}: <b>${esc(certo?.nome || "")}</b>${previsao && p !== null ? ` · ${p}% acertaram` : ""}${meu ? (meu === v.resultado ? ` <span class="vt-acertou">Acertaste!</span>` : previsao ? ` <span class="vt-falhou">Não foi desta</span>` : "") : ""}</div>`;
  };

  const opcaoBotao = (v, o, { grande = false } = {}) => {
    const meu = votos[v.id];
    const n = v.votos?.[o.id] || 0;
    const p = pct(v, o);
    const ganhou = v.resultado ? v.resultado === o.id : v.fechou && v.votos && lider(v) === o.id;
    return `<button class="vt-opcao ${grande ? "grande" : ""} ${meu === o.id ? "minha" : ""} ${ganhou ? "vencedora" : ""}" data-v="${esc(v.id)}" data-o="${esc(o.id)}" ${!v.aberta || meu ? "disabled" : ""}>
      ${imagem(o, grande ? 72 : 44)}
      <span class="vt-nome"><b>${esc(o.nome)}</b>${meu === o.id ? `<small>O teu voto</small>` : ""}</span>
      ${v.votos ? `<span class="vt-pct"><b>${p}%</b><small>${inteiro(n)}</small></span><i class="vt-barra" style="width:${p}%"></i>` : ""}
    </button>`;
  };

  const cartoes = {
    lista(v) {
      const contra = v.tipo === "desafiante" && v.extra?.contra ? pessoaDe(v.extra.contra) : null;
      return `<section class="vidro vt-votacao" data-anim-item>${cabecaVotacao(v)}<h2>${esc(v.titulo)}</h2>${v.descricao ? `<p class="muted">${esc(v.descricao)}</p>` : ""}
        ${contra ? `<div class="vt-contra">${avatar(contra, 52)}<span>Quem vai defrontar <b>${esc(contra.name)}</b>?</span></div>` : ""}
        <div class="vt-opcoes">${v.opcoes.map((o) => opcaoBotao(v, o)).join("")}</div>${notaResultado(v)}</section>`;
    },
    favorito(v) {
      const top = v.votos ? [...v.opcoes].sort((a, b) => (v.votos[b.id] || 0) - (v.votos[a.id] || 0)).slice(0, 10).filter((o) => v.votos[o.id]) : [];
      const meu = votos[v.id];
      const meuOp = v.opcoes.find((o) => o.id === meu);
      return `<section class="vidro vt-votacao vt-favorito" data-anim-item>${cabecaVotacao(v)}<h2>${esc(v.titulo)}</h2>${v.descricao ? `<p class="muted">${esc(v.descricao)}</p>` : ""}
        ${meuOp ? `<div class="vt-meu">O teu voto: ${imagem(meuOp, 32)} <b>${esc(meuOp.nome)}</b></div>` : ""}
        ${top.length ? `<h3 class="vt-sub">Os mais votados</h3><div class="vt-opcoes">${top.map((o) => opcaoBotao(v, o)).join("")}</div>` : ""}
        ${v.aberta && !meu ? `<label class="campo vt-procura"><span>Procura o teu favorito</span><input class="input" type="search" data-procura="${esc(v.id)}" placeholder="Nome do Youtuber"></label><div class="vt-grelha" data-grelha="${esc(v.id)}"></div>` : ""}
        ${notaResultado(v)}</section>`;
    },
    confronto(v) {
      const [a, b] = v.opcoes;
      const pa = pct(v, a);
      return `<section class="vidro vt-votacao vt-confronto" data-anim-item>${cabecaVotacao(v)}<h2>${esc(v.titulo)}</h2>${v.descricao ? `<p class="muted">${esc(v.descricao)}</p>` : ""}
        <div class="vt-vs">${opcaoBotao(v, a, { grande: true })}<i>VS</i>${opcaoBotao(v, b, { grande: true })}</div>
        ${v.votos && v.total ? `<div class="vt-dividido"><i style="width:${pa}%"></i></div>` : ""}${notaResultado(v)}</section>`;
    },
  };

  const torneioHtml = (grupo, lista) => {
    const ordem = [...lista].sort((a, b) => (a.ronda || 1) - (b.ronda || 1) || (a.extra?.pos || 0) - (b.extra?.pos || 0));
    const base = ordem[0];
    const total = base.extra?.rondas || Math.max(...ordem.map((v) => v.ronda || 1));
    const rondas = [...new Set(ordem.map((v) => v.ronda || 1))];
    const campeao = ordem.find((v) => v.extra?.campeao)?.extra?.campeao;
    const pc = campeao ? pessoaDe(campeao) : null;
    const abertas = ordem.filter((v) => v.aberta).length;
    const jogo = (v) => {
      const meu = votos[v.id];
      const linha = (o) => {
        const ganhou = v.resultado === o.id;
        return `<button class="vt-jogo-lado ${meu === o.id ? "minha" : ""} ${ganhou ? "vencedora" : v.resultado ? "perdeu" : ""}" data-v="${esc(v.id)}" data-o="${esc(o.id)}" ${!v.aberta || meu ? "disabled" : ""}>${imagem(o, 34)}<span>${esc(o.nome)}</span>${v.votos ? `<b>${pct(v, o)}%</b>` : ""}</button>`;
      };
      return `<div class="vt-jogo ${v.aberta ? "aberto" : ""}">${linha(v.opcoes[0])}${linha(v.opcoes[1])}</div>`;
    };
    return `<section class="vidro vt-votacao vt-torneio" data-anim-item>
      <div class="vt-topo"><span class="vt-tipo">🏟️ Torneio</span>${abertas ? `<span class="vt-selo aberta">${abertas === 1 ? "1 confronto aberto" : `${abertas} confrontos abertos`}</span>` : `<span class="vt-selo">${pc ? "Terminado" : "À espera da próxima ronda"}</span>`}${base.modo === "previsao" ? `<span class="vt-selo previsao">Previsão</span>` : `<span class="vt-selo decide">O público decide</span>`}<small>${esc(quandoFecha(ordem.find((v) => v.aberta) || base))}</small></div>
      <h2>${esc(base.extra?.nomeGrupo || "Torneio")}</h2>${base.descricao ? `<p class="muted">${esc(base.descricao)}</p>` : ""}
      ${pc ? `<div class="vt-campeao">${avatar(pc, 64)}<span><small>★ Campeão</small><b>${esc(pc.name)}</b></span></div>` : ""}
      <div class="vt-chave">${rondas
        .map((r) => `<div class="vt-ronda"><h3>${esc(NOME_RONDA(r, total))}</h3>${ordem.filter((v) => (v.ronda || 1) === r).map(jogo).join("")}</div>`)
        .join("")}</div>
      ${abertas ? `<p class="muted vt-nota">${base.modo === "previsao" ? "Escolhe quem achas que ganha cada confronto: os números decidem e no vídeo vês quantos acertaram." : "Escolhe quem passa em cada confronto: o público decide quem segue no torneio."}</p>` : ""}
    </section>`;
  };

  const desenhar = () => {
    desenharConta();
    const lista = escolher();
    if (!lista.length) {
      listaEl.innerHTML = compacto ? "" : `<div class="vidro vt-vazio"><h3>Ainda não há votações</h3><p class="muted">Volta em breve.</p></div>`;
      return;
    }
    // Torneios: um cartão por torneio com todos os confrontos
    const vistos = new Set();
    const partes = [];
    const ordem = [...lista].sort((a, b) => Number(b.aberta) - Number(a.aberta));
    for (const v of ordem) {
      if (v.tipo === "torneio" && v.grupo) {
        if (vistos.has(v.grupo)) continue;
        vistos.add(v.grupo);
        partes.push(torneioHtml(v.grupo, dados.votacoes.filter((x) => x.grupo === v.grupo)));
      } else if (v.tipo === "favorito") partes.push(cartoes.favorito(v));
      else if (v.tipo === "confronto") partes.push(cartoes.confronto(v));
      else partes.push(cartoes.lista(v));
    }
    listaEl.innerHTML = partes.join("");
    ligarBotoes(listaEl);
    // Favorito: grelha com pesquisa
    $$("[data-procura]", listaEl).forEach((inp) => {
      const v = dados.votacoes.find((x) => x.id === inp.dataset.procura);
      const grelha = $(`[data-grelha="${CSS.escape(v.id)}"]`, listaEl);
      const pintar = () => {
        const t = norm(inp.value);
        const l = v.opcoes.filter((o) => !t || norm(o.nome).includes(t)).slice(0, t ? 40 : 24);
        grelha.innerHTML = l.map((o) => `<button class="vt-mini" data-v="${esc(v.id)}" data-o="${esc(o.id)}">${imagem(o, 48)}<span>${esc(o.nome)}</span></button>`).join("") || `<p class="muted">Ninguém com esse nome.</p>`;
        ligarBotoes(grelha);
      };
      inp.addEventListener("input", pintar);
      pintar();
    });
  };

  const ligarBotoes = (raiz) =>
    $$("[data-v][data-o]:not([disabled])", raiz).forEach((b) => {
      if (b.dataset.ligado) return;
      b.dataset.ligado = "1";
      b.addEventListener("click", async () => {
        if (!temConta()) {
          if (cfg.google && $(".vt-gbotao div", conta)) {
            toast("Para votar, entra primeiro com a tua conta Google.");
            conta.scrollIntoView({ behavior: "smooth", block: "center" });
          } else if (await confirmar("Para votar, entra com a tua conta Google. Queres entrar agora?", { sim: "Entrar com Google" })) entrarComGoogle(cfg);
          return;
        }
        const v = dados.votacoes.find((x) => x.id === b.dataset.v);
        const o = v.opcoes.find((x) => x.id === b.dataset.o);
        if (!(await confirmar(`Votar em ${o.nome}? Só podes votar uma vez${v.tipo === "torneio" ? " neste confronto" : ""}.`, { sim: "Votar" }))) return;
        try {
          await votar(cfg, v.id, o.id);
          toast("Voto registado. Obrigado!");
          votos = { ...votos, [v.id]: o.id };
          dados = await lerVotacoes({ forcar: true });
          desenhar();
        } catch (e) {
          toast(e.message, { erro: true });
          if (e.semConta) desenharConta();
        }
      });
    });

  desenhar();
}
