import {
  Bot,
  CheckCircle2,
  Columns3,
  HelpCircle,
  KeyRound,
  ListChecks,
  MessageCircle,
  Radar,
  ShieldCheck,
  Users,
} from 'lucide-react';

const sections = [
  { id: 'inicio', label: 'Primeiros passos', icon: ListChecks },
  { id: 'credenciais', label: 'Credenciais', icon: KeyRound },
  { id: 'coleta', label: 'Coleta', icon: Radar },
  { id: 'leads', label: 'Leads', icon: Users },
  { id: 'crm', label: 'CRM', icon: Columns3 },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { id: 'autopilot', label: 'Autopilot', icon: Bot },
  { id: 'seguranca', label: 'Segurança', icon: ShieldCheck },
];

export default function Help() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-primary-600 dark:text-primary-300">
          <HelpCircle className="h-5 w-5" />
          <span className="text-sm font-semibold uppercase">Ajuda</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Como usar o Prospect AI</h1>
        <p className="max-w-4xl text-gray-600 dark:text-gray-400">
          Guia operacional para configurar credenciais, coletar leads, trabalhar o CRM e ligar o Autopilot com segurança.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="card h-fit xl:sticky xl:top-6">
          <nav className="space-y-1">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  <Icon className="h-4 w-4" />
                  {section.label}
                </a>
              );
            })}
          </nav>
        </aside>

        <main className="space-y-6">
          <HelpSection id="inicio" icon={ListChecks} title="Primeiros passos">
            <StepList
              items={[
                'Complete o Perfil com profissão, nicho principal e WhatsApp pessoal para aprovar lotes.',
                'Cadastre pelo menos uma credencial de coleta ativa em Credenciais.',
                'Cadastre uma credencial LLM paga se quiser mensagens BDR/SDR melhores e histórico de custo.',
                'Conecte um número de WhatsApp em WhatsApp para enviar mensagens e receber respostas.',
                'Use Coletar para testes manuais e Autopilot para rotina recorrente.',
              ]}
            />
          </HelpSection>

          <HelpSection id="credenciais" icon={KeyRound} title="Credenciais">
            <InfoGrid
              cards={[
                ['Scraper/coleta', 'Use Serper, RapidAPI ou Apify como fonte de leads. A credencial precisa estar ativa e dentro do limite diário.'],
                ['LLM', 'Use credenciais pagas para tarefas de IA: diagnóstico, mensagem BDR, follow-up e SDR. O sistema registra tokens e custo estimado.'],
                ['Teste', 'Sempre use o botão de teste antes de ligar automações. Erro de credencial bloqueia coleta real.'],
              ]}
            />
          </HelpSection>

          <HelpSection id="coleta" icon={Radar} title="Coleta manual">
            <StepList
              items={[
                'Abra Coletar.',
                'Informe cidade, nicho ou busca direta.',
                'Escolha limite baixo no primeiro teste.',
                'Ative verificação de WhatsApp quando quiser priorizar contatos válidos.',
                'Depois da coleta, confira os registros em Leads e o histórico em Histórico.',
              ]}
            />
          </HelpSection>

          <HelpSection id="leads" icon={Users} title="Leads">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              A página Leads é o inventário da base. Ela serve para buscar, filtrar, importar, exportar, analisar e apagar registros.
              O Kanban comercial fica somente no CRM.
            </p>
            <Checklist
              items={[
                'Use filtros para encontrar leads por cidade, nicho, status, resposta e responsável.',
                'Selecione leads para análise em lote.',
                'Use Apagar apenas em registros de teste ou dados que realmente devem sair da base.',
                'Abra o detalhe do lead para ver diagnóstico, histórico e dados comerciais.',
              ]}
            />
          </HelpSection>

          <HelpSection id="crm" icon={Columns3} title="CRM Kanban">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              O CRM organiza o fluxo comercial. As etapas podem ser personalizadas pelo botão Personalizar CRM.
            </p>
            <Checklist
              items={[
                'Arraste cards entre etapas para atualizar o status comercial.',
                'Use edição rápida para responsável, próxima ação e valor potencial.',
                'Renomeie, reordene ou oculte etapas em Personalizar CRM.',
                'Os IDs internos continuam fixos para não quebrar automações e relatórios.',
              ]}
            />
          </HelpSection>

          <HelpSection id="whatsapp" icon={MessageCircle} title="WhatsApp">
            <StepList
              items={[
                'Abra WhatsApp e conecte o número por QR Code.',
                'Se usar mais de um número, defina o padrão para envio.',
                'Mantenha leitura automática desligada se quiser comportamento mais humano.',
                'Respostas recebidas atualizam o histórico e podem mover o lead para Respondeu.',
              ]}
            />
          </HelpSection>

          <HelpSection id="autopilot" icon={Bot} title="Autopilot: configuração correta">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-900/20 dark:text-amber-100">
              <strong>Regra principal:</strong> o Autopilot pode trabalhar sozinho, mas mensagens novas devem ficar com aprovação ativa até você confiar no fluxo, na credencial, no número e na copy.
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <GuideCard title="1. Pré-requisitos">
                <Checklist
                  items={[
                    'Credencial de coleta ativa.',
                    'Credencial LLM ativa para BDR/SDR.',
                    'WhatsApp conectado e saudável.',
                    'WhatsApp pessoal definido no Perfil para aprovar lotes.',
                    'Plano/billing com limite disponível.',
                  ]}
                />
              </GuideCard>

              <GuideCard title="2. Ligar coleta automática">
                <StepList
                  items={[
                    'Abra Autopilot.',
                    'Preencha Busca do dia, Cidade/Nicho e ID da credencial.',
                    'Clique em Ligar coleta automática desse alvo.',
                    'Confira se a coleta aparece como ativa no painel Modo automático real.',
                  ]}
                />
              </GuideCard>

              <GuideCard title="3. Ligar o daemon">
                <StepList
                  items={[
                    'No painel Modo automático real, clique em Ligar automático.',
                    'O backend roda ciclos sozinho pela agenda configurada.',
                    'Use Rodar ciclo agora para testar imediatamente.',
                    'Se algo der errado, clique em Pausar automático.',
                  ]}
                />
              </GuideCard>

              <GuideCard title="4. Aprovação e envio">
                <StepList
                  items={[
                    'Deixe Enviar pedido de aprovação para meu WhatsApp pessoal ligado.',
                    'O Autopilot cria lotes com mensagens novas.',
                    'Aprove pelo WhatsApp pessoal ou pela fila de aprovações.',
                    'Somente mensagens approved são enviadas pelo worker.',
                  ]}
                />
              </GuideCard>
            </div>

            <div className="mt-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">O que acontece em cada ciclo automático</h3>
              <ol className="mt-3 space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <li>1. Cancela follow-ups de leads que já responderam.</li>
                <li>2. Executa coletas recorrentes vencidas.</li>
                <li>3. Analisa leads elegíveis e gera abordagem BDR/SDR quando houver LLM.</li>
                <li>4. Cria fila ou lote de aprovação para mensagens novas.</li>
                <li>5. Processa mensagens já aprovadas, respeitando janela, limite e WhatsApp conectado.</li>
              </ol>
            </div>
          </HelpSection>

          <HelpSection id="seguranca" icon={ShieldCheck} title="Segurança operacional">
            <Checklist
              items={[
                'Comece sempre com limite baixo de leads e lote pequeno.',
                'Não desligue aprovação manual antes de validar respostas reais.',
                'Confira Custos e histórico LLM para evitar gasto invisível.',
                'Use Histórico para auditar coletas e falhas de provider.',
                'Se o WhatsApp desconectar, pause o automático antes de reconectar.',
              ]}
            />
          </HelpSection>
        </main>
      </div>
    </div>
  );
}

function HelpSection({ id, icon: Icon, title, children }) {
  return (
    <section id={id} className="card scroll-mt-6">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-5 w-5 text-primary-600 dark:text-primary-300" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function GuideCard({ title, children }) {
  return (
    <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
      <h3 className="font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function StepList({ items }) {
  return (
    <ol className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
      {items.map((item, index) => <li key={item}>{index + 1}. {item}</li>)}
    </ol>
  );
}

function Checklist({ items }) {
  return (
    <ul className="mt-3 space-y-2 text-sm text-gray-600 dark:text-gray-300">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600 dark:text-green-300" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function InfoGrid({ cards }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {cards.map(([title, description]) => (
        <div key={title} className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{description}</p>
        </div>
      ))}
    </div>
  );
}
