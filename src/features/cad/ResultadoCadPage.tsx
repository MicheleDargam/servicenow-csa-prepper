import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import { ResultadoView } from '../simulados/ResultadoView';
import { DomainBreakdownCard } from '../exame-prepper/DomainBreakdownCard';
import { cadDomainStatsForAttempt } from './cadDomains';

/** Same review screen as ResultadoPrepperPage, reading from tentativasCad/questoesCad. */
export function ResultadoCadPage() {
  const { tentativaId } = useParams();
  const id = Number(tentativaId);
  const navigate = useNavigate();

  const tentativa = useLiveQuery(() => db.tentativasCad.get(id), [id]);
  const domainStats = useLiveQuery(
    () => (tentativa ? cadDomainStatsForAttempt(tentativa) : undefined),
    [tentativa],
  );

  if (!tentativa) {
    return <div className="simulados-page" />;
  }

  return (
    <ResultadoView
      title={tentativa.simuladoNome}
      acertos={tentativa.acertos}
      total={tentativa.total}
      duracaoSegundos={tentativa.duracaoSegundos}
      erros={tentativa.erros}
      acertosIds={tentativa.acertosIds}
      onBack={() => navigate('/cad')}
      fetchQuestoes={(ids) => db.questoesCad.bulkGet(ids)}
      extra={
        domainStats && (
          <DomainBreakdownCard
            title="Desempenho por domínio"
            stats={domainStats}
            emptyMessage="Nenhuma questão neste simulado tem domínio definido."
          />
        )
      }
    />
  );
}
