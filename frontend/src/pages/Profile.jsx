import { useState } from 'react';
import toast from 'react-hot-toast';
import { Save, User } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const DEFAULT_CONTEXT = 'Atuar como gestor de tráfego consultivo, focado em prospecção, diagnóstico comercial, qualidade do lead, WhatsApp e geração de reuniões.';

export default function Profile() {
  const { user, updateProfile } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || '',
    profession: user?.profession || 'Gestor de Tráfego',
    primary_niche: user?.primary_niche || '',
    internal_context: user?.internal_context || DEFAULT_CONTEXT,
  });

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      await updateProfile(form);
      toast.success('Perfil profissional atualizado');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao atualizar perfil');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Perfil Profissional</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Ajuste como a IA deve pensar, priorizar e escrever dentro da sua operação comercial.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-5">
        <div className="flex items-center gap-3 pb-3 border-b border-gray-200 dark:border-gray-700">
          <div className="p-2 rounded-lg bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-300">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Contexto usado nos prompts internos</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Esses dados alimentam diagnósticos, mensagens, e-mails, follow-ups, roteiros e propostas.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome</label>
            <input
              type="text"
              value={form.name}
              onChange={(event) => updateField('name', event.target.value)}
              className="input"
              placeholder="Seu nome"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Profissão / Função *</label>
            <input
              type="text"
              value={form.profession}
              onChange={(event) => updateField('profession', event.target.value)}
              className="input"
              placeholder="Ex: Gestor de Tráfego"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nicho foco</label>
          <input
            type="text"
            value={form.primary_niche}
            onChange={(event) => updateField('primary_niche', event.target.value)}
            className="input"
            placeholder="Ex: Imobiliário, clínicas, estética..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Personalização interna da IA</label>
          <textarea
            value={form.internal_context}
            onChange={(event) => updateField('internal_context', event.target.value)}
            className="input min-h-40"
            maxLength={3000}
            placeholder="Explique seu jeito de vender, tipo de cliente ideal, tom de abordagem e prioridades comerciais."
          />
          <div className="flex justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
            <span>Exemplo: foco em WhatsApp, rastreamento, CPL, reuniões qualificadas e diagnóstico consultivo.</span>
            <span>{form.internal_context.length}/3000</span>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-4 text-sm text-gray-600 dark:text-gray-300">
          <strong className="text-gray-900 dark:text-gray-100">Prévia do contexto:</strong>{' '}
          A IA responderá como {form.profession || 'profissional'}{form.primary_niche ? ` com foco em ${form.primary_niche}` : ''}, usando as instruções internas acima como regra de posicionamento.
        </div>

        <button type="submit" disabled={saving} className="btn btn-primary flex items-center gap-2">
          <Save className="w-5 h-5" />
          {saving ? 'Salvando...' : 'Salvar perfil'}
        </button>
      </form>
    </div>
  );
}
