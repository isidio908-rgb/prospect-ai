import { z } from 'zod';

export const importLeadSchema = z.object({
  nome_empresa: z.string().min(1, 'Nome da empresa é obrigatório'),
  site: z.string().url('URL inválida').optional().or(z.literal('')),
  telefone: z.string().optional(),
  cidade: z.string().optional(),
  nicho: z.string().optional(),
  categoria: z.string().optional(),
  fonte: z.string().optional(),
  observacoes: z.string().optional()
});

export const importCSVSchema = z.object({
  csvContent: z.string().min(10, 'Conteúdo CSV muito curto')
});

export const collectLeadsSchema = z.object({
  query: z.string().min(1).optional(),
  city: z.string().optional(),
  niche: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20)
}).refine(
  (data) => data.query || (data.city && data.niche),
  { message: 'Informe query OU city + niche' }
);

export const analyzeLeadsSchema = z.object({
  leadIds: z.array(z.number().int().positive()).min(1, 'Informe pelo menos um ID')
});

// Status do CRM interno (spec secao 11)
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

export const updateLeadSchema = z.object({
  status: z.enum(LEAD_STATUSES).optional(),
  observacoes: z.string().optional(),
  data_contato: z.string().datetime().optional(),
  responsavel: z.string().max(255).optional(),
  proxima_acao: z.string().max(500).optional(),
  data_proxima_acao: z.string().datetime().optional(),
  valor_potencial: z.number().nonnegative().optional(),
  motivo_perda: z.string().optional()
});

export const listLeadsSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
  prioridade: z.enum(['Baixa', 'Media', 'Alta', 'Prioridade maxima']).optional(),
  cidade: z.string().optional(),
  nicho: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['score', 'created_at', 'nome_empresa', 'prioridade']).default('score'),
  sortOrder: z.enum(['ASC', 'DESC']).default('DESC')
});
