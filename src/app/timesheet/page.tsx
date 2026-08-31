import type { Metadata } from "next";
import { Suspense } from "react";

import PainelTimesheet from "@/components/PainelTimesheet";

export const metadata: Metadata = {
  title: "Timesheet · IT Protect — Diretoria de Operações",
  description: "Acompanhamento de horas e chargeability da operação — IT Protect · Dextro",
};

export default function Page() {
  return (
    <Suspense>
      <PainelTimesheet />
    </Suspense>
  );
}
