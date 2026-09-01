import { NextResponse } from "next/server";

import { carregarTimesheet } from "@/lib/smartsheet";

/**
 * Um minuto: perto o bastante do ao vivo para uma edição na planilha aparecer
 * sozinha, e ainda assim uma leitura só do Smartsheet para todos que abrirem
 * a página nesse intervalo.
 */
const REVALIDATE = 60;

// O relatório tem dezenas de milhares de linhas; a leitura precisa de folga.
export const maxDuration = 60;

/**
 * `?fresh=1` ignora qualquer cache e lê o Smartsheet na hora — é o que o botão
 * "Atualizar" do cabeçalho usa quando alguém acabou de mexer na planilha.
 */
export async function GET(req: Request) {
  const fresh = new URL(req.url).searchParams.get("fresh") === "1";
  try {
    const dados = await carregarTimesheet(fresh ? 0 : REVALIDATE);
    return NextResponse.json(dados, {
      headers: {
        "Cache-Control": fresh
          ? "no-store"
          : `public, s-maxage=${REVALIDATE}, stale-while-revalidate=300`,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Falha ao ler o Smartsheet:", msg);
    // O dashboard cai para os dados embutidos quando esta rota falha.
    return NextResponse.json({ erro: msg }, { status: 502 });
  }
}
