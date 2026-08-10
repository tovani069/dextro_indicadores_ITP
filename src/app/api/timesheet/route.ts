import { NextResponse } from "next/server";

import { carregarTimesheet } from "@/lib/smartsheet";

/** Meia hora: o Smartsheet é atualizado ao longo do dia, não a cada segundo. */
const REVALIDATE = 1800;

// O relatório tem dezenas de milhares de linhas; a leitura precisa de folga.
export const maxDuration = 60;
export const revalidate = 1800;

export async function GET() {
  try {
    const dados = await carregarTimesheet(REVALIDATE);
    return NextResponse.json(dados, {
      headers: {
        "Cache-Control": `public, s-maxage=${REVALIDATE}, stale-while-revalidate=3600`,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Falha ao ler o Smartsheet:", msg);
    // O dashboard cai para os dados embutidos quando esta rota falha.
    return NextResponse.json({ erro: msg }, { status: 502 });
  }
}
