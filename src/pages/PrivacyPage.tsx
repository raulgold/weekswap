import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function PrivacyPage() {
  const navigate = useNavigate();
  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-indigo-600 hover:underline text-sm font-medium"
      >
        <ArrowLeft size={16} /> Voltar
      </button>

      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
        <h1 className="text-3xl font-black text-gray-900 mb-2">Política de Privacidade</h1>
        <p className="text-sm text-gray-400 mb-8">Última atualização: março de 2026 · WeekSwap Intermediações Ltda.</p>

        <div className="space-y-6 text-sm text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-lg font-black text-gray-900 mb-2">1. Introdução e Controlador dos Dados</h2>
            <p>A <strong>WeekSwap Intermediações Ltda.</strong> ("WeekSwap", "nós") é a controladora dos dados pessoais coletados por meio de nossa plataforma. Esta Política descreve como coletamos, usamos, armazenamos e protegemos suas informações, em conformidade com a <strong>Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018)</strong>.</p>
          </section>

          <section>
            <h2 className="text-lg font-black text-gray-900 mb-2">2. Dados que Coletamos</h2>
            <div className="space-y-3">
              <div>
                <p className="font-bold">2.1 Dados fornecidos por você:</p>
                <ul className="list-disc pl-5 space-y-1 mt-1">
                  <li>Nome completo, endereço de e-mail, CPF;</li>
                  <li>Informações sobre suas semanas de multipropriedade (resort, datas, nº de certificado);</li>
                  <li>Dados de pagamento processados pelo gateway Asaas (não armazenamos dados de cartão).</li>
                </ul>
              </div>
              <div>
                <p className="font-bold">2.2 Dados coletados automaticamente:</p>
                <ul className="list-disc pl-5 space-y-1 mt-1">
                  <li>Endereço IP, tipo de navegador e dispositivo;</li>
                  <li>Páginas acessadas, tempo de sessão e histórico de navegação na plataforma;</li>
                  <li>Logs de transações e atividades financeiras.</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-black text-gray-900 mb-2">3. Finalidades do Tratamento</h2>
            <p>Utilizamos seus dados para:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Execução do contrato:</strong> criar e gerenciar sua conta, processar trocas e pagamentos, operar o sistema de escrow;</li>
              <li><strong>Cumprimento legal:</strong> prevenção à fraude, conformidade com obrigações fiscais e regulatórias, atendimento a ordens judiciais;</li>
              <li><strong>Interesse legítimo:</strong> segurança da plataforma, prevenção de chargebacks, análise de risco;</li>
              <li><strong>Consentimento:</strong> envio de comunicações de marketing (você pode cancelar a qualquer momento).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-black text-gray-900 mb-2">4. Compartilhamento de Dados</h2>
            <p>Seus dados poderão ser compartilhados com:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Parceiros de pagamento</strong> (Asaas) para processamento das transações financeiras;</li>
              <li><strong>Firebase/Google</strong> para autenticação e armazenamento de dados em nuvem;</li>
              <li><strong>Autoridades públicas</strong> quando exigido por lei ou ordem judicial;</li>
              <li><strong>Auditores e assessores jurídicos</strong> em caso de disputas.</li>
            </ul>
            <p className="mt-2 font-medium">Não vendemos, alugamos ou comercializamos seus dados pessoais com terceiros para fins de marketing.</p>
          </section>

          <section>
            <h2 className="text-lg font-black text-gray-900 mb-2">5. Retenção de Dados</h2>
            <p>Mantemos seus dados pelo tempo necessário para as finalidades descritas nesta Política. Após o encerramento da conta:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Dados de transações financeiras: 5 anos (obrigação fiscal);</li>
              <li>Logs de acesso: 6 meses (Marco Civil da Internet);</li>
              <li>Dados de conta: excluídos em até 30 dias após solicitação.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-black text-gray-900 mb-2">6. Segurança dos Dados</h2>
            <p>Adotamos medidas técnicas e organizacionais adequadas para proteger seus dados, incluindo:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Criptografia em trânsito (HTTPS/TLS) e em repouso;</li>
              <li>Autenticação segura via Firebase Authentication;</li>
              <li>Controle de acesso baseado em funções (RBAC) no banco de dados;</li>
              <li>Monitoramento de atividades suspeitas e bloqueio automático por risco.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-black text-gray-900 mb-2">7. Seus Direitos (LGPD)</h2>
            <p>Como titular de dados, você tem o direito de:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Acesso:</strong> solicitar uma cópia dos seus dados pessoais;</li>
              <li><strong>Correção:</strong> corrigir dados incompletos, inexatos ou desatualizados;</li>
              <li><strong>Exclusão:</strong> solicitar a eliminação dos seus dados (sujeito a obrigações legais de retenção);</li>
              <li><strong>Portabilidade:</strong> receber seus dados em formato estruturado;</li>
              <li><strong>Oposição:</strong> opor-se ao tratamento baseado em interesse legítimo;</li>
              <li><strong>Revogação do consentimento:</strong> retirar o consentimento para comunicações de marketing.</li>
            </ul>
            <p className="mt-2">Para exercer seus direitos, entre em contato: <a href="mailto:privacidade@weekswap.com" className="text-indigo-600 hover:underline">privacidade@weekswap.com</a></p>
          </section>

          <section>
            <h2 className="text-lg font-black text-gray-900 mb-2">8. Cookies</h2>
            <p>Utilizamos cookies essenciais para o funcionamento da plataforma (autenticação, segurança) e cookies analíticos para melhorar a experiência (com seu consentimento). Você pode gerenciar cookies nas configurações do seu navegador.</p>
          </section>

          <section>
            <h2 className="text-lg font-black text-gray-900 mb-2">9. Alterações nesta Política</h2>
            <p>Podemos atualizar esta Política periodicamente. Notificaremos alterações relevantes por e-mail ou aviso na plataforma com antecedência mínima de 15 dias. O uso continuado da plataforma após as alterações implica aceitação da nova versão.</p>
          </section>

          <section>
            <h2 className="text-lg font-black text-gray-900 mb-2">10. Contato e Encarregado (DPO)</h2>
            <p>Para questões relacionadas à privacidade: <a href="mailto:privacidade@weekswap.com" className="text-indigo-600 hover:underline">privacidade@weekswap.com</a></p>
            <p className="mt-1">Autoridade Nacional de Proteção de Dados (ANPD): <a href="https://www.gov.br/anpd" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">www.gov.br/anpd</a></p>
          </section>

        </div>
      </div>
    </div>
  );
}
