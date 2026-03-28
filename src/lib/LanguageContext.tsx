import { createContext, useContext, useState, ReactNode } from 'react';
import { Language, Currency, t as translate, formatCurrency, formatPoints } from './i18n';

interface LanguageContextValue {
  lang: Language;
  currency: Currency;
  setLang: (l: Language) => void;
  setCurrency: (c: Currency) => void;
  t: (key: string) => string;
  fmt: (valueInBRL: number) => string;
  fmtPts: (points: number) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'pt-BR',
  currency: 'BRL',
  setLang: () => {},
  setCurrency: () => {},
  t: (k) => k,
  fmt: (v) => `R$ ${v.toFixed(2)}`,
  fmtPts: (p) => `${p} pts`,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const savedLang = (localStorage.getItem('weekswap_lang') as Language) || 'pt-BR';
  const savedCurrency = (localStorage.getItem('weekswap_currency') as Currency) || 'BRL';

  const [lang, setLangState] = useState<Language>(savedLang);
  const [currency, setCurrencyState] = useState<Currency>(savedCurrency);

  const setLang = (l: Language) => {
    setLangState(l);
    localStorage.setItem('weekswap_lang', l);
  };

  const setCurrency = (c: Currency) => {
    setCurrencyState(c);
    localStorage.setItem('weekswap_currency', c);
  };

  const value: LanguageContextValue = {
    lang,
    currency,
    setLang,
    setCurrency,
    t: (key) => translate(key, lang),
    fmt: (valueInBRL) => formatCurrency(valueInBRL, currency),
    fmtPts: (points) => formatPoints(points, lang),
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
