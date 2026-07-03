import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Radar, Loader2, MapPin, Info } from 'lucide-react';
import { leads, credentials } from '../services/api';

// Coordenadas de referência de algumas capitais para facilitar a busca
// geolocalizada (a Local Business Data usa lat/lng como centro da busca).
const CIDADES_REF = {
  'Cuiabá': { lat: -15.6014, lng: -56.0979 },
  'São Paulo': { lat: -23.5505, lng: -46.6333 },
  'Rio de Janeiro': { lat: -22.9068, lng: -43.1729 },
  'Goiânia': { lat: -16.6869, lng: -49.2648 },
  'Brasília': { lat: -15.7939, lng: -47.8828 },
};

const EMPTY_FORM = {
  credentialId: '',
  niche: '',
  city: '',
  query: '',
  lat: '',
  lng: '',
  region: 'br',
  language: 'pt',
  zoom: 13,
  limit: 20,
  extractEmailsAndContacts: false,
};

export default function Collect() {
  const navigate = useNavigate();
  const [creds, setCreds] = useState([]);
  const [loadingCreds, setLoadingCreds] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [collecting, setCollecting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    loadCredentials();
  }, []);

  const loadCredentials = async () => {
    try {
      const response = await credentials.list();
      const list = response.data.credentials || [];
      setCreds(list);
      // Pré-seleciona a primeira credencial ativa, se houver
      const firstActive = list.find((c) => c.status === 'active') || list[0];
      if (firstActive) {
        setForm((f) => ({ ...f, credentialId: String(firstActive.id) }));
      }
    } catch {
      toast.error('Erro ao carregar credenciais');
    } finally {
      setLoadingCreds(false);
    }
  };

  const handleCityChange = (city) => {
    const ref = CIDADES_REF[city];
    setForm((f) => ({
      ...f,
      city,
      lat: ref ? ref.lat : f.lat,
      lng: ref ? ref.lng : f.lng,
    }));
  };

  const buildQuery = () => {
    if (form.query.trim()) return form.query.trim();
    const parts = [form.niche, form.city].filter(Boolean);
    return parts.join(' em ');
  };

  const handleCollect = async (e) => {
    e.preventDefault();

    if (!form.credentialId) {
      toast.error('Selecione uma credencial');
      return;
    }
    const query = buildQuery();
    if (!query) {
      toast.error('Informe o nicho + cidade, ou uma busca livre');
      return;
    }

    setCollecting(true);
    setResult(null);
    try {
      const payload = {
        credentialId: Number(form.credentialId),
        query,
        city: form.city || undefined,
        niche: form.niche || undefined,
        limit: Number(form.limit) || 20,
        region: form.region || undefined,
        language: form.language || undefined,
        zoom: form.zoom ? Number(form.zoom) : undefined,
        extractEmailsAndContacts: form.extractEmailsAndContacts,
        ...(form.lat !== '' ? { lat: Number(form.lat) } : {}),
        ...(form.lng !== '' ? { lng: Number(form.lng) } : {}),
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

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Coletar Leads</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Busque empresas por nicho e cidade usando a Local Business Data (RapidAPI)
        </p>
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
            Nenhuma credencial ativa. Ative uma credencial em{' '}
            <button onClick={() => navigate('/credentials')} className="underline font-medium">
              Credenciais
            </button>{' '}
            antes de coletar.
          </p>
        </div>
      )}

      <form onSubmit={handleCollect} className="card space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Credencial *</label>
            <select
              value={form.credentialId}
              onChange={(e) => setForm({ ...form, credentialId: e.target.value })}
              className="input"
              disabled={loadingCreds}
            >
              <option value="">Selecione...</option>
              {creds.map((c) => (
                <option key={c.id} value={c.id} disabled={c.status !== 'active'}>
                  {c.name} {c.status !== 'active' ? `(${c.status})` : ''} — {c.used_today}/{c.daily_limit} hoje
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nicho</label>
            <input
              type="text"
              value={form.niche}
              onChange={(e) => setForm({ ...form, niche: e.target.value })}
              className="input"
              placeholder="Ex: imobiliárias"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cidade</label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => handleCityChange(e.target.value)}
              className="input"
              placeholder="Ex: Cuiabá"
              list="cidades-ref"
            />
            <datalist id="cidades-ref">
              {Object.keys(CIDADES_REF).map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Busca livre (opcional)
              <span className="text-xs text-gray-400 ml-1">substitui nicho + cidade</span>
            </label>
            <input
              type="text"
              value={form.query}
              onChange={(e) => setForm({ ...form, query: e.target.value })}
              className="input"
              placeholder='Ex: "clínicas de estética em Goiânia, GO"'
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <MapPin className="w-4 h-4 inline mr-1" />Latitude
            </label>
            <input
              type="number"
              step="any"
              value={form.lat}
              onChange={(e) => setForm({ ...form, lat: e.target.value })}
              className="input"
              placeholder="-15.6014"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <MapPin className="w-4 h-4 inline mr-1" />Longitude
            </label>
            <input
              type="number"
              step="any"
              value={form.lng}
              onChange={(e) => setForm({ ...form, lng: e.target.value })}
              className="input"
              placeholder="-56.0979"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantidade de leads</label>
            <input
              type="number"
              min="1"
              max="100"
              value={form.limit}
              onChange={(e) => setForm({ ...form, limit: e.target.value })}
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Região / Idioma</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
                className="input"
                placeholder="br"
              />
              <input
                type="text"
                value={form.language}
                onChange={(e) => setForm({ ...form, language: e.target.value })}
                className="input"
                placeholder="pt"
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.extractEmailsAndContacts}
                onChange={(e) => setForm({ ...form, extractEmailsAndContacts: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Extrair e-mails e contatos (consome mais cota — use só quando necessário)
              </span>
            </label>
          </div>
        </div>

        <div className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/40 rounded-lg p-3">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            Dica: informar latitude/longitude melhora a precisão da busca. Ao escolher uma cidade
            de referência, as coordenadas são preenchidas automaticamente. Leads duplicados são
            ignorados automaticamente.
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
          </div>

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
