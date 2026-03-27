import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, LogOut } from 'lucide-react';
import { db } from './lib/firebase';
import { useAuth } from './hooks/useAuth';
import { LoginPage } from './pages/LoginPage';
import { Dashboard } from './pages/Dashboard';
import { WeeksPage } from './pages/WeeksPage';
import { ExchangesPage } from './pages/ExchangesPage';
import { ReferralPage } from './pages/ReferralPage';
import { TermsPage } from './pages/TermsPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { Navbar } from './components/Navbar';

export default function App() {
  const { user, loading, logout } = useAuth();
  const [accountStatus, setAccountStatus] = useState<string>('active');

  // Monitoramento do status em tempo real
  useEffect(() => {
    if (!user) {
      setAccountStatus('active');
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, 'users', user.uid),
      (snapshot) => {
        if (snapshot.exists()) {
          setAccountStatus(snapshot.data().account_status || 'active');
        }
      },
      (error) => {
        console.error('Erro ao monitorar status:', error);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Erro ao sair:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      {/* Overlay de conta bloqueada */}
      <AnimatePresence>
        {accountStatus === 'RISK_LOCKED' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 text-center"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: 'spring' }}
              className="max-w-md bg-white rounded-3xl p-12 shadow-2xl"
            >
              <ShieldAlert size={40} className="text-red-600 mx-auto mb-6" />
              <h2 className="text-3xl font-black mb-4">Conta Bloqueada</h2>
              <p className="text-gray-500 mb-8">
                Sua conta foi bloqueada preventivamente por motivos de segurança.
                Para reativar seu acesso, entre em contato com nosso suporte.
              </p>
              <div className="space-y-4">
                <a
                  href="mailto:suporte@weekswap.com"
                  className="block bg-red-600 text-white py-4 rounded-2xl font-black text-center hover:bg-red-700 transition-colors"
                >
                  CONTATAR SUPORTE
                </a>
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center gap-2 w-full bg-gray-50 text-gray-400 py-4 rounded-2xl font-black hover:bg-gray-100 transition-colors"
                >
                  <LogOut size={18} />
                  SAIR DA CONTA
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* App principal */}
      {!user ? (
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/termos" element={<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"><TermsPage /></div>} />
          <Route path="/privacidade" element={<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"><PrivacyPage /></div>} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      ) : (
        <>
          <Navbar user={user} onLogout={handleLogout} />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Routes>
              <Route path="/" element={<Dashboard userId={user.uid} />} />
              <Route path="/weeks" element={<WeeksPage userId={user.uid} />} />
              <Route path="/exchanges" element={<ExchangesPage userId={user.uid} />} />
              <Route path="/indicacao" element={<ReferralPage userId={user.uid} />} />
              <Route path="/success" element={<div className="text-center py-20"><h1 className="text-3xl font-bold text-green-600">Pagamento realizado com sucesso!</h1><p className="text-gray-500 mt-2">Seus créditos serão liberados em breve.</p></div>} />
              <Route path="/cancel" element={<div className="text-center py-20"><h1 className="text-3xl font-bold text-red-600">Pagamento cancelado</h1></div>} />
              <Route path="/termos" element={<TermsPage />} />
              <Route path="/privacidade" element={<PrivacyPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </>
      )}
    </BrowserRouter>
  );
}
