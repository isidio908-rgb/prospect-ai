import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Radar, Loader2, Info, Shuffle, ChevronDown, Lock } from 'lucide-react';
import { leads, credentials } from '../services/api';
import { COUNTRIES } from '../data/geoPortuguese';
import { TIERS, MODIFICADORES } from '../data/niches';

const QTY_PRESETS = [10, 25, 50, 100];

const TIER_ACTIVE = {
  sky: 'border-sky-500 bg-sky-500/10 text-sky-600 dark:text-sky-300',
  purple: 'border-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-300',
  green: 'border-green-500 bg-green-500/10 text-green-600 dark:text-green-300',
};

export default function Collect() {
  const navigate = useNavigate();
  const [creds, setCreds] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loadingCreds, setLoadingCreds] = useState(true);
  const [collecting, setCollecting] = useState(false);
  const [result, setResult] = useState(null);

  // Formulário
  const [credentialId, setCredentialId] = useState('');
  const [niche, setNiche] = useState('');
  const [modifier, setModifier] = useState('');
  const [countryCode, setCountryCode] = useState('BR');
  const [stateUf, setStateUf] = useState('');
  const [city, setCity] = useState('');
  const [limit, setLimit] = useState(25);
  const [extractContacts, setExtractContacts] = useState(false);
  const [verifyWhatsAppExists, setVerifyWhatsAppExists] = useState(false);

  // UI dos nichos
  const [activeTier, setActiveTier] = useState(1);
  const [expandedTier, setExpandedTier] = useState(false);
  const [locks, setLocks] = useState({ niche: false, state: false, city: false, modifier: false });

  useEffect(() => {
    loadProviders();
    loadCredentials();
  }, []);

  const providersMap = Object.fromEntries(providers.map((p) => [p.type, p]));
  const selectedCred = creds.find((c) => String(c.id) === String(credentialId));
  const selectedType = selectedCred?.type;
  const isRapidApi = selectedType === 'rapidapi';

  const country = useMemo(() => COUNTRIES.find((c) => c.code === countryCode), [countryCode]);
  const stateObj = useMemo(() => country?.states.find((s) => s.uf === stateUf), [country, stateUf]);
  const cities = stateObj?.cidades || [];
  const tier = TIERS[activeTier - 1];

  const loadProviders = async () => {
    try {
      const response = await credentials.providers();
      setProviders(response.data.providers || []);
    } catch {
      /* labels complementares */
    }
  };

  const loadCredentials = async () => {
    try {
      const response = await credentials.list();
      const list = (response.data.credentials || []).filter((credential) => credential.category !== 'llm');
      setCreds(list);
      const firstActive = list.find((c) => c.status === 'active') || list[0];
      if (firstActive) setCredentialId(String(firstActive.id));
    } catch {
      toast.error('Erro ao carregar credenciais');
    } finally {
      setLoadingCreds(false);
    }
  };

  const toggleLock = (field) => setLocks((l) => ({ ...l, [field]: !l[field] }));

  const pickNiche = (query) => setNiche(query);
  const pickModifier = (mod) => setModifier((m) => (m === mod ? '' : mod));

  const onCountryChange = (code) => {
    setCountryCode(code);
    setStateUf('');
    setCity('');
  };

  const onStateChange = (uf) => {
    setStateUf(uf);
    setCity('');
  };

  const randomFill = () => {
    const allEsps = [...tier.top, ...tier.rest];
    if (!locks.niche) setNiche(allEsps[Math.floor(Math.random() * allEsps.length)].query);
    if (!locks.modifier) setModifier(MODIFICADORES[Math.floor(Math.random() * MODIFICADORES.length)]);
    if (!locks.state && country?.states.length) {
      const randState = country.states[Math.floor(Math.random() * country.states.length)];
      setStateUf(randState.uf);
      if (!locks.city && randState.cidades.length) {
        setCity(randState.cidades[Math.floor(Math.random() * randState.cidades.length)]);
      } else {
        setCity('');
      }
    } else if (!locks.city && stateObj?.cidades.length) {
      setCity(stateObj.cidades[Math.floor(Math.random() * stateObj.cidades.length)]);
    }
  };

  const buildQuery = () => {
    const fullNiche = [niche.trim(), modifier.trim()].filter(Boolean).join(' ');
    const parts = [city, stateObj?.nome, country?.name].filter(Boolean);
    const location = parts.join(', ');
    return { fullNiche, location, query: `${fullNiche} em ${location}` };
  };

  const handleCollect = async (e) => {
    e.preventDefault();
    if (!credentialId) return toast.error('Selecione uma credencial');
    if (!niche.trim()) return toast.error('Escolha um nicho ou digite a especialidade');
    if (!stateUf) return toast.error('Selecione ao menos o estado/região');

    const { fullNiche, query } = buildQuery();

    setCollecting(true);
    setResult(null);
    try {
      const payload = {
        credentialId: Number(credentialId),
        query,
        niche: fullNiche,
        city: city || undefined,
        limit: Number(limit) || 25,
        region: country?.gl || 'br',
        language: 'pt',
        extractEmailsAndContacts: isRapidApi ? extractContacts : false,
        verifyWhatsAppExists,
      };
      const response = await leads.collect(payload);
      setResult(response.data);
      toast.success(`Coleta concluída: ${response.data.saved} novos leads`);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao coletar leads');
    } finally {
      setCollecting(false);
    }
  };

  const hasActiveCredential = creds.some((c) => c.status === 'active');

  const LockButton = ({ field }) => (
    <button
      type="button"
      onClick={() => toggleLock(field)}
      title="Travar no aleatório"
      className={`inline-flex items-center justify-center w-6 h-6 rounded-md border transition-colors ${
        locks[field]
          ? 'border-primary-500 bg-primary-500/15 text-primary-600 dark:text-primary-300'
          : 'border-gray-300 dark:border-gray-600 text-gray-400 hover:text-primary-600'
      }`}
    >
      <Lock className="w-3 h-3" />
    </button>
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Coletar Leads</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Escolha o nicho e a localização — a busca é feita pela credencial selecionada
          </p>
        </div>
        <button
          type="button"
          onClick={randomFill}
          className="btn btn-secondary flex items-center gap-2 shrink-0"
        >
          <Shuffle className="w-4 h-4" /> Aleatório
        </button>
      </div>

      {!loadingCreds && creds.length === 0 && (
        <div className="card bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800">
          <p className="text-yellow-800 dark:text-yellow-300">
            Você ainda não cadastrou nenhuma credencial de API.{' '}
            <button onClick={() => navigate('/credentials')} className="underline font-medium">
              Cadastrar credencial
            </button>
          </p>
        </div>
      )}

      {!loadingCreds && creds.length > 0 && !hasActiveCredential && (
        <div className="card bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800">
          <p className="text-orange-800 dark:text-orange-300">
            Nenhuma credencial ativa. Ative uma em{' '}
            <button onClick={() => navigate('/credentials')} className="underline font-medium">
              Credenciais
            </button>.
          </p>
        </div>
      )}

      <form onSubmit={handleCollect} className="space-y-6">
        {/* Credencial / Fonte */}
        <div className="card space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fonte de coleta (credencial) *</label>
          <select
            value={credentialId}
            onChange={(e) => setCredentialId(e.target.value)}
            className="input"
            disabled={loadingCreds}
          >
            <option value="">Selecione...</option>
            {creds.map((c) => (
              <option key={c.id} value={c.id} disabled={c.status !== 'active'}>
                {c.name} [{providersMap[c.type]?.label || c.type}] {c.status !== 'active' ? `(${c.status})` : ''} — {c.used_today}/{c.daily_limit} hoje
              </option>
            ))}
          </select>
          {selectedCred && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Provedor: <span className="font-medium">{providersMap[selectedType]?.label || selectedType}</span>
            </p>
          )}
        </div>

        {/* Nicho */}
        <div className="card space-y-4">
          <div className="flex items-center gap-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Especialidade / Nicho *</label>
            <LockButton field="niche" />
          </div>
          <input
            type="text"
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            className="input"
            placeholder="Selecione um nicho abaixo ou escreva manualmente..."
          />

          {/* Tabs de tier */}
          <div className="flex gap-2">
            {TIERS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => { setActiveTier(t.id); setExpandedTier(false); }}
                className={`flex-1 py-2 px-2 rounded-lg text-xs font-semibold border transition-colors ${
                  activeTier === t.id
                    ? TIER_ACTIVE[t.color]
                    : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Chips top 5 */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-2">Top 5</p>
            <div className="flex flex-wrap gap-2">
              {tier.top.map((esp) => (
                <button
                  key={esp.query}
                  type="button"
                  onClick={() => pickNiche(esp.query)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    niche === esp.query
                      ? 'border-primary-500 bg-primary-500/15 text-primary-600 dark:text-primary-300'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-primary-400'
                  }`}
                >
                  {esp.nome}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setExpandedTier((v) => !v)}
            className="text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-primary-600 flex items-center gap-1"
          >
            {expandedTier ? 'Ver menos' : `Ver mais ${tier.rest.length} nichos`}
            <ChevronDown className={`w-3 h-3 transition-transform ${expandedTier ? 'rotate-180' : ''}`} />
          </button>

          {expandedTier && (
            <div className="flex flex-wrap gap-2">
              {tier.rest.map((esp) => (
                <button
                  key={esp.query}
                  type="button"
                  onClick={() => pickNiche(esp.query)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    niche === esp.query
                      ? 'border-primary-500 bg-primary-500/15 text-primary-600 dark:text-primary-300'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-primary-400'
                  }`}
                >
                  {esp.nome}
                </button>
              ))}
            </div>
          )}

          {/* Modificador */}
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Modificador</span>
              <span className="text-xs text-gray-400">opcional — concatena ao nicho</span>
              <div className="ml-auto"><LockButton field="modifier" /></div>
            </div>
            <div className="flex flex-wrap gap-2 mb-2">
              {MODIFICADORES.map((mod) => (
                <button
                  key={mod}
                  type="button"
                  onClick={() => pickModifier(mod)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    modifier === mod
                      ? 'border-primary-500 bg-primary-500/15 text-primary-600 dark:text-primary-300'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-primary-400'
                  }`}
                >
                  {mod}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={modifier}
              onChange={(e) => setModifier(e.target.value)}
              className="input"
              placeholder="Ex: premium, 24h, especializado..."
            />
          </div>
        </div>

        {/* Localização */}
        <div className="card space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">País *</label>
              <select value={countryCode} onChange={(e) => onCountryChange(e.target.value)} className="input">
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Estado / Região *</label>
                <LockButton field="state" />
              </div>
              <select value={stateUf} onChange={(e) => onStateChange(e.target.value)} className="input">
                <option value="">Selecione...</option>
                {country?.states.map((s) => (
                  <option key={s.uf} value={s.uf}>{s.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Cidade <span className="text-xs text-gray-400 font-normal">(opcional)</span></label>
                <LockButton field="city" />
              </div>
              <select value={city} onChange={(e) => setCity(e.target.value)} className="input" disabled={!stateUf}>
                <option value="">{stateUf ? 'Todas as cidades' : 'Selecione o estado primeiro'}</option>
                {cities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            A cidade é opcional: sem ela, a busca cobre o estado/região inteiro.
          </p>
        </div>

        {/* Quantidade */}
        <div className="card space-y-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Quantidade de leads</label>
          <div className="flex gap-2">
            {QTY_PRESETS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setLimit(n)}
                className={`flex-1 py-2 rounded-lg font-semibold border transition-colors ${
                  Number(limit) === n
                    ? 'border-primary-500 bg-primary-500/15 text-primary-600 dark:text-primary-300'
                    : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-primary-400'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <input
            type="number"
            min="1"
            max="500"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            className="input"
            placeholder="Quantidade personalizada..."
          />

          {isRapidApi && (
            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={extractContacts}
                onChange={(e) => setExtractContacts(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Extrair e-mails e contatos (consome mais cota)
              </span>
            </label>
          )}

          <label className="flex items-start gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={verifyWhatsAppExists}
              onChange={(e) => setVerifyWhatsAppExists(e.target.checked)}
              className="w-4 h-4 mt-0.5"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Verificar se o telefone existe no WhatsApp antes de salvar
              <span className="block text-xs text-gray-500 dark:text-gray-400">
                Requer WhatsApp conectado. Quando ativo, só salva leads com WhatsApp confirmado.
              </span>
            </span>
          </label>
        </div>
        <div className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/40 rounded-lg p-3">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            Dica: use os atalhos de nicho por tier para preencher rápido. Leads duplicados são
            ignorados automaticamente na coleta.
          </span>
        </div>

        <button
          type="submit"
          disabled={collecting || !hasActiveCredential}
          className="btn btn-primary flex items-center gap-2"
        >
          {collecting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Radar className="w-5 h-5" />}
          {collecting ? 'Coletando...' : 'Coletar Leads'}
        </button>
      </form>

      {result && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Resultado da coleta</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <ResultStat label="Encontrados" value={result.total} color="text-gray-900 dark:text-gray-100" />
            <ResultStat label="Novos salvos" value={result.saved} color="text-green-600 dark:text-green-400" />
            <ResultStat label="Duplicados" value={result.duplicates} color="text-yellow-600 dark:text-yellow-400" />
            <ResultStat label="Erros" value={result.errors} color="text-red-600 dark:text-red-400" />
            {result.whatsappVerification?.enabled && (
              <ResultStat label="WhatsApp OK" value={result.whatsappVerification.verified} color="text-green-600 dark:text-green-400" />
            )}
          </div>

          {result.whatsappVerification?.enabled && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Verificação WhatsApp: {result.whatsappVerification.verified} confirmados,{' '}
              {result.whatsappVerification.rejected} rejeitados e{' '}
              {result.whatsappVerification.withoutPhone} sem telefone.
            </p>
          )}

          {result.credential && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Cota da credencial: {result.credential.used}/{result.credential.limit} hoje
              ({result.credential.remaining} restantes)
            </p>
          )}

          <button onClick={() => navigate('/leads')} className="btn btn-secondary">
            Ver leads coletados
          </button>
        </div>
      )}
    </div>
  );
}

function ResultStat({ label, value, color }) {
  return (
    <div className="text-center p-3 bg-gray-50 dark:bg-gray-900/40 rounded-lg">
      <div className={`text-2xl font-bold ${color}`}>{value ?? 0}</div>
      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{label}</div>
    </div>
  );
}
