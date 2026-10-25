// O Caso (painel): o karma e as reações que o público dá a cada Youtuber (anónimo).
// Fica à parte do Índice; aqui decides se entra no Índice do site e quanto pode mexer.

import { api, estado, indice } from "../data.js";
import { esc, inteiro, norm } from "../format.js";
import { $, $$, avatar, toast, janela, confirmar } from "../ui.js";
import { chamar } from "./common.js";

const sinal = (n) => (n > 0 ? `+${n}` : String(n));

export async function render(main, { params = [] } = {}) {
  const vista = ["karma", "radar"].includes(params[0]) ? params[0] : "noticias";
  main.dataset.titulo = "O Caso";
  main.innerHTML = `<div class="wrap csp">${subnav("caso")}<div class="vc-topo"><div><h1>O Caso</h1><p class="muted">${
    vista === "radar"
      ? "Os vídeos recentes dos Youtubers que podem dar notícia: falam de outros Youtubers, têm palavras como resposta, polémica, colab, pausa ou 1 milhão, ou têm muito mais views e comentários do que o normal. Carrega em Fazer notícia para a começar já preenchida."
      : vista === "karma"
      ? 'O público dá karma aos Youtubers (apoiar 👍 ou "estou farto" 👎) e uma reação, com a conta Google e sempre anónimo. Fica à parte do Índice de Influência: só entra se o ligares aqui.'
      : "Publica o que anda a acontecer, com um tema (polémica, coisas boas…). O público reage, responde à tua pergunta e dá karma aos Youtubers envolvidos. Tudo anónimo."
  }</p></div>
    <div class="vc-acoes"><a class="btn" href="/#/caso${vista === "karma" ? "?ver=karma" : ""}" target="_blank" rel="noopener">Ver no site</a>${vista === "karma" ? `<button class="btn" id="csp-regras">Regras</button>` : vista === "radar" ? `<button class="btn" id="csp-regras">Regras do radar</button><button class="btn btn-primario" id="csp-procurar" data-a-esperar="A procurar">Procurar agora</button>` : `<button class="btn btn-primario" id="csp-nova">+ Nova notícia</button>`}</div></div>
    <div class="filtros"><div class="segmentos" role="group" aria-label="O Caso"><a class="btn-seg" href="#/caso" aria-pressed="${vista === "noticias"}">📰 Notícias</a><a class="btn-seg" href="#/caso/radar" aria-pressed="${vista === "radar"}">📡 Radar</a><a class="btn-seg" href="#/caso/karma" aria-pressed="${vista === "karma"}">⚖️ Karma</a></div></div>
    <div id="csp-corpo"><div class="a-carregar"><div class="roda"></div></div></div></div>`;
  if (vista === "karma") await desenhar(main);
  else if (vista === "radar") {
    const { desenharRadar } = await import("./radar.js");
    await desenharRadar(main);
  } else {
    const { desenharNoticias } = await import("./noticias.js");
    await desenharNoticias(main);
  }
}

/** Atalhos entre as páginas do público (no telemóvel, onde não há barra lateral). */
export function subnav(atual) {
  const l = [
    ["votacoes", "Votações"],
    ["sugestoes", "Sugestões"],
    ["caso", "O Caso"],
  ];
  return `<nav class="pn-subnav" aria-label="Público">${l.map(([id, n]) => `<a href="#/${id}" ${id === atual ? 'aria-current="page"' : ""}>${n}</a>`).join("")}</nav>`;
}

async function desenhar(main) {
  const corpo = $("#csp-corpo", main);
  let r;
  try {
    r = await api("admin/caso");
  } catch (e) {
    corpo.innerHTML = `<div class="aviso"><p>${esc(e.message)}</p></div>`;
    return;
  }
  $("#csp-regras", main).onclick = () => regras(r, () => desenhar(main));
  if (!r.ligado) {
    corpo.innerHTML = `<div class="painel ed-bloco"><h3>Falta ligar o Supabase</h3><p class="muted">O Caso usa o Supabase (login com Google). Liga-o em <a href="#/editar/definicoes">Editar, Definições</a>.</p></div>`;
    return;
  }
  const g = r.regras;
  const resumo = r.pessoas || {};
  const totalVotos = Object.values(resumo).reduce((a, x) => a + x.n, 0);

  // O Índice com e sem karma (com as regras atuais), para ver o efeito antes de ligar
  const ctxPeso = (peso) => (id) => {
    const i = indice(id);
    const base = i.semKarma ?? i.total;
    if (base === null || base === undefined) return null;
    const k = resumo[id];
    return k ? Math.max(0, Math.min(1000, Math.round(base * (1 + (peso / 100) * k.k)))) : base;
  };
  const efeito = (peso) => {
    const v = ctxPeso(peso);
    const base = (id) => indice(id).semKarma ?? indice(id).total;
    const pessoas = estado.ds.people.filter((p) => base(p.id) !== null && base(p.id) !== undefined);
    const antes = [...pessoas].sort((a, b) => base(b.id) - base(a.id)).map((p) => p.id);
    const depois = [...pessoas].sort((a, b) => v(b.id) - v(a.id)).map((p) => p.id);
    const posA = new Map(antes.map((id, i) => [id, i + 1]));
    return depois
      .slice(0, 50)
      .map((id, i) => ({ id, de: posA.get(id), para: i + 1 }))
      .filter((x) => x.de !== x.para);
  };

  const aviso = !r.aba?.visivel
    ? `<div class="aviso"><p><b>A aba "${esc(r.aba?.nome || "O Caso")}" está desligada:</b> o público não vê O Caso nem pode votar.</p><button class="btn btn-primario btn-pequeno" id="csp-ligar">Ligar a aba no site</button></div>`
    : !g.votar
      ? `<div class="aviso info"><p>Os votos estão fechados (nas Regras): o público vê o karma, mas não vota.</p></div>`
      : "";

  corpo.innerHTML = `${aviso}
    <div class="sgp-resumo">
      <div class="painel sgp-num"><b>${inteiro(totalVotos)}</b><span>Votos</span></div>
      <div class="painel sgp-num"><b>${inteiro(Object.keys(resumo).length)}</b><span>Youtubers com votos</span></div>
      <div class="painel sgp-num"><b>${inteiro(Object.values(resumo).filter((x) => x.k > 0.05).length)}</b><span>Com karma bom</span></div>
      <div class="painel sgp-num"><b>${inteiro(Object.values(resumo).filter((x) => x.k < -0.05).length)}</b><span>Com karma mau</span></div>
    </div>

    <div class="painel ed-bloco csp-indice">
      <label class="vc-interruptor"><input type="checkbox" id="csp-noindice" ${g.noIndice ? "checked" : ""}><span class="vc-bola"></span><span><b>Juntar o karma ao Índice no site</b><small>${g.noIndice ? "Ligado: o Índice, os rankings e o Palco usam o Índice com o karma." : "Desligado: o Índice só usa os números. No Palco podes escolher \"Índice com o karma do público\"."}</small></span></label>
      <label class="campo csp-peso"><span>O karma pode mexer no Índice até <b id="csp-peso-v">${g.peso}%</b> (para cima ou para baixo)</span><input type="range" min="0" max="50" step="1" id="csp-peso" value="${g.peso}"><small>Com menos de ${g.minVotos} votos, o efeito é menor (cresce com os votos). Os votos antigos pesam menos: metade em ${g.meiaVida} dias.</small></label>
      <div id="csp-efeito"></div>
      <div class="ed-acoes"><button class="btn btn-primario" id="csp-guardar-indice" data-a-esperar="A guardar">Guardar</button></div>
    </div>

    <div class="painel ed-bloco">
      <div class="vc-cabeca"><div><h3>Karma de cada Youtuber</h3><p class="muted">De -100 a +100. Se vires uma enxurrada de votos suspeita num Youtuber, podes apagar os votos dele.</p></div></div>
      <input class="input" type="search" id="csp-procura" placeholder="Procurar Youtuber" style="margin:10px 0">
      <div class="csp-lista" id="csp-lista"></div>
    </div>`;

  const desenharEfeito = (peso) => {
    const l = efeito(peso);
    $("#csp-efeito", corpo).innerHTML = l.length
      ? `<p class="muted csp-efeito-t">No top 50, com ${peso}%, ${l.length} ${l.length === 1 ? "Youtuber muda" : "Youtubers mudam"} de lugar:</p><div class="csp-movimentos">${l
          .slice(0, 12)
          .map((x) => {
            const p = estado.pessoas.get(x.id);
            return `<span class="${x.para < x.de ? "sobe" : "desce"}">${avatar(p, 22)}${esc(p.name)} <b>${x.de}.º → ${x.para}.º</b></span>`;
          })
          .join("")}${l.length > 12 ? `<small class="muted">e mais ${l.length - 12}</small>` : ""}</div>`
      : `<p class="muted csp-efeito-t">Com ${peso}%, ninguém muda de lugar no top 50.</p>`;
  };
  desenharEfeito(g.peso);
  $("#csp-peso", corpo).addEventListener("input", (e) => {
    $("#csp-peso-v", corpo).textContent = `${e.target.value}%`;
    desenharEfeito(Number(e.target.value));
  });
  $("#csp-guardar-indice", corpo).addEventListener("click", async (e) => {
    const noIndice = $("#csp-noindice", corpo).checked;
    await chamar("caso/regras", { regras: { ...g, noIndice, peso: Number($("#csp-peso", corpo).value) } }, { botao: e.currentTarget, recarregar: true, sucesso: noIndice ? "O karma já conta no Índice do site." : "O Índice voltou a usar só os números." }).catch(() => {});
    desenhar(main);
  });
  $("#csp-ligar", corpo)?.addEventListener("click", async (e) => {
    const v = await api("admin/vitrine");
    const aba = v.config.abas.find((a) => a.id === "caso");
    if (!aba) return toast("Atualiza a página e tenta outra vez.", { erro: true });
    aba.visivel = true;
    await chamar("vitrine", { config: v.config }, { botao: e.currentTarget, recarregar: false, sucesso: "A aba O Caso já está no site." }).catch(() => {});
    desenhar(main);
  });

  // Lista
  const linhas = Object.entries(resumo)
    .map(([id, k]) => ({ id, k, p: estado.pessoas.get(id) }))
    .filter((x) => x.p)
    .sort((a, b) => Math.abs(b.k.k) * Math.log(1 + b.k.n) - Math.abs(a.k.k) * Math.log(1 + a.k.n));
  const v = ctxPeso(g.peso);
  const pintar = () => {
    const t = norm($("#csp-procura", corpo).value);
    const l = linhas.filter((x) => !t || norm(x.p.name).includes(t));
    $("#csp-lista", corpo).innerHTML = l.length
      ? l
          .slice(0, 80)
          .map(({ id, k, p }) => {
            const pts = Math.round(k.k * 100);
            const base = indice(id).semKarma ?? indice(id).total;
            const com = v(id);
            const reacoes = Object.entries(k.r || {})
              .sort((a, b) => b[1] - a[1])
              .map(([rid, n]) => `${r.reacoes[rid]?.emoji || ""}${inteiro(n)}`)
              .join(" ");
            return `<div class="csp-linha" data-p="${esc(id)}">${avatar(p, 34)}<div class="csp-quem"><b>${esc(p.name)}</b><small>👍 ${inteiro(k.pos)} · 👎 ${inteiro(k.neg)}${reacoes ? ` · ${reacoes}` : ""}</small></div>
              <b class="csp-k ${pts > 0 ? "pos" : pts < 0 ? "neg" : ""}">${sinal(pts)}</b>
              <span class="csp-ind" title="Índice só com os números → com o karma">${base !== null && base !== undefined ? `${inteiro(base)} → ${inteiro(com)}` : "–"}</span>
              <button class="btn btn-pequeno" data-limpar>Apagar votos</button></div>`;
          })
          .join("")
      : `<p class="muted">${linhas.length ? "Ninguém com esse nome." : "Ainda não há votos."}</p>`;
    $$("[data-limpar]", corpo).forEach((b) =>
      b.addEventListener("click", async () => {
        const id = b.closest("[data-p]").dataset.p;
        const p = estado.pessoas.get(id);
        if (!(await confirmar(`Apagar todos os votos e reações de ${p?.name || id}? Não dá para desfazer.`, { sim: "Apagar votos", perigo: true }))) return;
        await chamar("caso/limpar", { pessoa: id }, { botao: b, recarregar: true, sucesso: "Votos apagados." }).catch(() => {});
        desenhar(main);
      }),
    );
  };
  $("#csp-procura", corpo).addEventListener("input", pintar);
  pintar();
}

function regras(r, depois) {
  const g = r.regras;
  const caixa = (nome, rotulo, v, ajuda) => `<label class="vc-interruptor"><input type="checkbox" name="${nome}" ${v ? "checked" : ""}><span class="vc-bola"></span><span><b>${rotulo}</b><small>${ajuda}</small></span></label>`;
  const numero = (nome, rotulo, v, min, max, ajuda) => `<label class="campo"><span>${rotulo}</span><input class="input" type="number" name="${nome}" value="${v}" min="${min}" max="${max}"><small class="muted">${ajuda}</small></label>`;
  const { el, fechar } = janela(
    `<h2>Regras do Caso</h2>
    <form class="vc-form sgp-form">
      ${caixa("votar", "Aceitar votos", g.votar, "Desligado: o público vê o karma, mas não vota.")}
      ${caixa("reacoes", "Reações (❤️ 👏 😂 😮 😡 🤮)", g.reacoes, "As reações boas e más contam meio voto para o karma; as outras só se mostram.")}
      <div class="ed-grelha">
        ${numero("meiaVida", "Dias até um voto pesar metade", g.meiaVida, 7, 730, "O karma esquece-se com o tempo.")}
        ${numero("minVotos", "Votos para força total", g.minVotos, 1, 10000, "Com menos votos, o karma mexe menos.")}
      </div>
    </form>
    <div class="janela-acoes"><button class="btn" data-fechar>Cancelar</button><button class="btn btn-primario" data-ok>Guardar</button></div>`,
    { larga: true },
  );
  $("[data-ok]", el).addEventListener("click", async (e) => {
    const f = $("form", el);
    const novas = { ...g, votar: f.elements.votar.checked, reacoes: f.elements.reacoes.checked, meiaVida: Number(f.elements.meiaVida.value), minVotos: Number(f.elements.minVotos.value) };
    try {
      await chamar("caso/regras", { regras: novas }, { botao: e.currentTarget, recarregar: true, sucesso: "Regras guardadas." });
      fechar();
      depois();
    } catch {
      /* o erro já apareceu */
    }
  });
}

