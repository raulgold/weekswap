import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Clock, ArrowLeftRight, CreditCard, QrCode, X, Copy, Check, ExternalLink, Smartphone } from 'lucide-react';
import { api } from '../lib/api';

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
  const MIN_CREDITS = 5;
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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
    if (cpfDigits.length !== 11) {
      alert('CPF inválido. Informe 11 dígitos.');
      return;
    }
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
        alert('Pagamento confirmado! Seus créditos serão liberados em breve.');
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
    { label: 'Créditos Disponíveis', value: userData?.credits_balance || 0, icon: Wallet, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Créditos Pendentes', value: userData?.pending_credits || 0, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Total de Trocas', value: exchanges.length, icon: ArrowLeftRight, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ];

  const paymentMethods = [
    { type: 'PIX' as BillingType, label: 'PIX', icon: QrCode, desc: 'Instantâneo', color: 'border-green-500 bg-green-50' },
    { type: 'BOLETO' as BillingType, label: 'Boleto', icon: ExternalLink, desc: 'Até 3 dias úteis', color: 'border-blue-500 bg-blue-50' },
    { type: 'CREDIT_CARD' as BillingType, label: 'Cartão', icon: CreditCard, desc: 'Crédito/Débito', color: 'border-purple-500 bg-purple-50' },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

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

      {/* Comprar créditos */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <CreditCard size={20} className="text-indigo-600" />
          Comprar Créditos
        </h2>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[120px]">
            <label className="block text-sm text-gray-500 mb-1">Quantidade</label>
            <input
              type="number"
              min={MIN_CREDITS}
              max={10000}
              value={buyAmount}
              onChange={(e) => setBuyAmount(Math.max(MIN_CREDITS, parseInt(e.target.value) || MIN_CREDITS))}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            />
          </div>
          <div className="flex-1 min-w-[100px]">
            <label className="block text-sm text-gray-500 mb-1">Total</label>
            <p className="text-2xl font-black text-gray-900 py-2">R$ {buyAmount.toFixed(2)}</p>
          </div>
          <button
            onClick={() => setShowPayModal(true)}
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors mt-5"
          >
            Comprar
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
                  exchange.exchange_status === 'FINALIZED' ? 'bg-green-100 text-green-700' :
                  exchange.exchange_status === 'pending' ? 'bg-amber-100 text-amber-700' :
                  exchange.exchange_status === 'cancelled' ? 'bg-red-100 text-red-700' :
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
                  {payResult ? 'Realizar Pagamento' : 'Escolher Pagamento'}
                </h3>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>

              <div className="p-6">
                {!payResult ? (
                  /* Seleção de método */
                  <div className="space-y-4">
                    <p className="text-gray-600">
                      Comprando <span className="font-black text-indigo-600">{buyAmount} créditos</span> por{' '}
                      <span className="font-black text-gray-900">R$ {buyAmount.toFixed(2)}</span>
                    </p>

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
                      {paying ? 'Gerando cobrança...' : `Pagar R$ ${buyAmount.toFixed(2)}`}
                    </button>
                  </div>
                ) : (
                  /* Resultado do pagamento */
                  <div className="space-y-4">
                    {payResult.billingType === 'PIX' && payResult.pixData && (
                      <div className="space-y-4">
                        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
                          <p className="text-green-700 font-bold mb-1">PIX gerado com sucesso!</p>
                          <p className="text-xs text-green-600">Escaneie o QR code ou copie o código</p>
                        </div>

                        {/* QR Code */}
                        <div className="flex justify-center">
                          <img
                            src={`data:image/png;base64,${payResult.pixData.qrCodeImage}`}
                            alt="QR Code PIX"
                            className="w-48 h-48 rounded-xl border border-gray-200"
                          />
                        </div>

                        {/* Copia e Cola */}
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

                    {payResult.billingType === 'BOLETO' && (
                      <div className="space-y-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-center">
                          <p className="text-blue-700 font-bold mb-1">Boleto gerado!</p>
                          <p className="text-xs text-blue-600">Vencimento em 1 dia útil</p>
                        </div>
                        {payResult.boletoUrl && (
                          <a
                            href={payResult.boletoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full bg-blue-600 text-white py-4 rounded-2xl font-black hover:bg-blue-700 transition-colors"
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
                            className="flex items-center justify-center gap-2 w-full bg-gray-100 text-gray-700 py-3 rounded-2xl font-bold hover:bg-gray-200 transition-colors text-sm"
                          >
                            Ver fatura
                          </a>
                        )}
                      </div>
                    )}

                    {payResult.billingType === 'CREDIT_CARD' && payResult.invoiceUrl && (
                      <div className="space-y-4">
                        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 text-center">
                          <p className="text-purple-700 font-bold mb-1">Cobrança criada!</p>
                          <p className="text-xs text-purple-600">Clique abaixo para inserir os dados do cartão</p>
                        </div>
                        <a
                          href={payResult.invoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 w-full bg-purple-600 text-white py-4 rounded-2xl font-black hover:bg-purple-700 transition-colors"
                        >
                          <CreditCard size={18} />
                          Pagar com Cartão
                        </a>
                      </div>
                    )}

                    <button
                      onClick={handleCheckStatus}
                      disabled={checkingStatus}
                      className="w-full bg-gray-100 text-gray-700 py-3 rounded-2xl font-bold hover:bg-gray-200 transition-colors disabled:opacity-50 text-sm"
                    >
                      {checkingStatus ? 'Verificando...' : 'Já paguei — verificar status'}
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
