// A aba Sugerir: quem tem conta Google sugere um vídeo (um top, uma batalha, um torneio, um jogo
// ou a história de um Youtuber), escolhendo os Youtubers. As sugestões são anónimas, ficam no ar
// algum tempo e toda a gente vota "quero ver" ou "não quero". O dono do canal decide no fim.

import { api, estado, procurar, indice } from "../data.js";
import { esc, inteiro } from "../format.js";
import { $, $$, avatar, toast, confirmar } from "../ui.js";
import { temConta, entrarComGoogle, sairDaConta, quemSou, novoNonce, entrarComTokenGoogle, carregarGoogle, tokenConta } from "../conta.js";
import { animarBlocos } from "./animar.js";

const GOOGLE = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z"/><path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z"/><path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8z"/><path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z"/></svg>`;
const POLEGAR = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 10v11H3V10z"/><path d="M7 10l4-7a2.5 2.5 0 0 1 3 2.6L13.5 9H19a2 2 0 0 1 2 2.3l-1.3 7.5A2.5 2.5 0 0 1 17.2 21H7"/></svg>`;

const TEXTO_TIPO = {
  top: "Um ranking: por views, subscritores ou Índice. Podes escolher quem entra.",
  batalha: "Dois Youtubers frente a frente, número a número.",
  torneio: "Oito Youtubers numa chave a eliminar até ao campeão.",
  simulacao: "Um jogo de sorte com os Youtubers que escolheres.",
  historia: "A história de um Youtuber no YouTube, mês a mês.",
};

/** Quanto falta para acabar. */
function falta(fecha) {
  const ms = Date.parse(fecha) - Date.now();
  if (ms <= 0) return "A acabar";
  const h = Math.floor(ms / 3600e3);
  if (h < 1) return "Acaba em menos de 1 hora";
  if (h < 24) return `Faltam ${h} ${h === 1 ? "hora" : "horas"}`;
  const d = Math.ceil(h / 24);
  return `Faltam ${d} dias`;
}

export async function render(main) {
  main.dataset.titulo = "Sugerir";
  main.innerHTML = `<div class="wrap pub-pagina sg">
    <div class="pub-cabeca"><h1>Sugerir</h1><p>O que queres ver no próximo vídeo? Escolhe um top, uma batalha, um torneio, um jogo ou a história de um Youtuber. As sugestões são <b>anónimas</b> e toda a gente pode votar.</p></div>
    <div id="sg-corpo"><div class="a-carregar"><div class="roda"></div></div></div>
  </div>`;
  const corpo = $("#sg-corpo", main);
  let dados;
  try {
    dados = await api("sugestoes");
  } catch {
    corpo.innerHTML = `<div class="vidro pub-vazio"><h2>As sugestões estão fechadas</h2><p class="muted">Volta em breve.</p></div>`;
    return;
  }
  const cfg = dados.supabase;
  if (!dados.ligado || !cfg) {
    corpo.innerHTML = `<div class="vidro pub-vazio"><h2>As sugestões ainda não abriram</h2><p class="muted">Volta em breve.</p></div>`;
    return;
  }

  let eu = null;
  let criar = null; // o que está a ser escolhido: { tipo, dados }

  // Com sessão: os meus votos e se posso sugerir
  const atualizarComConta = async () => {
    if (!temConta()) return;
    const t = await tokenConta(cfg);
    if (!t) return;
    try {
      dados = await api("sugestoes/eu", { metodo: "POST", corpo: { token: t } });
    } catch (e) {
      if (/sessão|Google/.test(e.message)) toast(e.message, { erro: true, tempo: 6000 });
    }
  };
  [eu] = await Promise.all([quemSou(cfg), atualizarComConta()]);

  const pessoaDe = (id) => estado.pessoas?.get(id) || (dados.pessoas?.[id] ? { id, ...dados.pessoas[id] } : { id, name: "Youtuber", photo: "" });
  const regras = () => dados.regras;

  // ---------- Conta ----------
  const contaHtml = () =>
    eu
      ? `<div class="vidro vt-eu sg-eu">${eu.foto ? `<img src="${esc(eu.foto)}" alt="" referrerpolicy="no-referrer">` : ""}<span><b>Entraste com a conta Google</b><small>Ninguém vê quem sugere nem quem vota: aparece tudo anónimo.</small></span><button class="btn btn-pequeno" data-sair>Sair</button></div>`
      : `<div class="vidro vt-eu sg-eu" id="sg-entrar"><span><b>Entra para sugerir e votar</b><small>A conta Google serve só para garantir um voto por pessoa. Fica tudo anónimo: ninguém vê quem és.</small></span><div class="vt-gbotao"></div><button class="btn vt-google" data-entrar ${cfg.google ? "hidden" : ""}>${GOOGLE} Entrar com Google</button></div>`;

  const ligarConta = () => {
    $("[data-entrar]", corpo)?.addEventListener("click", () => entrarComGoogle(cfg, "#/sugestoes"));
    $("[data-sair]", corpo)?.addEventListener("click", async () => {
      await sairDaConta(cfg);
      location.reload();
    });
    if (!eu && cfg.google) botaoGoogle();
  };
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
            toast("Entraste. Já podes sugerir e votar!");
            setTimeout(() => location.reload(), 600);
          } catch (e) {
            toast(e.message, { erro: true, tempo: 6000 });
          }
        },
      });
      const el = $(".vt-gbotao", corpo);
      if (el) g.accounts.id.renderButton(el, { theme: "filled_black", size: "large", shape: "pill", text: "signin_with", locale: "pt-PT" });
    } catch {
      const b = $("[data-entrar]", corpo);
      if (b) b.hidden = false;
    }
  };
  const pedirConta = async (oque) => {
    if (cfg.google && $("#sg-entrar .vt-gbotao div", corpo)) {
      toast(`Para ${oque}, entra primeiro com a tua conta Google.`);
      $("#sg-entrar", corpo)?.scrollIntoView({ behavior: "smooth", block: "center" });
    } else if (await confirmar(`Para ${oque}, entra com a tua conta Google. Queres entrar agora?`, { sim: "Entrar com Google" })) entrarComGoogle(cfg, "#/sugestoes");
  };

  // ---------- Cartões ----------
  const pilha = (ids, tam = 40, max = 8) =>
    `<span class="sg-pilha" style="--tam:${tam}px">${ids
      .slice(0, max)
      .map((id) => avatar(pessoaDe(id), tam))
      .join("")}${ids.length > max ? `<i>+${ids.length - max}</i>` : ""}</span>`;

  const detalhe = (s) => {
    const d = s.dados || {};
    if (s.tipo === "top") return d.pessoas ? `Só entre os ${d.pessoas.length} escolhidos` : d.cat ? `Só a categoria ${esc(d.cat)}` : "Entre todos os Youtubers";
    if (s.tipo === "torneio") return `${d.pessoas?.length || 8} Youtubers numa chave`;
    if (s.tipo === "simulacao") return `${esc(dados.jogos?.[d.jogo]?.nome || "Jogo")} · ${d.pessoas?.length} Youtubers`;
    if (s.tipo === "historia") return "Do início até hoje, mês a mês";
    return "Frente a frente, número a número";
  };

  const figura = (s) => {
    const d = s.dados || {};
    if (s.tipo === "batalha") return `<div class="sg-vs">${avatar(pessoaDe(d.a), 64)}<b>VS</b>${avatar(pessoaDe(d.b), 64)}</div>`;
    if (s.tipo === "historia") return `<div class="sg-vs um">${avatar(pessoaDe(d.id), 72)}</div>`;
    if (d.pessoas?.length) return `<div class="sg-fig">${pilha(d.pessoas, 44)}</div>`;
    return `<div class="sg-fig sg-fig-top"><span>${d.n}</span><small>Top</small></div>`;
  };

  const cartao = (s) => {
    const t = dados.tipos?.[s.tipo] || { nome: s.tipo, icone: "💡" };
    const total = s.quero + s.nao;
    const pq = total ? Math.round((s.quero / total) * 100) : 0;
    const pn = total ? 100 - pq : 0;
    const r = regras();
    const faltamVotos = Math.max(0, r.minVotos - total);
    return `<article class="vidro sg-cartao ${s.minha ? "minha" : ""}" data-anim-item data-id="${esc(s.id)}">
      <div class="sg-topo"><span class="sg-tipo">${t.icone} ${esc(t.nome)}</span>${s.minha ? `<span class="sg-selo">A tua sugestão</span>` : ""}<small>${esc(falta(s.fecha))}</small></div>
      <div class="sg-meio">${figura(s)}<div class="sg-texto"><h2>${esc(s.titulo)}</h2><p>${detalhe(s)}</p></div></div>
      <div class="sg-votos">
        <div class="sg-barra" role="img" aria-label="${pq}% querem ver, ${pn}% não querem"><i class="q" style="width:${total ? pq : 50}%"></i><i class="n" style="width:${total ? pn : 50}%"></i><b class="sg-limite" style="left:${100 - r.percentagem}%" title="Com ${r.percentagem}% de &quot;não quero&quot; sai do ar"></b></div>
        <div class="sg-numeros"><span class="q"><b>${pq}%</b> querem ver · ${inteiro(s.quero)}</span><span class="n">${inteiro(s.nao)} · <b>${pn}%</b> não</span></div>
        <div class="sg-botoes">
          <button class="sg-voto q" data-voto="1" aria-pressed="${s.meuVoto === true}">${POLEGAR}<span>${s.meuVoto === true ? "Queres ver" : "Quero ver"}</span></button>
          <button class="sg-voto n" data-voto="0" aria-pressed="${s.meuVoto === false}">${POLEGAR}<span>${s.meuVoto === false ? "Não queres" : "Não quero"}</span></button>
        </div>
        <p class="sg-nota">${faltamVotos ? `Com mais ${faltamVotos} ${faltamVotos === 1 ? "voto" : "votos"}, se ${r.percentagem}% não quiserem, sai do ar.` : `Se ${r.percentagem}% não quiserem, sai do ar.`}${s.meuVoto !== null && s.meuVoto !== undefined ? " Carrega outra vez para tirar o teu voto." : ""}</p>
      </div>
    </article>`;
  };

  const lugares = () => {
    const r = regras();
    const n = dados.ativas.length;
    return `<div class="sg-lugares" aria-label="${n} de ${r.max} lugares ocupados">${Array.from({ length: r.max }, (_, i) => `<i class="${i < n ? "cheio" : ""}"></i>`).join("")}<span>${n} de ${r.max} ${r.max === 1 ? "lugar" : "lugares"} ocupados</span></div>`;
  };

  // O botão de sugerir (ou porque não dá agora)
  const chamada = () => {
    const r = regras();
    let motivo = "";
    if (!r.novas) motivo = "As sugestões novas estão fechadas por agora. Podes votar nas que estão no ar.";
    else if (dados.eu?.temAtiva) motivo = "Já tens uma sugestão no ar. Quando acabar, podes fazer outra.";
    else if (dados.ativas.length >= r.max) motivo = `O site já tem ${r.max} sugestões no ar (o máximo). Quando uma sair, abre um lugar.`;
    else if (dados.eu?.podeDepois) motivo = `Podes fazer outra sugestão ${new Date(dados.eu.podeDepois).toLocaleString("pt-PT", { weekday: "long", hour: "2-digit", minute: "2-digit" })}.`;
    return `<div class="vidro sg-chamada">
      <div><h2>Tens uma ideia?</h2><p class="muted">Fica ${r.dias} dias no site para o público votar. No fim, o canal decide se faz o vídeo.</p>${lugares()}</div>
      ${motivo ? `<p class="sg-motivo">${esc(motivo)}</p>` : `<button class="btn btn-primario" data-criar>💡 Fazer uma sugestão</button>`}
    </div>`;
  };

  // ---------- Criar ----------
  const MIN_MAX = () => {
    const d = criar.dados;
    if (criar.tipo === "batalha") return [2, 2];
    if (criar.tipo === "torneio") return [8, 8];
    if (criar.tipo === "historia") return [1, 1];
    if (criar.tipo === "simulacao") {
      const j = dados.jogos?.[d.jogo];
      return j ? [j.min, j.max] : [3, 10];
    }
    return d.so ? [3, 20] : [0, 0];
  };
  const escolhidos = () => {
    const d = criar.dados;
    if (criar.tipo === "batalha") return [d.a, d.b].filter(Boolean);
    if (criar.tipo === "historia") return [d.id].filter(Boolean);
    return d.pessoas || [];
  };
  const definirEscolhidos = (ids) => {
    const d = criar.dados;
    if (criar.tipo === "batalha") [d.a, d.b] = ids;
    else if (criar.tipo === "historia") d.id = ids[0];
    else d.pessoas = ids;
  };

  const categorias = () => [...new Set(estado.ds.people.map((p) => p.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt"));
  const sugeridos = (fora) =>
    [...estado.ds.people]
      .filter((p) => !fora.has(p.id))
      .sort((a, b) => (indice(b.id).total ?? -1) - (indice(a.id).total ?? -1))
      .slice(0, 12)
      .map((p) => ({ p }));

  const criarHtml = () => {
    const tipos = regras().tipos.filter((t) => dados.tipos?.[t]);
    const d = criar.dados;
    const [min, max] = MIN_MAX();
    const passoTipo = `<div class="sg-passo"><h3><i>1</i> O que queres ver?</h3><div class="sg-tipos">${tipos
      .map((t) => `<button type="button" data-tipo="${t}" aria-pressed="${criar.tipo === t}"><span>${dados.tipos[t].icone}</span><b>${esc(dados.tipos[t].nome)}</b><small>${esc(TEXTO_TIPO[t] || "")}</small></button>`)
      .join("")}</div></div>`;
    if (!criar.tipo) return passoTipo;
    let opcoes = "";
    if (criar.tipo === "top") {
      opcoes = `<div class="sg-linhas">
        <label class="campo"><span>Ranking por</span><select class="input" data-campo="medida">${Object.entries(dados.medidas || {})
          .map(([k, n]) => `<option value="${k}" ${d.medida === k ? "selected" : ""}>${esc(n[0].toUpperCase() + n.slice(1))}</option>`)
          .join("")}</select></label>
        <div class="campo"><span>Quem entra</span><div class="sg-seg"><button type="button" data-so="0" aria-pressed="${!d.so}">Todos</button><button type="button" data-so="1" aria-pressed="${Boolean(d.so)}">Só os que eu escolher</button></div></div>
        ${d.so ? "" : `<label class="campo"><span>Quantos</span><select class="input" data-campo="n">${[5, 10, 15, 20].map((n) => `<option ${Number(d.n) === n ? "selected" : ""}>${n}</option>`).join("")}</select></label>
        <label class="campo"><span>Categoria</span><select class="input" data-campo="cat"><option value="">Todas</option>${categorias().map((c) => `<option ${d.cat === c ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></label>`}
      </div>`;
    }
    if (criar.tipo === "simulacao") {
      opcoes = `<div class="sg-jogos">${Object.entries(dados.jogos || {})
        .map(([k, j]) => `<button type="button" data-jogo="${k}" aria-pressed="${d.jogo === k}"><b>${esc(j.nome)}</b><small>${j.min} a ${j.max} Youtubers</small></button>`)
        .join("")}</div>`;
    }
    const precisaPessoas = max > 0 && (criar.tipo !== "simulacao" || d.jogo);
    const ids = escolhidos();
    const quem = precisaPessoas
      ? `<div class="sg-escolha">
          <div class="sg-escolha-cabeca"><b>${min === max ? `Escolhe ${min === 1 ? "o Youtuber" : `${min} Youtubers`}` : `Escolhe de ${min} a ${max} Youtubers`}</b><span class="${ids.length >= min && ids.length <= max ? "ok" : ""}">${ids.length}${min === max ? ` de ${min}` : ""}</span></div>
          <div class="sg-chips">${ids.map((id) => `<button type="button" class="sg-chip" data-tirar="${esc(id)}" title="Tirar">${avatar(pessoaDe(id), 28)}<span>${esc(pessoaDe(id).name)}</span><i>✕</i></button>`).join("") || `<p class="muted">Ainda ninguém. Procura ou toca nos de baixo.</p>`}</div>
          ${ids.length < max || max === 1 ? `<input class="input" type="search" data-procurar placeholder="Procurar um Youtuber" autocomplete="off"><div class="sg-grelha" data-resultados></div>` : ""}
        </div>`
      : "";
    const pronta = !precisaPessoas ? criar.tipo !== "simulacao" : ids.length >= min && ids.length <= max;
    return `${passoTipo}
      <div class="sg-passo"><h3><i>2</i> ${criar.tipo === "simulacao" ? "Que jogo e com quem?" : criar.tipo === "top" ? "Como é o top?" : "Com quem?"}</h3>${opcoes}${quem}</div>
      <div class="sg-passo sg-fim"><h3><i>3</i> Enviar</h3>
        <p class="muted">${pronta ? `Vai aparecer assim: <b>${esc(tituloPrevisto())}</b>. Fica ${regras().dias} dias no ar, anónima.` : "Falta escolher o que está acima."}</p>
        <div class="sg-fim-botoes"><button type="button" class="btn" data-cancelar>Cancelar</button><button type="button" class="btn btn-primario" data-enviar ${pronta ? "" : "disabled"}>Enviar sugestão</button></div>
      </div>`;
  };

  // O título que o servidor vai dar (o mesmo jeito de escrever)
  const tituloPrevisto = () => {
    const d = criar.dados;
    const nome = (id) => pessoaDe(id).name;
    const juntar = (ids) => (ids.length <= 3 ? ids.map(nome).join(", ").replace(/, ([^,]*)$/, " e $1") : `${ids.slice(0, 2).map(nome).join(", ")} e mais ${ids.length - 2}`);
    const med = dados.medidas?.[d.medida] || "";
    if (criar.tipo === "top") return d.so ? `Top ${d.pessoas?.length || 0} por ${med}: ${juntar(d.pessoas || [])}` : `Top ${d.n}${d.cat ? ` de ${d.cat}` : ""} por ${med}`;
    if (criar.tipo === "batalha") return `${nome(d.a)} vs ${nome(d.b)}`;
    if (criar.tipo === "torneio") return `Torneio com ${juntar(d.pessoas || [])}`;
    if (criar.tipo === "simulacao") return `${dados.jogos?.[d.jogo]?.nome} com ${juntar(d.pessoas || [])}`;
    return `A história de ${nome(d.id)} no YouTube`;
  };

  const ligarCriar = (caixa) => {
    $$("[data-tipo]", caixa).forEach((b) =>
      b.addEventListener("click", () => {
        criar = { tipo: b.dataset.tipo, dados: b.dataset.tipo === "top" ? { medida: "views", n: 10, cat: "", so: false } : {} };
        desenharCriar(true);
      }),
    );
    $$("[data-jogo]", caixa).forEach((b) =>
      b.addEventListener("click", () => {
        criar.dados.jogo = b.dataset.jogo;
        const [, max] = MIN_MAX();
        criar.dados.pessoas = (criar.dados.pessoas || []).slice(0, max);
        desenharCriar();
      }),
    );
    $$("[data-so]", caixa).forEach((b) =>
      b.addEventListener("click", () => {
        criar.dados.so = b.dataset.so === "1";
        if (!criar.dados.so) delete criar.dados.pessoas;
        desenharCriar();
      }),
    );
    $$("[data-campo]", caixa).forEach((el) =>
      el.addEventListener("change", () => {
        criar.dados[el.dataset.campo] = el.value;
        desenharCriar();
      }),
    );
    $$("[data-tirar]", caixa).forEach((b) =>
      b.addEventListener("click", () => {
        definirEscolhidos(escolhidos().filter((id) => id !== b.dataset.tirar));
        desenharCriar();
      }),
    );
    const campo = $("[data-procurar]", caixa);
    const res = $("[data-resultados]", caixa);
    if (campo) {
      const pintar = () => {
        const fora = new Set(escolhidos());
        const l = campo.value.trim() ? procurar(campo.value, 24).filter((p) => !fora.has(p.id)).slice(0, 12).map((p) => ({ p })) : sugeridos(fora);
        res.innerHTML = l.length ? l.map(({ p }) => `<button type="button" class="sg-mini" data-por="${esc(p.id)}">${avatar(p, 44)}<span>${esc(p.name)}</span></button>`).join("") : `<p class="muted">Ninguém com esse nome.</p>`;
        $$("[data-por]", res).forEach((b) =>
          b.addEventListener("click", () => {
            const [, max] = MIN_MAX();
            const atual = escolhidos();
            definirEscolhidos(max === 1 ? [b.dataset.por] : [...atual, b.dataset.por].slice(0, max));
            desenharCriar(false, true);
          }),
        );
      };
      campo.addEventListener("input", pintar);
      pintar();
    }
    $("[data-cancelar]", caixa)?.addEventListener("click", () => {
      criar = null;
      desenhar();
    });
    $("[data-enviar]", caixa)?.addEventListener("click", enviar);
  };

  const desenharCriar = (rolar = false, focar = false) => {
    const caixa = $("#sg-criar", corpo);
    if (!caixa) return;
    caixa.innerHTML = criarHtml();
    ligarCriar(caixa);
    if (rolar) caixa.querySelector(".sg-passo:nth-child(2)")?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (focar) $("[data-procurar]", caixa)?.focus({ preventScroll: true });
  };

  const enviar = async (ev) => {
    if (!temConta()) return pedirConta("sugerir");
    const b = ev.currentTarget;
    b.disabled = true;
    const d = { ...criar.dados };
    if (criar.tipo === "top" && !d.so) delete d.pessoas;
    delete d.so;
    try {
      const t = await tokenConta(cfg);
      if (!t) return pedirConta("sugerir");
      dados = await api("sugestao", { metodo: "POST", corpo: { token: t, sugestao: { tipo: criar.tipo, dados: d } } });
      criar = null;
      toast("A tua sugestão está no ar! Partilha para votarem.");
      desenhar();
      $(".sg-cartao.minha", corpo)?.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (e) {
      toast(e.message, { erro: true, tempo: 6000 });
      b.disabled = false;
    }
  };

  // ---------- Votar ----------
  const votarEm = async (id, quer, botao) => {
    if (!temConta()) return pedirConta("votar");
    const s = dados.ativas.find((x) => x.id === id);
    const novo = s?.meuVoto === quer ? null : quer;
    $$(`[data-id="${CSS.escape(id)}"] .sg-voto`, corpo).forEach((x) => (x.disabled = true));
    try {
      const t = await tokenConta(cfg);
      if (!t) return pedirConta("votar");
      dados = await api("sugestao/voto", { metodo: "POST", corpo: { token: t, id, quer: novo } });
      if (dados.saiu === "removida") toast("Com este voto, a sugestão saiu do ar: a maioria não a quer.");
      else toast(novo === null ? "Tiraste o teu voto." : novo ? "Votaste: queres ver!" : "Votaste: não queres.");
      desenhar();
    } catch (e) {
      toast(e.message, { erro: true });
      botao.disabled = false;
      desenhar();
    }
  };

  // ---------- Página ----------
  const desenhar = () => {
    const ativas = dados.ativas;
    corpo.innerHTML = `${contaHtml()}
      ${criar ? `<section class="vidro sg-criar" id="sg-criar"></section>` : chamada()}
      <div class="sg-lista" data-animacao="${jaAnimou ? "nenhuma" : "subir"}">
        <h2 class="sg-titulo">No ar agora</h2>
        ${ativas.length ? ativas.map(cartao).join("") : `<div class="vidro pub-vazio"><p class="muted">Ainda não há sugestões. Sê o primeiro!</p></div>`}
      </div>
      ${
        dados.aceites?.length
          ? `<div class="sg-aceites"><h2 class="sg-titulo">O canal aceitou</h2>${dados.aceites
              .map((s) => `<div class="vidro sg-aceite"><span class="sg-ok">✓</span><div><b>${esc(s.titulo)}</b><small>${esc(dados.tipos?.[s.tipo]?.nome || "")} · Vem aí!</small></div>${(s.dados?.pessoas || [s.dados?.a, s.dados?.b, s.dados?.id].filter(Boolean)).length ? pilha(s.dados?.pessoas || [s.dados?.a, s.dados?.b, s.dados?.id].filter(Boolean), 30, 4) : ""}</div>`)
              .join("")}</div>`
          : ""
      }`;
    ligarConta();
    $("[data-criar]", corpo)?.addEventListener("click", () => {
      if (!temConta()) return pedirConta("sugerir");
      criar = { tipo: null, dados: {} };
      desenhar();
      $("#sg-criar", corpo)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    if (criar) desenharCriar();
    $$(".sg-voto", corpo).forEach((b) => b.addEventListener("click", () => votarEm(b.closest("[data-id]").dataset.id, b.dataset.voto === "1", b)));
  };
  let jaAnimou = false;
  desenhar();
  const fim = animarBlocos(main);
  jaAnimou = true;
  return fim;
}
