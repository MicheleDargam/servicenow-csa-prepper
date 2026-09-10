import { db } from '../../db/database';
import { getCurrentWeekDates, toDateKey } from '../tarefas/taskUtils';

/**
 * Centralized read layer for the Progresso module. Every function here only
 * reads from tables other features already write to (sessions,
 * tentativasPrepper, praticasPrepper) — this module creates no data of its
 * own.
 */

export type Periodo = 'semana' | 'mes';

export const LIMITE_ATENCAO = 60;

function getStartOfMonth(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getRangeStart(periodo: Periodo): Date {
  return periodo === 'semana' ? getCurrentWeekDates()[0] : getStartOfMonth();
}

/**
 * Counts consecutive days ending today (or yesterday, if today has no
 * activity yet) that have at least one entry in `activityDateKeys` — a day
 * counts whether that entry came from a Timer study session or a completed
 * Prepper simulado/prática (see getVisaoGeral), since plenty of study
 * happens by answering questions with the Timer never turned on.
 */
function computeStreak(activityDateKeys: string[]): number {
  const uniqueDays = new Set(activityDateKeys);
  if (uniqueDays.size === 0) return 0;

  let streak = 0;
  const cursor = new Date();
  // Not studied yet today? The streak is still "alive" through yesterday.
  if (!uniqueDays.has(toDateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (uniqueDays.has(toDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

// ---- Dashboard overview ----

export interface VisaoGeral {
  horasSemana: number;
  horasMes: number;
  questoesRespondidas: number;
  taxaAcerto: number; // 0-1
  streak: number;
}

export async function getVisaoGeral(): Promise<VisaoGeral> {
  const [sessions, tentativasPrepper, praticasPrepper] = await Promise.all([
    db.sessions.toArray(),
    db.tentativasPrepper.toArray(),
    db.praticasPrepper.toArray(),
  ]);

  const studySessions = sessions.filter((s) => s.type === 'study');
  const weekStart = getCurrentWeekDates()[0];
  const monthStart = getStartOfMonth();

  const secondsSince = (start: Date) =>
    studySessions
      .filter((s) => s.startedAt >= start)
      .reduce((sum, s) => sum + s.duration, 0);

  const questoesRespondidas =
    tentativasPrepper.reduce((sum, t) => sum + t.total, 0) +
    praticasPrepper.reduce((sum, p) => sum + p.total, 0);
  const acertosTotais =
    tentativasPrepper.reduce((sum, t) => sum + t.acertos, 0) +
    praticasPrepper.reduce((sum, p) => sum + p.acertos, 0);

  // The streak counts a day as "estudei" if either the Timer logged study
  // time OR a Prepper simulado/prática was completed that day — studying by
  // answering questions, with the Timer off, still counts.
  const activityDateKeys = [
    ...studySessions.map((s) => toDateKey(s.startedAt)),
    ...tentativasPrepper.map((t) => toDateKey(t.completedAt)),
    ...praticasPrepper.map((p) => toDateKey(p.completedAt)),
  ];

  return {
    horasSemana: secondsSince(weekStart) / 3600,
    horasMes: secondsSince(monthStart) / 3600,
    questoesRespondidas,
    taxaAcerto: questoesRespondidas > 0 ? acertosTotais / questoesRespondidas : 0,
    streak: computeStreak(activityDateKeys),
  };
}

// ---- Horas de estudo por matéria ----

export interface HorasPorMateria {
  subjectId: number;
  subjectName: string;
  subjectColor: string;
  hours: number;
}

export async function getHorasPorMateria(periodo: Periodo): Promise<HorasPorMateria[]> {
  const start = getRangeStart(periodo);
  const sessions = await db.sessions.where('startedAt').aboveOrEqual(start).toArray();
  const studySessions = sessions.filter((s) => s.type === 'study');

  const map = new Map<number, HorasPorMateria>();
  for (const s of studySessions) {
    const existing = map.get(s.subjectId);
    if (existing) {
      existing.hours += s.duration / 3600;
    } else {
      map.set(s.subjectId, {
        subjectId: s.subjectId,
        subjectName: s.subjectName,
        subjectColor: s.subjectColor,
        hours: s.duration / 3600,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.hours - a.hours);
}

// ---- Desempenho nos Simulados Prepper ----

export interface SimuladoResumo {
  simuladoId: number;
  simuladoNome: string;
  tentativas: number;
}

export async function getSimuladosPrepperComTentativas(): Promise<SimuladoResumo[]> {
  const [simulados, tentativas] = await Promise.all([
    db.simuladosPrepper.toArray(),
    db.tentativasPrepper.toArray(),
  ]);

  const counts = new Map<number, number>();
  for (const t of tentativas) {
    counts.set(t.simuladoId, (counts.get(t.simuladoId) ?? 0) + 1);
  }

  return simulados
    .filter((s) => (counts.get(s.id!) ?? 0) > 0)
    .map((s) => ({ simuladoId: s.id!, simuladoNome: s.nome, tentativas: counts.get(s.id!) ?? 0 }));
}

export interface SimuladoTentativaPonto {
  numero: number;
  percent: number;
  acertos: number;
  total: number;
  completedAt: Date;
}

export async function getEvolucaoSimuladoPrepper(simuladoId: number): Promise<SimuladoTentativaPonto[]> {
  const tentativas = await db.tentativasPrepper.where('simuladoId').equals(simuladoId).sortBy('completedAt');
  return tentativas.map((t, i) => ({
    numero: i + 1,
    percent: t.total > 0 ? Math.round((t.acertos / t.total) * 100) : 0,
    acertos: t.acertos,
    total: t.total,
    completedAt: t.completedAt,
  }));
}
