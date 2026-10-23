// Roteiro de um espetáculo: a intro, o espetáculo, as cenas extra (antes, a meio e depois) e o fim.
// Cada cena liga-se, desliga-se e muda de sítio no painel. O mesmo roteiro fica guardado nos
// exclusivos, para o site mostrar as mesmas cenas.

export const ONDES = {
  antes: "Antes do espetáculo",
  meio: "A meio do espetáculo",
  depois: "Depois do espetáculo",
};

export const CENAS = {
  votacao: { nome: "Votação a decorrer", icone: "🗳️", onde: "depois", texto: "Há uma votação aberta no site: a pergunta, quem entra, o link na bio e o código QR." },
  exclusivo: { nome: "Exclusivo no site", icone: "☆", onde: "depois", texto: "Há um exclusivo para ver no site: o título, o link e o código QR." },
  foco: { nome: "Youtuber em foco", icone: "★", onde: "depois", texto: "Onde ficou um Youtuber e os números dele. Nos jogos e duelos, ele entra de certeza." },
  lembrete: { nome: "Faixa Subscreve", icone: "🔔", onde: "meio", texto: "Uma faixa pequena por cima do espetáculo a lembrar de subscrever (não pára nada)." },
  titulo: { nome: "Texto teu", icone: "T", onde: "antes", texto: "Um título grande e uma frase, escritos por ti." },
  data: { nome: "Data dos números", icone: "📅", onde: "antes", texto: "De quando são os números (o mês e o dia)." },
  contagem: { nome: "Contagem 3, 2, 1", icone: "3", onde: "antes", texto: "Uma contagem decrescente antes de começar." },
  site: { nome: "Visita o site", icone: "🌐", onde: "depois", texto: "O endereço do site e o código QR: rankings, votações e exclusivos." },
  proximo: { nome: "No próximo vídeo", icone: "⏭", onde: "depois", texto: "Uma frase a anunciar o que vem a seguir." },
};

let seq = 0;
export function novaCena(tipo, cfg = {}, extra = {}) {
  return { id: `c${Date.now().toString(36)}${(seq++).toString(36)}`, tipo, onde: CENAS[tipo]?.onde || "depois", ligada: true, cfg, ...extra };
}

/** O roteiro de sempre: intro, faixa Subscreve a meio (nos vídeos) e o fim. */
export function roteiroPadrao({ modo = "video" } = {}) {
  return { intro: true, fim: true, cenas: modo === "video" ? [novaCena("lembrete")] : [] };
}

/** Uma linha a dizer o que a cena mostra (para a lista no painel). */
export function resumoCena(c, nomePessoa = (id) => id) {
  const g = c.cfg || {};
  if (c.tipo === "votacao") return g.titulo || "Escolhe a votação";
  if (c.tipo === "exclusivo") return g.titulo || "Escolhe o exclusivo";
  if (c.tipo === "foco") return g.pessoa ? nomePessoa(g.pessoa) : "Escolhe o Youtuber";
  if (c.tipo === "titulo") return g.titulo || "Escreve o texto";
  if (c.tipo === "proximo") return g.texto || "Escreve a frase";
  if (c.tipo === "data") return g.quando ? "Data da publicação" : "A data de hoje e o mês dos números";
  return CENAS[c.tipo]?.texto || "";
}

/** A cena precisa de ser configurada antes de poder correr? */
export function cenaPronta(c) {
  const g = c.cfg || {};
  if (c.tipo === "votacao") return Boolean(g.titulo);
  if (c.tipo === "exclusivo") return Boolean(g.titulo);
  if (c.tipo === "foco") return Boolean(g.pessoa);
  if (c.tipo === "titulo") return Boolean(g.titulo);
  if (c.tipo === "proximo") return Boolean(g.texto);
  return true;
}

/** Roteiro limpo (o que vem de fora: exclusivos guardados, endereço…). */
export function limparRoteiro(r) {
  if (!r || typeof r !== "object") return roteiroPadrao();
  const cenas = (Array.isArray(r.cenas) ? r.cenas : [])
    .filter((c) => c && CENAS[c.tipo] && ONDES[c.onde])
    .slice(0, 20)
    .map((c) => ({ id: String(c.id || "").slice(0, 30) || novaCena(c.tipo).id, tipo: c.tipo, onde: c.onde, ligada: c.ligada !== false, cfg: c.cfg && typeof c.cfg === "object" ? c.cfg : {} }));
  return { intro: r.intro !== false, fim: r.fim !== false, cenas };
}
