import { useEffect, useState } from 'react';
import { stats } from '../services/api';
import { TrendingUp, Users, Target, Award } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await stats.get();
      setData(response.data);
    } catch (error) {
      toast.error('Erro ao carregar estatísticas');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Carregando...</div>
      </div>
    );
  }

  const statsCards = [
    { title: 'Total de Leads', value: data?.total || 0, icon: Users, color: 'bg-blue-500' },
    { title: 'Score Médio', value: data?.score?.medio || '0', icon: TrendingUp, color: 'bg-green-500' },
    {
      title: 'Alta Prioridade',
      value: (data?.porPrioridade?.Alta || 0) + (data?.porPrioridade?.['Prioridade maxima'] || 0),
      icon: Target,
      color: 'bg-orange-500',
    },
    { title: 'Com Oportunidades', value: data?.comOportunidades || 0, icon: Award, color: 'bg-purple-500' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400">Visão geral da sua prospecção</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Distribuição por Prioridade / Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Distribuição por Prioridade</h2>
          <div className="space-y-3">
            {Object.entries(data?.porPrioridade || {}).map(([prioridade, count]) => {
              const colors = {
                'Prioridade maxima': 'bg-red-500',
                'Alta': 'bg-orange-500',
                'Media': 'bg-yellow-500',
                'Baixa': 'bg-gray-500',
              };
              const total = data?.total || 1;
              const percentage = ((count / total) * 100).toFixed(1);
              return (
                <div key={prioridade}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700 dark:text-gray-300">{prioridade}</span>
                    <span className="text-gray-600 dark:text-gray-400">{count} ({percentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div className={`${colors[prioridade]} h-2 rounded-full`} style={{ width: `${percentage}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Distribuição por Status</h2>
          <div className="space-y-3">
            {Object.entries(data?.porStatus || {}).map(([status, count]) => {
              const total = data?.total || 1;
              const percentage = ((count / total) * 100).toFixed(1);
              return (
                <div key={status}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700 dark:text-gray-300 capitalize">{status}</span>
                    <span className="text-gray-600 dark:text-gray-400">{count} ({percentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div className="bg-primary-500 h-2 rounded-full" style={{ width: `${percentage}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top Cidades e Nichos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Top Cidades</h2>
          <div className="space-y-2">
            {data?.topCidades?.slice(0, 5).map((item, index) => (
              <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <span className="text-gray-700 dark:text-gray-300">{item.cidade}</span>
                <span className="badge badge-info">{item.count} leads</span>
              </div>
            ))}
            {data?.topCidades?.length === 0 && (
              <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhum dado disponível</p>
            )}
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Top Nichos</h2>
          <div className="space-y-2">
            {data?.topNichos?.slice(0, 5).map((item, index) => (
              <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <span className="text-gray-700 dark:text-gray-300">{item.nicho}</span>
                <span className="badge badge-info">{item.count} leads</span>
              </div>
            ))}
            {data?.topNichos?.length === 0 && (
              <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhum dado disponível</p>
            )}
          </div>
        </div>
      </div>

      {/* Presença técnica */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Presença Digital dos Leads</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Sem site', value: data?.presenca?.semSite },
            { label: 'Com site', value: data?.presenca?.comSite },
            { label: 'Com telefone', value: data?.presenca?.comTelefone },
            { label: 'Sem Pixel Meta', value: data?.presenca?.semPixel },
            { label: 'Sem GTM', value: data?.presenca?.semGtm },
            { label: 'Sem GA4', value: data?.presenca?.semGa4 },
            { label: 'Sem WhatsApp no site', value: data?.presenca?.semWhatsappSite },
          ].map((item) => (
            <div key={item.label} className="text-center p-3 bg-gray-50 dark:bg-gray-900/40 rounded-lg">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{item.value ?? 0}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{item.label}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
          Métricas de presença técnica consideram apenas leads já analisados.
        </p>
      </div>

      {/* Funil comercial */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Funil Comercial</h2>
          <span className="badge badge-info">Taxa de resposta: {data?.funil?.taxaResposta ?? 0}%</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <FunnelBox label="Contato enviado" value={data?.funil?.contatoEnviado} tone="blue" />
          <FunnelBox label="Respondeu" value={data?.funil?.respondeu} tone="blue" />
          <FunnelBox label="Reunião marcada" value={data?.funil?.reuniaoMarcada} tone="yellow" />
          <FunnelBox label="Proposta enviada" value={data?.funil?.propostaEnviada} tone="orange" />
          <FunnelBox label="Cliente fechado" value={data?.funil?.clienteFechado} tone="green" />
          <FunnelBox label="Sem interesse" value={data?.funil?.semInteresse} tone="red" />
          <FunnelBox label="Não respondeu" value={data?.funil?.naoRespondeu} tone="gray" />
          <FunnelBox
            label="Valor fechado"
            value={`R$ ${(data?.funil?.valorFechado ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            tone="green"
          />
        </div>
      </div>
    </div>
  );
}

function FunnelBox({ label, value, tone }) {
  const tones = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-300',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-900 dark:text-yellow-300',
    orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-900 dark:text-orange-300',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-300',
    red: 'bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-300',
    gray: 'bg-gray-50 dark:bg-gray-900/40 text-gray-900 dark:text-gray-200',
  };
  return (
    <div className={`text-center p-3 rounded-lg ${tones[tone]}`}>
      <div className="text-2xl font-bold">{value ?? 0}</div>
      <div className="text-xs opacity-80 mt-1">{label}</div>
    </div>
  );
}
