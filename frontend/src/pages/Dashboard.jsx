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
        <div className="text-gray-500">Carregando...</div>
      </div>
    );
  }

  const statsCards = [
    {
      title: 'Total de Leads',
      value: data?.total || 0,
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      title: 'Score Médio',
      value: data?.score?.medio || '0',
      icon: TrendingUp,
      color: 'bg-green-500',
    },
    {
      title: 'Alta Prioridade',
      value: (data?.porPrioridade?.Alta || 0) + (data?.porPrioridade?.['Prioridade maxima'] || 0),
      icon: Target,
      color: 'bg-orange-500',
    },
    {
      title: 'Com Oportunidades',
      value: data?.comOportunidades || 0,
      icon: Award,
      color: 'bg-purple-500',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Visão geral da sua prospecção</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Distribuição por Prioridade */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Distribuição por Prioridade</h2>
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
                    <span className="text-gray-700">{prioridade}</span>
                    <span className="text-gray-600">{count} ({percentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`${colors[prioridade]} h-2 rounded-full`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Distribuição por Status */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Distribuição por Status</h2>
          <div className="space-y-3">
            {Object.entries(data?.porStatus || {}).map(([status, count]) => {
              const total = data?.total || 1;
              const percentage = ((count / total) * 100).toFixed(1);
              
              return (
                <div key={status}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700 capitalize">{status}</span>
                    <span className="text-gray-600">{count} ({percentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary-500 h-2 rounded-full"
                      style={{ width: `${percentage}%` }}
                    ></div>
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
          <h2 className="text-lg font-semibold mb-4">Top Cidades</h2>
          <div className="space-y-2">
            {data?.topCidades?.slice(0, 5).map((item, index) => (
              <div key={index} className="flex justify-between items-center py-2 border-b last:border-0">
                <span className="text-gray-700">{item.cidade}</span>
                <span className="badge badge-info">{item.count} leads</span>
              </div>
            ))}
            {data?.topCidades?.length === 0 && (
              <p className="text-gray-500 text-sm">Nenhum dado disponível</p>
            )}
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Top Nichos</h2>
          <div className="space-y-2">
            {data?.topNichos?.slice(0, 5).map((item, index) => (
              <div key={index} className="flex justify-between items-center py-2 border-b last:border-0">
                <span className="text-gray-700">{item.nicho}</span>
                <span className="badge badge-info">{item.count} leads</span>
              </div>
            ))}
            {data?.topNichos?.length === 0 && (
              <p className="text-gray-500 text-sm">Nenhum dado disponível</p>
            )}
          </div>
        </div>
      </div>

      {/* Presença técnica (leads sem site, sem pixel, sem GTM, sem GA4, com telefone) */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Presença Digital dos Leads</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{data?.presenca?.semSite ?? 0}</div>
            <div className="text-xs text-gray-600 mt-1">Sem site</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{data?.presenca?.comSite ?? 0}</div>
            <div className="text-xs text-gray-600 mt-1">Com site</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{data?.presenca?.comTelefone ?? 0}</div>
            <div className="text-xs text-gray-600 mt-1">Com telefone</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{data?.presenca?.semPixel ?? 0}</div>
            <div className="text-xs text-gray-600 mt-1">Sem Pixel Meta</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{data?.presenca?.semGtm ?? 0}</div>
            <div className="text-xs text-gray-600 mt-1">Sem GTM</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{data?.presenca?.semGa4 ?? 0}</div>
            <div className="text-xs text-gray-600 mt-1">Sem GA4</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{data?.presenca?.semWhatsappSite ?? 0}</div>
            <div className="text-xs text-gray-600 mt-1">Sem WhatsApp no site</div>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Métricas de presença técnica consideram apenas leads já analisados.
        </p>
      </div>

      {/* Funil comercial (spec seção 13: reuniões, propostas, clientes, taxa de resposta) */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Funil Comercial</h2>
          <span className="badge badge-info">
            Taxa de resposta: {data?.funil?.taxaResposta ?? 0}%
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-900">{data?.funil?.contatoEnviado ?? 0}</div>
            <div className="text-xs text-blue-700 mt-1">Contato enviado</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-900">{data?.funil?.respondeu ?? 0}</div>
            <div className="text-xs text-blue-700 mt-1">Respondeu</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-900">{data?.funil?.reuniaoMarcada ?? 0}</div>
            <div className="text-xs text-yellow-700 mt-1">Reunião marcada</div>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-900">{data?.funil?.propostaEnviada ?? 0}</div>
            <div className="text-xs text-orange-700 mt-1">Proposta enviada</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-900">{data?.funil?.clienteFechado ?? 0}</div>
            <div className="text-xs text-green-700 mt-1">Cliente fechado</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-900">{data?.funil?.semInteresse ?? 0}</div>
            <div className="text-xs text-red-700 mt-1">Sem interesse</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{data?.funil?.naoRespondeu ?? 0}</div>
            <div className="text-xs text-gray-600 mt-1">Não respondeu</div>
          </div>
          <div className="text-center p-3 bg-green-100 rounded-lg">
            <div className="text-2xl font-bold text-green-900">
              R$ {(data?.funil?.valorFechado ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-green-700 mt-1">Valor fechado</div>
          </div>
        </div>
      </div>
    </div>
  );
}
