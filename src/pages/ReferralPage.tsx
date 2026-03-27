import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Gift, Copy, Check, Users, TrendingUp } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface ReferralPageProps {
  userId: string;
}

export function ReferralPage({ userId }: ReferralPageProps) {
  const [userData, setUserData] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'users', userId), (snap) => {
      if (snap.exists()) setUserData(snap.data());
    });
    return () => unsubscribe();
  }, [userId]);

  const referralLink = `${window.location.origin}/login?ref=${userData?.referral_code}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getReferralRate = (count: number) => {
    if (count >= 51) return 2.5;
    if (count >= 21) return 2.0;
    if (count >= 6) return 1.5;
    return 1.0;
  };

  const referralCount = userData?.referral_count || 0;
  const currentRate = getReferralRate(referralCount);
  const nextTier = referralCount < 6 ? { at: 6, rate: 1.5 } :
                   referralCount < 21 ? { at: 21, rate: 2.0 } :
                   referralCount < 51 ? { at: 51, rate: 2.5 } : null;

  const tiers = [
    { min: 1, max: 5, rate: 1.0, label: '1–5 indicados' },
    { min: 6, max: 20, rate: 1.5, label: '6–20 indicados' },
    { min: 21, max: 50, rate: 2.0, label: '21–50 indicados' },
    { min: 51, max: null, rate: 2.5, label: '51+ indicados' },
  ];

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900">Programa de Indicação</h1>

      {/* Saldo de créditos por indicação */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-6 text-white"
      >
        <div className="flex items-center gap-3 mb-2">
          <Gift size={24} />
          <span className="font-bold text-lg">Créditos por Indicação</span>
        </div>
        <p className="text-4xl font-black">{userData?.referral_credits || 0}</p>
        <p className="text-indigo-200 text-sm mt-1">créditos acumulados</p>
      </motion.div>

      {/* Taxa atual */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={20} className="text-indigo-600" />
            <h2 className="font-bold text-gray-900">Sua taxa atual</h2>
          </div>
          <span className="text-2xl font-black text-indigo-600">{currentRate}%</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Users size={16} />
          <span>{referralCount} indicados ativos</span>
        </div>

        {nextTier && (
          <div className="bg-indigo-50 rounded-xl p-3 text-sm text-indigo-700">
            Indique mais <strong>{nextTier.at - referralCount}</strong> pessoas para subir para <strong>{nextTier.rate}%</strong>
          </div>
        )}

        {/* Tabela de níveis */}
        <div className="mt-4 space-y-2">
          {tiers.map((tier) => {
            const isActive = referralCount >= tier.min && (tier.max === null || referralCount <= tier.max);
            return (
              <div
                key={tier.min}
                className={`flex items-center justify-between p-3 rounded-xl text-sm ${
                  isActive ? 'bg-indigo-100 text-indigo-800 font-bold' : 'bg-gray-50 text-gray-500'
                }`}
              >
                <span>{tier.label}</span>
                <span>{tier.rate}% por troca</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Link de indicação */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="font-bold text-gray-900 mb-1">Seu link de indicação</h2>
        <p className="text-sm text-gray-500 mb-4">
          Compartilhe este link. Quando alguém se cadastrar e fizer uma troca, você ganha créditos automaticamente.
        </p>

        <div className="flex gap-2">
          <div className="flex-1 bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-600 truncate font-mono">
            {referralLink}
          </div>
          <button
            onClick={handleCopy}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold transition-colors ${
              copied ? 'bg-green-600 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
            {copied ? 'Copiado!' : 'Copiar'}
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-gray-400">Seu código:</span>
          <span className="text-sm font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
            {userData?.referral_code}
          </span>
        </div>
      </div>

      {/* Como funciona */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="font-bold text-gray-900 mb-4">Como funciona</h2>
        <div className="space-y-3">
          {[
            { step: '1', text: 'Compartilhe seu link com amigos ou clientes' },
            { step: '2', text: 'Eles se cadastram e publicam semanas' },
            { step: '3', text: 'A cada troca finalizada, você recebe créditos automaticamente' },
            { step: '4', text: 'Use os créditos para fazer suas próprias trocas e viajar de graça' },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-3">
              <span className="flex-shrink-0 w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-black">
                {item.step}
              </span>
              <p className="text-sm text-gray-600 pt-1">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
