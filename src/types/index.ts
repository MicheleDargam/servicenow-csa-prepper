export interface Subject {
  id?: number;
  name: string;
  color: string;
  createdAt: Date;
}

export interface StudySession {
  id?: number;
  subjectId: number;
  subjectName: string;
  subjectColor: string;
  taskId?: number;
  taskTitle?: string;
  type: 'study' | 'break';
  duration: number; // in seconds
  startedAt: Date;
  completedAt: Date;
}

export interface Task {
  id?: number;
  title: string;
  subjectId: number;
  date: string; // local date key, format YYYY-MM-DD
  status: 'pending' | 'done';
  createdAt: Date;
  completedAt?: Date;
}

export interface Lembrete {
  id?: number;
  tipo: 'horario' | 'tarefas-pendentes';
  titulo?: string; // custom label; only meaningful for tipo 'horario'
  horario: string; // "HH:MM", 24h
  diasSemana: number[]; // 0=Dom .. 6=Sáb
  subjectId?: number; // optional matéria link; only meaningful for tipo 'horario'
  ativo: boolean;
  createdAt: Date;
  ultimoDisparoData?: string; // YYYY-MM-DD — guards against firing twice the same day
}

export interface TimerSettings {
  studyDuration: number; // in minutes (default: 25)
  breakDuration: number; // in minutes (default: 5)
}

export type TimerPhase = 'idle' | 'study' | 'break';
export type TimerStatus = 'running' | 'paused' | 'stopped';

export interface Simulado {
  id?: number;
  nome: string; // e.g. "Simulado Prepper 1" — dedup key on import
  totalQuestoes: number;
  createdAt: Date;
}

export interface Questao {
  id?: number;
  simuladoId?: number;
  externalId: string; // original id from the source JSON (e.g. "prep_q001"), globally unique
  materia: string;
  tema: string;
  enunciado: string;
  alternativas: string[];
  respostaCorreta: number[]; // indices into alternativas; length > 1 = multi-select
  nota?: string; // optional caveat about the answer key, shown during review
  ordem: number; // preserves original question order within the simulado
  enunciadoPt?: string; // PT-BR translation, shown alongside the English text when toggled
  alternativasPt?: string[]; // same order/length as `alternativas`
  imagem?: string; // optional diagram/screenshot the question references, shown above the enunciado
}

export interface TentativaErro {
  questaoId: number;
  selecionadas: number[];
}

export interface TentativaSimulado {
  id?: number;
  simuladoId: number;
  simuladoNome: string;
  acertos: number;
  total: number;
  erros: TentativaErro[];
  // ids of the questions answered correctly, so the result screen can show
  // a "questões que você acertou" review alongside the wrong-answer one —
  // optional because attempts recorded before this field existed won't have
  // it; ResultadoView just shows nothing for that section in that case.
  acertosIds?: number[];
  startedAt: Date;
  completedAt: Date;
  duracaoSegundos: number;
  // Only set for an on-the-fly generated exam (e.g. Exame Prepper's
  // "Gerar Simulado" button), which has no real simuladoId to look its
  // question roster up by (simuladoId is 0 for these) — the exact question
  // ids drawn for that attempt, so per-domain breakdowns can still be
  // computed after the fact.
  questaoIds?: number[];
}

/**
 * A practice session from the Banco de Questões module — same shape as
 * TentativaSimulado (acertos/total/erros/tempo) so both feed the future
 * progress charts uniformly, but scoped by tema instead of simuladoId.
 */
export interface SessaoPratica {
  id?: number;
  tema: string;
  materia: string;
  modo: 'quantidade' | 'todas';
  acertos: number;
  total: number;
  erros: TentativaErro[];
  acertosIds?: number[];
  startedAt: Date;
  completedAt: Date;
  duracaoSegundos: number;
}
