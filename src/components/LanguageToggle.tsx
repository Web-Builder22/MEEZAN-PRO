import { Language } from '../translations';
import { Globe } from 'lucide-react';

interface LanguageToggleProps {
  language: Language;
  setLanguage: (lang: Language) => void;
}

export default function LanguageToggle({ language, setLanguage }: LanguageToggleProps) {
  const toggleLanguage = () => {
    const nextLang: Language = language === 'en' ? 'ur' : 'en';
    setLanguage(nextLang);
    // Dynamically adjust HTML text direction
    document.documentElement.dir = nextLang === 'ur' ? 'rtl' : 'ltr';
    localStorage.setItem('lang', nextLang);
  };

  return (
    <button
      id="language-btn"
      onClick={toggleLanguage}
      className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors shadow-sm text-sm font-medium focus:outline-none"
    >
      <Globe className="h-[18px] w-[18px] text-[#0B192C] dark:text-[#D4AF37]" />
      <span>{language === 'en' ? 'اردو (Urdu)' : 'English'}</span>
    </button>
  );
}
