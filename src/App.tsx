import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, LogOut, MapPin, RefreshCw } from 'lucide-react';
import { db } from './lib/firebase';
import { useAuth } from './hooks/useAuth';
import { LanguageProvider } from './lib/LanguageContext';
import { GeoProvider, useGeo } from './lib/GeoContext';
import { LoginPage } from './pages/LoginPage';
import { Dashboard } from './pages/Dashboard';
import { WeeksPage } from './pages/WeeksPage';
import { ExchangesPage } from './pages/ExchangesPage';
import { ReferralPage } from './pages/ReferralPage';
import { TermsPage } from './pages/TermsPage';
import { PrivacyPage } from './pages/PrivacyPage';
import AdminPage from './pages/AdminPage';
import ProfilePage from './pages/ProfilePage';
import { Navbar } from './components/Navbar';

// ─── GeoGate: bloqueia app enquanto carrega ou se permissão negada ────────────
function GeoGate({ children }: { children: React.ReactNode }) {
  const { loading, permissionDenied } = useGeo();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
        <p className="text-gray-500 text-sm">Detectando sua localização...</p>
      </div>
    );
  }

  if (permissionDenied) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-sm bg-white rounded-3xl p-10 shadow-xl text-center">
          <div className="flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mx-auto mb-6">
            <MapPin size={32} className="text-indigo-600" />
          </div>
          <h2 className="text-2xl font-black mb-3">Localização Necessária</h2>
          <p className="text-gray-500 mb-8 text-sm leading-relaxed">
            O WeekSwap precisa da sua localização para definir a taxa de câmbio correta.
            Por favor, permita o acesso à localização e recarregue a página.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center justify-center gap-2 w-full bg-indigo-600 text-white py-4 rounded-2xl font-black hover:bg-indigo-700 transition-colors"
          >
            <RefreshCw size={18} />
            TENTAR NOVAMENTE
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// ─── Conteúdo principal (precisa estar dentro do GeoProvider) ─────────────────
function AppContent() {
  const { user, loading, logout } = useAuth();
  const [accountStatus, setAccountStatus] = useState<string>('active');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) {
      setAccountStatus('active');
      setIsAdmin(false);
      return;
    }
    const unsubscribe = onSnapshot(
      doc(db, 'users', user.uid),
      (snapshot) => {
        if (snapshot.exists()) {
          setAccountStatus(snapshot.data().account_status || 'active');
          setIsAdmin(snapshot.data().is_admin === true);
        }
      },
      (error) => console.error('Erro ao monitorar status:', error)
    );
    return () => unsubscribe();
  }, [user]);

  const handleLogout = async () => {
    try { await logout(); } catch (error) { console.error('Erro ao sair:', error); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <>
      <AnimatePresence>
        {accountStatus === 'RISK_LOCKED' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 text-center">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: 'spring' }}
              className="max-w-md bg-white rounded-3xl p-12 shadow-2xl">
              <ShieldAlert size={40} className="text-red-600 mx-auto mb-6" />
              <h2 className="text-3xl font-black mb-4">Conta Bloqueada</h2>
              <p className="text-gray-500 mb-8">
                Sua conta foi bloqueada preventivamente por motivos de seguranca.
                Para reativar seu acesso, entre em contato com nosso suporte.
              </p>
              <div className="space-y-4">
                <a href="mailto:suporte@weekswap.com"
                  className="block bg-red-600 text-white py-4 rounded-2xl font-black text-center hover:bg-red-700 transition-colors">
                  CONTATAR SUPORTE
                </a>
                <button onClick={handleLogout}
                  className="flex items-center justify-center gap-2 w-full bg-gray-50 text-gray-400 py-4 rounded-2xl font-black hover:bg-gray-100 transition-colors">
                  <LogOut size={18} />
                  SAIR DA CONTA
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {!user ? (
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/termos" element={<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"><TermsPage /></div>} />
          <Route path="/privacidade" element={<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"><PrivacyPage /></div>} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      ) : (
        <>
          <Navbar user={user} onLogout={handleLogout} isAdmin={isAdmin} />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Routes>
              <Route path="/" element={<Dashboard userId={user.uid} />} />
              <Route path="/weeks" element={<WeeksPage userId={user.uid} />} />
              <Route path="/exchanges" element={<ExchangesPage userId={user.uid} />} />
              <Route path="/indicacao" element={<ReferralPage userId={user.uid} />} />
              <Route path="/profile" element={<ProfilePage userId={user.uid} />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/success" element={
                <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4">
                  <div className="text-center bg-white/10 backdrop-blur-sm rounded-2xl p-8 max-w-sm w-full">
                    <div className="text-5xl mb-4">✅</div>
                    <h1 className="text-2xl font-bold text-white mb-2">Pagamento Realizado!</h1>
                    <p className="text-slate-300 mb-6">Seus pontos serão liberados após a confirmação do pagamento.</p>
                    <Link to="/" className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-xl transition-colors">
                      Voltar ao Dashboard
                    </Link>
                  </div>
                </div>
              } />
              <Route path="/cancel" element={
                <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4">
                  <div className="text-center bg-white/10 backdrop-blur-sm rounded-2xl p-8 max-w-sm w-full">
                    <div className="text-5xl mb-4">❌</div>
                    <h1 className="text-2xl font-bold text-white mb-2">Pagamento Cancelado</h1>
                    <p className="text-slate-300 mb-6">O pagamento foi cancelado. Você pode tentar novamente quando quiser.</p>
                    <Link to="/" className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-xl transition-colors">
                      Voltar ao Dashboard
                    </Link>
                  </div>
                </div>
              } />
              <Route path="/termos" element={<TermsPage />} />
              <Route path="/privacidade" element={<PrivacyPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </>
      )}
    </>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <LanguageProvider>
      <GeoProvider>
        <GeoGate>
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </GeoGate>
      </GeoProvider>
    </LanguageProvider>
  );
}
