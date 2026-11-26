import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../db/database';
import { QuizRunner, type QuizResult } from '../simulados/QuizRunner';
import { peekDraftQuestionIds } from '../simulados/quizDraft';
import { sampleRandom, shuffle } from '../exame-prepper/practiceUtils';
import { formatAttemptDate } from '../simulados/simuladoUtils';
import { CAD_DOMAINS } from './cadDomains';
import type { Questao } from '../../types';

const DRAFT_KEY = 'cad-gerado';

/** Draws each domain's share of a 60-question exam (per CAD_DOMAINS weights), shuffled together. */
async function gerarSimulado(): Promise<Questao[]> {
  const todas = await db.questoesCad.toArray();
  const porDominio = new Map<string, Questao[]>();
  for (const q of todas) {
    const lista = porDominio.get(q.tema) ?? [];
    lista.push(q);
    porDominio.set(q.tema, lista);
  }

  let sorteadas: Questao[] = [];
  for (const dominio of CAD_DOMAINS) {
    sorteadas = sorteadas.concat(sampleRandom(porDominio.get(dominio.nome) ?? [], dominio.questoes));
  }
  return shuffle(sorteadas);
}

/** Same flow as Exame Prepper's SimuladoGeradoPage, over the CAD pool. */
export function SimuladoGeradoCadPage() {
  const navigate = useNavigate();
  const [questoes, setQuestoes] = useState<Questao[] | null>(null);
  const initAttempted = useRef(false);

  // Resume an in-progress generated exam instead of drawing a new set over it.
  useEffect(() => {
    if (initAttempted.current) return;
    initAttempted.current = true;

    (async () => {
      const draftIds = peekDraftQuestionIds(DRAFT_KEY);
      if (draftIds && draftIds.length > 0) {
        const fetched = await db.questoesCad.bulkGet(draftIds);
        const valid = fetched.filter((q): q is Questao => !!q);
        if (valid.length === draftIds.length) {
          setQuestoes(valid);
          return;
        }
      }
      setQuestoes(await gerarSimulado());
    })();
  }, []);

  const handleFinish = async (result: QuizResult) => {
    if (!questoes) return;
    const tentativaId = await db.tentativasCad.add({
      simuladoId: 0,
      simuladoNome: `Simulado CAD - ${formatAttemptDate(new Date())}`,
      questaoIds: questoes.map((q) => q.id!),
      ...result,
    });
    navigate(`/cad/resultado/${tentativaId}`, { replace: true });
  };

  if (!questoes) {
    return <div className="simulados-page" />;
  }

  return (
    <QuizRunner
      title="Simulado CAD"
      questoes={questoes}
      introHint="60 questões sorteadas agora, distribuídas pelos domínios da prova CAD (como na prova real)."
      draftKey={DRAFT_KEY}
      onBack={() => navigate('/cad')}
      onFinish={handleFinish}
    />
  );
}
