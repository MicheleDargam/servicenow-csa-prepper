import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import { ResultadoView } from '../simulados/ResultadoView';

/** Same review screen as ResultadoPraticaPrepperPage, reading from praticasCad/questoesCad. */
export function ResultadoPraticaCadPage() {
  const { praticaId } = useParams();
  const id = Number(praticaId);
  const navigate = useNavigate();

  const pratica = useLiveQuery(() => db.praticasCad.get(id), [id]);

  if (!pratica) {
    return <div className="simulados-page" />;
  }

  return (
    <ResultadoView
      title={`${pratica.tema} · prática`}
      acertos={pratica.acertos}
      total={pratica.total}
      duracaoSegundos={pratica.duracaoSegundos}
      erros={pratica.erros}
      acertosIds={pratica.acertosIds}
      onBack={() => navigate('/cad/questoes')}
      fetchQuestoes={(ids) => db.questoesCad.bulkGet(ids)}
    />
  );
}
