import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token em todas as requisições
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para tratar erros
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const auth = {
  register: (data) => api.post('/api/auth/register', data),
  login: (data) => api.post('/api/auth/login', data),
  me: () => api.get('/api/auth/me'),
  updateMe: (data) => api.patch('/api/auth/me', data),
};

// Leads
export const leads = {
  list: (params) => api.get('/api/leads', { params }),
  get: (id) => api.get(`/api/leads/${id}`),
  import: (data) => api.post('/api/leads/import', data),
  importCSV: (csvContent) => api.post('/api/leads/import-csv', { csvContent }),
  export: (params) => api.get('/api/leads/export', { params, responseType: 'blob' }),
  exportJson: (params) => api.get('/api/leads/export-json', { params, responseType: 'blob' }),
  collect: (data) => api.post('/api/leads/collect', data),
  analyze: (leadIds) => api.post('/api/leads/analyze', { leadIds }),
  update: (id, data) => api.patch(`/api/leads/${id}`, data),
  delete: (id) => api.delete(`/api/leads/${id}`),
  getFollowups: (id) => api.get(`/api/leads/${id}/followups`),
  addFollowup: (id, mensagem) => api.post(`/api/leads/${id}/followups`, { mensagem }),
};

// Histórico de coletas
export const collections = {
  list: (params) => api.get('/api/collections', { params }),
  logs: (id) => api.get(`/api/collections/${id}/logs`),
  clearCache: (id) => api.delete(`/api/collections/${id}/cache`),
};

// Stats
export const stats = {
  get: (params) => api.get('/api/stats', { params }),
};

// Autopilot SDR
export const autopilot = {
  listRules: () => api.get('/api/autopilot/rules'),
  createRule: (data) => api.post('/api/autopilot/rules', data),
  updateRule: (id, data) => api.patch(`/api/autopilot/rules/${id}`, data),
  deleteRule: (id) => api.delete(`/api/autopilot/rules/${id}`),
  listQueue: (params) => api.get('/api/autopilot/queue', { params }),
  approveMessage: (id) => api.patch(`/api/autopilot/queue/${id}/approve`),
  cancelMessage: (id) => api.patch(`/api/autopilot/queue/${id}/cancel`),
  listApprovalBatches: (params) => api.get('/api/autopilot/approval-batches', { params }),
  createApprovalBatch: (data) => api.post('/api/autopilot/approval-batches', data),
  getApprovalBatch: (id) => api.get(`/api/autopilot/approval-batches/${id}`),
  resendApprovalBatch: (id) => api.post(`/api/autopilot/approval-batches/${id}/resend`),
  processApprovalCommand: (data) => api.post('/api/autopilot/approval-batches/process-command', data),
  stats: () => api.get('/api/autopilot/stats'),
  runs: (params) => api.get('/api/autopilot/runs', { params }),
  runScheduler: (data) => api.post('/api/autopilot/scheduler/run', data),
  processApproved: (data) => api.post('/api/autopilot/worker/process-approved', data),
  queueFollowups: (data) => api.post('/api/autopilot/followups/queue', data),
  stopOnReply: () => api.post('/api/autopilot/stop-on-reply'),
  classifyReplies: (data) => api.post('/api/autopilot/replies/classify', data),
  replyInbox: (params) => api.get('/api/autopilot/replies/inbox', { params }),
  applyReplyAction: (leadId, data) => api.post(`/api/autopilot/replies/${leadId}/action`, data),
  templateCatalog: () => api.get('/api/autopilot/templates/catalog'),
  previewTemplate: (data) => api.post('/api/autopilot/templates/preview', data),
  applyTemplate: (data) => api.post('/api/autopilot/templates/apply', data),
  advancedDiagnostic: (leadId) => api.get(`/api/autopilot/diagnostics/${leadId}/advanced`),
  applyAdvancedDiagnostic: (leadId) => api.post(`/api/autopilot/diagnostics/${leadId}/advanced/apply`),
  createAppointment: (data) => api.post('/api/autopilot/appointments', data),
  diagnostic: (leadId) => api.get(`/api/autopilot/diagnostics/${leadId}`),
};

// Credenciais
export const credentials = {
  providers: () => api.get('/api/credentials/providers'),
  list: () => api.get('/api/credentials'),
  create: (data) => api.post('/api/credentials', data),
  update: (id, data) => api.put(`/api/credentials/${id}`, data),
  remove: (id) => api.delete(`/api/credentials/${id}`),
  test: (id) => api.post(`/api/credentials/${id}/test`),
  updateStatus: (id, status) => api.patch(`/api/credentials/${id}/status`, { status }),
  usage: (id) => api.get(`/api/credentials/${id}/usage`),
};

// IA (LLM)
export const ai = {
  providers: () => api.get('/api/ai/providers'),
  tasks: () => api.get('/api/ai/tasks'),
  status: () => api.get('/api/ai/status'),
  run: (data) => api.post('/api/ai/run', data),
};

// WhatsApp (Evolution API)
export const whatsapp = {
  connect: (securityOptions) => api.post('/api/whatsapp/connect', securityOptions || {}),
  status: () => api.get('/api/whatsapp/status'),
  disconnect: () => api.post('/api/whatsapp/disconnect'),
  remove: () => api.delete('/api/whatsapp'),
  getLeadMessages: (leadId) => api.get(`/api/whatsapp/leads/${leadId}/messages`),
  sendText: (leadId, text) => api.post(`/api/whatsapp/leads/${leadId}/messages/text`, { text }),
  sendMedia: (leadId, data) => api.post(`/api/whatsapp/leads/${leadId}/messages/media`, data),
  sendAudio: (leadId, data) => api.post(`/api/whatsapp/leads/${leadId}/messages/audio`, data),
  // Busca a mídia como blob autenticado (evita colocar o token JWT na URL,
  // já que <img>/<audio> não enviam headers customizados).
  getMediaBlobUrl: async (messageId) => {
    const response = await api.get(`/api/whatsapp/messages/${messageId}/media`, {
      responseType: 'blob',
    });
    return URL.createObjectURL(response.data);
  },
};

export default api;
