import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeftRight, Check, X, Clock, AlertCircle,
  ChevronDown, ChevronUp, FileText, QrCode, CreditCard,
  ExternalLink, Copy, Smartphone
} from 'lucide-react';
import { api } from '../lib/api';
import { useGeo } from '../lib/GeoContext';

interface ExchangesPageProps {
  userId: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending:   { label: 'Aguardando confirmação', color: 'bg-amber-100 text-amber-700',    icon: Clock },
  confirmed: { label: 'Confirmada',             color: 'bg-blue-100 text-blue-700',      icon: Check },
  FINALIZED: { label: 'Finalizada',             color: 'bg-emerald-100 text-emerald-700', icon: Check },
  cancelled: { label: 'Cancelada',              color: 'bg-red-100 text-red-700',        icon: X },
};

export function ExchangesPage({ userId }: ExchangesPageProps) {
  const { country, EXCHANGE_FEE_PTS, EXCHANGE_FEE_LABEL } = useGeo();
  const [exchanges, setExchanges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showContractId, setShowContractId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'FINALIZED' | 'cancelled'>('all');
  const [payingExchangeId, setPayingExchangeId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState(100);
  const [payBillingType, setPayBillingType] = useState<'PIX' | 'BOLETO' | 'CREDIT_CARD'>('PIX');
  const [payLoading, setPayLoading] = useState(false);
  const [payResult, setPayResult] = useState<any | null>(null);
  const [pixCopied, setPixCopied] = useState(false);

  const fetchExchanges = useCallback(async () => {
    try {
      const data = await api.getExchanges(userId);
      setExchanges(data.exchanges);
    } catch (error) {
      console.error('Erro ao buscar trocas:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetchExchanges(); }, [fetchExchanges]);

  const handleConfirm = async (exchangeId: string) => {
    setActionLoading(exchangeId + '_confirm');
    try {
      await api.confirmExchange(userId, exchangeId);
      fetchExchanges();
    } catch (err: any) {
      alert(err.message || 'Erro ao confirmar troca');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (exchangeId: string) => {
    if (!confirm('Tem certeza que deseja cancelar esta troca?')) return;
    setActionLoading(exchangeId + '_cancel');
    try {
      await api.cancelExchange(userId, exchangeId);
      fetchExchanges();
    } catch (err: any) {
      alert(err.message || 'Erro ao cancelar troca');
    } finally {
      setActionLoading(null);
    }
  };

  const handleComplete = async (exchangeId: string) => {
    const feeMsg = country === 'BR'
      ? `Taxa WeekSwap: R$100 (10.000 pts) será debitada da sua conta.`
      : `Taxa WeekSwap: USD 50 (25.500 pts) será debitada da sua conta.`;
    if (!confirm(`Confirma a finalização desta troca?\n\n${feeMsg}\n\nOs créditos serão liberados após a dedução da taxa.`)) return;
    setActionLoading(exchangeId + '_complete');
    try {
      await api.completeExchange(userId, exchangeId, country);
      fetchExchanges();
    } catch (err: any) {
      alert(err.message || 'Erro ao finalizar troca');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePayExchange = async () => {
    if (!payingExchangeId) return;
    setPayLoading(true);
    try {
      const result = await api.createAsaasPayment(userId, payAmount, payBillingType, payingExchangeId);
      setPayResult(result);
    } catch (err: any) {
      alert(err.message || 'Erro ao criar pagamento');
    } finally {
      setPayLoading(false);
    }
  };

  const handleCopyPix = () => {
    if (payResult?.pixData?.copyPaste) {
      navigator.clipboard.writeText(payResult.pixData.copyPaste);
      setPixCopied(true);
      setTimeout(() => setPixCopied(false), 3000);
    }
  };

  const closePayModal = () => {
    setPayingExchangeId(null);
    setPayResult(null);
    setPixCopied(false);
    fetchExchanges();
  };

  const filtered = filter === 'all' ? exchanges : exchanges.filter(e => e.exchange_status === filter);
  const counts = {
    all: exchanges.length,
    pending: exchanges.filter(e => e.exchange_status === 'pending').length,
    confirmed: exchanges.filter(e => e.exchange_status === 'confirmed').length,
    FINALIZED: exchanges.filter(e => e.exchange_status === 'FINALIZED').length,
    cancelled: exchanges.filter(e => e.exchange_status === 'cancelled').length,
  };

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
    </div>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Minhas Trocas</h1>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {([['all','Todas'], ['pending','Pendentes'], ['confirmed','Confirmadas'], ['FINALIZED','Finalizadas'], ['cancelled','Canceladas']] as const).map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              filter === val ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {label} {counts[val] > 0 && <span className="ml-1 opacity-75">({counts[val]})</span>}
          </button>
        ))}
      </div>

      {/* Aviso de como funciona */}
      {counts.pending > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold text-amber-800">Você tem solicitações pendentes</p>
            <p className="text-amber-700 mt-0.5">
              Revise as trocas abaixo e confirme ou recuse. Quando o dono confirmar, a troca avança para pagamento.
            </p>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <ArrowLeftRight size={48} className="mx-auto mb-4 opacity-50" />
          <p className="font-medium">Nenhuma troca encontrada</p>
          <p className="text-sm mt-1">Vá até "Semanas" para solicitar sua primeira troca</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((exchange, i) => {
            const status = STATUS_CONFIG[exchange.exchange_status] || {
              label: exchange.exchange_status, color: 'bg-gray-100 text-gray-700', icon: Clock
            };
            const StatusIcon = status.icon;
            const isOwner = exchange.role === 'owner';
            const isExpanded = expandedId === exchange.id;

            return (
              <motion.div
                key={exchange.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
              >
                {/* Header */}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="font-black text-gray-900">Troca #{exchange.id.slice(0, 8).toUpperCase()}</p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {isOwner ? '📌 Você é o proprietário da semana solicitada' : '🔍 Você solicitou esta troca'}
                      </p>
                    </div>
                    <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${status.color}`}>
                      <StatusIcon size={12} />
                      {status.label}
                    </span>
                  </div>

                  {/* Semanas envolvidas (resumo) */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400 mb-1">Semana oferecida</p>
                      <p className="text-sm font-bold text-gray-700">{exchange.offered_week_id?.slice(0, 8) || '—'}</p>
                    </div>
                    <div className="bg-indigo-50 rounded-xl p-3">
                      <p className="text-xs text-indigo-400 mb-1">Semana solicitada</p>
                      <p className="text-sm font-bold text-indigo-700">{exchange.requested_week_id?.slice(0, 8) || '—'}</p>
                    </div>
                  </div>

                  {/* Detalhes financeiros (se finalizada) */}
                  {exchange.exchange_status === 'FINALIZED' && (
                    <div className="bg-emerald-50 rounded-xl p-4 mb-4 text-center">
                      <p className="text-xs text-gray-500 mb-1">Taxa de finalização cobrada</p>
                      <p className="font-black text-amber-600 text-lg">
                        {exchange.fee_pts
                          ? `${Number(exchange.fee_pts).toLocaleString('pt-BR')} pts`
                          : '10.000 pts'}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {exchange.fee_country === 'BR' ? 'R$100 — Brasil' : 'USD 50 — Internacional'}
                      </p>
                    </div>
                  )}

                  {/* Botão ver mais */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : exchange.id)}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-4"
                  >
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    {isExpanded ? 'Ocultar detalhes' : 'Ver detalhes e ações'}
                  </button>

                  {/* Ações */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-gray-100 pt-4 space-y-3">

                          {/* Owner vê solicitação pendente → pode confirmar ou recusar */}
                          {isOwner && exchange.exchange_status === 'pending' && (
                            <div className="space-y-2">
                              <p className="text-sm font-bold text-gray-700">Um usuário quer trocar semanas com você:</p>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleConfirm(exchange.id)}
                                  disabled={actionLoading === exchange.id + '_confirm'}
                                  className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-2.5 rounded-xl font-bold hover:bg-green-700 transition-colors disabled:opacity-50 text-sm"
                                >
                                  <Check size={16} />
                                  {actionLoading === exchange.id + '_confirm' ? 'Confirmando...' : 'Aceitar Troca'}
                                </button>
                                <button
                                  onClick={() => handleCancel(exchange.id)}
                                  disabled={actionLoading === exchange.id + '_cancel'}
                                  className="flex-1 flex items-center justify-center gap-2 bg-red-50 text-red-600 py-2.5 rounded-xl font-bold hover:bg-red-100 transition-colors disabled:opacity-50 text-sm"
                                >
                                  <X size={16} />
                                  Recusar
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Solicitante vê que está pendente → pode cancelar */}
                          {!isOwner && exchange.exchange_status === 'pending' && (
                            <div className="space-y-2">
                              <p className="text-sm text-gray-500">Aguardando o proprietário aceitar sua solicitação.</p>
                              <button
                                onClick={() => handleCancel(exchange.id)}
                                disabled={actionLoading === exchange.id + '_cancel'}
                                className="flex items-center justify-center gap-2 w-full bg-red-50 text-red-600 py-2.5 rounded-xl font-bold hover:bg-red-100 transition-colors text-sm"
                              >
                                <X size={16} />
                                Cancelar Solicitação
                              </button>
                            </div>
                          )}

                          {/* Confirmed → owner pode finalizar / qualquer um pode cancelar */}
                          {exchange.exchange_status === 'confirmed' && (
                            <div className="space-y-3">
                              <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-700">
                                <p className="font-bold mb-1">✅ Troca confirmada!</p>
                                {isOwner ? (
                                  <>
                                    <p>Confirme a entrega quando tudo estiver resolvido.</p>
                                    <p className="mt-1 text-xs text-amber-700 font-semibold">
                                      Taxa de finalização: {EXCHANGE_FEE_LABEL} ({EXCHANGE_FEE_PTS.toLocaleString('pt-BR')} pts) será debitada da sua conta.
                                    </p>
                                  </>
                                ) : (
                                  <p>Aguardando o proprietário confirmar a entrega. Se precisar comprar pontos para cobrir o diferencial, vá em "Semanas".</p>
                                )}
                              </div>

                              {!isOwner && (
                                <button
                                  onClick={() => setPayingExchangeId(exchange.id)}
                                  className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-xl font-black hover:bg-green-700 transition-colors"
                                >
                                  <QrCode size={18} />
                                  Pagar Agora (PIX / Boleto / Cartão)
                                </button>
                              )}

                              {isOwner && (
                                <button
                                  onClick={() => handleComplete(exchange.id)}
                                  disabled={actionLoading === exchange.id + '_complete'}
                                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 rounded-xl font-black hover:bg-emerald-700 transition-colors disabled:opacity-50"
                                >
                                  <Check size={18} />
                                  {actionLoading === exchange.id + '_complete' ? 'Finalizando...' : 'Confirmar Entrega e Finalizar'}
                                </button>
                              )}

                              {['pending', 'confirmed'].includes(exchange.exchange_status) && (
                                <button
                                  onClick={() => handleCancel(exchange.id)}
                                  disabled={actionLoading === exchange.id + '_cancel'}
                                  className="w-full flex items-center justify-center gap-2 text-red-500 py-2 text-sm font-medium hover:text-red-700 transition-colors"
                                >
                                  <X size={14} /> Cancelar troca
                                </button>
                              )}
                            </div>
                          )}

                          {/* Ver contrato */}
                          {exchange.exchange_status === 'FINALIZED' && (
                            <button
                              onClick={() => setShowContractId(exchange.id)}
                              className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-bold hover:bg-gray-200 transition-colors text-sm"
                            >
                              <FileText size={16} />
                              Ver Comprovante da Troca
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modal de Pagamento da Troca */}
      <AnimatePresence>
        {payingExchangeId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={e => e.target === e.currentTarget && closePayModal()}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h3 className="text-xl font-black text-gray-900">
                  {payResult ? 'Realizar Pagamento' : 'Pagar Troca'}
                </h3>
                <button onClick={closePayModal} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>

              <div className="p-6">
                {!payResult ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Valor da troca (R$)</label>
                      <input
                        type="number"
                        min={1}
                        value={payAmount}
                        onChange={e => setPayAmount(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Compra de pontos para cobrir diferencial de semanas
                      </p>
                    </div>

                    <div className="space-y-2">
                      {[
                        { type: 'PIX' as const, label: 'PIX', desc: 'Instantâneo', icon: QrCode },
                        { type: 'BOLETO' as const, label: 'Boleto', desc: 'Até 3 dias úteis', icon: ExternalLink },
                        { type: 'CREDIT_CARD' as const, label: 'Cartão de Crédito', desc: 'Aprovação imediata', icon: CreditCard },
                      ].map(({ type, label, desc, icon: Icon }) => (
                        <button
                          key={type}
                          onClick={() => setPayBillingType(type)}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                            payBillingType === type ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <Icon size={20} className={payBillingType === type ? 'text-indigo-600' : 'text-gray-400'} />
                          <div className="text-left">
                            <p className="text-sm font-bold text-gray-900">{label}</p>
                            <p className="text-xs text-gray-500">{desc}</p>
                          </div>
                          {payBillingType === type && (
                            <div className="ml-auto w-4 h-4 bg-indigo-600 rounded-full flex items-center justify-center">
                              <Check size={10} className="text-white" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={handlePayExchange}
                      disabled={payLoading}
                      className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                      {payLoading ? 'Gerando cobrança...' : `Pagar R$ ${payAmount.toFixed(2)}`}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {payResult.billingType === 'PIX' && payResult.pixData && (
                      <div className="space-y-4">
                        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
                          <p className="text-green-700 font-bold">PIX gerado com sucesso!</p>
                          <p className="text-xs text-green-600 mt-1">Escaneie o QR code ou copie o código</p>
                        </div>
                        <div className="flex justify-center">
                          <img
                            src={`data:image/png;base64,${payResult.pixData.qrCodeImage}`}
                            alt="QR Code PIX"
                            className="w-44 h-44 rounded-xl border border-gray-200"
                          />
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-xs text-gray-500 mb-2">Código copia e cola:</p>
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-mono flex-1 truncate text-gray-700">{payResult.pixData.copyPaste}</p>
                            <button
                              onClick={handleCopyPix}
                              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                                pixCopied ? 'bg-green-500 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                              }`}
                            >
                              {pixCopied ? <Check size={12} /> : <Copy size={12} />}
                              {pixCopied ? 'Copiado!' : 'Copiar'}
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 rounded-xl p-3">
                          <Smartphone size={16} />
                          <span>Abra o app do seu banco e escaneie o QR ou cole o código PIX</span>
                        </div>
                      </div>
                    )}

                    {payResult.billingType === 'BOLETO' && (
                      <div className="space-y-3">
                        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-center">
                          <p className="text-blue-700 font-bold">Boleto gerado!</p>
                        </div>
                        {payResult.boletoUrl && (
                          <a href={payResult.boletoUrl} target="_blank" rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full bg-blue-600 text-white py-4 rounded-2xl font-black hover:bg-blue-700 transition-colors"
                          >
                            <ExternalLink size={18} /> Abrir Boleto
                          </a>
                        )}
                      </div>
                    )}

                    {payResult.billingType === 'CREDIT_CARD' && payResult.invoiceUrl && (
                      <div className="space-y-3">
                        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 text-center">
                          <p className="text-purple-700 font-bold">Cobrança criada!</p>
                        </div>
                        <a href={payResult.invoiceUrl} target="_blank" rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 w-full bg-purple-600 text-white py-4 rounded-2xl font-black hover:bg-purple-700 transition-colors"
                        >
                          <CreditCard size={18} /> Pagar com Cartão
                        </a>
                      </div>
                    )}

                    <button
                      onClick={closePayModal}
                      className="w-full bg-gray-100 text-gray-700 py-3 rounded-2xl font-bold hover:bg-gray-200 transition-colors text-sm"
                    >
                      Fechar — Aguardar Confirmação
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Comprovante */}
      <AnimatePresence>
        {showContractId && (() => {
          const ex = exchanges.find(e => e.id === showContractId);
          if (!ex) return null;
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => setShowContractId(null)}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8"
                onClick={e => e.stopPropagation()}
              >
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-100 rounded-full mb-3">
                    <FileText size={24} className="text-emerald-600" />
                  </div>
                  <h3 className="text-xl font-black text-gray-900">Comprovante de Troca</h3>
                  <p className="text-sm text-gray-500 mt-1">WeekSwap — Troca Finalizada</p>
                </div>

                <div className="space-y-3 text-sm mb-6">
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">Nº da troca</span>
                    <span className="font-bold">#{ex.id.slice(0, 8).toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">Semana oferecida</span>
                    <span className="font-bold">{ex.offered_week_id?.slice(0, 8)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">Semana recebida</span>
                    <span className="font-bold">{ex.requested_week_id?.slice(0, 8)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">Taxa WeekSwap</span>
                    <span className="font-bold text-amber-600">
                      {ex.fee_pts
                        ? `${Number(ex.fee_pts).toLocaleString('pt-BR')} pts`
                        : '10.000 pts'}
                      {' '}({ex.fee_country === 'INTERNATIONAL' ? 'USD 50' : 'R$100'})
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-500">Status</span>
                    <span className="font-bold text-emerald-600">✅ Finalizada</span>
                  </div>
                </div>

                <p className="text-xs text-gray-400 text-center mb-4">
                  Esta troca foi processada e registrada pela plataforma WeekSwap.
                  O comprovante confirma a transferência de semanas entre as partes.
                </p>

                <button
                  onClick={() => setShowContractId(null)}
                  className="w-full bg-gray-100 text-gray-700 py-3 rounded-2xl font-bold hover:bg-gray-200 transition-colors"
                >
                  Fechar
                </button>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
