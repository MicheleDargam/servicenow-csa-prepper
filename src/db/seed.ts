import type { EntityTable } from 'dexie';
import { db } from './database';
import { DEFAULT_MATERIAS } from '../features/materias/materiaColors';
import { BUNDLED_SIMULADOS_PREPPER, type QuestaoJSON } from '../data/simulados-prepper';
import type { Questao } from '../types';

/**
 * Seed the default study subjects (the 6 CSA exam domains) on first run
 * only. Safe to call multiple times (including concurrently, e.g. React
 * StrictMode's double-invoked effects) — the count-check and insert run
 * inside one transaction so a second overlapping call always sees the
 * rows the first one just added instead of racing to insert its own copy.
 */
export async function seedDefaultMaterias(): Promise<void> {
  await db.transaction('rw', db.subjects, async () => {
    const count = await db.subjects.count();
    if (count === 0) {
      await db.subjects.bulkAdd(
        DEFAULT_MATERIAS.map((materia) => ({ ...materia, createdAt: new Date() })),
      );
    }
  });
}

type UpsertResult = 'inserted' | 'updated' | 'unchanged';

/**
 * Insert a question by its externalId, or sync its content fields if it's
 * already in the DB but drifted from the source JSON (answer key
 * corrections, a fixed nota, reworded text, etc.). This is what lets
 * fixing a JSON file and redeploying actually correct data that was
 * already imported into someone's browser — a plain "skip if exists"
 * dedup would leave the old, wrong content there forever.
 */
async function upsertQuestao(
  table: EntityTable<Questao, 'id'>,
  q: QuestaoJSON,
  ordem: number,
  simuladoId?: number,
): Promise<UpsertResult> {
  const existing = await table.where('externalId').equals(q.id).first();

  const fields = {
    materia: q.materia,
    tema: q.tema,
    enunciado: q.enunciado,
    alternativas: q.alternativas,
    respostaCorreta: q.resposta_correta,
    nota: q.nota,
    enunciadoPt: q.enunciado_pt,
    alternativasPt: q.alternativas_pt,
    imagem: q.imagem,
  };

  if (!existing) {
    await table.add({ externalId: q.id, simuladoId, ordem, ...fields });
    return 'inserted';
  }

  const changed =
    existing.materia !== fields.materia ||
    existing.tema !== fields.tema ||
    existing.enunciado !== fields.enunciado ||
    existing.nota !== fields.nota ||
    existing.enunciadoPt !== fields.enunciadoPt ||
    existing.imagem !== fields.imagem ||
    JSON.stringify(existing.alternativas) !== JSON.stringify(fields.alternativas) ||
    JSON.stringify(existing.respostaCorreta) !== JSON.stringify(fields.respostaCorreta) ||
    JSON.stringify(existing.alternativasPt) !== JSON.stringify(fields.alternativasPt);

  if (changed) {
    await table.update(existing.id!, fields);
    return 'updated';
  }

  return 'unchanged';
}

/**
 * Load the bundled Exame Prepper simulado JSON files into IndexedDB, one
 * Simulado record per file plus its Questao records. Each file is matched
 * independently by name — a new simulado gets created once, but its
 * questoes are always re-synced against the source (via upsertQuestao) so
 * answer-key fixes reach browsers that already imported it.
 */
export async function seedSimuladosPrepper(): Promise<void> {
  for (const raw of BUNDLED_SIMULADOS_PREPPER) {
    await db.transaction('rw', db.simuladosPrepper, db.questoesPrepper, async () => {
      let simulado = await db.simuladosPrepper.where('nome').equals(raw.simulado).first();

      if (!simulado) {
        const newId = (await db.simuladosPrepper.add({
          nome: raw.simulado,
          totalQuestoes: raw.questoes.length,
          createdAt: new Date(),
        })) as number;
        simulado = { id: newId, nome: raw.simulado, totalQuestoes: raw.questoes.length, createdAt: new Date() };
      } else if (simulado.totalQuestoes !== raw.questoes.length) {
        await db.simuladosPrepper.update(simulado.id!, { totalQuestoes: raw.questoes.length });
      }

      for (let index = 0; index < raw.questoes.length; index++) {
        await upsertQuestao(db.questoesPrepper, raw.questoes[index], index, simulado.id);
      }
    });
  }
}

/**
 * Seed the single built-in "tarefas pendentes" reminder on first run only.
 * Starts paused (ativo: false) — the user opts in explicitly, which is also
 * when notification permission gets requested.
 */
export async function seedLembretePadrao(): Promise<void> {
  await db.transaction('rw', db.lembretes, async () => {
    const exists = await db.lembretes.where('tipo').equals('tarefas-pendentes').count();
    if (exists === 0) {
      await db.lembretes.add({
        tipo: 'tarefas-pendentes',
        horario: '21:00',
        diasSemana: [0, 1, 2, 3, 4, 5, 6],
        ativo: false,
        createdAt: new Date(),
      });
    }
  });
}
