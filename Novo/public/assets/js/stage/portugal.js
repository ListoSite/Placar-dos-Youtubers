// Números de Portugal para as comparações das Curiosidades, todos com fonte:
//   - população residente a 31/12/2024: 10 749 635 (INE, estimativas de 2025);
//   - nados-vivos em 2024: 84 642 (INE);
//   - concelhos e distritos: Censos 2021 (INE; os 31 concelhos com mais gente, resultados provisórios);
//   - freguesia mais pequena do continente: Paradela e Granjinha, 99 residentes (Censos 2021);
//   - lotações: MEO Arena 20 100 em concertos; estádios pela lista de estádios de Portugal
//     (Dragão 50 033, Alvalade 52 095, Municipal de Braga 30 286; Luz arredondado a 65 mil);
//   - canal do Cristiano Ronaldo: 1 milhão de subscritores em 90 minutos (agosto de 2024).
// O mapa é um desenho simplificado (o contorno do continente e as ilhas em caixas à parte).

export const PORTUGUESES = 10749635;
export const NASCIMENTOS_ANO = 84642;
export const MINUTOS_POR_NASCIMENTO = (365.25 * 24 * 60) / NASCIMENTOS_ANO; // ≈ 6,2

// Concelhos (Censos 2021) com o distrito e a posição aproximada
export const CONCELHOS = [
  { nome: "Lisboa", pop: 544851, d: "Lisboa", lat: 38.72, lon: -9.14 },
  { nome: "Sintra", pop: 385954, d: "Lisboa", lat: 38.8, lon: -9.38 },
  { nome: "Vila Nova de Gaia", pop: 304149, d: "Porto", lat: 41.12, lon: -8.61 },
  { nome: "Porto", pop: 231962, d: "Porto", lat: 41.15, lon: -8.61, de: "do Porto", em: "no Porto" },
  { nome: "Cascais", pop: 214134, d: "Lisboa", lat: 38.7, lon: -9.42 },
  { nome: "Loures", pop: 201646, d: "Lisboa", lat: 38.83, lon: -9.17 },
  { nome: "Braga", pop: 193333, d: "Braga", lat: 41.55, lon: -8.42 },
  { nome: "Almada", pop: 177400, d: "Setúbal", lat: 38.68, lon: -9.16 },
  { nome: "Matosinhos", pop: 172669, d: "Porto", lat: 41.18, lon: -8.69 },
  { nome: "Oeiras", pop: 171802, d: "Lisboa", lat: 38.69, lon: -9.31 },
  { nome: "Amadora", pop: 171719, d: "Lisboa", lat: 38.75, lon: -9.23 },
  { nome: "Seixal", pop: 166693, d: "Setúbal", lat: 38.64, lon: -9.1 },
  { nome: "Gondomar", pop: 164255, d: "Porto", lat: 41.14, lon: -8.53 },
  { nome: "Guimarães", pop: 156852, d: "Braga", lat: 41.44, lon: -8.29 },
  { nome: "Odivelas", pop: 148156, d: "Lisboa", lat: 38.79, lon: -9.18 },
  { nome: "Coimbra", pop: 140796, d: "Coimbra", lat: 40.21, lon: -8.43 },
  { nome: "Vila Franca de Xira", pop: 137659, d: "Lisboa", lat: 38.95, lon: -8.99 },
  { nome: "Santa Maria da Feira", pop: 136720, d: "Aveiro", lat: 40.93, lon: -8.54 },
  { nome: "Maia", pop: 134959, d: "Porto", lat: 41.24, lon: -8.62, de: "da Maia", em: "na Maia" },
  { nome: "Vila Nova de Famalicão", pop: 133590, d: "Braga", lat: 41.41, lon: -8.52 },
  { nome: "Leiria", pop: 128640, d: "Leiria", lat: 39.74, lon: -8.81 },
  { nome: "Setúbal", pop: 123684, d: "Setúbal", lat: 38.52, lon: -8.89 },
  { nome: "Barcelos", pop: 116777, d: "Braga", lat: 41.53, lon: -8.62 },
  { nome: "Funchal", pop: 105919, d: "Madeira", lat: 32.65, lon: -16.91, ilha: "madeira", de: "do Funchal", em: "no Funchal" },
  { nome: "Viseu", pop: 99693, d: "Viseu", lat: 40.66, lon: -7.91 },
  { nome: "Valongo", pop: 94795, d: "Porto", lat: 41.19, lon: -8.5 },
  { nome: "Mafra", pop: 86523, d: "Lisboa", lat: 38.94, lon: -9.33 },
  { nome: "Viana do Castelo", pop: 85864, d: "Viana do Castelo", lat: 41.69, lon: -8.83 },
  { nome: "Paredes", pop: 84414, d: "Porto", lat: 41.21, lon: -8.33 },
  { nome: "Torres Vedras", pop: 83130, d: "Lisboa", lat: 39.09, lon: -9.26 },
  { nome: "Vila do Conde", pop: 80921, d: "Porto", lat: 41.35, lon: -8.74 },
  { nome: "Torre de Moncorvo", pop: 6822, d: "Bragança", lat: 41.17, lon: -7.05 },
  { nome: "Vila do Bispo", pop: 5722, d: "Faro", lat: 37.08, lon: -8.91 },
];

// Distritos e regiões autónomas (Censos 2021), com a capital no mapa
export const DISTRITOS = [
  { nome: "Lisboa", pop: 2275385, lat: 38.72, lon: -9.14, r: "Lisboa e Vale do Tejo" },
  { nome: "Porto", pop: 1785405, lat: 41.15, lon: -8.61, r: "Norte", de: "do Porto" },
  { nome: "Setúbal", pop: 874806, lat: 38.52, lon: -8.89, r: "Lisboa e Vale do Tejo" },
  { nome: "Braga", pop: 846293, lat: 41.55, lon: -8.42, r: "Norte" },
  { nome: "Aveiro", pop: 700787, lat: 40.64, lon: -8.65, r: "Centro" },
  { nome: "Faro", pop: 467343, lat: 37.02, lon: -7.93, r: "Algarve" },
  { nome: "Leiria", pop: 458605, lat: 39.74, lon: -8.81, r: "Centro" },
  { nome: "Santarém", pop: 424973, lat: 39.24, lon: -8.69, r: "Lisboa e Vale do Tejo" },
  { nome: "Coimbra", pop: 408551, lat: 40.21, lon: -8.43, r: "Centro" },
  { nome: "Viseu", pop: 351292, lat: 40.66, lon: -7.91, r: "Centro" },
  { nome: "Viana do Castelo", pop: 231266, lat: 41.69, lon: -8.83, r: "Norte" },
  { nome: "Vila Real", pop: 185695, lat: 41.3, lon: -7.74, r: "Norte" },
  { nome: "Castelo Branco", pop: 177962, lat: 39.82, lon: -7.49, r: "Centro" },
  { nome: "Évora", pop: 152444, lat: 38.57, lon: -7.91, r: "Alentejo" },
  { nome: "Beja", pop: 144401, lat: 38.01, lon: -7.86, r: "Alentejo" },
  { nome: "Guarda", pop: 142974, lat: 40.54, lon: -7.27, r: "Centro", de: "da Guarda" },
  { nome: "Bragança", pop: 122804, lat: 41.81, lon: -6.76, r: "Norte" },
  { nome: "Portalegre", pop: 104923, lat: 39.29, lon: -7.43, r: "Alentejo" },
  { nome: "Madeira", pop: 250744, lat: 32.65, lon: -16.91, r: "Ilhas", ilha: "madeira", de: "da Madeira", regiao: true },
  { nome: "Açores", pop: 236413, lat: 37.74, lon: -25.67, r: "Ilhas", ilha: "acores", de: "dos Açores", regiao: true },
];
export const NORTE = new Set(["Norte", "Centro"]);

/** "de Lisboa", "do Porto", "da Madeira". */
export const deLugar = (x) => x.de || `de ${x.nome}`;
export const emLugar = (x) => x.em || `em ${x.nome}`;

const semAcentos = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
const ALIAS_LUGAR = [
  [/\b(lisbon|lisboa)\b/, "Lisboa"],
  [/\b(oporto|porto)\b/, "Porto"],
  [/\b(madeira|funchal)\b/, "Madeira"],
  [/\b(acores|azores|ponta delgada|terceira|sao miguel|angra do heroismo|horta)\b/, "Açores"],
  [/\balgarve\b/, "Faro"],
];

/** O distrito (ou região autónoma) de uma localidade escrita à mão, ou null. */
export function distritoDe(local) {
  const t = semAcentos(local);
  if (!t || /\b(brasil|brazil|angola|mocambique|cabo verde|france|franca|suica|reino unido|uk|espanha|spain)\b/.test(t)) return null;
  for (const [re, d] of ALIAS_LUGAR) if (re.test(t)) return DISTRITOS.find((x) => x.nome === d);
  for (const c of CONCELHOS) if (new RegExp(`\\b${semAcentos(c.nome)}\\b`).test(t)) return DISTRITOS.find((x) => x.nome === c.d);
  for (const d of DISTRITOS) if (new RegExp(`\\b${semAcentos(d.nome)}\\b`).test(t)) return d;
  return null;
}

// ---------- O mapa ----------
// O contorno do continente, simplificado (latitude, longitude)
const CONTORNO = [
  [41.87, -8.87], [42.05, -8.65], [42.15, -8.2], [41.93, -8.05], [41.86, -7.7], [41.97, -7.2], [41.98, -6.6], [41.67, -6.19], [41.5, -6.3], [41.03, -6.93],
  [40.75, -6.85], [40.3, -6.85], [40.02, -7.0], [39.66, -7.53], [39.45, -7.3], [39.0, -7.03], [38.85, -7.1], [38.45, -7.3], [38.2, -6.95], [37.95, -7.25],
  [37.5, -7.5], [37.18, -7.42], [37.0, -7.9], [37.1, -8.6], [37.0, -8.95], [37.4, -8.8], [37.95, -8.88], [38.42, -9.2], [38.78, -9.5], [39.35, -9.4],
  [39.6, -9.08], [40.15, -8.87], [40.65, -8.75], [41.15, -8.68], [41.7, -8.85],
];
const ILHAS = { acores: [52, 300], madeira: [52, 392] };
/** Posição no mapa (viewBox 0 0 470 630); as ilhas ficam nas caixas à esquerda, longe da costa. */
export function noMapa({ lat, lon, ilha }) {
  if (ilha) return ILHAS[ilha];
  return [Math.round(((lon + 9.75) * 86 + 130) * 10) / 10, Math.round(((42.3 - lat) * 113 + 10) * 10) / 10];
}
export const CONTORNO_PATH = `M${CONTORNO.map((p) => noMapa({ lat: p[0], lon: p[1] }).join(" ")).join("L")}Z`;
export const CAIXAS_ILHAS = [
  { id: "acores", nome: "Açores", x: 8, y: 270, w: 88, h: 60 },
  { id: "madeira", nome: "Madeira", x: 8, y: 362, w: 88, h: 60 },
];
