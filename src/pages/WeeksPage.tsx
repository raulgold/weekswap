import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, MapPin, Plus, X, Users, Home, Star,
  ChevronDown, ChevronUp, ArrowLeftRight, FileText
} from 'lucide-react';
import { api } from '../lib/api';

interface WeeksPageProps {
  userId: string;
}

const ESTADOS_BR = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS',
  'MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
];

const TEMPORADAS = [
  { value: 'alta', label: 'Alta Temporada (Jan–Fev / Jul / Dez)', color: 'text-red-600' },
  { value: 'media', label: 'Média Temporada (Mar–Jun / Ago–Set)', color: 'text-amber-600' },
  { value: 'baixa', label: 'Baixa Temporada (Out–Nov)', color: 'text-green-600' },
];

const TIPOS_UNIDADE = ['Studio', 'Apartamento 1 quarto', 'Apartamento 2 quartos', 'Apartamento 3 quartos', 'Chalé', 'Casa', 'Bangalô'];

const defaultForm = {
  resort: '',
  cidade: '',
  estado: '',
  resortEntregue: false,
  checkIn: '',
  checkOut: '',
  temporada: '',
  tipoUnidade: '',
  capacidade: '2',
  numeroCertificado: '',
  descricao: '',
  aceitaTroca: true,
  observacoes: '',
};

export function WeeksPage({ userId }: WeeksPageProps) {
  const [allWeeks, setAllWeeks] = useState<any[]>([]);
  const [myWeeks, setMyWeeks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [tab, setTab] = useState<'disponiveis' | 'minhas'>('disponiveis');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [requesting, setRequesting] = useState<string | null>(null);
  const [myWeeksIds, setMyWeeksIds] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [showWeekSelectId, setShowWeekSelectId] = useState<string | null>(null); // ID da semana solicitada
  const [selectedMyWeekId, setSelectedMyWeekId] = useState<string>('');

  const fetchWeeks = async () => {
    try {
      const data = await api.getWeeks();
      const all = data.weeks;
      setAllWeeks(all.filter((w: any) => w.owner_id !== userId));
      const mine = all.filter((w: any) => w.owner_id === userId);
      setMyWeeks(mine);
      setMyWeeksIds(mine.map((w: any) => w.id));
    } catch (error) {
      console.error('Erro ao buscar semanas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchWeeks(); }, [userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.resortEntregue) { setError('Apenas resorts entregues e em pleno funcionamento podem ser cadastrados.'); return; }
    if (!form.temporada) { setError('Selecione a temporada'); return; }
    if (!form.tipoUnidade) { setError('Selecione o tipo de unidade'); return; }
    setSubmitting(true);
    try {
      await api.submitWeek(userId, form);
      setShowForm(false);
      setForm(defaultForm);
      fetchWeeks();
    } catch (err: any) {
      setError(err.message || 'Erro ao publicar semana');
    } finally {
      setSubmitting(false);
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
      await api.initiateExchange(userId, offeredWeekId, requestedWeekId);
      alert('Solicitação de troca enviada! Aguarde a confirmação do proprietário.');
      setShowWeekSelectId(null);
    } catch (err: any) {
      alert(err.message || 'Erro ao solicitar troca');
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

  const displayWeeks = tab === 'disponiveis' ? allWeeks : myWeeks;

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

      {/* Formulário de cadastro */}
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

            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl">{error}</div>
            )}

            {/* Resort e localização */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Resort / Empreendimento *
                </label>
                <input
                  type="text"
                  value={form.resort}
                  onChange={e => set('resort', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  placeholder="Ex: Riviera Beach Resort"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cidade *</label>
                <input
                  type="text"
                  value={form.cidade}
                  onChange={e => set('cidade', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  placeholder="Ex: Florianópolis"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado *</label>
                <select
                  value={form.estado}
                  onChange={e => set('estado', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  required
                >
                  <option value="">Selecione</option>
                  {ESTADOS_BR.map(uf => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Verificação: resort entregue */}
            <div className={`rounded-2xl border-2 p-4 transition-colors ${form.resortEntregue ? 'border-green-400 bg-green-50' : 'border-red-200 bg-red-50'}`}>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {form.resortEntregue
                    ? <span className="text-2xl">✅</span>
                    : <span className="text-2xl">🚫</span>
                  }
                </div>
                <div className="flex-1">
                  <p className={`font-black text-sm mb-1 ${form.resortEntregue ? 'text-green-800' : 'text-red-800'}`}>
                    O resort/empreendimento está entregue e em pleno funcionamento? *
                  </p>
                  <p className="text-xs text-gray-500 mb-3">
                    Somente semanas de resorts <strong>já entregues e operacionais</strong> podem ser cadastradas.
                    Empreendimentos em construção, na planta, em fase de entrega ou com obras pendentes <strong>não são permitidos</strong>.
                  </p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => set('resortEntregue', true)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-black border-2 transition-all ${
                        form.resortEntregue
                          ? 'bg-green-600 text-white border-green-600'
                          : 'bg-white text-gray-500 border-gray-200 hover:border-green-400'
                      }`}
                    >
                      ✔ Sim, está entregue e operacional
                    </button>
                    <button
                      type="button"
                      onClick={() => set('resortEntregue', false)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-black border-2 transition-all ${
                        !form.resortEntregue
                          ? 'bg-red-500 text-white border-red-500'
                          : 'bg-white text-gray-500 border-gray-200 hover:border-red-400'
                      }`}
                    >
                      ✖ Não / Em construção
                    </button>
                  </div>
                  {!form.resortEntregue && (
                    <p className="text-xs text-red-600 font-bold mt-2">
                      ⚠️ Não é possível cadastrar semanas de empreendimentos não entregues.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Tipo, temporada, capacidade */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Unidade *</label>
                <select
                  value={form.tipoUnidade}
                  onChange={e => set('tipoUnidade', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                >
                  <option value="">Selecione</option>
                  {TIPOS_UNIDADE.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Temporada *</label>
                <select
                  value={form.temporada}
                  onChange={e => set('temporada', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                >
                  <option value="">Selecione</option>
                  {TEMPORADAS.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Capacidade (pessoas)</label>
                <select
                  value={form.capacidade}
                  onChange={e => set('capacidade', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                >
                  {[2,3,4,5,6,7,8,10,12].map(n => (
                    <option key={n} value={String(n)}>{n} pessoas</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Datas */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data Check-in *</label>
                <input
                  type="date"
                  value={form.checkIn}
                  onChange={e => set('checkIn', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data Check-out *</label>
                <input
                  type="date"
                  value={form.checkOut}
                  onChange={e => set('checkOut', e.target.value)}
                  min={form.checkIn}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  required
                />
              </div>
            </div>

            {/* Número do certificado / contrato */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nº do Certificado / Contrato de Multipropriedade
                <span className="text-gray-400 font-normal ml-1">(opcional, mas recomendado)</span>
              </label>
              <input
                type="text"
                value={form.numeroCertificado}
                onChange={e => set('numeroCertificado', e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                placeholder="Ex: CERT-2024-00123"
              />
              <p className="text-xs text-gray-400 mt-1">
                O número do certificado ajuda a validar sua propriedade e aumenta a confiança de outros usuários.
              </p>
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
              <textarea
                value={form.descricao}
                onChange={e => set('descricao', e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
                placeholder="Descreva o que está incluso, pontos turísticos próximos, diferenciais da unidade..."
              />
            </div>

            {/* Observações */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Preferências de troca / Observações
              </label>
              <textarea
                value={form.observacoes}
                onChange={e => set('observacoes', e.target.value)}
                rows={2}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
                placeholder="Ex: Aceito trocas por praias do Nordeste, período similar, até 6 pessoas..."
              />
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
              disabled={submitting}
              className="w-full bg-indigo-600 text-white py-4 rounded-xl font-black text-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Publicando...' : 'Publicar Semana para Troca'}
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setTab('disponiveis')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
            tab === 'disponiveis' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'
          }`}
        >
          Disponíveis ({allWeeks.length})
        </button>
        <button
          onClick={() => setTab('minhas')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
            tab === 'minhas' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'
          }`}
        >
          Minhas Semanas ({myWeeks.length})
        </button>
      </div>

      {/* Lista */}
      {displayWeeks.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Calendar size={48} className="mx-auto mb-4 opacity-50" />
          <p className="font-medium">
            {tab === 'disponiveis' ? 'Nenhuma semana disponível no momento' : 'Você ainda não publicou nenhuma semana'}
          </p>
          {tab === 'minhas' && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 text-indigo-600 font-bold hover:underline text-sm"
            >
              Publicar minha primeira semana →
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayWeeks.map((week, i) => {
            const temp = TEMPORADAS.find(t => t.value === week.temporada);
            const isExpanded = expandedId === week.id;
            return (
              <motion.div
                key={week.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow overflow-hidden"
              >
                {/* Header do card */}
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-black text-gray-900 text-base">{week.resort}</p>
                      <div className="flex items-center gap-1 text-sm text-gray-500 mt-0.5">
                        <MapPin size={13} />
                        <span>{week.cidade ? `${week.cidade} — ${week.estado}` : week.estado || '—'}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
                        temp ? 'bg-orange-50 text-orange-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {temp ? temp.label.split(' ')[0] + ' Temp.' : 'Disponível'}
                      </span>
                      {week.resort_entregue && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 flex items-center gap-1 whitespace-nowrap">
                          ✅ Entregue
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-3">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={14} className="text-indigo-400" />
                      <span>{week.check_in}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar size={14} className="text-indigo-400" />
                      <span>{week.check_out}</span>
                    </div>
                    {(week.tipoUnidade || week.tipo_unidade) && (
                      <div className="flex items-center gap-1.5">
                        <Home size={14} className="text-indigo-400" />
                        <span>{week.tipoUnidade || week.tipo_unidade}</span>
                      </div>
                    )}
                    {(week.capacidade) && (
                      <div className="flex items-center gap-1.5">
                        <Users size={14} className="text-indigo-400" />
                        <span>Até {week.capacidade} pessoas</span>
                      </div>
                    )}
                  </div>

                  {/* Expansível */}
                  {(week.descricao || week.observacoes || week.numeroCertificado) && (
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : week.id)}
                      className="flex items-center gap-1 text-xs text-indigo-600 font-medium mb-3"
                    >
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      {isExpanded ? 'Menos detalhes' : 'Ver mais detalhes'}
                    </button>
                  )}

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-2 text-sm text-gray-600 mb-3 border-t border-gray-100 pt-3">
                          {week.descricao && <p>{week.descricao}</p>}
                          {week.observacoes && (
                            <p className="text-xs text-gray-400 italic">Obs: {week.observacoes}</p>
                          )}
                          {week.numero_certificado && (
                            <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 rounded-lg px-3 py-1.5">
                              <Star size={12} />
                              <span>Cert: {week.numero_certificado}</span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Botão de ação */}
                  {tab === 'disponiveis' && (
                    <button
                      onClick={() => handleSolicitarTroca(week.id)}
                      disabled={requesting === week.id}
                      className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 text-sm"
                    >
                      <ArrowLeftRight size={16} />
                      {requesting === week.id ? 'Solicitando...' : 'Solicitar Troca'}
                    </button>
                  )}
                  {tab === 'minhas' && (
                    <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                      <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                      Publicada — disponível para troca
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modal: selecionar qual semana oferecer */}
      <AnimatePresence>
        {showWeekSelectId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowWeekSelectId(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-black text-gray-900 mb-1">Qual semana você quer oferecer?</h3>
              <p className="text-sm text-gray-500 mb-4">Selecione a semana que você irá trocar:</p>
              <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                {myWeeks.map(w => (
                  <button
                    key={w.id}
                    onClick={() => setSelectedMyWeekId(w.id)}
                    className={`w-full text-left p-3 rounded-xl border-2 transition-all text-sm ${
                      selectedMyWeekId === w.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-bold text-gray-900">{w.resort}</p>
                    <p className="text-gray-500 text-xs">{w.cidade} — {w.estado} · {w.check_in} a {w.check_out}</p>
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowWeekSelectId(null)}
                  className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => selectedMyWeekId && confirmExchange(selectedMyWeekId, showWeekSelectId)}
                  disabled={!selectedMyWeekId || requesting === showWeekSelectId}
                  className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {requesting === showWeekSelectId ? 'Enviando...' : 'Confirmar Troca'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
