import Dexie, { type EntityTable } from 'dexie';
import type {
  Subject,
  StudySession,
  Task,
  Simulado,
  Questao,
  TentativaSimulado,
  SessaoPratica,
  Lembrete,
} from '../types';

class StudyTimerDB extends Dexie {
  subjects!: EntityTable<Subject, 'id'>;
  sessions!: EntityTable<StudySession, 'id'>;
  tasks!: EntityTable<Task, 'id'>;
  lembretes!: EntityTable<Lembrete, 'id'>;
  // Exame Prepper: questions imported from an outside exam-prep source, plus
  // fixed simulados over them, attempt history, and practice-by-domain
  // sessions (mirrors a Banco de Questões-style flow, but scoped to this
  // pool only — this app has no other question source to keep it apart from).
  simuladosPrepper!: EntityTable<Simulado, 'id'>;
  questoesPrepper!: EntityTable<Questao, 'id'>;
  tentativasPrepper!: EntityTable<TentativaSimulado, 'id'>;
  praticasPrepper!: EntityTable<SessaoPratica, 'id'>;
  // CAD (Certified Application Developer): its own question pool, generated
  // exam attempts and practice sessions — never mixed with the CSA ones.
  questoesCad!: EntityTable<Questao, 'id'>;
  tentativasCad!: EntityTable<TentativaSimulado, 'id'>;
  praticasCad!: EntityTable<SessaoPratica, 'id'>;

  constructor() {
    super('CSAPrepperDB');

    this.version(1).stores({
      subjects: '++id, name, createdAt',
      sessions: '++id, subjectId, startedAt, [subjectId+startedAt]',
      tasks: '++id, subjectId, date, [subjectId+date]',
      lembretes: '++id, tipo',
      simuladosPrepper: '++id, &nome, createdAt',
      questoesPrepper: '++id, &externalId, simuladoId, tema, materia, [simuladoId+ordem]',
      tentativasPrepper: '++id, simuladoId, completedAt, [simuladoId+completedAt]',
      praticasPrepper: '++id, tema, materia, completedAt, [tema+completedAt]',
    });

    // v2: adds the CAD track — question pool (no fixed simulados), generated
    // exam attempts and practice sessions.
    this.version(2).stores({
      subjects: '++id, name, createdAt',
      sessions: '++id, subjectId, startedAt, [subjectId+startedAt]',
      tasks: '++id, subjectId, date, [subjectId+date]',
      lembretes: '++id, tipo',
      simuladosPrepper: '++id, &nome, createdAt',
      questoesPrepper: '++id, &externalId, simuladoId, tema, materia, [simuladoId+ordem]',
      tentativasPrepper: '++id, simuladoId, completedAt, [simuladoId+completedAt]',
      praticasPrepper: '++id, tema, materia, completedAt, [tema+completedAt]',
      questoesCad: '++id, &externalId, tema, materia',
      tentativasCad: '++id, completedAt',
      praticasCad: '++id, tema, materia, completedAt, [tema+completedAt]',
    });
  }
}

export const db = new StudyTimerDB();

/**
 * Delete a subject and cascade-delete its tasks; any lembrete linked to it
 * keeps existing but loses the matéria tag (its schedule is still valid on
 * its own, so deleting the whole reminder would be more destructive than
 * the user asked for). Study sessions keep their own snapshotted
 * subjectName/subjectColor, so past history stays intact and readable even
 * after the subject is gone.
 */
export async function deleteSubjectCascade(subjectId: number): Promise<void> {
  await db.transaction('rw', db.subjects, db.tasks, db.lembretes, async () => {
    await db.tasks.where('subjectId').equals(subjectId).delete();

    const lembretes = await db.lembretes.toArray();
    for (const lembrete of lembretes) {
      if (lembrete.subjectId === subjectId && lembrete.id) {
        await db.lembretes.update(lembrete.id, { subjectId: undefined });
      }
    }

    await db.subjects.delete(subjectId);
  });
}
