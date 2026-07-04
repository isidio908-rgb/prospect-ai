import { useEffect, useState } from 'react';
import { stats } from '../services/api';
import { TrendingUp, Users, Target, Award, MessageCircle, Filter, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const PERIOD_OPTIONS = [
  { value: 'all', label: 'Todo período' },
  { value: 'today', label: 'Hoje' },
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: '90d', label: 'Últimos 90 dias' },
  { value: 'month', label: 'Mês atual' },
  { value: 'custom', label: 'Personalizado' },
];

function buildStatsParams(filters) {
  const params = {
    period: filters.period,
    fonte: filters.fonte,
  };

  if (filters.period === 'custom') {
    if (filters.dateFrom) params.dateFrom = filters.dateFrom;
    if (filters.dateTo) params.dateTo = filters.dateTo;
  }

  return params;
}

function getPeriodLabel(period) {
  return PERIOD_OPTIONS.find((option) => option.value === period)?.label || 'Todo período';
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    period: 'all',
    fonte: 'all',
    dateFrom: '',
    dateTo: '',
  });

  useEffect(() => {
    loadStats(filters);
  }, [filters]);

  const loadStats = async (currentFilters = filters) => {
    setLoading(true);
    try {
      const response = await stats.get(buildStatsParams(currentFilters));
      setData(response.data);
    } catch (error) {
      toast.error('Erro ao carregar estatísticas');
    } finally {
      setLoading(false);
    }
  };

  const updateFilter = (field, value) => {
    setFilters((current) => ({ ...current, [field]: value }));
  };

  const clearFilters = () => {
    setFilters({ period: 'all', fonte: 'all', dateFrom: '', dateTo: '' });
  };

  if (loading && !data) {
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
    { title: 'WhatsApp Confirmado', value: data?.presenca?.comWhatsappConfirmado || 0, icon: MessageCircle, color: 'bg-emerald-500' },
  ];

  const selectedSourceLabel = filters.fonte === 'all' ? 'Todas as fontes' : filters.fonte;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">Visão geral da sua prospecção</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-gray-600 dark:text-gray-400">
          <span className="badge badge-info">{getPeriodLabel(filters.period)}</span>
          <span className="badge badge-info">Fonte: {selectedSourceLabel}</span>
          {loading && <span className="badge badge-warning">Atualizando...</span>}
        </div>
      </div>

      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Filtros comerciais</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          <label className="space-y-1">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Período</span>
            <select
              value={filters.period}
              onChange={(event) => updateFilter('period', event.target.value)}
              className="input w-full"
            >
              {PERIOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Fonte</span>
            <select
              value={filters.fonte}
              onChange={(event) => updateFilter('fonte', event.target.value)}
              className="input w-full"
            >
              <option value="all">Todas as fontes</option>
              {(data?.availableSources || []).map((source) => (
                <option key={source.fonte} value={source.fonte}>
                  {source.fonte} ({source.total})
                </option>
              ))}
            </select>
          </label>

          {filters.period === 'custom' && (
            <>
              <label className="space-y-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Início</span>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(event) => updateFilter('dateFrom', event.target.value)}
                  className="input w-full"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Fim</span>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(event) => updateFilter('dateTo', event.target.value)}
                  className="input w-full"
                />
              </label>
            </>
          )}

          <div className="flex items-end gap-2">
            <button type="button" onClick={clearFilters} className="btn-secondary w-full">
              Limpar
            </button>
            <button type="button" onClick={() => loadStats()} className="btn-secondary px-3" title="Atualizar dashboard">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
          Os filtros recalculam totais, funil, presença digital e conversões usando a data de coleta do lead.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
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
        <TopList title="Top Cidades" items={data?.topCidades || []} labelKey="cidade" valueSuffix="leads" />
        <TopList title="Top Nichos" items={data?.topNichos || []} labelKey="nicho" valueSuffix="leads" />
      </div>

      {/* Presença técnica */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Presença Digital dos Leads</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Sem site', value: data?.presenca?.semSite },
            { label: 'Com site', value: data?.presenca?.comSite },
            { label: 'Com telefone', value: data?.presenca?.comTelefone },
            { label: 'WhatsApp confirmado', value: data?.presenca?.comWhatsappConfirmado },
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
          Métricas de presença técnica consideram apenas leads já analisados quando dependem da auditoria do site.
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

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <ConversionTable
          title="Fontes de Coleta"
          rows={data?.porFonte || []}
          labelKey="fonte"
          metricLabel="Oportunidades"
          metricKey="oportunidades"
          rateKey="taxaOportunidade"
        />
        <ConversionTable
          title="Conversão por Nicho"
          rows={data?.conversaoPorNicho || []}
          labelKey="nicho"
          metricLabel="Avançados"
          metricKey="avancados"
          rateKey="taxaAvanco"
        />
        <ConversionTable
          title="Conversão por Cidade"
          rows={data?.conversaoPorCidade || []}
          labelKey="cidade"
          metricLabel="Avançados"
          metricKey="avancados"
          rateKey="taxaAvanco"
        />
      </div>
    </div>
  );
}

function TopList({ title, items, labelKey, valueSuffix }) {
  return (
    <div className="card">
      <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">{title}</h2>
      <div className="space-y-2">
        {items.slice(0, 5).map((item, index) => (
          <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
            <span className="text-gray-700 dark:text-gray-300">{item[labelKey]}</span>
            <span className="badge badge-info">{item.count} {valueSuffix}</span>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhum dado disponível</p>
        )}
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

function ConversionTable({ title, rows, labelKey, metricLabel, metricKey, rateKey }) {
  return (
    <div className="card">
      <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">{title}</h2>
      <div className="space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum dado disponível</p>
        ) : rows.map((row) => (
          <div key={row[labelKey]} className="border-b border-gray-100 dark:border-gray-700 last:border-0 pb-3 last:pb-0">
            <div className="flex justify-between gap-3 text-sm mb-1">
              <span className="font-medium text-gray-800 dark:text-gray-200 truncate">{row[labelKey]}</span>
              <span className="text-gray-500 dark:text-gray-400 whitespace-nowrap">{row.total} leads</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
              <span>{metricLabel}: {row[metricKey]}</span>
              <span>{row[rateKey]}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div className="bg-primary-500 h-2 rounded-full" style={{ width: `${Math.min(row[rateKey] || 0, 100)}%` }}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
