import { norm } from "./format";
import type { PlanoRow } from "./types";

/**
 * Mapa estratégico — mesmo desenho do dashboard da Premazon.
 *
 * O conteúdo não é fixo no código: as faixas e os objetivos saem do próprio
 * Plano Estratégico ITP, que já traz as colunas `Perspectiva` e `Objetivo
 * Estratégico`. Assim o mapa nasce coerente com o que está sendo executado, em
 * vez de virar um segundo cadastro que envelhece sozinho.
 *
 * Missão, visão e valores não existem em planilha nenhuma: começam com um texto
 * de exemplo e são editados na tela.
 */

export type CartaoMVV = { lbl: string; ico: IconeId; bg: string; txt: string };
export type Perspectiva = {
  nome: string;
  ico: IconeId;
  cor: string;
  claro: string;
  objs: string[];
};
export type MapaDados = { mvv: CartaoMVV[]; persp: Perspectiva[] };

export type IconeId =
  | "missao"
  | "visao"
  | "valores"
  | "lideranca"
  | "financas"
  | "mercado"
  | "processos"
  | "pessoas";

/** Máximo de objetivos por faixa — acima disso os cards ficam ilegíveis. */
export const MAX_OBJETIVOS = 4;

const CHAVE = "itpMapa";

/** Missão, visão e valores: texto de partida, para ser editado na tela. */
const MVV_PADRAO: CartaoMVV[] = [
  {
    lbl: "MISSÃO",
    ico: "missao",
    bg: "#D9D9D9",
    txt: "Descreva aqui a razão de existir da operação — o que a IT Protect faz, para quem e com que padrão. Dê um duplo clique neste card para editar.",
  },
  {
    lbl: "VISÃO",
    ico: "visao",
    bg: "#FFCC80",
    txt: "Descreva aqui onde a operação quer chegar no horizonte do planejamento, de forma verificável. Dê um duplo clique neste card para editar.",
  },
  {
    lbl: "VALORES",
    ico: "valores",
    bg: "#3EABE1",
    txt: "Liste aqui os valores que orientam as decisões do time. Dê um duplo clique neste card para editar.",
  },
];

/**
 * Aparência de cada perspectiva do BSC, na ordem canônica. A planilha numera as
 * perspectivas ("2. Finanças"), então é o número que escolhe a cor — mudar o
 * nome não quebra o visual.
 */
const APARENCIA: { chave: string; ico: IconeId; cor: string; claro: string }[] = [
  { chave: "1", ico: "lideranca", cor: "#FD577A", claro: "#FECBD6" },
  { chave: "2", ico: "financas", cor: "#69A675", claro: "#D9E7DC" },
  { chave: "3", ico: "mercado", cor: "#60C9FD", claro: "#D7F0FC" },
  { chave: "4", ico: "processos", cor: "#F4BB66", claro: "#FFEFD8" },
  { chave: "5", ico: "pessoas", cor: "#F49066", claro: "#FBDDD0" },
];

/** Aparência pela numeração da perspectiva; cai na ordem quando não há número. */
function aparenciaDe(nome: string, i: number) {
  const num = nome.trim().charAt(0);
  return APARENCIA.find((a) => a.chave === num) ?? APARENCIA[i % APARENCIA.length];
}

/** Tira o prefixo numérico do rótulo ("2. Finanças" → "Finanças"). */
function semPrefixo(s: string): string {
  return s.replace(/^\s*\d+(\.\d+)*[.)]?\s*/, "").trim();
}

/**
 * Monta o mapa a partir do plano: cada perspectiva vira uma faixa e cada
 * objetivo estratégico distinto dela vira um card.
 */
export function mapaDoPlano(plano: PlanoRow[]): MapaDados {
  const porPerspectiva = new Map<string, string[]>();
  const ordem: string[] = [];

  plano.forEach((r) => {
    const p = (r.perspectiva || "").trim();
    if (!p || p === "—") return;
    if (!porPerspectiva.has(p)) {
      porPerspectiva.set(p, []);
      ordem.push(p);
    }
    const obj = semPrefixo(r.objetivo || "");
    if (!obj || r.objetivo === "—") return;
    const lista = porPerspectiva.get(p)!;
    if (!lista.some((o) => norm(o) === norm(obj))) lista.push(obj);
  });

  ordem.sort((a, b) => a.localeCompare(b, "pt-BR"));

  const persp: Perspectiva[] = ordem.map((nome, i) => {
    const ap = aparenciaDe(nome, i);
    return {
      nome: semPrefixo(nome) || nome,
      ico: ap.ico,
      cor: ap.cor,
      claro: ap.claro,
      objs: (porPerspectiva.get(nome) ?? []).slice(0, MAX_OBJETIVOS),
    };
  });

  return { mvv: MVV_PADRAO.map((m) => ({ ...m })), persp };
}

/** O que está salvo no navegador, se houver. */
export function mapaSalvo(): MapaDados | null {
  if (typeof window === "undefined") return null;
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return null;
    const d = JSON.parse(bruto) as MapaDados;
    if (!Array.isArray(d?.mvv) || !Array.isArray(d?.persp)) return null;
    return d;
  } catch {
    return null;
  }
}

export function salvarMapa(d: MapaDados): void {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(d));
  } catch {
    /* modo privado: a edição vale só enquanto a aba estiver aberta */
  }
}

export function limparMapa(): void {
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    /* idem */
  }
}
