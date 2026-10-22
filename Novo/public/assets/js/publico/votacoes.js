// Votações na página pública. Qualquer pessoa vê; para votar entra-se com a conta Google
// (um voto por pessoa em cada votação).

import { api } from "../data.js";
import { esc, inteiro } from "../format.js";
import { $, $$, avatar, toast, confirmar } from "../ui.js";
import { temConta, entrarComGoogle, sairDaConta, quemSou, meusVotos, votar } from "../conta.js";

const GOOGLE = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z"/><path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z"/><path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8z"/><path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z"/></svg>`;

function quandoFecha(v) {
  if (!v.fecha) return "";
  const ms = Date.parse(v.fecha) - Date.now();
  if (ms <= 0) return "Fechou";
  const h = Math.round(ms / 3600000);
  if (h < 1) return "Fecha em menos de 1 hora";
  if (h < 48) return `Fecha em ${h} ${h === 1 ? "hora" : "horas"}`;
  return `Fecha em ${Math.round(h / 24)} dias`;
}

/**
 * Mostra as votações dentro de main. pessoas: { id: { name, photo } } para as opções que são Youtubers.
 * dados: a resposta de /api/votacoes (se já foi pedida).
 */
export async function montarVotacoes(main, { dados, pessoas = {} } = {}) {
  const pessoa = (id) => (pessoas[id] ? { id, ...pessoas[id] } : null);
  main.innerHTML = `<div id="vt-conta" class="vt-conta"></div>
    <div id="vt-lista"><div class="a-carregar"><div class="roda"></div></div></div>`;
  if (!dados) {
    try {
      dados = await api("votacoes");
    } catch (e) {
      $("#vt-lista", main).innerHTML = `<p class="muted">${esc(e.message)}</p>`;
      return;
    }
  }
  const cfg = dados.supabase;
  if (!dados.ligado || !cfg) {
    $("#vt-conta", main).innerHTML = "";
    $("#vt-lista", main).innerHTML = `<div class="vidro vt-vazio"><h3>As votações ainda não abriram</h3><p class="muted">Volta em breve.</p></div>`;
    return;
  }
  const eu = await quemSou(cfg);
  let votos = await meusVotos(cfg);

  const desenharConta = () => {
    $("#vt-conta", main).innerHTML = eu
      ? `<div class="vidro vt-eu">${eu.foto ? `<img src="${esc(eu.foto)}" alt="" referrerpolicy="no-referrer">` : ""}<span><b>${esc(eu.nome)}</b><small>Podes votar uma vez em cada votação.</small></span><button class="btn btn-pequeno" id="vt-sair">Sair</button></div>`
      : `<div class="vidro vt-eu"><span><b>Entra para votar</b><small>Usamos a conta Google só para garantir um voto por pessoa. Não publicamos nada em teu nome.</small></span><button class="btn vt-google" id="vt-entrar">${GOOGLE} Entrar com Google</button></div>`;
    $("#vt-entrar", main)?.addEventListener("click", () => entrarComGoogle(cfg));
    $("#vt-sair", main)?.addEventListener("click", async () => {
      await sairDaConta(cfg);
      location.reload();
    });
  };

  const desenhar = () => {
    const lista = [...dados.votacoes].sort((a, b) => Number(b.aberta) - Number(a.aberta));
    if (!lista.length) {
      $("#vt-lista", main).innerHTML = `<div class="vidro vt-vazio"><h3>Ainda não há votações</h3><p class="muted">Volta em breve.</p></div>`;
      return;
    }
    $("#vt-lista", main).innerHTML = lista
      .map((v) => {
        const meu = votos[v.id];
        const total = v.total || 0;
        const max = v.votos ? Math.max(0, ...Object.values(v.votos)) : 0;
        const opcoes = v.opcoes
          .map((o) => {
            const p = o.pessoa ? pessoa(o.pessoa) : null;
            const n = v.votos?.[o.id] || 0;
            const pct = total ? Math.round((n / total) * 100) : 0;
            const lider = v.votos && total && n === max;
            return `<button class="vt-opcao ${meu === o.id ? "minha" : ""} ${lider && v.fechou ? "vencedora" : ""}" data-v="${esc(v.id)}" data-o="${esc(o.id)}" ${!v.aberta || meu ? "disabled" : ""}>
              ${p ? avatar(p, 44) : `<span class="vt-letra">${esc(o.nome.slice(0, 1).toUpperCase())}</span>`}
              <span class="vt-nome"><b>${esc(o.nome)}</b>${meu === o.id ? `<small>O teu voto</small>` : ""}</span>
              ${v.votos ? `<span class="vt-pct"><b>${pct}%</b><small>${inteiro(n)}</small></span><i class="vt-barra" style="width:${pct}%"></i>` : ""}
            </button>`;
          })
          .join("");
        const estado = v.aberta ? `<span class="vt-selo aberta">Aberta</span>` : `<span class="vt-selo">Fechada</span>`;
        return `<section class="vidro vt-votacao">
          <div class="vt-topo">${estado}<small>${esc(quandoFecha(v))}${v.votos ? ` · ${inteiro(total)} ${total === 1 ? "voto" : "votos"}` : ""}</small></div>
          <h2>${esc(v.titulo)}</h2>${v.descricao ? `<p class="muted">${esc(v.descricao)}</p>` : ""}
          <div class="vt-opcoes">${opcoes}</div>
          ${!v.votos ? `<p class="muted vt-nota">Os resultados aparecem quando a votação fechar.</p>` : ""}
        </section>`;
      })
      .join("");
    $$(".vt-opcao:not([disabled])", main).forEach((b) =>
      b.addEventListener("click", async () => {
        if (!temConta()) {
          if (await confirmar("Para votar, entra com a tua conta Google. Queres entrar agora?", { sim: "Entrar com Google" })) entrarComGoogle(cfg);
          return;
        }
        const v = dados.votacoes.find((x) => x.id === b.dataset.v);
        const o = v.opcoes.find((x) => x.id === b.dataset.o);
        if (!(await confirmar(`Votar em ${o.nome}? Só podes votar uma vez.`, { sim: "Votar" }))) return;
        try {
          await votar(cfg, v.id, o.id);
          toast("Voto registado. Obrigado!");
          votos = { ...votos, [v.id]: o.id };
          dados = await api(`votacoes?t=${Date.now()}`).catch(() => dados);
          desenhar();
        } catch (e) {
          toast(e.message, { erro: true });
          if (e.semConta) desenharConta();
        }
      }),
    );
  };
  desenharConta();
  desenhar();
}
