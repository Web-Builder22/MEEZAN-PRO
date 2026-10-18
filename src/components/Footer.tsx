import React from 'react';
import { BRAND } from '../brand';

interface FooterProps {
  hasMobileBottomNav?: boolean;
}

export default function Footer({ hasMobileBottomNav = false }: FooterProps) {
  return (
    <footer
      className={`w-full bg-white dark:bg-zinc-900 border-t border-slate-200/80 dark:border-zinc-800 px-4 sm:px-8 py-6 ${
        hasMobileBottomNav ? 'pb-22 md:pb-6' : ''
      } transition-colors duration-200`}
    >
      <div className="max-w-7xl mx-auto flex flex-col items-center justify-center text-center gap-1.5">
        <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-zinc-400 flex items-center justify-center gap-1.5">
          <span className="font-mono font-bold text-[#0B192C] dark:text-[#D4AF37]">
            &lt;/&gt;
          </span>
          <span>Crafted with ❤️ by M. Nouman</span>
        </p>
        <p className="text-xs text-slate-400 dark:text-zinc-500">
          {BRAND.getCopyright('en')}
        </p>
      </div>
    </footer>
  );
}
