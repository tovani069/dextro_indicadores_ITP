import { NextResponse, type NextRequest } from "next/server";

/**
 * Endereço separado só para o Timesheet.
 *
 * O link que sai da casa aponta para um host próprio. Nele, qualquer caminho
 * — a raiz inclusive — devolve o Timesheet: apagar o que vem depois da barra
 * não leva a lugar nenhum, porque o painel completo simplesmente não existe
 * neste endereço. O domínio principal continua servindo tudo como sempre.
 *
 * Para ligar: adicione o domínio ao projeto na Vercel (Settings → Domains).
 * `dextro-timesheet.vercel.app` e qualquer host começando por `timesheet.`
 * já são reconhecidos; outros nomes entram em `TIMESHEET_HOSTS`, separados
 * por vírgula.
 */
const HOSTS_PADRAO = ["dextro-timesheet.vercel.app"];

function ehHostDoTimesheet(host: string) {
  if (host.startsWith("timesheet.")) return true;
  const extras = (process.env.TIMESHEET_HOSTS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return [...HOSTS_PADRAO, ...extras].includes(host);
}

export function middleware(req: NextRequest) {
  const host = (req.headers.get("host") ?? "").toLowerCase().split(":")[0];
  if (!ehHostDoTimesheet(host)) return NextResponse.next();

  const { pathname } = req.nextUrl;

  // A única rota de dados que a página do Timesheet consome.
  if (pathname === "/api/timesheet") return NextResponse.next();
  // As demais — o Plano, por exemplo — não são servidas por aqui.
  if (pathname.startsWith("/api/")) {
    return new NextResponse("Não encontrado", { status: 404 });
  }

  if (pathname === "/timesheet") return NextResponse.next();

  // Qualquer outro caminho, raiz incluída, cai no próprio Timesheet.
  const url = req.nextUrl.clone();
  url.pathname = "/timesheet";
  return NextResponse.rewrite(url);
}

export const config = {
  // Arquivos estáticos e imagens do Next passam direto.
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:png|ico|svg|jpg|jpeg|webp)$).*)"],
};
