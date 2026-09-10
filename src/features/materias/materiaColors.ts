export const MATERIA_COLORS = [
  { name: 'Azul', value: '#3b82f6' },
  { name: 'Roxo', value: '#8b5cf6' },
  { name: 'Rosa', value: '#ec4899' },
  { name: 'Vermelho', value: '#ef4444' },
  { name: 'Laranja', value: '#f97316' },
  { name: 'Amarelo', value: '#eab308' },
  { name: 'Verde', value: '#22c55e' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Ciano', value: '#06b6d4' },
  { name: 'Índigo', value: '#6366f1' },
] as const;

// Pré-cadastrados no primeiro uso, mas totalmente editáveis/removíveis pelo
// usuário depois. Os nomes são exatamente os 6 domínios oficiais do exame
// CSA usados para marcar as questões do Exame Prepper (ver PREPPER_DOMAINS
// em src/features/exame-prepper/domainStats.ts) — assim "Horas por matéria"
// (Timer/Progresso) e "Desempenho por domínio" (Exame Prepper/Progresso)
// falam a mesma língua em vez de serem duas taxonomias soltas.
export const DEFAULT_MATERIAS = [
  { name: 'Platform Overview and Navigation', color: '#3b82f6' },
  { name: 'Instance Configuration', color: '#8b5cf6' },
  { name: 'Configuring Applications for Collaboration', color: '#ec4899' },
  { name: 'Self Service & Automation', color: '#ef4444' },
  { name: 'Database Management and Platform Security', color: '#f97316' },
  { name: 'Data Migration and Integration', color: '#eab308' },
];
