import React from 'react';
import { BRAND } from '../brand';

interface FooterProps {
  hasMobileBottomNav?: boolean;
}

export default function Footer({ hasMobileBottomNav = false }: FooterProps) {
  return (
    <footer
      className={`w-full bg-[#042F24] border-t border-white/10 px-4 sm:px-8 py-7 ${
        hasMobileBottomNav ? 'pb-24 md:pb-7' : ''
      } transition-colors duration-200`}
    >
      <div className="max-w-7xl mx-auto flex flex-col items-center justify-center text-center gap-2">
        <p className="text-sm sm:text-base font-extrabold text-white flex items-center justify-center gap-2">
          <span className="font-mono font-black text-emerald-400">
            &lt;/&gt;
          </span>
          <span>Crafted with ❤️ by M. Nouman</span>
        </p>
        <p className="text-xs sm:text-sm text-gray-300 font-medium">
          {BRAND.getCopyright('en')}
        </p>
      </div>
    </footer>
  );
}
