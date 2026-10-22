// Temas do Palco: cores, cenário, partículas, música e sons de cada ambiente.
//
// As cores de cada tema estão no palco.css (classe .tema-<id>). Aqui ficam o nome, a amostra
// para o menu, o tipo de partículas, as músicas (calma, ação e leve) e os sons de destaque.

export const TEMAS = [
  {
    id: "rubi",
    nome: "Clássico",
    texto: "O vermelho do Placar",
    amostra: ["#6a1029", "#e0294f", "#f4b942"],
    particulas: "poeira",
    festa: "confetes",
    cores: ["#f4b942", "#ffd77a", "#e0294f", "#ffffff", "#ff8199"],
    musica: { tensao: "tensao", epico: "epico", leve: "leve" },
    sons: { abertura: "revelar", destaque: "brilho", festa: "vitoria" },
  },
  {
    id: "verao",
    nome: "Verão",
    texto: "Pôr do sol, mar e ritmo de praia",
    amostra: ["#ff7a59", "#ffc857", "#19b6c9"],
    particulas: "bolhas",
    festa: "confetes",
    cores: ["#ffc857", "#ff7a59", "#19b6c9", "#ffffff", "#ff4f8b", "#7be0ad"],
    musica: { tensao: "verao_calmo", epico: "verao_festa", leve: "verao_calmo" },
    sons: { abertura: "onda", destaque: "brilho", festa: "vitoria" },
  },
  {
    id: "inferno",
    nome: "Inferno",
    texto: "Chamas, brasas e peso",
    amostra: ["#1a0302", "#ff3d00", "#ffb300"],
    particulas: "brasas",
    festa: "faiscas",
    cores: ["#ffb300", "#ff6d00", "#ff3d00", "#ffe082", "#d50000"],
    musica: { tensao: "inferno_tensao", epico: "inferno_fogo", leve: "inferno_tensao" },
    sons: { abertura: "fogo", destaque: "fogo", festa: "ko" },
  },
  {
    id: "gelo",
    nome: "Gelo",
    texto: "Neve, aurora e cristais",
    amostra: ["#06182e", "#5ad1ff", "#e6f7ff"],
    particulas: "neve",
    festa: "neve",
    cores: ["#e6f7ff", "#5ad1ff", "#9be7ff", "#ffffff", "#7c9cff"],
    musica: { tensao: "gelo_calmo", epico: "gelo_epico", leve: "gelo_calmo" },
    sons: { abertura: "cristal", destaque: "cristal", festa: "vitoria" },
  },
  {
    id: "neon",
    nome: "Neon",
    texto: "Anos 80, grelha e luzes",
    amostra: ["#14002b", "#ff2bd6", "#00e5ff"],
    particulas: "neon",
    festa: "neon",
    cores: ["#ff2bd6", "#00e5ff", "#ffe600", "#b26bff", "#ffffff"],
    musica: { tensao: "neon_calmo", epico: "neon_corrida", leve: "neon_calmo" },
    sons: { abertura: "laser", destaque: "laser", festa: "vitoria" },
  },
  {
    id: "espaco",
    nome: "Galáxia",
    texto: "Estrelas, nebulosas e planetas",
    amostra: ["#05031a", "#7c5cff", "#38d9ff"],
    particulas: "estrelas",
    festa: "estrelas",
    cores: ["#ffffff", "#b9a8ff", "#38d9ff", "#ffd9fb", "#7c5cff"],
    musica: { tensao: "espaco_calmo", epico: "espaco_epico", leve: "espaco_calmo" },
    sons: { abertura: "estrela", destaque: "estrela", festa: "vitoria" },
  },
  {
    id: "gala",
    nome: "Gala",
    texto: "Cortinas, holofotes e ouro",
    amostra: ["#0d0806", "#c9a227", "#7a0f1f"],
    particulas: "brilhos",
    festa: "ouro",
    cores: ["#f7d774", "#c9a227", "#fff3c4", "#ffffff", "#e8b84a"],
    musica: { tensao: "gala_calmo", epico: "gala_epico", leve: "gala_calmo" },
    sons: { abertura: "brilho", destaque: "brilho", festa: "vitoria" },
  },
  {
    id: "estadio",
    nome: "Estádio",
    texto: "Relvado, holofotes e bancada",
    amostra: ["#062312", "#2ee66b", "#ffffff"],
    particulas: "flashes",
    festa: "confetes",
    cores: ["#2ee66b", "#ffffff", "#ffe14d", "#18a34a", "#e8fff0"],
    musica: { tensao: "estadio_calmo", epico: "estadio_epico", leve: "estadio_calmo" },
    sons: { abertura: "buzina", destaque: "multidao", festa: "multidao" },
  },
];

export function tema(id) {
  return TEMAS.find((t) => t.id === id) || TEMAS[0];
}

/** Cenário de cada tema (desenhado em CSS no palco.css). */
export function cenario(id) {
  const ondas = (n) => `<svg class="dc-onda dc-onda-${n}" viewBox="0 0 1600 200" preserveAspectRatio="none" aria-hidden="true"><path d="M0 80 C 200 20, 400 140, 600 80 S 1000 20, 1200 80 S 1400 140, 1600 80 V200 H0Z"/></svg>`;
  const palmeira = (lado) => `<svg class="dc-palmeira ${lado}" viewBox="0 0 300 500" aria-hidden="true"><path d="M150 500 C 140 380, 160 260, 140 160" stroke="currentColor" stroke-width="18" fill="none" stroke-linecap="round"/><path d="M140 160 C 80 120, 30 140, 0 190 C 50 150, 100 150, 140 170Z M140 160 C 200 110, 260 120, 300 170 C 250 140, 190 140, 142 168Z M140 160 C 110 90, 60 60, 10 70 C 70 80, 110 110, 138 165Z M140 160 C 170 80, 230 50, 290 60 C 230 70, 180 110, 143 165Z M140 160 C 140 90, 160 40, 200 10 C 170 50, 155 100, 146 162Z" fill="currentColor"/></svg>`;
  const html = {
    rubi: ``,
    verao: `<div class="dc-sol"><i></i></div>${ondas(1)}${ondas(2)}${ondas(3)}${palmeira("esq")}${palmeira("dir")}`,
    inferno: `<div class="dc-chamas">${Array.from({ length: 14 }, (_, i) => `<i style="--i:${i}"></i>`).join("")}</div><div class="dc-calor"></div>`,
    gelo: `<div class="dc-aurora"><i></i><i></i><i></i></div><svg class="dc-montanhas" viewBox="0 0 1600 300" preserveAspectRatio="none" aria-hidden="true"><path d="M0 300 L0 210 L160 120 L280 190 L420 60 L560 180 L700 110 L860 230 L1000 90 L1160 200 L1300 130 L1460 220 L1600 150 L1600 300Z"/><path class="neve-topo" d="M420 60 L470 100 L440 96 L420 112 L395 92 L370 104Z M1000 90 L1046 126 L1016 122 L998 136 L975 118 L952 128Z"/></svg><div class="dc-gelo-cantos"></div>`,
    neon: `<div class="dc-sol-retro"></div><div class="dc-grelha"><i></i></div><div class="dc-linhas"></div>`,
    espaco: `<div class="dc-nebulosa"><i></i><i></i></div><div class="dc-planeta"><i></i></div>`,
    gala: `<div class="dc-holofotes"><i></i><i></i><i></i></div><div class="dc-cortina esq"></div><div class="dc-cortina dir"></div><div class="dc-chao"></div>`,
    estadio: `<div class="dc-relvado"><i></i></div><div class="dc-torres"><i></i><i></i></div><div class="dc-bancada"></div>`,
  }[id];
  return html || "";
}
