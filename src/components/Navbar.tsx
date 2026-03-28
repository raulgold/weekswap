import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { User } from 'firebase/auth';
import { ArrowLeftRight, Calendar, LayoutDashboard, LogOut, Gift, Globe, ChevronDown } from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';
import type { Language, Currency } from '../lib/i18n';

interface NavbarProps {
  user: User;
  onLogout: () => void;
}

export function Navbar({ user, onLogout }: NavbarProps) {
  const location = useLocation();
  const { lang, currency, setLang, setCurrency, t } = useLanguage();
  const [showLangMenu, setShowLangMenu] = useState(false);

  const links = [
    { to: '/',          label: t('nav.dashboard'), icon: LayoutDashboard },
    { to: '/weeks',     label: t('nav.weeks'),     icon: Calendar },
    { to: '/exchanges', label: t('nav.exchanges'), icon: ArrowLeftRight },
    { to: '/indicacao', label: t('nav.referral'),  icon: Gift },
  ];

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo + links */}
          <div className="flex items-center gap-8">
            <Link to="/" className="text-xl font-black text-indigo-600">
              WeekSwap
            </Link>
            <div className="hidden sm:flex items-center gap-1">
              {links.map(({ to, label, icon: Icon }) => (
                <Link key={to} to={to}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === to
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Direita: idioma + moeda + email + sair */}
          <div className="flex items-center gap-2">

            {/* Seletor idioma/moeda */}
            <div className="relative">
              <button
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 border border-gray-200 transition-colors"
              >
                <Globe size={15} />
                <span>{lang === 'pt-BR' ? '🇧🇷 PT' : '🇺🇸 EN'}</span>
                <span className="text-gray-300">|</span>
                <span>{currency}</span>
                <ChevronDown size={13} />
              </button>
              {showLangMenu && (
                <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl border border-gray-200 shadow-lg py-1 z-50">
                  <p className="px-3 py-1 text-xs text-gray-400 font-medium uppercase tracking-wide">Idioma</p>
                  {(['pt-BR', 'en-US'] as Language[]).map(l => (
                    <button
                      key={l}
                      onClick={() => { setLang(l); setShowLangMenu(false); }}
                      className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors ${lang === l ? 'text-indigo-600 font-bold' : 'text-gray-700'}`}
                    >
                      {l === 'pt-BR' ? '🇧🇷 Português (BR)' : '🇺🇸 English (US)'}
                      {lang === l && <span className="ml-auto">✓</span>}
                    </button>
                  ))}
                  <div className="border-t border-gray-100 my-1" />
                  <p className="px-3 py-1 text-xs text-gray-400 font-medium uppercase tracking-wide">Moeda</p>
                  {(['BRL', 'USD'] as Currency[]).map(c => (
                    <button
                      key={c}
                      onClick={() => { setCurrency(c); setShowLangMenu(false); }}
                      className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors ${currency === c ? 'text-indigo-600 font-bold' : 'text-gray-700'}`}
                    >
                      {c === 'BRL' ? '🇧🇷 Real (BRL)' : '🇺🇸 Dollar (USD)'}
                      {currency === c && <span className="ml-auto">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Email */}
            <span className="hidden md:block text-sm text-gray-500 max-w-[180px] truncate">
              {user.email}
            </span>

            {/* Sair */}
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">{t('nav.logout')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Overlay para fechar dropdown */}
      {showLangMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setShowLangMenu(false)} />
      )}
    </nav>
  );
}
