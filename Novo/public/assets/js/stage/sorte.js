// Sorte do Palco: as escolhas ao acaso dos espetáculos (critérios, ordem, roda…) passam por aqui.
// Com uma semente, a sorte repete-se igual: é assim que um exclusivo corre no site exatamente
// como correu no painel. Os efeitos (partículas, tremer) continuam com Math.random.

let gerador = null;

/** Liga a sorte com semente (mulberry32). */
export function semear(semente) {
  let s = semente >>> 0 || 1;
  gerador = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Volta à sorte normal. */
export function largar() {
  gerador = null;
}

export const novaSemente = () => (Math.random() * 2147483647) | 0;

export function aleatorio() {
  return gerador ? gerador() : Math.random();
}
