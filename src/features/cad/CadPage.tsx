import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Database, FileQuestion, History, Wand2 } from 'lucide-react';
import { db } from '../../db/database';
import { DomainBreakdownCard } from '../exame-prepper/DomainBreakdownCard';
import { cadDomainStatsAcrossAllAttempts } from './cadDomains';

/**
 * Landing page for the CAD track. Unlike CSA/Prepper there are no fixed
 * simulados — just "Gerar Simulado" (a fresh 60-question exam drawn on the
 * spot) plus Banco de Questões by domain and the attempt history.
 */
export function CadPage() {
  const navigate = useNavigate();
  const totalQuestoes = useLiveQuery(() => db.questoesCad.count(), []);
  const domainStats = useLiveQuery(() => cadDomainStatsAcrossAllAttempts(), []);

  return (
    <div className="simulados-page">
      <div className="timer-page-header">
        <div>
          <h1 className="timer-page-title">CAD</h1>
          <p className="timer-page-subtitle">Certified Application Developer</p>
        </div>
        <div className="header-actions">
          <Link to="questoes" className="timer-btn-icon" title="Banco de Questões CAD">
            <Database size={20} />
          </Link>
          <Link to="historico" className="timer-btn-icon" title="Histórico de simulados">
            <History size={20} />
          </Link>
        </div>
      </div>

      {totalQuestoes === 0 ? (
        <div className="history-empty">
          <FileQuestion size={32} className="history-empty-icon" />
          <p>Carregando questões da CAD...</p>
        </div>
      ) : (
        <>
          <button className="btn-primary" onClick={() => navigate('gerado')}>
            <Wand2 size={18} /> Gerar Simulado (60 questões)
          </button>

          <button className="simulado-card" onClick={() => navigate('questoes')}>
            <div className="simulado-card-icon">
              <Database size={22} />
            </div>
            <div className="simulado-card-info">
              <span className="simulado-card-name">Banco de Questões</span>
              <span className="simulado-card-meta">
                {totalQuestoes ?? 0} questões · praticar por domínio
              </span>
            </div>
          </button>
        </>
      )}

      {domainStats && domainStats.length > 0 && (
        <DomainBreakdownCard
          title="Desempenho por domínio"
          subtitle="Acumulado de todos os simulados CAD"
          stats={domainStats}
          emptyMessage="Nenhuma questão respondida ainda."
        />
      )}
    </div>
  );
}
