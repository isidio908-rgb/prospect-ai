import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { leads, whatsapp } from '../services/api';
import toast from 'react-hot-toast';
import { 
  ArrowLeft, 
  ExternalLink, 
  Copy, 
  MessageCircle,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import WhatsAppChat from '../components/whatsapp/WhatsAppChat';
import AiAssistant from '../components/AiAssistant';

const CRM_STATUSES = [
  { value: 'novo', label: 'Novo' },
  { value: 'analisado', label: 'Analisado' },
  { value: 'mensagem_pronta', label: 'Mensagem pronta' },
  { value: 'contato_enviado', label: 'Contato enviado' },
  { value: 'respondeu', label: 'Respondeu' },
  { value: 'reuniao_marcada', label: 'Reunião marcada' },
  { value: 'proposta_enviada', label: 'Proposta enviada' },
  { value: 'cliente_fechado', label: 'Cliente fechado' },
  { value: 'sem_interesse', label: 'Sem interesse' },
  { value: 'nao_respondeu', label: 'Não respondeu' },
];

export default function LeadDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [followups, setFollowups] = useState([]);
  const [crmForm, setCrmForm] = useState({
    status: '',
    responsavel: '',
    proxima_acao: '',
    valor_potencial: '',
    motivo_perda: '',
  });
  const [savingCrm, setSavingCrm] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [whatsappConnected, setWhatsappConnected] = useState(false);

  useEffect(() => {
    loadLead();
    loadFollowups();
    loadWhatsAppStatus();
  }, [id]);

  const loadWhatsAppStatus = async () => {
    try {
      const response = await whatsapp.status();
      setWhatsappConnected(Boolean(response.data.connected));
    } catch {
      setWhatsappConnected(false);
    }
  };

  const loadLead = async () => {
    try {
      const response = await leads.get(id);
      setLead(response.data.lead);
      setCrmForm({
        status: response.data.lead.status || 'novo',
        responsavel: response.data.lead.responsavel || '',
        proxima_acao: response.data.lead.proxima_acao || '',
        valor_potencial: response.data.lead.valor_potencial || '',
        motivo_perda: response.data.lead.motivo_perda || '',
      });
    } catch (error) {
      toast.error('Erro ao carregar lead');
      navigate('/leads');
    } finally {
      setLoading(false);
    }
  };

  const loadFollowups = async () => {
    try {
      const response = await leads.getFollowups(id);
      setFollowups(response.data.followups || []);
    } catch (error) {
      // Silencioso: histórico é complementar, não bloqueia a página
    }
  };

  const handleSaveCrm = async (e) => {
    e.preventDefault();
    setSavingCrm(true);
    try {
      await leads.update(id, {
        status: crmForm.status,
        responsavel: crmForm.responsavel || undefined,
        proxima_acao: crmForm.proxima_acao || undefined,
        valor_potencial: crmForm.valor_potencial ? Number(crmForm.valor_potencial) : undefined,
        motivo_perda: crmForm.motivo_perda || undefined,
      });
      toast.success('CRM atualizado com sucesso!');
      await loadLead();
      await loadFollowups();
    } catch (error) {
      toast.error('Erro ao atualizar CRM');
    } finally {
      setSavingCrm(false);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setSavingNote(true);
    try {
      await leads.addFollowup(id, newNote.trim());
      setNewNote('');
      toast.success('Nota adicionada!');
      await loadFollowups();
    } catch (error) {
      toast.error('Erro ao adicionar nota');
    } finally {
      setSavingNote(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado para área de transferência!');
  };

  const openWhatsApp = () => {
    const phone = lead.telefone?.replace(/\D/g, '');
    const message = encodeURIComponent(lead.mensagem_whatsapp || '');
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Carregando...</div>
      </div>
    );
  }

  if (!lead) return null;

  const ScoreBadge = ({ score }) => {
    let color = 'bg-gray-500';
    if (score >= 80) color = 'bg-red-500';
    else if (score >= 60) color = 'bg-orange-500';
    else if (score >= 35) color = 'bg-yellow-500';
    else color = 'bg-green-500';

    return (
      <div className={`${color} text-white px-6 py-3 rounded-lg inline-block`}>
        <div className="text-4xl font-bold">{score}</div>
        <div className="text-sm">Score</div>
      </div>
    );
  };

  const TechIcon = ({ has, label }) => (
    <div className="flex items-center gap-2">
      {has ? (
        <CheckCircle className="w-5 h-5 text-green-500" />
      ) : (
        <XCircle className="w-5 h-5 text-red-500" />
      )}
      <span className="text-sm">{label}</span>
    </div>
  );

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/leads')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
      >
        <ArrowLeft className="w-5 h-5" />
        Voltar para Leads
      </button>

      {/* Header */}
      <div className="card">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{lead.nome_empresa}</h1>
            <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
              <span>{lead.cidade}</span>
              <span>•</span>
              <span>{lead.nicho}</span>
              <span>•</span>
              <span>{lead.categoria}</span>
            </div>
            {lead.site && (
              <a
                href={lead.site}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary-600 hover:text-primary-700 mt-2"
              >
                {lead.site}
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
          <div className="flex gap-4">
            <ScoreBadge score={lead.score || 0} />
            <div>
              <span className={`badge ${
                lead.prioridade === 'Prioridade maxima' ? 'badge-danger' :
                lead.prioridade === 'Alta' ? 'badge-warning' :
                lead.prioridade === 'Media' ? 'badge-info' : 'badge-success'
              } text-lg`}>
                {lead.prioridade}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tecnologias Detectadas */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Tecnologias Detectadas</h2>
          <div className="space-y-2">
            <TechIcon has={lead.tem_pixel_meta} label="Meta Pixel" />
            <TechIcon has={lead.tem_gtm} label="Google Tag Manager" />
            <TechIcon has={lead.tem_ga4} label="Google Analytics 4" />
            <TechIcon has={lead.tem_google_ads_tag} label="Google Ads Tag" />
            <TechIcon has={lead.tem_whatsapp_site} label="WhatsApp no Site" />
            <TechIcon has={lead.tem_formulario} label="Formulário de Contato" />
            <TechIcon has={lead.tem_https} label="HTTPS" />
          </div>
        </div>

        {/* Informações do Site */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Informações do Site</h2>
          <div className="space-y-3">
            <div>
              <span className="text-sm text-gray-600">Status:</span>
              <div className="font-medium">{lead.status_site}</div>
            </div>
            {lead.tempo_carregamento_ms && (
              <div>
                <span className="text-sm text-gray-600">Tempo de Carregamento:</span>
                <div className="font-medium">{lead.tempo_carregamento_ms}ms</div>
              </div>
            )}
            {lead.tamanho_kb && (
              <div>
                <span className="text-sm text-gray-600">Tamanho da Página:</span>
                <div className="font-medium">{lead.tamanho_kb} KB</div>
              </div>
            )}
          </div>
        </div>

        {/* Redes Sociais */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Redes Sociais</h2>
          <div className="space-y-2">
            {lead.instagram ? (
              <a href={lead.instagram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary-600 hover:text-primary-700">
                Instagram <ExternalLink className="w-4 h-4" />
              </a>
            ) : (
              <div className="text-sm text-gray-500">Instagram não encontrado</div>
            )}
            {lead.facebook ? (
              <a href={lead.facebook} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary-600 hover:text-primary-700">
                Facebook <ExternalLink className="w-4 h-4" />
              </a>
            ) : (
              <div className="text-sm text-gray-500">Facebook não encontrado</div>
            )}
          </div>
        </div>
      </div>

      {/* Oportunidades */}
      {lead.oportunidades && (
        <div className="card bg-red-50 border-red-200">
          <h2 className="text-lg font-semibold text-red-900 mb-3">🎯 Oportunidades Detectadas</h2>
          <ul className="space-y-2">
            {lead.oportunidades.split('|').map((opp, index) => (
              <li key={index} className="text-red-800 flex items-start gap-2">
                <span className="text-red-500 mt-1">•</span>
                <span>{opp.trim()}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Pontos Positivos */}
      {lead.pontos_positivos && (
        <div className="card bg-green-50 border-green-200">
          <h2 className="text-lg font-semibold text-green-900 mb-3">✅ Pontos Positivos</h2>
          <ul className="space-y-2">
            {lead.pontos_positivos.split('|').map((point, index) => (
              <li key={index} className="text-green-800 flex items-start gap-2">
                <span className="text-green-500 mt-1">•</span>
                <span>{point.trim()}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Diagnóstico */}
      {lead.diagnostico && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">📋 Diagnóstico Completo</h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{lead.diagnostico}</p>
        </div>
      )}

      {/* Mensagem WhatsApp */}
      {lead.mensagem_whatsapp && (
        <div className="card bg-green-50 border-green-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-green-900">💬 Mensagem WhatsApp</h2>
            <div className="flex gap-2">
              <button
                onClick={() => copyToClipboard(lead.mensagem_whatsapp)}
                className="btn btn-secondary flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Copiar
              </button>
              {lead.telefone && (
                <button
                  onClick={openWhatsApp}
                  className="btn btn-primary flex items-center gap-2 bg-green-600 hover:bg-green-700"
                >
                  <MessageCircle className="w-4 h-4" />
                  Abrir WhatsApp
                </button>
              )}
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 text-gray-700 whitespace-pre-line border border-green-300">
            {lead.mensagem_whatsapp}
          </div>
        </div>
      )}

      {/* Mensagem de Follow-up (2º estágio, pós-resposta positiva) */}
      {lead.mensagem_whatsapp_followup && (
        <div className="card bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-blue-900">💬 Mensagem de Follow-up (após resposta)</h2>
            <button
              onClick={() => copyToClipboard(lead.mensagem_whatsapp_followup)}
              className="btn btn-secondary flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              Copiar
            </button>
          </div>
          <div className="bg-white rounded-lg p-4 text-gray-700 whitespace-pre-line border border-blue-300">
            {lead.mensagem_whatsapp_followup}
          </div>
        </div>
      )}

      <AiAssistant leadId={id} onLeadUpdated={loadLead} />

      {/* Chat WhatsApp */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-green-600" />
            Conversa no WhatsApp
          </h2>
          {!whatsappConnected && (
            <Link to="/whatsapp" className="text-sm text-primary-600 hover:text-primary-700">
              Conectar WhatsApp →
            </Link>
          )}
        </div>
        <WhatsAppChat leadId={id} whatsappConnected={whatsappConnected} />
      </div>

      {/* CRM - Status, responsável, próxima ação, valor potencial */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">🗂️ CRM</h2>
        <form onSubmit={handleSaveCrm} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={crmForm.status}
              onChange={(e) => setCrmForm({ ...crmForm, status: e.target.value })}
              className="input"
            >
              {CRM_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Responsável</label>
            <input
              type="text"
              value={crmForm.responsavel}
              onChange={(e) => setCrmForm({ ...crmForm, responsavel: e.target.value })}
              className="input"
              placeholder="Quem está conduzindo o contato"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Próxima ação</label>
            <input
              type="text"
              value={crmForm.proxima_acao}
              onChange={(e) => setCrmForm({ ...crmForm, proxima_acao: e.target.value })}
              className="input"
              placeholder="Ex: Ligar em 2 dias"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valor potencial (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={crmForm.valor_potencial}
              onChange={(e) => setCrmForm({ ...crmForm, valor_potencial: e.target.value })}
              className="input"
              placeholder="0.00"
            />
          </div>
          {crmForm.status === 'sem_interesse' && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Motivo da perda</label>
              <input
                type="text"
                value={crmForm.motivo_perda}
                onChange={(e) => setCrmForm({ ...crmForm, motivo_perda: e.target.value })}
                className="input"
                placeholder="Ex: Já tem agência, sem orçamento no momento..."
              />
            </div>
          )}
          <div className="md:col-span-2">
            <button type="submit" disabled={savingCrm} className="btn btn-primary">
              {savingCrm ? 'Salvando...' : 'Salvar CRM'}
            </button>
          </div>
        </form>
      </div>

      {/* Histórico de follow-up */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">🕒 Histórico de Follow-up</h2>

        <form onSubmit={handleAddNote} className="flex gap-2 mb-4">
          <input
            type="text"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            className="input flex-1"
            placeholder="Adicionar nota de contato..."
          />
          <button type="submit" disabled={savingNote || !newNote.trim()} className="btn btn-secondary">
            {savingNote ? 'Salvando...' : 'Adicionar'}
          </button>
        </form>

        {followups.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum histórico registrado ainda.</p>
        ) : (
          <ul className="space-y-3">
            {followups.map((f) => (
              <li key={f.id} className="border-l-2 border-primary-300 pl-3">
                <div className="text-xs text-gray-500">
                  {new Date(f.created_at).toLocaleString('pt-BR')}
                </div>
                {f.tipo === 'status_change' ? (
                  <div className="text-sm text-gray-800">
                    Status alterado: <span className="font-medium">{f.status_anterior}</span> → <span className="font-medium">{f.status_novo}</span>
                    {f.mensagem && <div className="text-gray-600 mt-1">{f.mensagem}</div>}
                  </div>
                ) : (
                  <div className="text-sm text-gray-800">{f.mensagem}</div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Contatos */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">📞 Contatos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {lead.telefone && (
            <div>
              <span className="text-sm text-gray-600">Telefone:</span>
              <div className="font-medium">{lead.telefone}</div>
            </div>
          )}
          {lead.emails_encontrados && (
            <div>
              <span className="text-sm text-gray-600">Emails:</span>
              <div className="font-medium">{lead.emails_encontrados}</div>
            </div>
          )}
          {lead.telefones_encontrados && (
            <div>
              <span className="text-sm text-gray-600">Telefones no site:</span>
              <div className="font-medium text-sm">{lead.telefones_encontrados}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
