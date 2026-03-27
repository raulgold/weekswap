import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function TermsPage() {
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
        <h1 className="text-3xl font-black text-gray-900 mb-2">Termos de Uso</h1>
        <p className="text-sm text-gray-400 mb-8">Última atualização: março de 2026 · WeekSwap Intermediações Ltda.</p>

        <div className="prose prose-gray max-w-none space-y-6 text-sm text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-lg font-black text-gray-900 mb-2">1. Definições e Objeto</h2>
            <p>A <strong>WeekSwap</strong> é uma plataforma digital de intermediação para troca de semanas de multipropriedade (timeshare) entre usuários cadastrados. A WeekSwap <strong>não é parte das trocas</strong> realizadas, atuando exclusivamente como facilitadora e depositária temporária dos créditos envolvidos (sistema de escrow).</p>
            <p className="mt-2">Ao criar uma conta e utilizar a plataforma, o usuário declara ter lido, compreendido e concordado integralmente com estes Termos de Uso e com a Política de Privacidade.</p>
          </section>

          <section>
            <h2 className="text-lg font-black text-gray-900 mb-2">2. Cadastro e Responsabilidades do Usuário</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>O usuário deve ser maior de 18 anos e ter plena capacidade civil.</li>
              <li>Cada pessoa física pode ter apenas uma conta na plataforma.</li>
              <li>O usuário é responsável pela veracidade de todas as informações fornecidas, incluindo dados pessoais, informações sobre as semanas publicadas e número de certificado/contrato.</li>
              <li>É expressamente vedado o uso da plataforma para fins fraudulentos, lavagem de dinheiro ou qualquer atividade ilícita.</li>
              <li>O usuário deve manter a confidencialidade de sua senha e notificar imediatamente a WeekSwap sobre qualquer acesso não autorizado.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-black text-gray-900 mb-2">3. Publicação de Semanas e Titularidade</h2>
            <p>Ao publicar uma semana na plataforma, o usuário declara e garante que:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>É o legítimo titular do contrato de multipropriedade ou possui autorização expressa do titular para oferecer a semana para troca;</li>
              <li>O contrato está em situação regular junto à administradora do resort, sem pendências financeiras ou restrições que impeçam sua utilização;</li>
              <li>As informações sobre datas, resort, localização e características da unidade são verdadeiras e completas;</li>
              <li>A semana não foi oferecida simultaneamente em outra plataforma sem cancelamento prévio.</li>
            </ul>
            <p className="mt-2 text-red-600 font-medium">O envio de informações falsas resultará no cancelamento imediato da conta e pode ensejar responsabilidade civil e criminal.</p>
          </section>

          <section>
            <h2 className="text-lg font-black text-gray-900 mb-2">4. Processo de Troca</h2>
            <p>O fluxo de troca na WeekSwap segue as seguintes etapas:</p>
            <ol className="list-decimal pl-5 space-y-1 mt-2">
              <li><strong>Solicitação:</strong> O usuário interessado solicita a troca com o proprietário da semana desejada;</li>
              <li><strong>Confirmação:</strong> O proprietário analisa e aceita ou recusa a solicitação;</li>
              <li><strong>Pagamento da taxa:</strong> Após confirmação, o solicitante paga a taxa de serviço da WeekSwap (10% do valor da troca);</li>
              <li><strong>Escrow:</strong> Os valores ficam retidos na plataforma até a confirmação da entrega;</li>
              <li><strong>Finalização:</strong> O proprietário confirma a entrega da semana e os créditos são liberados.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-black text-gray-900 mb-2">5. Taxa de Serviço e Créditos</h2>
            <p>A WeekSwap cobra uma <strong>taxa de serviço de 10%</strong> sobre o valor de cada troca realizada. Esta taxa remunera os serviços de intermediação, sistema de escrow, suporte e infraestrutura tecnológica.</p>
            <p className="mt-2">Os créditos acumulados na plataforma podem ser utilizados exclusivamente para trocas de semanas dentro da WeekSwap. <strong>Os créditos não são conversíveis em dinheiro</strong>, não têm prazo de vencimento e não são transferíveis entre usuários.</p>
          </section>

          <section>
            <h2 className="text-lg font-black text-gray-900 mb-2">6. Programa de Indicação</h2>
            <p>Usuários que indicarem novos membros para a plataforma receberão créditos bônus quando o indicado realizar trocas, conforme tabela de comissões vigente (1% a 2,5% sobre o valor da troca, de acordo com o número de indicações ativas). Os créditos de indicação seguem as mesmas regras dos créditos regulares.</p>
          </section>

          <section>
            <h2 className="text-lg font-black text-gray-900 mb-2">7. Chargebacks, Disputas e Bloqueio de Conta</h2>
            <p>Em caso de contestação de pagamento (chargeback) iniciada pelo usuário junto à operadora do cartão ou instituição financeira, a WeekSwap irá:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Suspender imediatamente todos os créditos associados ao pagamento contestado;</li>
              <li>Bloquear preventivamente a conta do usuário até resolução da disputa;</li>
              <li>Reverter quaisquer trocas em andamento vinculadas aos créditos contestados.</li>
            </ul>
            <p className="mt-2">Chargebacks indevidos ou fraudulentos serão reportados aos órgãos competentes e a WeekSwap reserva-se o direito de cobrar os valores devidos por vias judiciais.</p>
          </section>

          <section>
            <h2 className="text-lg font-black text-gray-900 mb-2">8. Cancelamentos e Reembolsos</h2>
            <p>Uma troca pode ser cancelada por qualquer uma das partes antes da finalização. Em caso de cancelamento:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Se o cancelamento ocorrer antes do pagamento da taxa: nenhum valor é cobrado;</li>
              <li>Se ocorrer após o pagamento mas antes da finalização: a taxa de serviço (10%) é retida e o restante devolvido em créditos;</li>
              <li>Após a finalização: a troca é irrevogável.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-black text-gray-900 mb-2">9. Limitação de Responsabilidade</h2>
            <p>A WeekSwap não se responsabiliza por:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>A qualidade, condições ou disponibilidade efetiva das semanas oferecidas pelos usuários;</li>
              <li>Eventuais restrições impostas pelas administradoras dos resorts;</li>
              <li>Danos diretos ou indiretos decorrentes do uso da plataforma;</li>
              <li>Informações falsas ou enganosas fornecidas por outros usuários.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-black text-gray-900 mb-2">10. Rescisão</h2>
            <p>A WeekSwap poderá encerrar ou suspender a conta do usuário, sem aviso prévio, em caso de violação destes Termos, conduta fraudulenta, abuso do sistema de indicações ou qualquer atividade que prejudique a plataforma ou outros usuários.</p>
          </section>

          <section>
            <h2 className="text-lg font-black text-gray-900 mb-2">11. Legislação Aplicável e Foro</h2>
            <p>Estes Termos são regidos pelas leis da República Federativa do Brasil, especialmente pelo Código Civil, Código de Defesa do Consumidor (Lei nº 8.078/90), Marco Civil da Internet (Lei nº 12.965/14) e Lei Geral de Proteção de Dados (Lei nº 13.709/18). Fica eleito o foro da comarca de São Paulo/SP para dirimir quaisquer controvérsias.</p>
          </section>

          <section>
            <h2 className="text-lg font-black text-gray-900 mb-2">12. Contato</h2>
            <p>Dúvidas, reclamações ou solicitações podem ser enviadas para: <a href="mailto:suporte@weekswap.com" className="text-indigo-600 hover:underline">suporte@weekswap.com</a></p>
          </section>

        </div>
      </div>
    </div>
  );
}
