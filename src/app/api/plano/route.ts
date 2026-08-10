import { NextResponse } from "next/server";

import { carregarPlano } from "@/lib/smartsheet";

/** Meia hora, como no timesheet: o plano muda ao longo do dia, não a cada minuto. */
const REVALIDATE = 1800;

export const maxDuration = 60;
export const revalidate = 1800;

export async function GET() {
  try {
    const dados = await carregarPlano(REVALIDATE);
    return NextResponse.json(dados, {
      headers: {
        "Cache-Control": `public, s-maxage=${REVALIDATE}, stale-while-revalidate=3600`,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Falha ao ler o Plano Estratégico no Smartsheet:", msg);
    return NextResponse.json({ erro: msg }, { status: 502 });
  }
}
