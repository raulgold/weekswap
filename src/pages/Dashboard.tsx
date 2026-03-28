import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Clock, ArrowLeftRight, CreditCard, QrCode, X, Copy, Check, ExternalLink, Smartphone, Star, Zap } from 'lucide-react';
import { api } from '../lib/api';

const POINTS_PER_REAL = 100;

interface DashboardProps {
  userId: string;
}

type BillingType = 'PIX' | 'BOLETO' | 'CREDIT_CARD';

interface PaymentResult {
  paymentId: string;
  billingType: BillingType;
  value: number;
  pixData?: { qrCodeImage: string; copyPaste: string; expirationDate: string } | null;
  boletoUrl?: string | null;
  invoiceUrl?: string | null;
}

export function Dashboard({ userId }: DashboardProps) {
  const [userData, setUserData] = useState<any>(null);
  const [exchanges, setExchanges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyAmount, setBuyAmount] = useState(10);
  const MIN_REAIS = 5;
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedType, setSelectedType] = useState<BillingType>('PIX');
  const [paying, setPaying] = useState(false);
  const [payResult, setPayResult] = useState<PaymentResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [cpf, setCpf] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [user, exchangeData] = await Promise.all([
        api.getUser(userId),
        api.getExchanges(userId),
      ]);
      setUserData(user);
      setExchanges(exchangeData.exchanges);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const formatCpf = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpf(formatCpf(e.target.value));
  };

  const handleCreatePayment = async () => {
    const cpfDigits = cpf.replace(/\D/g, '');
    if (cpfDigits.length !== 11) { alert('CPF inválido. Informe 11 dígitos.'); return; }
    setPaying(true);
    try {
      const result = await api.createAsaasPayment(userId, buyAmount, selectedType, cpfDigits);
      setPayResult(result);
    } catch (error: any) {
      alert(error.message || 'Erro ao criar pagamento');
    } finally {
      setPaying(false);
    }
  };

  const handleCopyPix = () => {
    if (payResult?.pixData?.copyPaste) {
      navigator.clipboard.writeText(payResult.pixData.copyPaste);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleCheckStatus = async () => {
    if (!payResult?.paymentId) return;
    setCheckingStatus(true);
    try {
      const { status } = await api.getAsaasPaymentStatus(payResult.paymentId);
      if (status === 'RECEIVED' || status === 'CONFIRMED') {
        alert('Pagamento confirmado! Seus pontos serão liberados em breve.');
        setShowPayModal(false);
        setPayResult(null);
        fetchData();
      } else {
        alert(`Status: ${status} — aguardando confirmação.`);
      }
    } catch {
      alert('Erro ao verificar status');
    } finally {
      setCheckingStatus(false);
    }
  };

  const closeModal = () => {
    setShowPayModal(false);
    setPayResult(null);
    setCopied(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const stats = [
    { label: 'Pontos Disponíveis', value: (userData?.credits_balance || 0).toLocaleString('pt-BR'), icon: Wallet, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Pontos Pendentes',   value: (userData?.pending_credits || 0).toLocaleString('pt-BR'), icon: Clock,   color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Total de Trocas',    value: exchanges.length,                                          icon: ArrowLeftRight, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ];

  const paymentMethods = [
    { type: 'PIX'         as BillingType, label: 'PIX',    icon: QrCode,      desc: 'Instantâneo',      color: 'border-green-500 bg-green-50'   },
    { type: 'BOLETO'      as BillingType, label: 'Boleto', icon: ExternalLink, desc: 'Até 3 dias úteis', color: 'border-blue-500 bg-blue-50'     },
    { type: 'CREDIT_CARD' as BillingType, label: 'Cartão', icon: CreditCard,   desc: 'Crédito/Débito',   color: 'border-purple-500 bg-purple-50' },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Banner sistema de pontos */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-5 text-white flex items-center gap-4">
        <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
          <Zap size={24} className="text-yellow-300" />
        </div>
        <div className="flex-1">
          <p className="font-black text-lg">Sistema de Pontos WeekSwap</p>
          <p className="text-indigo-100 text-sm">R$ 1,00 = <strong className="text-white">100 pontos</strong> — igual ao RCI. Acumule e troque suas semanas!</p>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-3xl font-black text-yellow-300">
            {((userData?.credits_balance || 0) / POINTS_PER_REAL).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
          <p className="text-xs text-indigo-200">em valor equivalente</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
          >
            <div className={`inline-flex p-3 rounded-xl ${stat.bg} mb-4`}>
              <stat.icon size={24} className={stat.color} />
            </div>
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="text-3xl font-black text-gray-900">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Modo Ouro CTA */}
      <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-300 rounded-2xl p-5">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-yellow-400 rounded-xl flex items-center justify-center">
            <Star size={24} className="text-white fill-white" />
          </div>
          <div className="flex-1">
            <p className="font-black text-amber-900 text-lg">⭐ Modo Ouro — R$ 200</p>
            <p className="text-amber-700 text-sm mt-1">
              Sua semana aparece <strong>sempre no topo</strong> dos anúncios por 30 dias.
              Troque mais rápido e com mais visibilidade!
            </p>
            <div className="flex gap-3 mt-3 flex-wrap">
              <div className="text-xs text-amber-700 bg-amber-100 px-3 py-1.5 rounded-full font-medium">✅ Destaque no topo</div>
              <div className="text-xs text-amber-700 bg-amber-100 px-3 py-1.5 rounded-full font-medium">✅ Badge exclusivo</div>
              <div className="text-xs text-amber-700 bg-amber-100 px-3 py-1.5 rounded-full font-medium">✅ 30 dias de destaque</div>
            </div>
          </div>
          <div className="flex-shrink-0 hidden sm:block text-center">
            <p className="text-xs text-amber-600">Disponível em</p>
            <p className="font-black text-amber-900">Minhas Semanas</p>
          </div>
        </div>
      </div>

      {/* Comprar Pontos */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
          <CreditCard size={20} className="text-indigo-600" />
          Comprar Pontos
        </h2>
        <p className="text-xs text-gray-400 mb-4">R$ 1,00 = 100 pontos — mínimo R$ 5,00</p>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[140px]">
            <label className="block text-sm text-gray-500 mb-1">Valor em Reais (R$)</label>
            <input
              type="number"
              min={MIN_REAIS}
              max={10000}
              step={1}
              value={buyAmount}
              onChange={(e) => setBuyAmount(Math.max(MIN_REAIS, parseInt(e.target.value) || MIN_REAIS))}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-sm text-gray-500 mb-1">Você receberá</label>
            <p className="text-2xl font-black text-indigo-600 py-2">
              {(buyAmount * POINTS_PER_REAL).toLocaleString('pt-BR')} pts
            </p>
          </div>
          <button
            onClick={() => setShowPayModal(true)}
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors mt-5"
          >
            Comprar por R$ {buyAmount.toFixed(2)}
          </button>
        </div>
      </div>

      {/* Trocas recentes */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold mb-4">Trocas Recentes</h2>
        {exchanges.length === 0 ? (
          <p className="text-gray-400 text-center py-8">Nenhuma troca ainda</p>
        ) : (
          <div className="space-y-3">
            {exchanges.slice(0, 5).map((exchange) => (
              <div key={exchange.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="font-medium text-gray-900">Troca #{exchange.id.slice(0, 8)}</p>
                  <p className="text-sm text-gray-500">Papel: {exchange.role === 'owner' ? 'Dono' : 'Solicitante'}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  exchange.exchange_status === 'FINALIZED'  ? 'bg-green-100 text-green-700' :
                  exchange.exchange_status === 'pending'    ? 'bg-amber-100 text-amber-700' :
                  exchange.exchange_status === 'cancelled'  ? 'bg-red-100 text-red-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {exchange.exchange_status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Pagamento */}
      <AnimatePresence>
        {showPayModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && closeModal()}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h3 className="text-xl font-black text-gray-900">
                  {payResult ? 'Realizar Pagamento' : `Comprar ${(buyAmount * POINTS_PER_REAL).toLocaleString('pt-BR')} Pontos`}
                </h3>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 max-h-[80vh] overflow-y-auto">
                {!payResult ? (
                  <div className="space-y-4">
                    <div className="bg-indigo-50 rounded-xl p-3 text-center">
                      <p className="text-2xl font-black text-indigo-600">{(buyAmount * POINTS_PER_REAL).toLocaleString('pt-BR')} pontos</p>
                      <p className="text-sm text-gray-500">por <strong className="text-gray-700">R$ {buyAmount.toFixed(2)}</strong> (R$1 = 100 pts)</p>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-500 mb-1">CPF</label>
                      <input
                        type="text"
                        placeholder="000.000.000-00"
                        value={cpf}
                        onChange={handleCpfChange}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                      />
                    </div>

                    <div className="space-y-3">
                      {paymentMethods.map(({ type, label, icon: Icon, desc, color }) => (
                        <button
                          key={type}
                          onClick={() => setSelectedType(type)}
                          className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                            selectedType === type ? color : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <Icon size={24} className={selectedType === type ? 'text-gray-700' : 'text-gray-400'} />
                          <div className="text-left">
                            <p className="font-bold text-gray-900">{label}</p>
                            <p className="text-xs text-gray-500">{desc}</p>
                          </div>
                          {selectedType === type && (
                            <div className="ml-auto w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center">
                              <Check size={12} className="text-white" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={handleCreatePayment}
                      disabled={paying}
                      className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                      {paying ? 'Gerando cobrança...' : `Pagar R$ ${buyAmount.toFixed(2)} → ${(buyAmount * POINTS_PER_REAL).toLocaleString('pt-BR')} pts`}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* PIX */}
                    {payResult.billingType === 'PIX' && payResult.pixData && (
                      <div className="space-y-4">
                        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
                          <p className="text-green-700 font-bold mb-1">PIX gerado com sucesso!</p>
                          <p className="text-xs text-green-600">Escaneie o QR code ou copie o código</p>
                        </div>
                        <div className="flex justify-center">
                          <img
                            src={`data:image/png;base64,${payResult.pixData.qrCodeImage}`}
                            alt="QR Code PIX"
                            className="w-48 h-48 rounded-xl border border-gray-200"
                          />
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-xs text-gray-500 mb-2">Código copia e cola:</p>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-gray-700 font-mono flex-1 truncate">
                              {payResult.pixData.copyPaste}
                            </p>
                            <button
                              onClick={handleCopyPix}
                              className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                copied ? 'bg-green-500 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                              }`}
                            >
                              {copied ? <Check size={12} /> : <Copy size={12} />}
                              {copied ? 'Copiado!' : 'Copiar'}
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 rounded-xl p-3">
                          <Smartphone size={16} />
                          <span>Abra o app do seu banco e escaneie o QR code ou cole o código PIX</span>
                        </div>
                      </div>
                    )}

                    {/* BOLETO */}
                    {payResult.billingType === 'BOLETO' && (
                      <div className="space-y-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-center">
                          <p className="text-blue-700 font-bold mb-1">Boleto gerado!</p>
                          <p className="text-xs text-blue-600">Compensação em até 3 dias úteis</p>
                        </div>
                        {payResult.boletoUrl && (
                          <a
                            href={payResult.boletoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors"
                          >
                            <ExternalLink size={18} />
                            Abrir Boleto
                          </a>
                        )}
                        {payResult.invoiceUrl && (
                          <a
                            href={payResult.invoiceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full border-2 border-blue-300 text-blue-600 py-3 rounded-xl font-bold hover:bg-blue-50 transition-colors"
                          >
                            <ExternalLink size={18} />
                            Ver Fatura
                          </a>
                        )}
                      </div>
                    )}

                    {/* CARTÃO */}
                    {payResult.billingType === 'CREDIT_CARD' && payResult.invoiceUrl && (
                      <div className="space-y-4">
                        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 text-center">
                          <p className="text-purple-700 font-bold mb-1">Pagamento criado!</p>
                          <p className="text-xs text-purple-600">Clique abaixo para inserir os dados do cartão</p>
                        </div>
                        <a
                          href={payResult.invoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 w-full bg-purple-600 text-white py-3 rounded-xl font-bold hover:bg-purple-700 transition-colors"
                        >
                          <CreditCard size={18} />
                          Pagar com Cartão
                        </a>
                      </div>
                    )}

                    {/* Verificar status */}
                    <button
                      onClick={handleCheckStatus}
                      disabled={checkingStatus}
                      className="w-full border-2 border-indigo-300 text-indigo-600 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-colors disabled:opacity-50"
                    >
                      {checkingStatus ? 'Verificando...' : '🔄 Já paguei — verificar status'}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
