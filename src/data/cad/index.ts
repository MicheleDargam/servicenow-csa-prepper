import type { QuestaoJSON } from '../simulados-prepper';
import questoesCad from './questoes_cad.json';

export interface QuestoesBatchJSON {
  origem: string;
  questoes: QuestaoJSON[];
}

// CAD (ServiceNow Certified Application Developer): questions from an outside
// exam-prep site (same kind of source as Exame Prepper, safe to share), kept
// in their own questoesCad table. No fixed CAD simulados: the CAD tab only
// offers practice by domain and a freshly generated exam ("Gerar Simulado").
//
// Each question's `tema` holds one of the 6 official CAD exam domains (see
// CAD_DOMAINS in features/cad/cadDomains.ts). externalIds follow the source
// PDF's numbering; cad_q081, cad_q097 and cad_q101 are intentionally absent
// (exact duplicates of cad_q041, cad_q046 and cad_q089). Same file as the
// main CSA Study app's src/data/cad/questoes_cad.json — keep them in sync.
export const BUNDLED_CAD: QuestoesBatchJSON[] = [questoesCad];
