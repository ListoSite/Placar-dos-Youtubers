// Título, legenda e hashtags sugeridos para publicar cada espetáculo nas redes.

import { estado, pessoa } from "../data.js";
import { mesNome } from "../format.js";
import { METRICAS } from "./metricas.js";

const HASH_CATEGORIA = {
  Football: "#futebol",
  Gamer: "#gaming",
  Tech: "#tecnologia",
  Comida: "#comida",
  Carros: "#carros",
  Comédia: "#humor",
  Música: "#musica",
  Podcast: "#podcast",
  Vlog: "#vlog",
  Fitness: "#fitness",
  Business: "#negocios",
  Educação: "#educacao",
  Política: "#politica",
  Livros: "#livros",
  Cinema: "#cinema",
  Notícias: "#noticias",
  História: "#historia",
  Animais: "#animais",
  Pesca: "#pesca",
  Dança: "#danca",
  Shorts: "#shorts",
  Reacts: "#reacts",
  Kids: "#kids",
  Programação: "#programacao",
  Mota: "#motas",
  Tutorial: "#tutorial",
};

export function textoPublicar(esp, opts, { formato }) {
  const canal = { nome: "Placar dos Youtubers", youtube: "", ...(estado.ds?.settings?.canal || {}) };
  const site = location.host;
  const mes = opts.m ? mesNome(opts.m) : mesNome(estado.ref);
  const cat = opts.cat ? ` (${opts.cat})` : "";
  const nome = (id) => pessoa(id)?.name || "";
  const met = METRICAS[opts.metric]?.nome(opts.m || estado.ref);
  const t = {
    revelacao: [`Top ${opts.n || 10} dos Youtubers portugueses: ${met || `views em ${mes}`}${cat} 🏆`, `Quem ficou em 1.º lugar? Vê até ao fim 👀`],
    corrida: [`A corrida das views dos Youtubers portugueses${cat} 🏁`, `De ${mesNome(opts.de || estado.ref)} a ${mesNome(opts.ate || estado.ref)}: quem dominou cada mês?`],
    tier: [`Tier list dos Youtubers portugueses${cat} 🔥`, `Concordas com as filas? Quem merecia estar no S? Comenta!`],
    altos: [`Quem subiu e quem caiu em ${mes} 📈📉`, `As maiores subidas e quedas do ranking de views dos Youtubers portugueses.`],
    barras: [`Top ${opts.n || 10} em barras: ${met || `views em ${mes}`}${cat} 📊`, `As colunas crescem fora de ordem… quem fica em 1.º quando se ordenam?`],
    categorias: [`Qual é a categoria com mais views em ${mes}? 🍩`, `O bolo das views dos Youtubers portugueses, fatia a fatia. A tua categoria preferida ficou onde?`],
    bolhas: [`As bolhas dos Youtubers portugueses${cat} 🫧`, `Views, subscritores e Índice: vê quem tem a maior bolha em cada um.`],
    linhas: [`${opts.n || 5} Youtubers, ${opts.meses && opts.meses < 999 ? `${opts.meses} meses` : "todos os meses"}: quem vai na frente? 📈`, `As views mês a mês, linha a linha. Houve ultrapassagens?`],
    numeros: [`${mes} em números${cat} 🔢`, `O total de views, as maiores subidas e o n.º 1 do mês dos Youtubers portugueses.`],
    desafio: [`Desafio do Placar: quantos pontos fazes? 🧠`, `Pausa, responde e conta os teus pontos. Comenta a tua pontuação!`],
    quiz: [`Quem fez mais? Testa o que sabes sobre os Youtubers portugueses 🤔`, `5 segundos por pergunta. Quantas acertaste? Comenta!`],
    maismenos: [`Mais ou menos? O jogo dos Youtubers portugueses 🔥`, `Até onde consegues ir sem errar? Comenta a tua sequência!`],
    adivinha: [`Consegues adivinhar quem é? 👀`, `Foto desfocada e pistas. Quantos acertaste antes da revelação?`],
    roda: [`A roda da sorte dos Youtubers portugueses 🎡`, `Para onde vai parar? E os números de quem saiu?`],
    batalha: [`${nome(opts.a) || "Youtuber"} vs ${nome(opts.b) || "Youtuber"}: quem ganha? 🥊`, `Ronda a ronda, número a número, até ao K.O. Quem achas que vence?`],
    torneio: [`O grande torneio dos Youtubers portugueses${cat} 🏆`, `${opts.n || 8} Youtubers, eliminatórias e uma final. Quem levou a taça?`],
    cartao: [`${nome(opts.id) || "Youtuber"} em números 📊`, `O Índice de Influência e os números mais importantes.`],
    historia: [`A história de ${nome(opts.id) || "um Youtuber"} no YouTube 📈`, `Do início até hoje, mês a mês, com os momentos marcantes.`],
  }[esp.id] || [esp.nome, ""];
  const extra = [canal.youtube ? `Subscreve ${canal.youtube} para mais.` : `Segue o ${canal.nome} para mais.`, `Ranking completo em ${site}`].join(" ");
  const tags = new Set(String(canal.hashtags || "#placardosyoutubers #youtubersportugueses").split(/\s+/).filter(Boolean));
  if (HASH_CATEGORIA[opts.cat]) tags.add(HASH_CATEGORIA[opts.cat]);
  if (formato === "9x16") tags.add("#shorts");
  tags.add("#portugal");
  const dica =
    formato === "9x16"
      ? "Vertical: ideal para TikTok, Reels e Shorts. Para Shorts, mantém abaixo de 60 segundos (velocidade Rápida ajuda). Publica entre as 18h e as 21h."
      : "Horizontal: ideal para o YouTube. Usa o título como título do vídeo e a legenda na descrição. Um corte vertical do momento final dá um bom Short.";
  return { titulo: t[0], legenda: `${t[1]} ${extra}`, hashtags: [...tags].join(" "), dica };
}
