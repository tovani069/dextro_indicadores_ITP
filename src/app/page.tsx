import type { Metadata } from "next";
import { Suspense } from "react";

import PainelTimesheet from "@/components/PainelTimesheet";

export const metadata: Metadata = {
  title: "Timesheet · IT Protect — Diretoria de Operações",
  description: "Acompanhamento de horas e chargeability da operação — IT Protect · Dextro",
};

/**
 * A raiz é o Timesheet, e não o painel completo, de propósito: é o endereço
 * que sai da casa. Apagar o que vem depois da barra devolve o próprio
 * Timesheet — não há caminho a encurtar até as outras seções, que vivem em
 * `/painel` e só circulam dentro do portal.
 */
export default function Page() {
  return (
    <Suspense>
      <PainelTimesheet />
    </Suspense>
  );
}
