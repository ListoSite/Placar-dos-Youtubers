// Coisas do mundo real para comparar com os números dos Youtubers (temas Empilhados, De mãos dadas,
// Contra os gigantes do mundo, Mais gente do que… e À portuguesa). Todas com fonte e data:
//   - canais: tabela dos mais subscritos (aifreeforever.com, dados do YouTube arredondados, 28/10/2026);
//     o MrBeast foi o primeiro a chegar aos 500 milhões, a 12/06/2026;
//   - vídeos mais vistos: Epidemic Sound, lista atualizada a 27/10/2026;
//   - sócios: Benfica 392 202 (fev. 2025, A Bola), FC Porto 131 037 (set. 2024, DN),
//     Sporting 110 mil sócios pagantes (jun. 2024, A Bola);
//   - NOS Alive 2026: cerca de 160 mil pessoas em 3 dias (Forbes Portugal, 13/07/2026);
//   - Fátima: cerca de 6,5 milhões de peregrinos em 2025 (Santuário de Fátima);
//   - turistas: 29,9 milhões em 2025; dormidas: 82 milhões em 2025 (INE);
//   - aeroportos em 2025: 73,75 milhões de passageiros, Lisboa 36,1 milhões, Faro 10,4 milhões (INE);
//   - Carris Metropolitana: 194 milhões de passageiros em 2025 (Sábado);
//   - Pastéis de Belém: em média 20 mil por dia (Forbes Portugal);
//   - salário mínimo em 2026: 920 € (DECO PROteste);
//   - Euromilhões: 5 números de 50 e 2 estrelas de 12 = 139 838 160 chaves diferentes;
//   - alturas: baliza 2,44 m (Leis do Jogo), Torre de Belém 30 m, Elevador de Santa Justa 45 m,
//     Torre dos Clérigos 75,6 m, Cristo Rei 110 m com a base (82 m + 28 m da estátua),
//     Torre Vasco da Gama 145 m, torres da Ponte 25 de Abril 190 m, Torre Eiffel 330 m,
//     Burj Khalifa 828 m, Torre da Serra da Estrela 1 993 m, Montanha do Pico 2 351 m,
//     Evereste 8 849 m, aviões a uns 11 km, o espaço a 100 km (linha de Kármán), a Estação
//     Espacial Internacional a uns 400 km e a Lua a 384 400 km;
//   - espessuras: uma folha de papel A4 normal tem cerca de 0,1 mm; uma moeda de 1 cêntimo tem
//     1,67 mm (Banco Central Europeu);
//   - distâncias: Ponte 25 de Abril 2 277 m, Ponte Vasco da Gama 12,3 km, Estrada Nacional 2 739 km,
//     volta à Terra pelo equador 40 075 km; as outras são em linha reta desde a Praça do Comércio,
//     calculadas pelas coordenadas;
//   - de mãos dadas e braços abertos, cada pessoa ocupa cerca de 1,5 m (uma aproximação).

export const DATA_MUNDO = "outubro de 2026";

// ---------- Os gigantes do YouTube ----------
export const CANAIS_GIGANTES = [
  { id: "mrbeast", nome: "MrBeast", ic: "🦁", v: 524e6, nota: "o maior canal do mundo" },
  { id: "tseries", nome: "T-Series", ic: "🎵", v: 316e6, nota: "a editora de música indiana" },
  { id: "cocomelon", nome: "Cocomelon", ic: "🍉", v: 203e6, nota: "as canções para bebés" },
  { id: "pewdiepie", nome: "PewDiePie", ic: "🎮", v: 109e6, nota: "o Youtuber que foi o maior durante anos" },
  { id: "blackpink", nome: "BLACKPINK", ic: "🎤", v: 101e6, nota: "o grupo de K-pop" },
];
export const VIDEOS_GIGANTES = [
  { id: "babyshark", nome: "Baby Shark Dance", ic: "🦈", v: 17.49e9, nota: "o vídeo mais visto de sempre" },
  { id: "despacito", nome: "Despacito", ic: "💃", v: 9.16e9, nota: "do Luis Fonsi" },
  { id: "seeyouagain", nome: "See You Again", ic: "🚗", v: 7.12e9, nota: "do Wiz Khalifa" },
  { id: "shapeofyou", nome: "Shape of You", ic: "🎸", v: 6.83e9, nota: "do Ed Sheeran" },
  { id: "axelf", nome: "Axel F (Crazy Frog)", ic: "🐸", v: 6.26e9, nota: "o sapo da mota" },
];

// ---------- Portugal em gente (para comparar com subscritores) ----------
export const GENTE_PT = [
  { id: "sporting", vs: "o Sporting", t: "os sócios pagantes do Sporting", nome: "Sócios pagantes do Sporting", curto: "Sporting", ic: "🦁", v: 110000, nota: "2024" },
  { id: "porto", vs: "o FC Porto", t: "os sócios do FC Porto", nome: "Sócios do FC Porto", curto: "FC Porto", ic: "🐉", v: 131037, nota: "2024" },
  { id: "alive", vs: "o NOS Alive", t: "o público dos 3 dias do NOS Alive", nome: "Público do NOS Alive (3 dias)", curto: "NOS Alive", ic: "🎸", v: 160000, nota: "2026" },
  { id: "benfica", vs: "o Benfica", t: "os sócios do Benfica", nome: "Sócios do Benfica", curto: "Benfica", ic: "🦅", v: 392202, nota: "2025" },
  { id: "fatima", vs: "Fátima", t: "os peregrinos que vão a Fátima num ano", nome: "Peregrinos em Fátima num ano", curto: "Fátima", ic: "🕯️", v: 6.5e6, nota: "2025" },
  { id: "faro", vs: "o aeroporto de Faro", t: "os passageiros do aeroporto de Faro num ano", nome: "Passageiros do aeroporto de Faro num ano", curto: "Aeroporto de Faro", ic: "✈️", v: 10.4e6, nota: "2025" },
  { id: "turistas", vs: "os turistas", t: "os turistas que vêm a Portugal num ano", nome: "Turistas em Portugal num ano", curto: "Turistas", ic: "🧳", v: 29.9e6, nota: "2025" },
  { id: "lisboa", vs: "o aeroporto de Lisboa", t: "os passageiros do aeroporto de Lisboa num ano", nome: "Passageiros do aeroporto de Lisboa num ano", curto: "Aeroporto de Lisboa", ic: "🛫", v: 36.1e6, nota: "2025" },
  { id: "aeroportos", vs: "os aeroportos", t: "os passageiros de todos os aeroportos portugueses num ano", nome: "Passageiros em todos os aeroportos num ano", curto: "Aeroportos", ic: "🌍", v: 73.75e6, nota: "2025" },
  { id: "dormidas", vs: "os hotéis", t: "as noites passadas em hotéis e alojamentos num ano", nome: "Noites em hotéis e alojamentos num ano", curto: "Dormidas", ic: "🛏️", v: 82e6, nota: "2025" },
  { id: "carris", vs: "a Carris Metropolitana", t: "as viagens de um ano na Carris Metropolitana", nome: "Viagens na Carris Metropolitana num ano", curto: "Carris Metropolitana", ic: "🚌", v: 194e6, nota: "2025" },
];

// ---------- À portuguesa ----------
export const PASTEIS_DIA = 20000;
export const SALARIO_MINIMO = 920;
export const EUROMILHOES = 139838160;

// ---------- Alturas (metros) ----------
export const ALTURAS = [
  { nome: "Uma baliza de futebol", t: "uma baliza de futebol", de: "de uma baliza", ic: "🥅", m: 2.44 },
  { nome: "Torre de Belém", t: "a Torre de Belém", de: "da Torre de Belém", ic: "🏰", m: 30 },
  { nome: "Elevador de Santa Justa", t: "o Elevador de Santa Justa", de: "do Elevador de Santa Justa", ic: "🛗", m: 45 },
  { nome: "Torre dos Clérigos", t: "a Torre dos Clérigos", de: "da Torre dos Clérigos", ic: "🗼", m: 75.6 },
  { nome: "Cristo Rei", t: "o Cristo Rei", de: "do Cristo Rei", ic: "✝️", m: 110 },
  { nome: "Torre Vasco da Gama", t: "a Torre Vasco da Gama", de: "da Torre Vasco da Gama", ic: "🏙️", m: 145 },
  { nome: "Torres da Ponte 25 de Abril", t: "as torres da Ponte 25 de Abril", de: "das torres da Ponte 25 de Abril", ic: "🌉", m: 190 },
  { nome: "Torre Eiffel", t: "a Torre Eiffel", de: "da Torre Eiffel", ic: "🇫🇷", m: 330 },
  { nome: "Burj Khalifa", t: "o Burj Khalifa, o prédio mais alto do mundo", de: "do Burj Khalifa", ic: "🏢", m: 828 },
  { nome: "Serra da Estrela", t: "a Serra da Estrela", de: "da Serra da Estrela", ic: "⛰️", m: 1993 },
  { nome: "Montanha do Pico", t: "a Montanha do Pico, o ponto mais alto de Portugal", de: "da Montanha do Pico", ic: "🌋", m: 2351 },
  { nome: "Evereste", t: "o Evereste", de: "do Evereste", ic: "🏔️", m: 8849 },
  { nome: "Os aviões", t: "os aviões, que voam a uns 11 km", de: "a que voam os aviões", ic: "✈️", m: 11000 },
  { nome: "Onde começa o espaço", t: "a linha onde começa o espaço (100 km)", de: "a que começa o espaço", ic: "🚀", m: 100000 },
  { nome: "Estação Espacial", t: "a Estação Espacial Internacional", de: "da Estação Espacial", ic: "🛰️", m: 400000 },
  { nome: "A Lua", t: "a Lua", de: "da Lua", ic: "🌕", m: 384400000 },
];
export const FOLHA_M = 0.0001;
export const MOEDA_M = 0.00167;

// ---------- Distâncias (km) ----------
export const DISTANCIAS = [
  { nome: "Ponte 25 de Abril", inf: "atravessar a Ponte 25 de Abril", ic: "🌉", km: 2.277, frase: "atravessavam a Ponte 25 de Abril" },
  { nome: "Ponte Vasco da Gama", inf: "atravessar a Ponte Vasco da Gama", ic: "🌁", km: 12.3, frase: "atravessavam a Ponte Vasco da Gama" },
  { nome: "Lisboa → Sintra", inf: "ir de Lisboa a Sintra", ic: "🏯", km: 23.8, frase: "iam de Lisboa a Sintra" },
  { nome: "Lisboa → Évora", inf: "ir de Lisboa a Évora", ic: "🏛️", km: 107, frase: "iam de Lisboa a Évora" },
  { nome: "Lisboa → Coimbra", inf: "ir de Lisboa a Coimbra", ic: "🎓", km: 178, frase: "iam de Lisboa a Coimbra" },
  { nome: "Lisboa → Porto", inf: "ir de Lisboa ao Porto", ic: "🌉", km: 275, frase: "iam de Lisboa ao Porto" },
  { nome: "Lisboa → Bragança", inf: "ir de Lisboa a Bragança", ic: "🏰", km: 399, frase: "iam de Lisboa a Bragança" },
  { nome: "Lisboa → Madrid", inf: "ir de Lisboa a Madrid", ic: "🇪🇸", km: 503, frase: "iam de Lisboa a Madrid" },
  { nome: "Estrada Nacional 2", inf: "fazer a Estrada Nacional 2 toda", ic: "🛣️", km: 739, frase: "faziam a Estrada Nacional 2 de ponta a ponta" },
  { nome: "Lisboa → Funchal", inf: "ir de Lisboa ao Funchal", ic: "🌺", km: 972, frase: "iam de Lisboa ao Funchal" },
  { nome: "Lisboa → Paris", inf: "ir de Lisboa a Paris", ic: "🇫🇷", km: 1454, frase: "iam de Lisboa a Paris" },
  { nome: "Lisboa → Londres", inf: "ir de Lisboa a Londres", ic: "🇬🇧", km: 1586, frase: "iam de Lisboa a Londres" },
  { nome: "Lisboa → Berlim", inf: "ir de Lisboa a Berlim", ic: "🇩🇪", km: 2313, frase: "iam de Lisboa a Berlim" },
  { nome: "Lisboa → Nova Iorque", inf: "chegar a Nova Iorque", ic: "🗽", km: 5423, frase: "atravessavam o Atlântico até Nova Iorque" },
  { nome: "Lisboa → Rio de Janeiro", inf: "chegar ao Rio de Janeiro", ic: "🇧🇷", km: 7714, frase: "iam de Lisboa ao Rio de Janeiro" },
  { nome: "Lisboa → Tóquio", inf: "chegar a Tóquio", ic: "🗾", km: 11144, frase: "iam de Lisboa a Tóquio" },
  { nome: "Volta à Terra", inf: "dar a volta à Terra", ic: "🌍", km: 40075, frase: "davam a volta à Terra" },
  { nome: "Até à Lua", inf: "chegar à Lua", ic: "🌕", km: 384400, frase: "chegavam à Lua" },
];
export const PESSOA_M = 1.5;

/** "75,6 m", "488 m", "1,99 km", "16,7 km", "384 400 km". */
export function altura(m) {
  const n = (x, c) => x.toLocaleString("pt-PT", { maximumFractionDigits: c });
  if (m < 1) return `${n(m * 100, 0)} cm`;
  if (m < 100) return `${n(m, 1)} m`;
  if (m < 1000) return `${n(m, 0)} m`;
  const km = m / 1000;
  return `${n(km, km < 10 ? 2 : km < 100 ? 1 : 0)} km`;
}
/** "1,5 km", "275 km", "7 320 km". */
export const distancia = (km) => altura(km * 1000);
