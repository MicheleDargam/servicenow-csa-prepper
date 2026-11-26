import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './Layout';
import { ErrorBoundary } from './ErrorBoundary';
import { TimerPage } from '../features/timer/TimerPage';
import { TimerProvider } from '../features/timer/TimerContext';
import { TarefasPage } from '../features/tarefas/TarefasPage';
import { MateriasPage } from '../features/materias/MateriasPage';
import { LembretesPage } from '../features/lembretes/LembretesPage';
import { useLembreteScheduler } from '../features/lembretes/useLembreteScheduler';
import { ExamePrepperPage } from '../features/exame-prepper/ExamePrepperPage';
import { SimuladoPrepperRunnerPage } from '../features/exame-prepper/SimuladoPrepperRunnerPage';
import { ResultadoPrepperPage } from '../features/exame-prepper/ResultadoPrepperPage';
import { HistoricoPrepperPage } from '../features/exame-prepper/HistoricoPrepperPage';
import { QuestoesPrepperPage } from '../features/exame-prepper/QuestoesPrepperPage';
import { DomainPracticaPrepperPage } from '../features/exame-prepper/DomainPracticaPrepperPage';
import { ResultadoPraticaPrepperPage } from '../features/exame-prepper/ResultadoPraticaPrepperPage';
import { HistoricoPraticaPrepperPage } from '../features/exame-prepper/HistoricoPraticaPrepperPage';
import { SimuladoGeradoPage } from '../features/exame-prepper/SimuladoGeradoPage';
import { CadPage } from '../features/cad/CadPage';
import { SimuladoGeradoCadPage } from '../features/cad/SimuladoGeradoCadPage';
import { ResultadoCadPage } from '../features/cad/ResultadoCadPage';
import { HistoricoCadPage } from '../features/cad/HistoricoCadPage';
import { QuestoesCadPage } from '../features/cad/QuestoesCadPage';
import { DomainPracticaCadPage } from '../features/cad/DomainPracticaCadPage';
import { ResultadoPraticaCadPage } from '../features/cad/ResultadoPraticaCadPage';
import { HistoricoPraticaCadPage } from '../features/cad/HistoricoPraticaCadPage';
import { seedDefaultMaterias, seedSimuladosPrepper, seedQuestoesCad, seedLembretePadrao } from '../db/seed';

// recharts pulls in a sizeable chunk — only fetch it when Progresso is visited
const ProgressoPage = lazy(() =>
  import('../features/progresso/ProgressoPage').then((m) => ({ default: m.ProgressoPage })),
);

export function App() {
  // Seed default study subjects, bundled Prepper simulados and the default
  // reminder once, regardless of which route loads first
  useEffect(() => {
    seedDefaultMaterias();
    seedSimuladosPrepper();
    seedQuestoesCad();
    seedLembretePadrao();
  }, []);

  // Runs once at the app root so reminders keep checking regardless of route
  useLembreteScheduler();

  return (
    <ErrorBoundary>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <TimerProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<TimerPage />} />
              <Route path="/tarefas" element={<TarefasPage />} />
              <Route path="/tarefas/materias" element={<MateriasPage />} />
              <Route path="/tarefas/lembretes" element={<LembretesPage />} />
              <Route path="/exame-prepper" element={<ExamePrepperPage />} />
              <Route path="/exame-prepper/historico" element={<HistoricoPrepperPage />} />
              <Route path="/exame-prepper/resultado/:tentativaId" element={<ResultadoPrepperPage />} />
              <Route path="/exame-prepper/gerado" element={<SimuladoGeradoPage />} />
              <Route path="/exame-prepper/questoes" element={<QuestoesPrepperPage />} />
              <Route path="/exame-prepper/questoes/dominio" element={<DomainPracticaPrepperPage />} />
              <Route path="/exame-prepper/questoes/historico" element={<HistoricoPraticaPrepperPage />} />
              <Route path="/exame-prepper/questoes/resultado/:praticaId" element={<ResultadoPraticaPrepperPage />} />
              <Route path="/exame-prepper/:simuladoId" element={<SimuladoPrepperRunnerPage />} />
              <Route path="/cad" element={<CadPage />} />
              <Route path="/cad/gerado" element={<SimuladoGeradoCadPage />} />
              <Route path="/cad/historico" element={<HistoricoCadPage />} />
              <Route path="/cad/resultado/:tentativaId" element={<ResultadoCadPage />} />
              <Route path="/cad/questoes" element={<QuestoesCadPage />} />
              <Route path="/cad/questoes/dominio" element={<DomainPracticaCadPage />} />
              <Route path="/cad/questoes/historico" element={<HistoricoPraticaCadPage />} />
              <Route path="/cad/questoes/resultado/:praticaId" element={<ResultadoPraticaCadPage />} />
              <Route
                path="/progresso"
                element={
                  <Suspense fallback={<div className="progresso-page" />}>
                    <ProgressoPage />
                  </Suspense>
                }
              />
            </Route>
          </Routes>
        </TimerProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
