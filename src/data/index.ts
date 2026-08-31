import type {
  Indicador,
  OrcPessoal,
  OrcRecord,
  TSRow,
} from "@/lib/types";

import timesheetJson from "./timesheet.json";
import colaboradoresJson from "./colaboradores.json";
import indicadoresJson from "./indicadores.json";
import orcRecordsJson from "./orcamento-records.json";
import orcPessoalJson from "./orcamento-pessoal.json";

/**
 * Dados originais embutidos no projeto. São a base exibida quando não há
 * importação salva no navegador (localStorage) — ver `lib/data-context`.
 */
export const TIMESHEET_SEED = timesheetJson as unknown as TSRow[];
export const ORC_RECORDS_SEED = orcRecordsJson as unknown as OrcRecord[];
export const ORC_PESSOAL_SEED = orcPessoalJson as unknown as OrcPessoal[];

/** Indicadores são estáticos (não têm importação por planilha). */
export const INDICADORES: Indicador[] = indicadoresJson as unknown as Indicador[];

/**
 * Reorganização dos times (MDR, Endpoint, Exposure, Identity e Network).
 *
 * Só entram aqui os colaboradores cujo time mudou: para todos os demais vale
 * a pasta do Smartsheet em que a planilha deles está guardada — inclusive
 * para quem já saiu, que continua no time em que estava.
 */
export const COLABORADORES = colaboradoresJson as {
  c: string;
  time: string;
  st?: string;
}[];
