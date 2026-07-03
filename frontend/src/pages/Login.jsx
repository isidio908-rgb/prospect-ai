import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { LogIn, UserPlus } from 'lucide-react';

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [profession, setProfession] = useState('Gestor de Tráfego');
  const [primaryNiche, setPrimaryNiche] = useState('Imobiliário');
  const [internalContext, setInternalContext] = useState(
    'Atuar como gestor de tráfego consultivo, focado em prospecção, diagnóstico comercial, qualidade do lead, WhatsApp e geração de reuniões.'
  );
  const [loading, setLoading] = useState(false);
  
  const { login, register } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isRegister) {
        await register({
          email,
          password,
          name,
          profession,
          primary_niche: primaryNiche,
          internal_context: internalContext,
        });
        toast.success('Conta criada com sucesso!');
      } else {
        await login(email, password);
        toast.success('Login realizado com sucesso!');
      }
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary-600 dark:text-primary-400 mb-2">Prospect AI</h1>
          <p className="text-gray-600 dark:text-gray-400">Sistema de Prospecção Inteligente</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
          <div className="flex mb-6 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setIsRegister(false)}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                !isRegister ? 'bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 shadow' : 'text-gray-600 dark:text-gray-300'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setIsRegister(true)}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                isRegister ? 'bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 shadow' : 'text-gray-600 dark:text-gray-300'
              }`}
            >
              Criar Conta
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Nome
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input"
                  placeholder="Seu nome"
                  required={isRegister}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="seu@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            {isRegister && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Profissão / Função
                  </label>
                  <input
                    type="text"
                    value={profession}
                    onChange={(e) => setProfession(e.target.value)}
                    className="input"
                    placeholder="Ex: Gestor de Tráfego"
                    maxLength={255}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Nicho foco
                  </label>
                  <input
                    type="text"
                    value={primaryNiche}
                    onChange={(e) => setPrimaryNiche(e.target.value)}
                    className="input"
                    placeholder="Ex: Imobiliário, clínicas, restaurantes"
                    maxLength={255}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Personalização interna da IA
                  </label>
                  <textarea
                    value={internalContext}
                    onChange={(e) => setInternalContext(e.target.value)}
                    className="input min-h-[96px] resize-y"
                    placeholder="Explique como a IA deve pensar, escrever e priorizar para o seu trabalho."
                    maxLength={3000}
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Esse texto vira contexto interno dos prompts comerciais, diagnósticos e mensagens.
                  </p>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn btn-primary flex items-center justify-center gap-2"
            >
              {loading ? (
                'Carregando...'
              ) : isRegister ? (
                <>
                  <UserPlus className="w-5 h-5" />
                  Criar Conta
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Entrar
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-4">
          Prospect AI v1.0.0 - Sistema de Prospecção para Gestores de Tráfego
        </p>
      </div>
    </div>
  );
}