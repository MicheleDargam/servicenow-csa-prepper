import { useLiveQuery } from 'dexie-react-hooks';
import { getVisaoGeral } from './progressoData';
import { domainStatsAcrossAllAttempts } from '../exame-prepper/domainStats';
import { DomainBreakdownCard } from '../exame-prepper/DomainBreakdownCard';
import { StatTiles } from './StatTiles';
import { HorasPorMateriaChart } from './HorasPorMateriaChart';
import { SimuladoEvolucaoChart } from './SimuladoEvolucaoChart';

export function ProgressoPage() {
  const visaoGeral = useLiveQuery(() => getVisaoGeral(), []);
  const domainStats = useLiveQuery(() => domainStatsAcrossAllAttempts(), []);

  return (
    <div className="progresso-page">
      <div className="timer-page-header">
        <div>
          <h1 className="timer-page-title">Progresso</h1>
          <p className="timer-page-subtitle">Sua evolução nos estudos</p>
        </div>
      </div>

      {visaoGeral && <StatTiles data={visaoGeral} />}

      <HorasPorMateriaChart />

      <SimuladoEvolucaoChart />

      <DomainBreakdownCard
        title="Desempenho por domínio"
        subtitle="Acumulado de todas as tentativas de Simulados Prepper"
        stats={domainStats ?? []}
        emptyMessage="Nenhuma questão respondida ainda."
      />
    </div>
  );
}
