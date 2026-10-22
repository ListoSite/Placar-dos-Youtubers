// Onde estamos: no painel (controlo) ou na página pública. As páginas de dados servem as duas,
// mas na pública só aparece o que estiver ligado no painel (cfg) e nunca há ligações para o painel.

export const modo = { publico: false, cfg: null };

/** Na página pública: está ligado no painel? (no painel tudo está ligado) */
export function ligado(caminho, def = true) {
  if (!modo.publico) return true;
  let v = modo.cfg;
  for (const k of caminho.split(".")) v = v?.[k];
  return v === undefined ? def : Boolean(v);
}
