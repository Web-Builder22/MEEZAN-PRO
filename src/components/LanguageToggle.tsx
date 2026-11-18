import { Language } from '../translations';

interface LanguageToggleProps {
  language: Language;
  setLanguage: (lang: Language) => void;
}

export default function LanguageToggle({ language, setLanguage }: LanguageToggleProps) {
  const selectLanguage = (nextLang: Language) => {
    setLanguage(nextLang);
    document.documentElement.dir = nextLang === 'ur' ? 'rtl' : 'ltr';
    localStorage.setItem('lang', nextLang);
  };

  const toggleLanguage = () => {
    selectLanguage(language === 'en' ? 'ur' : 'en');
  };

  return (
    <button
      id="language-btn"
      type="button"
      dir="ltr"
      onClick={toggleLanguage}
      aria-label="Toggle language between English and Urdu"
      className="inline-flex items-center p-1 rounded-full bg-slate-100/95 dark:bg-zinc-800/95 border border-slate-200/80 dark:border-zinc-700/80 shadow-inner select-none cursor-pointer transition-all focus:outline-none"
    >
      <span
        className={`px-3 py-1 rounded-full text-xs font-black tracking-wide transition-all duration-200 ${
          language === 'en'
            ? 'bg-gradient-to-r from-[#064E3B] to-[#059669] text-white shadow-[0_2px_8px_rgba(5,150,105,0.4)]'
            : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
        }`}
      >
        EN
      </span>
      <span
        className={`px-3 py-1 rounded-full text-xs font-black leading-none transition-all duration-200 ${
          language === 'ur'
            ? 'bg-gradient-to-r from-[#064E3B] to-[#059669] text-white shadow-[0_2px_8px_rgba(5,150,105,0.4)]'
            : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
        }`}
      >
        اردو
      </span>
    </button>
  );
}

