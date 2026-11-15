import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Play, X } from 'lucide-react';
import { QuestionCard } from './QuestionCard';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { sameAnswerSet } from './simuladoUtils';
import { loadMatchingDraft, saveDraft, clearDraft } from './quizDraft';
import type { Questao, TentativaErro } from '../../types';

export interface QuizResult {
  acertos: number;
  total: number;
  erros: TentativaErro[];
  acertosIds: number[];
  startedAt: Date;
  completedAt: Date;
  duracaoSegundos: number;
}

interface QuizRunnerProps {
  /** Shown as the page title, both on the intro screen and during the quiz. */
  title: string;
  questoes: Questao[];
  introHint?: string;
  /**
   * Stable identifier for this quiz's autosave draft (e.g. `simulado-3` or
   * `banco-CMDB-CSA - ServiceNow`). Must uniquely identify the exact
   * question set — the draft is discarded if it doesn't match `questoes`.
   */
  draftKey: string;
  /**
   * Practice mode: after answering, the user checks the answer and sees
   * right/wrong (plus the correct option) before moving on. Off for
   * Simulados, which stay exam-style (results only at the end).
   */
  instantFeedback?: boolean;
  onBack: () => void;
  onFinish: (result: QuizResult) => void;
}

type Phase = 'intro' | 'running';

// Alternatives whose meaning depends on their position — a question with
// any of these keeps its original order instead of being shuffled.
const POSITIONAL_ALT = /all of the above|none of the above|todas as anteriores|nenhuma das anteriores|\b(both|options?|alternativas?) [a-e]\b|\b[a-e] (and|e) [a-e]\b/i;

function shuffledIndices(n: number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildOrdens(questoes: Questao[]): Record<number, number[]> {
  const ordens: Record<number, number[]> = {};
  for (const q of questoes) {
    const n = q.alternativas.length;
    ordens[q.id!] = q.alternativas.some((a) => POSITIONAL_ALT.test(a))
      ? Array.from({ length: n }, (_, i) => i)
      : shuffledIndices(n);
  }
  return ordens;
}

/** Display order for a question, falling back to the original order if missing/stale. */
function getOrdem(ordens: Record<number, number[]>, q: Questao): number[] {
  const ordem = ordens[q.id!];
  const n = q.alternativas.length;
  if (ordem && ordem.length === n && [...ordem].sort((a, b) => a - b).every((v, i) => v === i)) {
    return ordem;
  }
  return Array.from({ length: n }, (_, i) => i);
}

/** Question as the card should show it: alternatives (and translations) reordered, correct answer remapped to display positions. */
function applyOrdem(q: Questao, ordem: number[]): Questao {
  return {
    ...q,
    alternativas: ordem.map((i) => q.alternativas[i]),
    alternativasPt: q.alternativasPt ? ordem.map((i) => q.alternativasPt![i]) : undefined,
    respostaCorreta: q.respostaCorreta.map((orig) => ordem.indexOf(orig)),
  };
}

/**
 * Generic one-question-at-a-time quiz engine: intro screen, progress bar,
 * navigation, scoring and the "unanswered questions" confirm dialog.
 * Feature-agnostic — Simulados and Banco de Questões both drive it with
 * their own question list and decide what to do with the result.
 *
 * Every answer/navigation is autosaved to localStorage (see quizDraft.ts),
 * so a locked screen, a backgrounded tab getting reclaimed by the OS, or an
 * accidental reload resumes exactly where it left off instead of losing the
 * attempt — this only clears once the quiz is actually submitted.
 */
export function QuizRunner({ title, questoes, introHint, draftKey, instantFeedback = false, onBack, onFinish }: QuizRunnerProps) {
  const questaoIds = questoes.map((q) => q.id!);
  // Computed once, at mount — later prop updates (e.g. a live query
  // re-firing) shouldn't retrigger draft detection.
  const [initialDraft] = useState(() => loadMatchingDraft(draftKey, questaoIds));

  const [phase, setPhase] = useState<Phase>(initialDraft ? 'running' : 'intro');
  const [currentIndex, setCurrentIndex] = useState(initialDraft?.currentIndex ?? 0);
  const [answers, setAnswers] = useState<Record<number, number[]>>(initialDraft?.answers ?? {});
  const [startedAt, setStartedAt] = useState<Date | null>(
    initialDraft ? new Date(initialDraft.startedAt) : null,
  );
  const [revealed, setRevealed] = useState<number[]>(initialDraft?.revealed ?? []);
  // Per-attempt shuffled display order of each question's alternatives —
  // kept in the draft so a resume shows the same order.
  const [ordens, setOrdens] = useState<Record<number, number[]>>(
    () => initialDraft?.ordens ?? buildOrdens(questoes),
  );
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [showResumedBanner, setShowResumedBanner] = useState(!!initialDraft);

  const total = questoes.length;
  const currentOriginal = questoes[currentIndex];
  const currentOrdem = currentOriginal ? getOrdem(ordens, currentOriginal) : [];
  // `answers` always stores ORIGINAL alternative indices (so scoring and the
  // result screen are unaffected); only the card sees the shuffled view.
  const currentQuestao = useMemo(
    () => (currentOriginal ? applyOrdem(currentOriginal, currentOrdem) : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentOriginal, currentOrdem.join(',')],
  );
  const answeredCount = Object.values(answers).filter((a) => a.length > 0).length;
  const isLast = currentIndex === total - 1;
  const currentSelected = currentOriginal ? (answers[currentOriginal.id!] ?? []) : [];
  const currentSelectedDisplay = currentSelected.map((orig) => currentOrdem.indexOf(orig));
  const currentRevealed = instantFeedback && !!currentQuestao && revealed.includes(currentQuestao.id!);
  // In instant-feedback mode, an answered-but-unchecked question shows
  // "Verificar resposta" instead of moving on; an unanswered one can still
  // be skipped with Próxima.
  const showCheckButton = instantFeedback && !currentRevealed && currentSelected.length > 0;

  // Keep the draft in sync with every answer/navigation while the quiz is
  // running, so there's never more than one question's worth of progress
  // at risk if the app dies mid-session.
  useEffect(() => {
    if (phase !== 'running' || !startedAt) return;
    saveDraft(draftKey, {
      questaoIds: questoes.map((q) => q.id!),
      currentIndex,
      answers,
      startedAt: startedAt.toISOString(),
      revealed,
      ordens,
    });
  }, [phase, draftKey, questoes, currentIndex, answers, startedAt, revealed, ordens]);

  const handleStart = () => {
    setStartedAt(new Date());
    setPhase('running');
  };

  const handleRestartFromScratch = () => {
    clearDraft(draftKey);
    setAnswers({});
    setRevealed([]);
    setOrdens(buildOrdens(questoes));
    setCurrentIndex(0);
    setStartedAt(new Date());
    setShowResumedBanner(false);
  };

  const handleAnswerChange = (selectedDisplay: number[]) => {
    if (!currentOriginal?.id || currentRevealed) return;
    const selected = selectedDisplay.map((d) => currentOrdem[d]);
    setAnswers((prev) => ({ ...prev, [currentOriginal.id!]: selected }));
  };

  const handleCheck = () => {
    if (!currentQuestao?.id) return;
    setRevealed((prev) => (prev.includes(currentQuestao.id!) ? prev : [...prev, currentQuestao.id!]));
  };

  const finish = () => {
    if (!startedAt) return;

    let acertos = 0;
    const erros: TentativaErro[] = [];
    const acertosIds: number[] = [];

    for (const questao of questoes) {
      const selecionadas = answers[questao.id!] ?? [];
      if (sameAnswerSet(selecionadas, questao.respostaCorreta)) {
        acertos += 1;
        acertosIds.push(questao.id!);
      } else {
        erros.push({ questaoId: questao.id!, selecionadas });
      }
    }

    const completedAt = new Date();
    clearDraft(draftKey);
    onFinish({
      acertos,
      total,
      erros,
      acertosIds,
      startedAt,
      completedAt,
      duracaoSegundos: Math.round((completedAt.getTime() - startedAt.getTime()) / 1000),
    });
  };

  const handleNext = () => {
    if (isLast) {
      if (answeredCount < total) {
        setConfirmFinish(true);
      } else {
        finish();
      }
    } else {
      setCurrentIndex((i) => i + 1);
    }
  };

  if (total === 0 || !currentQuestao) return null;

  if (phase === 'intro') {
    return (
      <div className="simulados-page">
        <div className="timer-page-header">
          <div className="materias-page-heading">
            <button className="timer-btn-icon" onClick={onBack} title="Voltar">
              <ArrowLeft size={20} />
            </button>
            <h1 className="timer-page-title">{title}</h1>
          </div>
        </div>

        <div className="simulado-intro-card">
          <span className="simulado-intro-count">{total} questões</span>
          <p className="simulado-intro-hint">
            {introHint ?? 'Responda no seu ritmo. Você pode voltar e revisar suas respostas antes de finalizar.'}
          </p>
          <button className="btn-primary" onClick={handleStart}>
            <Play size={18} /> Começar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="simulados-page">
      {showResumedBanner && (
        <div className="recovery-banner">
          <span>Retomando de onde você parou.</span>
          <button type="button" onClick={handleRestartFromScratch}>
            Começar do zero
          </button>
          <button
            type="button"
            className="recovery-banner-close"
            onClick={() => setShowResumedBanner(false)}
            title="Dispensar"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="quiz-progress-bar">
        <div
          className="quiz-progress-fill"
          style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
        />
      </div>

      <QuestionCard
        key={currentQuestao.id}
        questao={currentQuestao}
        index={currentIndex}
        total={total}
        selected={currentSelectedDisplay}
        onChange={handleAnswerChange}
        revealed={currentRevealed}
      />

      <div className="quiz-nav">
        <button
          className="btn-secondary"
          onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
        >
          <ArrowLeft size={18} /> Anterior
        </button>
        {showCheckButton ? (
          <button className="btn-primary quiz-nav-next" onClick={handleCheck}>
            <CheckCircle2 size={18} /> Verificar resposta
          </button>
        ) : (
          <button className="btn-primary quiz-nav-next" onClick={handleNext}>
            {isLast ? 'Finalizar' : 'Próxima'}
            {!isLast && <ArrowRight size={18} />}
          </button>
        )}
      </div>

      {confirmFinish && (
        <ConfirmDialog
          title="Finalizar"
          message={`Você tem ${total - answeredCount} questão(ões) sem resposta — elas serão contadas como erradas. Deseja finalizar mesmo assim?`}
          confirmLabel="Finalizar"
          onConfirm={finish}
          onCancel={() => setConfirmFinish(false)}
        />
      )}
    </div>
  );
}
