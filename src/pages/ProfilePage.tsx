import { useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot, updateDoc, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { User, Star, CreditCard, Shield, Edit2, Check, X, Loader2 } from 'lucide-react';

interface ProfilePageProps {
  userId: string;
}

type Tab = 'dados' | 'saldo' | 'avaliacoes' | 'seguranca';

export default function ProfilePage({ userId }: ProfilePageProps) {
  const [userData, setUserData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<Tab>('dados');
  const [editingName, setEditingName] = useState(false);
  const [editingCpf, setEditingCpf] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCpf, setNewCpf] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [creditBatches, setCreditBatches] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [passwordEmailSent, setPasswordEmailSent] = useState(false);
  const [passwordSending, setPasswordSending] = useState(false);

  // Listener em tempo real dos dados do usuário
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'users', userId), snap => {
      if (snap.exists()) {
        const data = snap.data();
        setUserData(data);
        setNewName(data.name || '');
        setNewCpf(data.cpf || '');
      }
    });
    return () => unsub();
  }, [userId]);

  // Buscar histórico de créditos
  useEffect(() => {
    if (activeTab !== 'saldo') return;
    const fetchBatches = async () => {
      const q = query(
        collection(db, 'credit_batches'),
        where('user_id', '==', userId),
        orderBy('created_at', 'desc'),
        limit(10)
      );
      const snap = await getDocs(q);
      setCreditBatches(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchBatches();
  }, [activeTab, userId]);

  // Buscar avaliações
  const fetchReviews = useCallback(async () => {
    setLoadingReviews(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const API_URL = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${API_URL}/api/reviews/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.reviews) setReviews(data.reviews);
    } catch { /* silencioso */ }
    setLoadingReviews(false);
  }, [userId]);

  useEffect(() => {
    if (activeTab === 'avaliacoes') fetchReviews();
  }, [activeTab, fetchReviews]);

  const handleSaveName = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    await updateDoc(doc(db, 'users', userId), { name: newName.trim() });
    setSaving(false);
    setEditingName(false);
    setSavedMsg('Nome atualizado!');
    setTimeout(() => setSavedMsg(''), 3000);
  };

  const handleSaveCpf = async () => {
    const cpfClean = newCpf.replace(/\D/g, '');
    if (cpfClean && cpfClean.length !== 11) {
      alert('CPF deve ter 11 dígitos');
      return;
    }
    setSaving(true);
    await updateDoc(doc(db, 'users', userId), { cpf: cpfClean });
    setSaving(false);
    setEditingCpf(false);
    setSavedMsg('CPF atualizado!');
    setTimeout(() => setSavedMsg(''), 3000);
  };

  const formatCpf = (v: string) => {
    const d = v.replace(/\D/g, '').substring(0, 11);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0,3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`;
    return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
  };

  const handleSendPasswordReset = async () => {
    if (!auth.currentUser?.email) return;
    setPasswordSending(true);
    try {
      await sendPasswordResetEmail(auth, auth.currentUser.email);
      setPasswordEmailSent(true);
    } catch (e: any) {
      alert('Erro ao enviar email: ' + e.message);
    }
    setPasswordSending(false);
  };

  const memberSince = userData?.created_at?.toDate?.()?.toLocaleDateString('pt-BR') || '—';
  const avgRating = userData?.avg_rating || 0;
  const reviewCount = userData?.review_count || 0;

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'dados', label: 'Meus Dados', icon: <User size={16} /> },
    { key: 'saldo', label: 'Saldo & Pontos', icon: <CreditCard size={16} /> },
    { key: 'avaliacoes', label: `Avaliações${reviewCount > 0 ? ` (${reviewCount})` : ''}`, icon: <Star size={16} /> },
    { key: 'seguranca', label: 'Segurança', icon: <Shield size={16} /> },
  ];

  if (!userData) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="animate-spin text-indigo-500" size={32} />
    </div>
  );

  const initials = (userData.name || userData.email || '?').charAt(0).toUpperCase();

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header do perfil */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 mb-6 flex items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-white text-2xl font-black shadow-lg shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-black text-white truncate">{userData.name || 'Sem nome'}</h1>
          <p className="text-indigo-200 text-sm truncate">{userData.email}</p>
          <div className="flex items-center gap-3 mt-1">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${userData.account_status === 'RISK_LOCKED' ? 'bg-red-400 text-white' : 'bg-green-400 text-white'}`}>
              {userData.account_status === 'RISK_LOCKED' ? '🔒 Bloqueado' : '✅ Ativo'}
            </span>
            {reviewCount > 0 && (
              <span className="text-xs text-indigo-200">⭐ {avgRating}/5 ({reviewCount} avaliações)</span>
            )}
          </div>
        </div>
        {savedMsg && (
          <div className="bg-green-500 text-white text-sm px-3 py-1 rounded-full font-medium">
            ✓ {savedMsg}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-6 bg-gray-100 rounded-2xl p-1.5 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === tab.key
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ABA: MEUS DADOS */}
      {activeTab === 'dados' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50">
          {/* Nome */}
          <div className="p-5 flex items-center gap-4">
            <div className="flex-1">
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">Nome completo</label>
              {editingName ? (
                <div className="flex gap-2 mt-1">
                  <input
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    className="flex-1 border border-indigo-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                  />
                  <button onClick={handleSaveName} disabled={saving} className="bg-indigo-600 text-white px-3 py-2 rounded-xl hover:bg-indigo-700 disabled:opacity-50">
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  </button>
                  <button onClick={() => setEditingName(false)} className="text-gray-400 hover:text-gray-600 px-2">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <p className="text-gray-800 font-semibold mt-0.5">{userData.name || <span className="text-gray-400 italic">Não informado</span>}</p>
              )}
            </div>
            {!editingName && (
              <button onClick={() => setEditingName(true)} className="text-indigo-500 hover:text-indigo-700 p-2 rounded-xl hover:bg-indigo-50">
                <Edit2 size={16} />
              </button>
            )}
          </div>

          {/* Email */}
          <div className="p-5">
            <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">Email</label>
            <p className="text-gray-800 font-semibold mt-0.5">{userData.email}</p>
            <p className="text-xs text-gray-400 mt-0.5">Não é possível alterar o email</p>
          </div>

          {/* CPF */}
          <div className="p-5 flex items-center gap-4">
            <div className="flex-1">
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">CPF <span className="text-gray-300">(opcional)</span></label>
              {editingCpf ? (
                <div className="flex gap-2 mt-1">
                  <input
                    value={formatCpf(newCpf)}
                    onChange={e => setNewCpf(e.target.value.replace(/\D/g, ''))}
                    placeholder="000.000.000-00"
                    className="flex-1 border border-indigo-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    autoFocus
                    maxLength={14}
                  />
                  <button onClick={handleSaveCpf} disabled={saving} className="bg-indigo-600 text-white px-3 py-2 rounded-xl hover:bg-indigo-700 disabled:opacity-50">
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  </button>
                  <button onClick={() => setEditingCpf(false)} className="text-gray-400 hover:text-gray-600 px-2">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <p className="text-gray-800 font-semibold mt-0.5">
                  {userData.cpf ? formatCpf(userData.cpf) : <span className="text-gray-400 italic">Não informado</span>}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-0.5">Necessário para pagamentos via Asaas</p>
            </div>
            {!editingCpf && (
              <button onClick={() => setEditingCpf(true)} className="text-indigo-500 hover:text-indigo-700 p-2 rounded-xl hover:bg-indigo-50">
                <Edit2 size={16} />
              </button>
            )}
          </div>

          {/* Membro desde */}
          <div className="p-5">
            <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">Membro desde</label>
            <p className="text-gray-800 font-semibold mt-0.5">{memberSince}</p>
          </div>

          {/* Código de indicação */}
          <div className="p-5">
            <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">Seu código de indicação</label>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl text-sm">
                {userData.referral_code || <span className="text-gray-400 italic text-xs">gerando...</span>}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ABA: SALDO & PONTOS */}
      {activeTab === 'saldo' && (
        <div className="space-y-4">
          {/* Cards de saldo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Pontos Disponíveis', value: userData.credits_balance || 0, color: 'indigo', icon: '💎' },
              { label: 'Pontos Pendentes', value: userData.pending_credits || 0, color: 'yellow', icon: '⏳' },
              { label: 'Bônus de Indicação', value: userData.referral_credits || 0, color: 'green', icon: '🎁' },
            ].map(card => (
              <div key={card.label} className={`bg-white rounded-2xl p-5 shadow-sm border border-${card.color}-100`}>
                <div className="text-2xl mb-1">{card.icon}</div>
                <p className={`text-2xl font-black text-${card.color}-700`}>{(card.value).toLocaleString('pt-BR')}</p>
                <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
                <p className={`text-xs text-${card.color}-500 font-medium`}>
                  = R$ {(card.value / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            ))}
          </div>

          {/* Histórico de compras */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-50">
              <h3 className="font-bold text-gray-800">Histórico de compras de pontos</h3>
            </div>
            {creditBatches.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <div className="text-3xl mb-2">💳</div>
                <p className="text-sm">Nenhuma compra de pontos ainda</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {creditBatches.map((batch: any) => (
                  <div key={batch.id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        +{(batch.amount || 0).toLocaleString('pt-BR')} pontos
                      </p>
                      <p className="text-xs text-gray-400">
                        {batch.created_at?.toDate?.()?.toLocaleDateString('pt-BR') || '—'} · {batch.asaas_billing_type || ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-700">
                        R$ {(batch.amount_reais || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        batch.status === 'AVAILABLE'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {batch.status === 'AVAILABLE' ? '✓ Confirmado' : '⏳ Pendente'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA: AVALIAÇÕES */}
      {activeTab === 'avaliacoes' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Média geral */}
          {reviewCount > 0 && (
            <div className="p-5 border-b border-gray-50 flex items-center gap-4">
              <div className="text-4xl font-black text-indigo-700">{avgRating.toFixed(1)}</div>
              <div>
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map(s => (
                    <span key={s} className={`text-xl ${s <= Math.round(avgRating) ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
                  ))}
                </div>
                <p className="text-sm text-gray-500 mt-0.5">{reviewCount} avaliação{reviewCount !== 1 ? 'ões' : ''} recebida{reviewCount !== 1 ? 's' : ''}</p>
              </div>
            </div>
          )}

          {loadingReviews ? (
            <div className="p-8 text-center">
              <Loader2 className="animate-spin text-indigo-400 mx-auto" size={24} />
            </div>
          ) : reviews.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <div className="text-3xl mb-2">⭐</div>
              <p className="text-sm font-medium">Nenhuma avaliação ainda</p>
              <p className="text-xs mt-1">Avaliações aparecem após trocas finalizadas</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {reviews.map((r: any) => (
                <div key={r.id} className="p-5">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(s => (
                        <span key={s} className={`text-base ${s <= r.rating ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
                      ))}
                    </div>
                    <span className="text-xs text-gray-400">
                      {r.created_at?.toDate?.()?.toLocaleDateString('pt-BR') || '—'}
                    </span>
                  </div>
                  {r.comment && <p className="text-sm text-gray-600 mt-1 italic">"{r.comment}"</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ABA: SEGURANÇA */}
      {activeTab === 'seguranca' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50">
            <div className="p-5">
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">Email da conta</label>
              <p className="text-gray-800 font-semibold mt-0.5">{userData.email}</p>
            </div>
            <div className="p-5">
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">Status da conta</label>
              <p className={`font-semibold mt-0.5 ${userData.account_status === 'RISK_LOCKED' ? 'text-red-600' : 'text-green-600'}`}>
                {userData.account_status === 'RISK_LOCKED' ? '🔒 Conta bloqueada' : '✅ Conta ativa'}
              </p>
              {userData.account_status === 'RISK_LOCKED' && (
                <p className="text-xs text-red-400 mt-1">Entre em contato com o suporte para desbloquear.</p>
              )}
            </div>
            <div className="p-5">
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">Senha</label>
              <p className="text-gray-500 text-sm mt-0.5">
                Um email com link para redefinir sua senha será enviado para seu endereço cadastrado.
              </p>
              {passwordEmailSent ? (
                <div className="mt-3 bg-green-50 border border-green-200 rounded-xl p-3 text-green-700 text-sm font-medium">
                  ✅ Email enviado! Verifique sua caixa de entrada.
                </div>
              ) : (
                <button
                  onClick={handleSendPasswordReset}
                  disabled={passwordSending}
                  className="mt-3 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
                >
                  {passwordSending ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
                  Alterar senha
                </button>
              )}
            </div>
          </div>

          <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4">
            <p className="text-sm font-semibold text-orange-700">⚠️ Zona de perigo</p>
            <p className="text-xs text-orange-600 mt-1">
              Para excluir sua conta ou resolver questões de segurança, entre em contato com o suporte: <strong>suporte@weekswap.com.br</strong>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
