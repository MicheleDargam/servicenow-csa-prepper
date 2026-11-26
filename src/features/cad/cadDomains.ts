import { db } from '../../db/database';
import type { DomainStat } from '../exame-prepper/domainStats';
import type { Questao, TentativaErro, TentativaSimulado } from '../../types';

// The 6 official CAD exam domains, with how many of a generated 60-question
// exam each one gets — proportional to the exam blueprint's weights
// (20/20/20/20/10/10%). questoesCad.tema holds one of these exact strings.
export const CAD_DOMAINS = [
  { nome: 'Designing and Creating an Application', questoes: 12 },
  { nome: 'Application User Interface', questoes: 12 },
  { nome: 'Security and Restricting Access', questoes: 12 },
  { nome: 'Application Automation', questoes: 12 },
  { nome: 'Working with External Data', questoes: 6 },
  { nome: 'Managing Applications', questoes: 6 },
] as const;

export const CAD_DOMAIN_NAMES: readonly string[] = CAD_DOMAINS.map((d) => d.nome);

function sortByDomainOrder(stats: DomainStat[]): DomainStat[] {
  const rank = (domain: string) => {
    const i = CAD_DOMAIN_NAMES.indexOf(domain);
    return i === -1 ? CAD_DOMAIN_NAMES.length : i;
  };
  return [...stats].sort((a, b) => rank(a.domain) - rank(b.domain));
}

function tallyByDomain(questoes: Questao[], erros: TentativaErro[], byDomain: Map<string, DomainStat>): void {
  const wrongIds = new Set(erros.map((e) => e.questaoId));
  for (const q of questoes) {
    const entry = byDomain.get(q.tema) ?? { domain: q.tema, correct: 0, total: 0 };
    entry.total += 1;
    if (q.id && !wrongIds.has(q.id)) entry.correct += 1;
    byDomain.set(q.tema, entry);
  }
}

// Every CAD attempt is a generated exam, so it always carries its own questaoIds.
async function getRoster(t: TentativaSimulado): Promise<Questao[]> {
  if (!t.questaoIds || t.questaoIds.length === 0) return [];
  const fetched = await db.questoesCad.bulkGet(t.questaoIds);
  return fetched.filter((q): q is Questao => !!q);
}

/** Per-domain correct/total for a single CAD generated exam. */
export async function cadDomainStatsForAttempt(tentativa: TentativaSimulado): Promise<DomainStat[]> {
  const byDomain = new Map<string, DomainStat>();
  tallyByDomain(await getRoster(tentativa), tentativa.erros, byDomain);
  return sortByDomainOrder([...byDomain.values()]);
}

/** Per-domain correct/total summed across every CAD generated exam ever taken. */
export async function cadDomainStatsAcrossAllAttempts(): Promise<DomainStat[]> {
  const tentativas = await db.tentativasCad.toArray();
  const byDomain = new Map<string, DomainStat>();
  for (const t of tentativas) {
    tallyByDomain(await getRoster(t), t.erros, byDomain);
  }
  return sortByDomainOrder([...byDomain.values()]);
}
