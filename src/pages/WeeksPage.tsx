import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, MapPin, Plus, X, Users, Home, Star,
  ChevronDown, ChevronUp, ArrowLeftRight, FileText,
  Upload, CheckCircle, QrCode, ExternalLink, CreditCard, Check, Copy, Smartphone, Shield
} from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { api } from '../lib/api';

interface WeeksPageProps {
  userId: string;
}

const ESTADOS_BR = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS',
  'MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
];

const TEMPORADAS = [
  { value: 'alta',  label: 'Alta Temporada (Jan–Fev / Jul / Dez)', color: 'text-red-600' },
  { value: 'media', label: 'Média Temporada (Mar–Jun / Ago–Set)',  color: 'text-amber-600' },
  { value: 'baixa', label: 'Baixa Temporada (Out–Nov)',            color: 'text-green-600' },
];

const TIPOS_UNIDADE = [
  'Studio', 'Apartamento 1 quarto', 'Apartamento 2 quartos',
  'Apartamento 3 quartos', 'Chalé', 'Casa', 'Bangalô'
];

const defaultForm = {
  resort: '', cidade: '', estado: '', resortEntregue: false,
  checkIn: '', checkOut: '', temporada: '', tipoUnidade: '',
  capacidade: '2', numeroCertificado: '', descricao: '',
  aceitaTroca: true, observacoes: '',
  estrelas: '3', avaliacao: '3',
  contractPdfUrl: '', resortProofPdfUrl: '', authLetterAccepted: false,
};

type GoldBillingType = 'PIX' | 'BOLETO' | 'CREDIT_CARD';

export function WeeksPage({ userId }: WeeksPageProps) {
  const [allWeeks, setAllWeeks]   = useState<any[]>([]);
  const [myWeeks, setMyWeeks]     = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm]           = useState(defaultForm);
  const [tab, setTab]             = useState<'disponiveis' | 'minhas'>('disponiveis');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [requesting, setRequesting] = useState<string | null>(null);
  const [myWeeksIds, setMyWeeksIds] = useState<string[]>([]);
  const [error, setError]         = useState('');
  const [showWeekSelectId, setShowWeekSelectId] = useState<string | null>(null);
  const [selectedMyWeekId, setSelectedMyWeekId] = useState<string>('');

  // Filtros de busca
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSeason, setFilterSeason] = useState('');
  const [filterStars, setFilterStars] = useState('');

  // PDF upload
  const contractRef = useRef<HTMLInputElement>(null);
  const proofRef    = useRef<HTMLInputElement>(null);
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [proofFile, setProofFile]       = useState<File | null>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [pdfError, setPdfError]         = useState('');

  // Carta de autorização pós-submit
  const [showAuthLetter, setShowAuthLetter]     = useState(false);
  const [publishedWeekId, setPublishedWeekId]   = useState('');
  const [publishedResort, setPublishedResort]   = useState('');

  // Modo Ouro
  const [showGoldModal, setShowGoldModal]   = useState(false);
  const [goldWeekId, setGoldWeekId]         = useState('');
  const [goldWeekName, setGoldWeekName]     = useState('');
  const [goldBillingType, setGoldBillingType] = useState<GoldBillingType>('PIX');
  const [goldCpf, setGoldCpf]               = useState('');
  const [payingGold, setPayingGold]         = useState(false);
  const [goldPayResult, setGoldPayResult]   = useState<any>(null);
  const [goldCopied, setGoldCopied]         = useState(false);
  const [checkingGold, setCheckingGold]     = useState(false);

  const fetchWeeks = async () => {
    try {
      const data = await api.getWeeks();
      const all = data.weeks;
      setAllWeeks(all.filter((w: any) => w.owner_id !== userId));
      const mine = all.filter((w: any) => w.owner_id === userId);
      setMyWeeks(mine);
      setMyWeeksIds(mine.map((w: any) => w.id));
    } catch (err) {
      console.error('Erro ao buscar semanas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchWeeks(); }, [userId]);

  const validatePdf = (file: File | null, label: string): string => {
    if (!file) return '';
    if (file.type !== 'application/pdf') return `${label}: apenas arquivos PDF são aceitos.`;
    if (file.size > 5 * 1024 * 1024) return `${label}: tamanho máximo é 5 MB.`;
    return '';
  };

  const handleContractFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    const err = validatePdf(f, 'Contrato');
    setPdfError(err);
    if (!err) setContractFile(f);
  };

  const handleProofFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    const err = validatePdf(f, 'Comprovante');
    setPdfError(err);
    if (!err) setProofFile(f);
  };

  const uploadPdfToStorage = async (file: File, path: string): Promise<string> => {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setPdfError('');

    // Validações básicas obrigatórias
    if (!form.resortEntregue) { setError('Apenas resorts entregues e em pleno funcionamento podem ser cadastrados.'); return; }
    if (!form.temporada)      { setError('Selecione a temporada'); return; }
    if (!form.tipoUnidade)    { setError('Selecione o tipo de unidade'); return; }

    // Validações de datas
    if (!form.checkIn) { setError('Data de check-in é obrigatória'); return; }
    if (!form.checkOut) { setError('Data de check-out é obrigatória'); return; }

    const checkInDate = new Date(form.checkIn);
    const checkOutDate = new Date(form.checkOut);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (checkInDate < today) { setError('Check-in deve ser no futuro'); return; }
    if (checkOutDate <= checkInDate) { setError('Check-out deve ser após o check-in'); return; }

    const durationDays = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
    if (durationDays < 5) { setError('Duração mínima deve ser 5 dias'); return; }

    // Validações de documentos
    if (!contractFile)        { setError('O upload do contrato da cota (PDF) é obrigatório.'); return; }
    if (!proofFile)           { setError('O upload do comprovante do resort ativo (PDF) é obrigatório.'); return; }
    if (!form.authLetterAccepted) { setError('Você precisa aceitar a carta de autorização digital.'); return; }

    setUploadingPdf(true);
    setSubmitting(true);
    let contractPdfUrl = '';
    let resortProofPdfUrl = '';
    try {
      const ts = Date.now();
      [contractPdfUrl, resortProofPdfUrl] = await Promise.all([
        uploadPdfToStorage(contractFile, `weeks/${userId}/${ts}_contrato.pdf`),
        uploadPdfToStorage(proofFile,    `weeks/${userId}/${ts}_comprovante.pdf`),
      ]);
    } catch {
      setError('Erro ao enviar PDFs. Verifique sua conexão e tente novamente.');
      setUploadingPdf(false);
      setSubmitting(false);
      return;
    }
    setUploadingPdf(false);

    try {
      const result = await api.submitWeek(userId, { ...form, contractPdfUrl, resortProofPdfUrl });
      setShowForm(false);
      setContractFile(null);
      setProofFile(null);
      setPublishedWeekId(result.weekId);
      setPublishedResort(form.resort);
      setForm(defaultForm);
      fetchWeeks();
      setShowAuthLetter(true);
    } catch (err: any) {
      const errMsg = err.message || 'Erro ao publicar semana';
      // Detectar se é erro de duplicata
      if (errMsg.includes('já tem essa semana cadastrada') || errMsg.includes('número de certificado')) {
        setError('⚠️ ' + errMsg);
      } else {
        setError(errMsg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const formatCpfGold = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 11);
    return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  const handleActivateGold = (weekId: string, weekName: string) => {
    setGoldWeekId(weekId);
    setGoldWeekName(weekName);
    setGoldPayResult(null);
    setShowGoldModal(true);
  };

  const handleGoldPayment = async () => {
    const cpfDigits = goldCpf.replace(/\D/g, '');
    if (cpfDigits.length !== 11) { alert('CPF inválido.'); return; }
    setPayingGold(true);
    try {
      const result = await api.createGoldPayment(userId, goldWeekId, goldBillingType, cpfDigits);
      setGoldPayResult(result);
    } catch (err: any) {
      alert(err.message || 'Erro ao criar pagamento Modo Ouro');
    } finally {
      setPayingGold(false);
    }
  };

  const handleCheckGold = async () => {
    if (!goldPayResult?.paymentId) return;
    setCheckingGold(true);
    try {
      const { status } = await api.getGoldPaymentStatus(goldPayResult.paymentId);
      if (status === 'RECEIVED' || status === 'CONFIRMED') {
        await api.activateGoldMode(userId, goldWeekId, goldPayResult.paymentId);
        alert('🌟 Modo Ouro ativado! Sua semana agora aparece no topo por 30 dias.');
        setShowGoldModal(false);
        setGoldPayResult(null);
        fetchWeeks();
      } else {
        alert(`Status: ${status} — aguardando confirmação do pagamento.`);
      }
    } catch {
      alert('Erro ao verificar status do pagamento');
    } finally {
      setCheckingGold(false);
    }
  };

  const handleSolicitarTroca = (requestedWeekId: string) => {
    if (myWeeksIds.length === 0) {
      alert('Você precisa ter pelo menos uma semana cadastrada para solicitar uma troca.');
      return;
    }
    if (myWeeksIds.length === 1) {
      confirmExchange(myWeeksIds[0], requestedWeekId);
    } else {
      setSelectedMyWeekId(myWeeksIds[0]);
      setShowWeekSelectId(requestedWeekId);
    }
  };

  const confirmExchange = async (offeredWeekId: string, requestedWeekId: string) => {
    setRequesting(requestedWeekId);
    try {
      const result = await api.initiateExchange(userId, offeredWeekId, requestedWeekId);
      let msg = 'Solicitação de troca enviada! Aguarde a confirmação do proprietário.';
      if (result.differential && result.differential > 0) {
        msg += `\n\n📊 Diferencial coberto: ${result.differential.toLocaleString('pt-BR')} pontos reservados do seu saldo para equalizar o valor das semanas.`;
      }
      alert(msg);
      setShowWeekSelectId(null);
      // Recarregar semanas para refletir status atualizado
      fetchWeeks();
    } catch (err: any) {
      const msg = err.message || 'Erro ao solicitar troca';
      // Verificar se é erro de diferencial insuficiente
      if (msg.toLowerCase().includes('diferencial') || msg.toLowerCase().includes('saldo insuficiente')) {
        alert(`⚠️ Pontos insuficientes\n\n${msg}\n\nVá em "Minhas Trocas" → "Comprar Pontos" para adquirir mais pontos.`);
      } else {
        alert(msg);
      }
    } finally {
      setRequesting(null);
    }
  };

  const set = (field: string, value: string | boolean) =>
    setForm(prev => ({ ...prev, [field]: value }));

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
    </div>
  );

  // Filtragem de semanas disponíveis
  const filteredWeeks = useMemo(() => {
    const weeks = tab === 'disponiveis' ? allWeeks : myWeeks;
    
    if (tab === 'minhas') return weeks;
    
    return weeks.filter(w => {
      const matchSearch = !searchQuery || 
        w.resort?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.cidade?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.estado?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchSeason = !filterSeason || w.temporada === filterSeason;
      const matchStars = !filterStars || (w.estrelas || 0) >= parseInt(filterStars);
      return matchSearch && matchSeason && matchStars;
    });
  }, [allWeeks, myWeeks, tab, searchQuery, filterSeason, filterStars]);

  // Ordenação: Gold primeiro, depois mais recentes
  const displayWeeks = useMemo(() => {
    const sorted = [...filteredWeeks];
    sorted.sort((a, b) => {
      const aGold = a.is_gold_active ? 1 : 0;
      const bGold = b.is_gold_active ? 1 : 0;
      if (aGold !== bGold) return bGold - aGold;
      return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
    });
    return sorted;
  }, [filteredWeeks]);


  // Helper functions para visual premium
  const getStateGradient = (estado: string): string => {
    const gradients: Record<string, string> = {
      'SC': 'bg-gradient-to-br from-blue-600 to-cyan-400',
      'RJ': 'bg-gradient-to-br from-green-600 to-emerald-400',
      'SP': 'bg-gradient-to-br from-gray-700 to-slate-500',
      'BA': 'bg-gradient-to-br from-yellow-500 to-orange-400',
      'PE': 'bg-gradient-to-br from-orange-600 to-red-400',
      'CE': 'bg-gradient-to-br from-yellow-400 to-amber-500',
      'ES': 'bg-gradient-to-br from-teal-500 to-green-400',
      'PR': 'bg-gradient-to-br from-green-700 to-teal-500',
      'MG': 'bg-gradient-to-br from-purple-600 to-indigo-400',
    };
    return gradients[estado] || 'bg-gradient-to-br from-indigo-600 to-purple-500';
  };

  const getSeasonBadge = (temporada: string): string => {
    if (temporada === 'alta') return 'bg-red-100 text-red-700';
    if (temporada === 'média' || temporada === 'media') return 'bg-orange-100 text-orange-700';
    return 'bg-green-100 text-green-700';
  };

  const formatDateBR = (dateStr: string): string => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Semanas</h1>
        <button
          onClick={() => { setShowForm(!showForm); setError(''); }}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-colors"
        >
          {showForm ? <X size={18} /> : <Plus size={18} />}
          {showForm ? 'Cancelar' : 'Publicar Minha Semana'}
        </button>
      </div>

      {/* Formulário */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-5 overflow-hidden"
          >
            <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
              <Home size={20} className="text-indigo-600" />
              Dados da Semana
            </h2>

            {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl">{error}</div>}

            {/* Resort + localização */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Resort / Empreendimento *</label>
                <input type="text" value={form.resort} onChange={e => set('resort', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Ex: Riviera Beach Resort" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cidade *</label>
                <input type="text" value={form.cidade} onChange={e => set('cidade', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Ex: Florianópolis" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado *</label>
                <select value={form.estado} onChange={e => set('estado', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" required>
                  <option value="">Selecione</option>
                  {ESTADOS_BR.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </div>
            </div>

            {/* Resort entregue */}
            <div className={`rounded-2xl border-2 p-4 transition-colors ${form.resortEntregue ? 'border-green-400 bg-green-50' : 'border-red-200 bg-red-50'}`}>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {form.resortEntregue ? <span className="text-2xl">✅</span> : <span className="text-2xl">🚫</span>}
                </div>
                <div className="flex-1">
                  <p className={`font-black text-sm mb-1 ${form.resortEntregue ? 'text-green-800' : 'text-red-800'}`}>
                    O resort está entregue e em pleno funcionamento? *
                  </p>
                  <p className="text-xs text-gray-500 mb-3">
                    Somente semanas de resorts <strong>já entregues e operacionais</strong> podem ser cadastradas.
                  </p>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => set('resortEntregue', true)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-black border-2 transition-all ${form.resortEntregue ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-500 border-gray-200 hover:border-green-400'}`}>
                      ✔ Sim, está entregue e operacional
                    </button>
                    <button type="button" onClick={() => set('resortEntregue', false)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-black border-2 transition-all ${!form.resortEntregue ? 'bg-red-500 text-white border-red-500' : 'bg-white text-gray-500 border-gray-200 hover:border-red-400'}`}>
                      ✖ Não / Em construção
                    </button>
                  </div>
                  {!form.resortEntregue && (
                    <p className="text-xs text-red-600 font-bold mt-2">⚠️ Não é possível cadastrar semanas de empreendimentos não entregues.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Tipo, temporada, capacidade */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Unidade *</label>
                <select value={form.tipoUnidade} onChange={e => set('tipoUnidade', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="">Selecione</option>
                  {TIPOS_UNIDADE.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Temporada *</label>
                <select value={form.temporada} onChange={e => set('temporada', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="">Selecione</option>
                  {TEMPORADAS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Capacidade (pessoas)</label>
                <select value={form.capacidade} onChange={e => set('capacidade', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">
                  {[2,3,4,5,6,7,8,10,12].map(n => <option key={n} value={String(n)}>{n} pessoas</option>)}
                </select>
              </div>
            </div>

            {/* Estrelas do empreendimento + Avaliação */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estrelas do Resort <span className="text-yellow-500">★</span>
                  <span className="text-gray-400 font-normal ml-1">(classificação oficial)</span>
                </label>
                <div className="flex gap-2">
                  {[1,2,3,4,5].map(n => (
                    <button key={n} type="button"
                      onClick={() => set('estrelas', String(n))}
                      className={`flex-1 py-2 rounded-xl border text-sm font-bold transition-colors ${
                        Number(form.estrelas) >= n
                          ? 'bg-yellow-400 border-yellow-400 text-white'
                          : 'border-gray-200 text-gray-400 hover:border-yellow-300'
                      }`}
                    >
                      {n}★
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Avaliação dos Hóspedes
                  <span className="text-gray-400 font-normal ml-1">(média, ex: 4.5)</span>
                </label>
                <input type="number" min="0" max="5" step="0.1"
                  value={form.avaliacao}
                  onChange={e => set('avaliacao', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="0.0 – 5.0" />
              </div>
            </div>

            {/* Datas */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data Check-in *</label>
                <input type="date" value={form.checkIn} onChange={e => set('checkIn', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data Check-out *</label>
                <input type="date" value={form.checkOut} onChange={e => set('checkOut', e.target.value)}
                  min={form.checkIn}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" required />
              </div>
            </div>

            {/* Nº certificado */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nº do Certificado / Contrato <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <input type="text" value={form.numeroCertificado} onChange={e => set('numeroCertificado', e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Ex: CERT-2024-00123" />
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
              <textarea value={form.descricao} onChange={e => set('descricao', e.target.value)} rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                placeholder="Descreva o que está incluso, pontos turísticos próximos, diferenciais..." />
            </div>

            {/* Observações */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preferências de troca / Observações</label>
              <textarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)} rows={2}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                placeholder="Ex: Aceito trocas por praias do Nordeste, período similar, até 6 pessoas..." />
            </div>

            {/* Upload PDFs */}
            <div className="space-y-4">
              <h3 className="text-sm font-black text-gray-800 flex items-center gap-2">
                <Upload size={16} className="text-indigo-600" />
                Documentos Obrigatórios (apenas PDF, máx. 5 MB cada)
              </h3>
              {pdfError && <div className="bg-red-50 text-red-600 text-xs p-3 rounded-xl">{pdfError}</div>}

              {/* Contrato */}
              <div
                className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${contractFile ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-indigo-400 hover:bg-indigo-50'}`}
                onClick={() => contractRef.current?.click()}
              >
                <input ref={contractRef} type="file" accept="application/pdf" className="hidden" onChange={handleContractFileChange} />
                {contractFile ? (
                  <div className="flex items-center justify-center gap-2 text-green-700">
                    <CheckCircle size={18} />
                    <span className="text-sm font-bold">{contractFile.name}</span>
                  </div>
                ) : (
                  <>
                    <Upload size={22} className="mx-auto text-gray-400 mb-1" />
                    <p className="text-sm font-bold text-gray-700">Contrato / Escritura da Cota *</p>
                    <p className="text-xs text-gray-400 mt-1">Clique para selecionar o PDF do contrato de multipropriedade</p>
                  </>
                )}
              </div>

              {/* Comprovante resort */}
              <div
                className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${proofFile ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-indigo-400 hover:bg-indigo-50'}`}
                onClick={() => proofRef.current?.click()}
              >
                <input ref={proofRef} type="file" accept="application/pdf" className="hidden" onChange={handleProofFileChange} />
                {proofFile ? (
                  <div className="flex items-center justify-center gap-2 text-green-700">
                    <CheckCircle size={18} />
                    <span className="text-sm font-bold">{proofFile.name}</span>
                  </div>
                ) : (
                  <>
                    <Upload size={22} className="mx-auto text-gray-400 mb-1" />
                    <p className="text-sm font-bold text-gray-700">Comprovante — Resort em Funcionamento *</p>
                    <p className="text-xs text-gray-400 mt-1">Boleto, extrato ou documento que comprove a cota ativa e o resort operacional</p>
                  </>
                )}
              </div>
            </div>

            {/* Carta de autorização */}
            <div className={`rounded-2xl border-2 p-4 transition-colors ${form.authLetterAccepted ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 bg-gray-50'}`}>
              <div className="flex items-start gap-3">
                <Shield size={18} className={`flex-shrink-0 mt-0.5 ${form.authLetterAccepted ? 'text-indigo-600' : 'text-gray-400'}`} />
                <div className="flex-1">
                  <p className="text-sm font-black text-gray-800">Carta de Autorização Digital *</p>
                  <p className="text-xs text-gray-500 mt-1 mb-3">
                    Ao aceitar, você autoriza digitalmente a troca desta semana com outro titular da plataforma WeekSwap,
                    mediante confirmação do hotel/resort. Esta autorização é vinculante e protege ambas as partes.
                  </p>
                  <button
                    type="button"
                    onClick={() => set('authLetterAccepted', !form.authLetterAccepted)}
                    className={`flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-xl border-2 transition-all ${form.authLetterAccepted ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-400'}`}
                  >
                    <Check size={16} />
                    {form.authLetterAccepted ? 'Carta de Autorização Aceita ✓' : 'Aceitar e Assinar Digitalmente'}
                  </button>
                </div>
              </div>
            </div>

            {/* Aviso legal */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <FileText size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-amber-800">Declaração de veracidade</p>
                  <p className="text-xs text-amber-700 mt-1">
                    Ao publicar esta semana, declaro que sou o legítimo titular ou tenho autorização
                    expressa para oferecer este período para troca, que as informações são verdadeiras
                    e que o certificado/contrato está em situação regular junto à administradora do resort.
                    Estou ciente de que informações falsas podem resultar no cancelamento da minha conta.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || uploadingPdf}
              className="w-full bg-indigo-600 text-white py-4 rounded-xl font-black text-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {uploadingPdf ? '📤 Enviando documentos...' : submitting ? 'Publicando...' : 'Publicar Semana para Troca'}
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-fit mb-6">
        <button
          onClick={() => setTab('disponiveis')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${tab === 'disponiveis' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Disponíveis ({allWeeks.length})
        </button>
        <button
          onClick={() => setTab('minhas')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${tab === 'minhas' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Minhas Semanas ({myWeeks.length})
        </button>
      </div>

      {/* Filtros (apenas aba Disponíveis) */}
      {tab === 'disponiveis' && (
        <div className="flex flex-wrap gap-3 mb-6">
          <input
            type="text"
            placeholder="🔍 Buscar cidade ou resort..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 min-w-[200px] px-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <select
            value={filterSeason}
            onChange={e => setFilterSeason(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">Temporada</option>
            <option value="alta">Alta</option>
            <option value="media">Média</option>
            <option value="baixa">Baixa</option>
          </select>
          <select
            value={filterStars}
            onChange={e => setFilterStars(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">Estrelas</option>
            <option value="5">⭐⭐⭐⭐⭐</option>
            <option value="4">⭐⭐⭐⭐+</option>
            <option value="3">⭐⭐⭐+</option>
          </select>
        </div>
      )}

      {/* Grid de semanas */}
      <div className={tab === 'disponiveis' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
        {displayWeeks.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 col-span-full">
            <Calendar size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400 font-medium">
              {tab === 'disponiveis' ? 'Nenhuma semana disponível para troca' : 'Você ainda não publicou nenhuma semana'}
            </p>
            {tab === 'minhas' && (
              <button
                onClick={() => setShowForm(true)}
                className="mt-4 inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-colors"
              >
                <Plus size={16} /> Publicar Primeira Semana
              </button>
            )}
          </div>
        ) : (
          displayWeeks.map((week) => {
            const isGold = week.is_gold_active;
            return (
              <motion.div
                key={week.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="group relative bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100"
              >
                {/* Cabeçalho colorido por estado */}
                <div className={`relative h-44 flex items-end p-4 ${getStateGradient(week.estado)}`}>
                  {/* Badge Gold */}
                  {isGold && (
                    <div className="absolute top-3 left-3 bg-yellow-400 text-yellow-900 text-xs font-black px-2 py-1 rounded-full flex items-center gap-1 shadow-md">
                      ⭐ DESTAQUE
                    </div>
                  )}
                  {/* Badge Temporada */}
                  <div className={`absolute top-3 right-3 text-xs font-bold px-2 py-1 rounded-full ${getSeasonBadge(week.temporada)}`}>
                    {week.temporada?.toUpperCase()}
                  </div>
                  {/* Nome do resort */}
                  <div>
                    <h3 className="text-white font-black text-lg leading-tight drop-shadow-lg">{week.resort}</h3>
                    <p className="text-white/80 text-sm mt-0.5">📍 {week.cidade}, {week.estado}</p>
                  </div>
                </div>
                
                {/* Corpo do card */}
                <div className="p-4">
                  {/* Estrelas */}
                  <div className="flex items-center gap-0.5 mb-3">
                    {[1,2,3,4,5].map(s => (
                      <span key={s} className={s <= (week.estrelas||0) ? 'text-yellow-400' : 'text-gray-200'}>★</span>
                    ))}
                    <span className="text-xs text-gray-500 ml-1">{week.avaliacao ? `${week.avaliacao}/5` : ''}</span>
                  </div>
                  
                  {/* Datas e capacidade */}
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
                    <span>📅 {formatDateBR(week.check_in)} → {formatDateBR(week.check_out)}</span>
                    <span>👥 {week.capacidade} pax</span>
                  </div>
                  
                  {/* Tipo de unidade */}
                  <p className="text-xs text-gray-500 mb-3">{week.tipo_unidade}</p>
                  
                  {/* Pontos em destaque */}
                  <div className="bg-indigo-50 rounded-xl p-3 mb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-indigo-600 font-medium">Valor da semana</p>
                        <p className="text-2xl font-black text-indigo-700">{(week.week_points||0).toLocaleString('pt-BR')} pts</p>
                        {week.week_label && <p className="text-xs text-indigo-500">{week.week_label}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Descrição curtida */}
                  {week.descricao && (
                    <p className="text-xs text-gray-600 mb-3 line-clamp-2">{week.descricao}</p>
                  )}
                  
                  {/* Botão solicitar troca ou expandir */}
                  <div className="space-y-2">
                    {week.owner_id !== userId && (
                      <button
                        onClick={() => handleSolicitarTroca(week.id)}
                        disabled={requesting === week.id}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        🔄 Solicitar Troca
                      </button>
                    )}
                    {week.owner_id === userId && (
                      <div className="w-full text-center text-sm text-gray-400 py-2">Sua semana</div>
                    )}
                    <button
                      onClick={() => setExpandedId(expandedId === week.id ? null : week.id)}
                      className="w-full text-indigo-600 hover:text-indigo-700 font-semibold py-2 text-sm transition-colors"
                    >
                      {expandedId === week.id ? 'Ocultar detalhes ▲' : 'Ver detalhes ▼'}
                    </button>
                  </div>

                  {/* Conteúdo expandido */}
                  <AnimatePresence>
                    {expandedId === week.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-4 border-t border-gray-100 mt-4 space-y-3">
                          {week.tipo_unidade && (
                            <p className="text-sm text-gray-600"><span className="font-semibold">Tipo:</span> {week.tipo_unidade}</p>
                          )}
                          {week.descricao && (
                            <p className="text-sm text-gray-600"><span className="font-semibold">Descrição:</span> {week.descricao}</p>
                          )}
                          {week.observacoes && (
                            <p className="text-sm text-gray-600"><span className="font-semibold">Observações:</span> {week.observacoes}</p>
                          )}
                          {week.numero_certificado && (
                            <p className="text-sm text-gray-500 flex items-center gap-1">
                              <FileText size={13} />
                              Certificado: {week.numero_certificado}
                            </p>
                          )}

                          {/* Ação: solicitar troca com seleção (tab disponíveis) */}
                          {tab === 'disponiveis' && week.owner_id !== userId && (
                            <div className="pt-2">
                              {showWeekSelectId === week.id ? (
                                <div className="space-y-3">
                                  <p className="text-sm font-bold text-gray-700">Qual semana você quer oferecer?</p>
                                  <select
                                    value={selectedMyWeekId}
                                    onChange={e => setSelectedMyWeekId(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                  >
                                    <option value="">Selecione uma semana...</option>
                                    {myWeeks.map(mw => (
                                      <option key={mw.id} value={mw.id}>{mw.resort} — {mw.check_in}</option>
                                    ))}
                                  </select>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => confirmExchange(selectedMyWeekId, week.id)}
                                      disabled={!!requesting || !selectedMyWeekId}
                                      className="flex-1 bg-indigo-600 text-white py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                                    >
                                      {requesting ? 'Enviando...' : 'Confirmar Troca'}
                                    </button>
                                    <button
                                      onClick={() => setShowWeekSelectId(null)}
                                      className="px-4 py-2 rounded-xl text-sm font-bold border border-gray-200 text-gray-600 hover:bg-gray-50"
                                    >
                                      Cancelar
                                    </button>
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          )}

                          {/* Ação: Modo Ouro (tab minhas) */}
                          {tab === 'minhas' && (
                            <div className="pt-2 flex gap-3 flex-wrap">
                              {isGold ? (
                                <div className="flex items-center gap-2 bg-yellow-100 text-yellow-700 px-3 py-2 rounded-xl text-sm font-bold border border-yellow-300">
                                  <Star size={14} className="fill-yellow-600" />
                                  Modo Ouro ativo
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleActivateGold(week.id, week.resort)}
                                  className="flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-amber-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:from-yellow-500 hover:to-amber-600 transition-all shadow-sm"
                                >
                                  <Star size={14} className="fill-white" />
                                  Ativar Modo Ouro — R$ 200
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

            {/* Modal: Carta de Autorização pós-publicação */}
      <AnimatePresence>
        {showAuthLetter && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 space-y-5"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={32} className="text-green-600" />
                </div>
                <h3 className="text-2xl font-black text-gray-900">Semana Publicada! 🎉</h3>
                <p className="text-gray-500 text-sm mt-2">
                  Sua semana em <strong>{publishedResort}</strong> foi publicada e já está disponível para trocas.
                </p>
              </div>

              <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <Shield size={20} className="text-indigo-600" />
                  <p className="font-black text-indigo-900">Carta de Autorização Digital</p>
                </div>
                <p className="text-sm text-indigo-700 leading-relaxed">
                  Ao publicar esta semana, você assinou digitalmente a <strong>Carta de Autorização</strong> que permite
                  ao WeekSwap intermediar a troca desta semana com outro titular, mediante confirmação do hotel/resort.
                  Esta autorização é <strong>vinculante</strong> e protege ambas as partes envolvidas na troca.
                </p>
                <div className="mt-3 text-xs text-indigo-500">
                  ID da semana: <span className="font-mono">{publishedWeekId.slice(0, 16)}...</span>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-sm text-amber-800 font-bold mb-1">💡 Dica: Ative o Modo Ouro!</p>
                <p className="text-xs text-amber-700">
                  Para sua semana aparecer no topo de todos os anúncios por 30 dias e ser trocada mais rapidamente,
                  ative o Modo Ouro por apenas R$ 200. Acesse a aba "Minhas Semanas" para ativar.
                </p>
              </div>

              <button
                onClick={() => setShowAuthLetter(false)}
                className="w-full bg-indigo-600 text-white py-3 rounded-2xl font-black hover:bg-indigo-700 transition-colors"
              >
                Entendido, ver minhas semanas
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal: Modo Ouro */}
      <AnimatePresence>
        {showGoldModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && setShowGoldModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              {/* Header dourado */}
              <div className="bg-gradient-to-r from-yellow-400 to-amber-500 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/30 rounded-xl flex items-center justify-center">
                      <Star size={20} className="text-white fill-white" />
                    </div>
                    <div>
                      <p className="font-black text-white text-lg">Modo Ouro</p>
                      <p className="text-yellow-100 text-xs">{goldWeekName}</p>
                    </div>
                  </div>
                  <button onClick={() => setShowGoldModal(false)} className="text-white/70 hover:text-white">
                    <X size={22} />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                {!goldPayResult ? (
                  <>
                    {/* Benefícios */}
                    <div className="bg-amber-50 rounded-2xl p-4 space-y-2">
                      <p className="font-black text-amber-900 text-center text-xl">R$ 200,00</p>
                      <p className="text-xs text-amber-700 text-center">por 30 dias de destaque total</p>
                      <div className="grid grid-cols-3 gap-2 mt-3">
                        {['✅ Topo dos anúncios', '✅ Badge exclusivo', '✅ Mais trocas'].map(b => (
                          <div key={b} className="bg-amber-100 rounded-xl p-2 text-center text-xs text-amber-700 font-medium">{b}</div>
                        ))}
                      </div>
                    </div>

                    {/* CPF */}
                    <div>
                      <label className="block text-sm text-gray-500 mb-1">CPF</label>
                      <input
                        type="text"
                        placeholder="000.000.000-00"
                        value={goldCpf}
                        onChange={e => setGoldCpf(formatCpfGold(e.target.value))}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-400 outline-none"
                      />
                    </div>

                    {/* Método pagamento */}
                    <div className="space-y-2">
                      {[
                        { type: 'PIX' as GoldBillingType, label: 'PIX', icon: QrCode, desc: 'Instantâneo', color: 'border-green-500 bg-green-50' },
                        { type: 'BOLETO' as GoldBillingType, label: 'Boleto', icon: ExternalLink, desc: 'Até 3 dias', color: 'border-blue-500 bg-blue-50' },
                        { type: 'CREDIT_CARD' as GoldBillingType, label: 'Cartão', icon: CreditCard, desc: 'Crédito/Débito', color: 'border-purple-500 bg-purple-50' },
                      ].map(({ type, label, icon: Icon, desc, color }) => (
                        <button
                          key={type}
                          onClick={() => setGoldBillingType(type)}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${goldBillingType === type ? color : 'border-gray-200 hover:border-gray-300'}`}
                        >
                          <Icon size={20} className={goldBillingType === type ? 'text-gray-700' : 'text-gray-400'} />
                          <div className="text-left">
                            <p className="font-bold text-sm text-gray-900">{label}</p>
                            <p className="text-xs text-gray-500">{desc}</p>
                          </div>
                          {goldBillingType === type && (
                            <div className="ml-auto w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
                              <Check size={11} className="text-white" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={handleGoldPayment}
                      disabled={payingGold}
                      className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 text-white py-4 rounded-2xl font-black text-lg hover:from-yellow-500 hover:to-amber-600 transition-all shadow-md disabled:opacity-50"
                    >
                      {payingGold ? 'Gerando cobrança...' : '⭐ Ativar Modo Ouro — R$ 200'}
                    </button>
                  </>
                ) : (
                  <div className="space-y-4">
                    {/* PIX */}
                    {goldPayResult.billingType === 'PIX' && goldPayResult.pixData && (
                      <div className="space-y-3">
                        <div className="bg-green-50 border border-green-200 rounded-2xl p-3 text-center">
                          <p className="text-green-700 font-bold">PIX gerado!</p>
                          <p className="text-xs text-green-600">Escaneie o QR code ou copie o código</p>
                        </div>
                        <div className="flex justify-center">
                          <img
                            src={`data:image/png;base64,${goldPayResult.pixData.qrCodeImage}`}
                            alt="QR Code PIX Modo Ouro"
                            className="w-44 h-44 rounded-xl border border-gray-200"
                          />
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-xs text-gray-500 mb-1">Código copia e cola:</p>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-gray-700 font-mono flex-1 truncate">{goldPayResult.pixData.copyPaste}</p>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(goldPayResult.pixData.copyPaste);
                                setGoldCopied(true);
                                setTimeout(() => setGoldCopied(false), 3000);
                              }}
                              className={`flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${goldCopied ? 'bg-green-500 text-white' : 'bg-indigo-600 text-white'}`}
                            >
                              {goldCopied ? <Check size={11} /> : <Copy size={11} />}
                              {goldCopied ? 'Copiado!' : 'Copiar'}
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 rounded-xl p-2">
                          <Smartphone size={14} />
                          <span>Abra o app do seu banco e pague via PIX</span>
                        </div>
                      </div>
                    )}

                    {/* BOLETO */}
                    {goldPayResult.billingType === 'BOLETO' && goldPayResult.boletoUrl && (
                      <div className="space-y-3">
                        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 text-center">
                          <p className="text-blue-700 font-bold">Boleto gerado!</p>
                          <p className="text-xs text-blue-600">Compensação em até 3 dias úteis</p>
                        </div>
                        <a
                          href={goldPayResult.boletoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors"
                        >
                          <ExternalLink size={16} /> Abrir Boleto
                        </a>
                      </div>
                    )}

                    {/* CARTÃO */}
                    {goldPayResult.billingType === 'CREDIT_CARD' && goldPayResult.invoiceUrl && (
                      <div className="space-y-3">
                        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-3 text-center">
                          <p className="text-purple-700 font-bold">Pagamento criado!</p>
                          <p className="text-xs text-purple-600">Clique abaixo para inserir os dados do cartão</p>
                        </div>
                        <a
                          href={goldPayResult.invoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 w-full bg-purple-600 text-white py-3 rounded-xl font-bold hover:bg-purple-700 transition-colors"
                        >
                          <CreditCard size={16} /> Pagar com Cartão
                        </a>
                      </div>
                    )}

                    <button
                      onClick={handleCheckGold}
                      disabled={checkingGold}
                      className="w-full border-2 border-yellow-400 text-yellow-700 py-3 rounded-xl font-bold hover:bg-yellow-50 transition-colors disabled:opacity-50"
                    >
                      {checkingGold ? 'Verificando...' : '🔄 Já paguei — ativar Modo Ouro'}
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
