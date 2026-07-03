export const LEAD_STATUSES = [
  'novo',
  'analisado',
  'mensagem_pronta',
  'contato_enviado',
  'respondeu',
  'reuniao_marcada',
  'proposta_enviada',
  'cliente_fechado',
  'sem_interesse',
  'nao_respondeu'
];

export const KANBAN_COLUMNS = [
  { id: 'novo', label: 'Novo', description: 'Lead recém coletado ou importado' },
  { id: 'analisado', label: 'Analisado', description: 'Já passou por auditoria/score' },
  { id: 'mensagem_pronta', label: 'Mensagem pronta', description: 'Copy pronta para abordagem' },
  { id: 'contato_enviado', label: 'Contato enviado', description: 'Primeira abordagem feita' },
  { id: 'respondeu', label: 'Respondeu', description: 'Abriu conversa' },
  { id: 'reuniao_marcada', label: 'Reunião marcada', description: 'Chamada ou diagnóstico agendado' },
  { id: 'proposta_enviada', label: 'Proposta enviada', description: 'Oferta enviada' },
  { id: 'cliente_fechado', label: 'Cliente fechado', description: 'Venda concluída' },
  { id: 'sem_interesse', label: 'Sem interesse', description: 'Lead recusou' },
  { id: 'nao_respondeu', label: 'Não respondeu', description: 'Sem retorno após follow-up' },
];

export const CLOSED_LEAD_STATUSES = ['cliente_fechado', 'sem_interesse', 'nao_respondeu'];