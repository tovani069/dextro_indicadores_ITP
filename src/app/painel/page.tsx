import type { Metadata } from "next";

import Dashboard from "@/components/Dashboard";

export const metadata: Metadata = {
  title: "Dashboard · IT Protect — Diretoria de Operações",
  description:
    "Plano de Ação, Indicadores, Orçamento e Timesheet da Diretoria de Operações — IT Protect · Dextro",
  // Endereço da diretoria: circula dentro do portal, não em buscador.
  robots: { index: false, follow: false },
};

export default function Page() {
  return <Dashboard />;
}
