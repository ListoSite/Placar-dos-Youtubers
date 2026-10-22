// Temas por categoria gerados a partir de poucas escolhas: cores, padrão de fundo, ícones e música.
// Cada categoria do site tem o seu tema. As cores viram variáveis CSS na tela do Palco.

/** Ícones (caminhos SVG 24×24) usados nas partículas, no cenário e nas explosões de festa. */
export const ICONES = {
  play: { d: "M8 5v14l11-7z" },
  filme: { d: "M3 4h18v16H3z M5 6h2v2H5z M5 11h2v2H5z M5 16h2v2H5z M17 6h2v2h-2z M17 11h2v2h-2z M17 16h2v2h-2z M9 7h6v10H9z", par: true },
  camara: { d: "M4 7h3l2-2h6l2 2h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z M12 9a4 4 0 1 0 0 8 4 4 0 1 0 0-8z", par: true },
  microfone: { d: "M9 3h6v10a3 3 0 0 1-6 0z M5 11h2a5 5 0 0 0 10 0h2a7 7 0 0 1-6 6.9V21h-2v-3.1A7 7 0 0 1 5 11z" },
  ondas: { d: "M12 10a2 2 0 1 0 0 4 2 2 0 1 0 0-4z M7.8 7.8l1.4 1.4a4 4 0 0 0 0 5.6l-1.4 1.4a6 6 0 0 1 0-8.4z M16.2 7.8a6 6 0 0 1 0 8.4l-1.4-1.4a4 4 0 0 0 0-5.6z M5 5l1.4 1.4a8 8 0 0 0 0 11.2L5 19a10 10 0 0 1 0-14z M19 5a10 10 0 0 1 0 14l-1.4-1.4a8 8 0 0 0 0-11.2z" },
  grafico: { d: "M4 20V10h3v10z M10 20V4h3v16z M16 20v-7h3v7z" },
  seta: { d: "M3 17l6-6 4 4 7-7v4h2V4h-8v2h4l-5 5-4-4-8 8z" },
  coracao: { d: "M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z" },
  estrela: { d: "M12 2l3 7h7l-5.5 4.5L18.5 21 12 16.5 5.5 21l2-7.5L2 9h7z" },
  lapis: { d: "M3 21l1.2-5.2L15.5 4.5l4 4L8.2 19.8z M16.5 3.5l1.5-1.5 4 4-1.5 1.5z" },
  livro: { d: "M4 4h7a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4z M20 4h-5a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h5z" },
  haltere: { d: "M2 10h2V8h2v8H4v-2H2z M22 10h-2V8h-2v8h2v-2h2z M7 6h2v12H7z M15 6h2v12h-2z M9 11h6v2H9z" },
  cara: { d: "M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20z M8.5 8a1.5 1.5 0 1 0 0 3 1.5 1.5 0 1 0 0-3z M15.5 8a1.5 1.5 0 1 0 0 3 1.5 1.5 0 1 0 0-3z M7 14h10a5 5 0 0 1-10 0z", par: true },
  casa: { d: "M3 11l9-8 9 8h-3v9h-5v-6h-2v6H6v-9z" },
  planta: { d: "M11 22v-7.5C7 14 4 12 4 7c4 0 7 2.5 7.5 6.5C12 8.5 16 5 21 5c0 6-4 9-8.5 9.5V22z" },
  swipe: { d: "M12 3l6 6h-4v6h-4V9H6z M6 17h12v3H6z" },
  coroa: { d: "M3 8l4 4 5-7 5 7 4-4-2 11H5z" },
  jornal: { d: "M3 5h14v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M17 9h4v10a2 2 0 0 1-4 0z M5 7h10v4H5z M5 13h10v1.5H5z M5 16h10v1.5H5z", par: true },
  globo: { d: "M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20z M2 12h20 M12 2c3 3 4 6 4 10s-1 7-4 10c-3-3-4-6-4-10s1-7 4-10z", traco: true },
  peixe: { d: "M2 12c3-5 9-6 14-3l5-3-1 6 1 6-5-3c-5 3-11 2-14-3z M7 10.5a1 1 0 1 0 0 2 1 1 0 1 0 0-2z", par: true },
  claquete: { d: "M3 9h18v11H3z M3.2 3.5l17-1.2.5 4-17 1.2z" },
  presente: { d: "M3 9h18v4H3z M5 13h14v8H5z M11 9h2v12h-2z" },
  roda: { d: "M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20z M12 5a7 7 0 1 0 0 14 7 7 0 1 0 0-14z M11 5h2v14h-2z M5 11h14v2H5z", par: true },
  codigo: { d: "M8 6l-6 6 6 6 1.5-1.5L5 12l4.5-4.5z M16 6l-1.5 1.5L19 12l-4.5 4.5L16 18l6-6z M13.5 4h2l-5 16h-2z" },
  balao: { d: "M12 2a6 6 0 0 0-6 6c0 4 3 7 6 8 3-1 6-4 6-8a6 6 0 0 0-6-6z M11 16h2l-.5 2h-1z" },
  pata: { d: "M12 13c-3 0-6 3-6 5.5S8 21 12 21s6-.5 6-2.5S15 13 12 13z M6.5 7a2 2.5 0 1 0 0 5 2 2.5 0 1 0 0-5z M17.5 7a2 2.5 0 1 0 0 5 2 2.5 0 1 0 0-5z M10 3a2 2.5 0 1 0 0 5 2 2.5 0 1 0 0-5z M14 3a2 2.5 0 1 0 0 5 2 2.5 0 1 0 0-5z" },
  atomo: { d: "M12 10a2 2 0 1 0 0 4 2 2 0 1 0 0-4z M2 12a10 4 0 1 0 20 0a10 4 0 1 0-20 0 M12 2a4 10 0 1 0 0 20a4 10 0 1 0 0-20", traco: true },
  nota: { d: "M9 3v11.3A3.5 3.5 0 1 0 11 17.5V8h6V3z" },
  chave: { d: "M14.5 2a5.5 5.5 0 0 0-5.2 7.3L2 16.6V21h4.4l1.4-1.4V18h1.6l1-1v-1.6h1.6l1.3-1.3A5.5 5.5 0 1 0 14.5 2z M16 5.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 1 0 0-3z", par: true },
  chama: { d: "M12 2c3 4 5 6.5 5 9.5a5 5 0 0 1-10 0C7 8.5 9 6 12 2z M12 11c1.5 2 2 3 2 4a2 2 0 0 1-4 0c0-1 .5-2 2-4z", par: true },
  bandeira: { d: "M5 2h2v20H5z M7 3h12l-3 4 3 4H7z" },
  euro: { d: "M15.5 5.5A6 6 0 0 0 7.3 10H5v2h2.1a6 6 0 0 0 0 1H5v2h2.3a6 6 0 0 0 8.2 4.5l-.8-1.9A4 4 0 0 1 9.4 15H14v-2H9a4 4 0 0 1 0-1h5v-2H9.4a4 4 0 0 1 5.3-2.6z" },
};

// cores: [fundo escuro, fundo médio, fundo claro (topo)]; acento; ouro (vencedor/destaque)
const T = (id, nome, texto, categorias, o) => ({
  id,
  nome,
  grupo: "categorias",
  texto,
  categorias,
  gerado: true,
  particulas: "icones",
  festa: "icones",
  amostra: [o.fundo[1], o.acento, o.ouro],
  cores: o.cores || [o.acento, o.ouro, "#ffffff", o.fundo[2]].map((c) => (/^#[0-9a-f]{6}$/i.test(c) ? c : "#ffffff")),
  ...o,
});

export const GERADOS = [
  T("youtube", "YouTube", "O vermelho do play", ["Youtuber"], { fundo: ["#0b0b0b", "#1c1c1c", "#3a0d14"], acento: "#ff0033", ouro: "#ffcc00", padrao: "grelha", icones: ["play"], musica: { tensao: "tensao", epico: "epico", leve: "leve" }, sons: { abertura: "revelar", destaque: "brilho", festa: "vitoria" } }),
  T("clips", "Clips", "Fita de filme e cortes rápidos", ["Clips"], { fundo: ["#0d0718", "#1d0f33", "#3b1766"], acento: "#ff4fd8", ouro: "#ffe14d", padrao: "filme", icones: ["filme", "play"], musica: { tensao: "neon_calmo", epico: "neon_corrida", leve: "neon_calmo" }, sons: { abertura: "laser", destaque: "laser", festa: "vitoria" } }),
  T("shorts", "Shorts", "Vertical, rápido e viciante", ["Shorts"], { fundo: ["#07070b", "#13131c", "#2a0a1d"], acento: "#ff0050", ouro: "#00f2ea", padrao: "riscas", icones: ["swipe", "coracao", "play"], musica: { tensao: "neon_corrida", epico: "neon_corrida", leve: "neon_calmo" }, sons: { abertura: "laser", destaque: "bip", festa: "vitoria" } }),
  T("vlog", "Vlog", "Luz quente e câmara na mão", ["Vlog"], { claro: true, fundo: ["#ffd3c2", "#ffe7dc", "#fff6f1"], acento: "#ff6f61", ouro: "#2a9d8f", escuro: "#3a1d17", padrao: "bokeh", icones: ["camara", "coracao"], musica: { tensao: "verao_calmo", epico: "verao_festa", leve: "verao_calmo" }, sons: { abertura: "onda", destaque: "brilho", festa: "vitoria" } }),
  T("podcast", "Podcast e Rádio", "Estúdio, ondas e no ar", ["Podcast", "Radio"], { fundo: ["#0e0907", "#1e140f", "#3a2216"], acento: "#ff8a3d", ouro: "#ffd166", padrao: "ondas", icones: ["microfone", "ondas"], musica: { tensao: "lofi_calmo", epico: "lofi_epico", leve: "lofi_calmo" }, sons: { abertura: "bip", destaque: "bip", festa: "vitoria" } }),
  T("business", "Negócios", "Gráficos, crescimento e lucro", ["Business"], { fundo: ["#06101f", "#0b1d38", "#12305c"], acento: "#2ecc71", ouro: "#f1c40f", padrao: "grelha", icones: ["grafico", "seta", "euro"], musica: { tensao: "tech_calmo", epico: "tech_epico", leve: "tech_calmo" }, sons: { abertura: "moeda", destaque: "moeda", festa: "vitoria" } }),
  T("girly", "Girly", "Rosa, brilhos e corações", ["Girly"], { claro: true, fundo: ["#ffc2dd", "#ffdcec", "#fff2f8"], acento: "#ff4fa3", ouro: "#a3127a", escuro: "#4a0d33", padrao: "pontos", icones: ["coracao", "estrela"], musica: { tensao: "musica_calmo", epico: "verao_festa", leve: "musica_calmo" }, sons: { abertura: "brilho", destaque: "brilho", festa: "vitoria" } }),
  T("escola", "Escola", "Quadro de giz e cadernos", ["Educação"], { fundo: ["#0c1f16", "#163a28", "#21503a"], acento: "#ffd166", ouro: "#ffffff", padrao: "giz", icones: ["lapis", "livro"], musica: { tensao: "tech_calmo", epico: "gelo_epico", leve: "tech_calmo" }, sons: { abertura: "ding", destaque: "ding", festa: "vitoria" } }),
  T("tutorial", "Tutorial", "Papel de planta e ferramentas", ["Tutorial"], { fundo: ["#07275e", "#0b3d91", "#1552b8"], acento: "#ffd166", ouro: "#ffffff", padrao: "quadriculado", icones: ["chave", "lapis"], musica: { tensao: "tech_calmo", epico: "tech_epico", leve: "tech_calmo" }, sons: { abertura: "bip", destaque: "ding", festa: "vitoria" } }),
  T("politica", "Política", "Hemiciclo, bandeiras e discursos", ["Política"], { fundo: ["#070e22", "#0f1d44", "#1b2f6b"], acento: "#3b7bff", ouro: "#f4c542", padrao: "diagonal", icones: ["bandeira", "estrela"], musica: { tensao: "gala_calmo", epico: "gala_epico", leve: "gala_calmo" }, sons: { abertura: "tambor", destaque: "tambor", festa: "vitoria" } }),
  T("noticias", "Notícias", "Estúdio e última hora", ["Notícias", "Reportagem"], { fundo: ["#050b18", "#0b1a33", "#16294d"], acento: "#e10600", ouro: "#ffffff", padrao: "noticias", icones: ["jornal", "globo"], musica: { tensao: "noticias_calmo", epico: "noticias_epico", leve: "noticias_calmo" }, sons: { abertura: "tambor", destaque: "bip", festa: "vitoria" } }),
  T("historia", "História", "Pergaminho, coroas e séculos", ["História"], { fundo: ["#140d05", "#2a1c0c", "#4a3317"], acento: "#c08a3e", ouro: "#f2d38a", padrao: "papel", icones: ["coroa", "bandeira"], musica: { tensao: "gala_calmo", epico: "gala_epico", leve: "gala_calmo" }, sons: { abertura: "tambor", destaque: "brilho", festa: "vitoria" } }),
  T("livros", "Livros", "Biblioteca e papel antigo", ["Livros"], { claro: true, fundo: ["#e6d2ab", "#f2e5c8", "#fbf5e6"], acento: "#8b4513", ouro: "#b8860b", escuro: "#3b2412", padrao: "papel", icones: ["livro"], musica: { tensao: "lofi_calmo", epico: "lofi_epico", leve: "lofi_calmo" }, sons: { abertura: "virar", destaque: "brilho", festa: "vitoria" } }),
  T("cinema", "Cinema", "Claquete, tapete e estrelas", ["Cinema"], { fundo: ["#070707", "#141010", "#2b0b0d"], acento: "#e50914", ouro: "#ffd700", padrao: "filme", icones: ["claquete", "estrela"], musica: { tensao: "gala_calmo", epico: "gala_epico", leve: "gala_calmo" }, sons: { abertura: "tambor", destaque: "brilho", festa: "vitoria" } }),
  T("fitness", "Fitness", "Ginásio, energia e suor", ["Fitness", "Corrida"], { fundo: ["#0a0a0a", "#171717", "#2a1200"], acento: "#ff4d00", ouro: "#c6ff00", padrao: "diagonal", icones: ["haltere"], musica: { tensao: "carros_tensao", epico: "estadio_epico", leve: "carros_tensao" }, sons: { abertura: "golpe", destaque: "golpe", festa: "vitoria" } }),
  T("reacts", "Reacts", "Emojis e reações", ["Reacts"], { fundo: ["#12061f", "#22093b", "#3d0f66"], acento: "#ffcc00", ouro: "#00e5ff", padrao: "pontos", icones: ["cara", "coracao", "estrela"], musica: { tensao: "comedia_leve", epico: "comedia_festa", leve: "comedia_leve" }, sons: { abertura: "boing", destaque: "boing", festa: "vitoria" } }),
  T("casa", "Casa", "Plantas, luz e conforto", ["Doméstico"], { claro: true, fundo: ["#cdebdc", "#e3f4ea", "#f4fbf7"], acento: "#2a9d8f", ouro: "#e76f51", escuro: "#123b33", padrao: "quadriculado", icones: ["casa", "planta"], musica: { tensao: "cozinha_calmo", epico: "cozinha_festa", leve: "cozinha_calmo" }, sons: { abertura: "ding", destaque: "ding", festa: "vitoria" } }),
  T("pesca", "Pesca", "Lago, peixes e calma", ["Pesca"], { fundo: ["#02223a", "#053b5c", "#0a6e8a"], acento: "#ffb703", ouro: "#8ecae6", padrao: "ondas", icones: ["peixe"], musica: { tensao: "verao_calmo", epico: "verao_festa", leve: "verao_calmo" }, sons: { abertura: "onda", destaque: "onda", festa: "vitoria" } }),
  T("animais", "Animais", "Natureza e patinhas", ["Animais"], { claro: true, fundo: ["#cfe8b8", "#e4f2d6", "#f4faee"], acento: "#6a994e", ouro: "#bc6c25", escuro: "#243b16", padrao: "bokeh", icones: ["pata"], musica: { tensao: "verao_calmo", epico: "verao_festa", leve: "verao_calmo" }, sons: { abertura: "ding", destaque: "boing", festa: "vitoria" } }),
  T("kids", "Kids", "Balões e cores primárias", ["Kids"], { claro: true, fundo: ["#a9d6ff", "#cbe7ff", "#eef7ff"], acento: "#ff006e", ouro: "#ffbe0b", escuro: "#14213d", padrao: "pontos", icones: ["balao", "estrela"], cores: ["#ff006e", "#ffbe0b", "#3a86ff", "#8338ec", "#06d6a0"], musica: { tensao: "comedia_leve", epico: "comedia_festa", leve: "comedia_leve" }, sons: { abertura: "boing", destaque: "powerup", festa: "vitoria" } }),
  T("ciencia", "Ciência", "Átomos, laboratório e luz", ["Física"], { fundo: ["#040818", "#0a1433", "#13235c"], acento: "#00d2ff", ouro: "#b388ff", padrao: "grelha", icones: ["atomo"], musica: { tensao: "espaco_calmo", epico: "espaco_epico", leve: "espaco_calmo" }, sons: { abertura: "laser", destaque: "estrela", festa: "vitoria" } }),
  T("danca", "Dança", "Pista, bola de espelhos e ritmo", ["Dança"], { fundo: ["#140020", "#2a0040", "#4d0070"], acento: "#ff2e93", ouro: "#ffd400", padrao: "raios", icones: ["nota", "estrela"], musica: { tensao: "musica_festa", epico: "musica_festa", leve: "musica_calmo" }, sons: { abertura: "revelar", destaque: "brilho", festa: "vitoria" } }),
  T("religiao", "Religião", "Luz, vitrais e silêncio", ["Religião"], { fundo: ["#0b0820", "#17123a", "#2a2160"], acento: "#ffd27f", ouro: "#fff1c1", padrao: "raios", icones: ["chama", "estrela"], musica: { tensao: "gelo_calmo", epico: "espaco_epico", leve: "gelo_calmo" }, sons: { abertura: "sino", destaque: "cristal", festa: "vitoria" } }),
  T("motas", "Motas", "Estrada, rodas e escape", ["Mota"], { fundo: ["#0b0b0c", "#18191c", "#2b1a0a"], acento: "#ff7a00", ouro: "#ffffff", padrao: "diagonal", icones: ["roda"], musica: { tensao: "carros_tensao", epico: "carros_corrida", leve: "carros_tensao" }, sons: { abertura: "motor", destaque: "motor", festa: "vitoria" } }),
  T("programacao", "Programação", "Terminal e código", ["Programação"], { fundo: ["#030806", "#07150f", "#0d2a1c"], acento: "#39ff88", ouro: "#ffffff", padrao: "quadriculado", icones: ["codigo"], musica: { tensao: "tech_calmo", epico: "tech_epico", leve: "tech_calmo" }, sons: { abertura: "bip", destaque: "bip", festa: "vitoria" } }),
];

/** Variáveis CSS do tema (aplicadas na tela do Palco). */
export function variaveis(t) {
  const [f0, f1, f2] = t.fundo;
  const a = t.acento;
  const o = t.ouro;
  if (t.claro) {
    const e = t.escuro || "#1d1a24";
    return {
      "--pt-fundo": `linear-gradient(180deg, ${f2} 0%, ${f1} 55%, ${f0} 100%)`,
      "--pt-painel": "rgba(255, 255, 255, 0.86)",
      "--pt-pontos": `color-mix(in srgb, ${a} 12%, transparent)`,
      "--pt-orbe1": `color-mix(in srgb, ${a} 22%, transparent)`,
      "--pt-orbe2": `color-mix(in srgb, ${o} 18%, transparent)`,
      "--pt-titulo": `linear-gradient(180deg, color-mix(in srgb, ${a} 75%, #fff) 0%, ${a} 55%, color-mix(in srgb, ${a} 60%, #000) 100%)`,
      "--pt-titulo-sombra": "drop-shadow(0 4px 0 #ffffff) drop-shadow(0 12px 22px rgba(0, 0, 0, 0.18))",
      "--pt-anel": "#ffffff",
      "--pt-ok": "#1f9d55",
      "--pt-mal": "#d64545",
      "--pt-flash": "#ffffff",
      "--dg-cor": `color-mix(in srgb, ${a} 18%, transparent)`,
      "--rubi": a,
      "--ouro": o,
      "--texto": e,
      "--texto-2": `color-mix(in srgb, ${e} 82%, transparent)`,
      "--texto-3": `color-mix(in srgb, ${e} 58%, transparent)`,
    };
  }
  return {
    "--pt-fundo": `radial-gradient(1300px 850px at 50% 0%, ${f2} 0%, ${f1} 52%, ${f0} 100%)`,
    "--pt-painel": `color-mix(in srgb, ${f0} 84%, transparent)`,
    "--pt-pontos": `color-mix(in srgb, ${a} 10%, transparent)`,
    "--pt-orbe1": `color-mix(in srgb, ${a} 26%, transparent)`,
    "--pt-orbe2": `color-mix(in srgb, ${o} 14%, transparent)`,
    "--pt-titulo": `linear-gradient(180deg, #ffffff 0%, color-mix(in srgb, ${a} 28%, #fff) 45%, ${a} 100%)`,
    "--pt-titulo-sombra": `drop-shadow(0 0 20px color-mix(in srgb, ${a} 50%, transparent)) drop-shadow(0 10px 26px rgba(0, 0, 0, 0.55))`,
    "--pt-anel": f0,
    "--pt-ok": "#4fe3a0",
    "--pt-mal": "#ff8a6b",
    "--pt-flash": "#ffffff",
    "--dg-cor": `color-mix(in srgb, ${a} 16%, transparent)`,
    "--rubi": a,
    "--ouro": o,
    "--texto": "#fbf7ff",
    "--texto-2": "rgba(245, 238, 250, 0.86)",
    "--texto-3": "rgba(235, 225, 245, 0.6)",
  };
}

const svgIcone = (nome, classe) => {
  const i = ICONES[nome] || ICONES.estrela;
  return `<svg class="${classe}" viewBox="0 0 24 24" aria-hidden="true"><path d="${i.d}" ${i.traco ? 'fill="none" stroke="currentColor" stroke-width="1.6"' : `fill="currentColor"${i.par ? ' fill-rule="evenodd"' : ""}`}/></svg>`;
};

/** Cenário dos temas gerados: padrão de fundo e dois ícones grandes a flutuar. */
export function cenarioGerado(t) {
  const [i1, i2] = [t.icones[0], t.icones[1] || t.icones[0]];
  const faixa = t.padrao === "noticias" ? `<div class="dg-faixa"><span>ÚLTIMA HORA · PLACAR DOS YOUTUBERS · OS NÚMEROS DO MÊS · ÚLTIMA HORA · PLACAR DOS YOUTUBERS · OS NÚMEROS DO MÊS · </span></div>` : "";
  return `<div class="dg-padrao p-${t.padrao}"></div>${svgIcone(i1, "dg-marca um")}${svgIcone(i2, "dg-marca dois")}${faixa}`;
}
