import { ATENCAO_PADRAO, CAPACITY_PADRAO } from "./constants";
import type { ConfigPainel } from "./types";

/**
 * Parâmetros que a operação edita direto no Smartsheet, na planilha
 * "Painel ITP | Configurações" — trocar o capacity não é mais uma alteração de
 * código: a tela relê a planilha sozinha e o novo valor entra em até um minuto.
 *
 * O valor fica guardado aqui no módulo para que as funções de cor e rótulo
 * continuem puras de um argumento; quem monta a tela lê o número pelo contexto
 * de dados (`useData()`), que é o que dispara a re-renderização.
 */
export const CONFIG_PADRAO: ConfigPainel = {
  capacity: CAPACITY_PADRAO,
  atencao: ATENCAO_PADRAO,
};

let atual: ConfigPainel = CONFIG_PADRAO;

export const configAtual = (): ConfigPainel => atual;

export const aplicarConfig = (c: ConfigPainel) => {
  atual = c;
};

/** Percentual válido para os cortes do painel; fora da faixa, vale o padrão. */
export const percentual = (v: unknown, padrao: number) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) && n > 0 && n <= 100 ? n : padrao;
};
