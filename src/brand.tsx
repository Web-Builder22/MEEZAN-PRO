import React from 'react';
import { Language } from './translations';

/**
 * Centralized Brand Configuration for MeezanFlow
 * "Meezan" represents balance and financial accuracy; "Flow" represents smooth business operations.
 */
export const BRAND = {
  name: 'MeezanFlow',
  displayName: 'MeezanFlow',
  nameUr: 'میزان فلو',
  tagline: 'Every Account. Perfectly Balanced.',
  taglineSecondary: 'Balance your business. Flow with confidence.',
  taglineUr: 'ہر کھاتہ۔ مکمل توازن کے ساتھ۔',
  category: 'Modern Business Accounting & Financial Management SaaS',
  categoryUr: 'جدید کاروباری اکاؤنٹنگ اور مالیاتی مینجمنٹ سسٹم',
  copyrightYear: 2026,
  getCopyright(lang: Language = 'en') {
    return lang === 'en'
      ? `© ${this.copyrightYear} ${this.name}. All rights reserved.`
      : `© ${this.copyrightYear} ${this.name}. جملہ حقوق محفوظ ہیں۔`;
  },
  getName(lang: Language = 'en') {
    return lang === 'en' ? this.name : `${this.name} (${this.nameUr})`;
  },
  getTagline(lang: Language = 'en') {
    return lang === 'en' ? this.tagline : this.taglineUr;
  },
  exportPrefix: 'meezanflow_backup',
  defaultBusinessName: 'MeezanFlow Business'
} as const;

interface MeezanLogoProps {
  size?: 'sm' | 'md' | 'lg' | number;
  className?: string;
}

/**
 * Distinctive, High-End Fintech MeezanFlow Emblem:
 * - Deep Forest & Emerald Green enclosure (#042F24 -> #064E3B) with subtle Gold border
 * - "Meezan": Precision architectural gold equilibrium scale & fulcrum (#D4AF37)
 * - "Flow": Ascending emerald-and-white liquidity wave underneath
 */
export function MeezanFlowLogo({ size = 'md', className = '' }: MeezanLogoProps) {
  const normalizedSize: 'sm' | 'md' | 'lg' =
    typeof size === 'number'
      ? size <= 30
        ? 'sm'
        : size >= 40
        ? 'lg'
        : 'md'
      : size;

  const dimensions =
    normalizedSize === 'sm'
      ? 'h-8 w-8 rounded-lg'
      : normalizedSize === 'lg'
      ? 'h-12 w-12 rounded-2xl'
      : 'h-9 w-9 rounded-xl';

  const svgSize =
    normalizedSize === 'sm' ? 'h-4.5 w-4.5' : normalizedSize === 'lg' ? 'h-7 w-7' : 'h-5 w-5';

  return (
    <div
      className={`${dimensions} bg-gradient-to-br from-[#022C22] via-[#042F24] to-[#065F46] border border-[#D4AF37]/40 flex items-center justify-center shadow-xs shrink-0 select-none ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={svgSize}
      >
        {/* Subtle Gold Outer Geometric Diamond Accent */}
        <path
          d="M18 4.5L29.5 11.5V24.5L18 31.5L6.5 24.5V11.5L18 4.5Z"
          stroke="#D4AF37"
          strokeOpacity="0.28"
          strokeWidth="1.2"
        />

        {/* Central Balance Fulcrum Pillar (Meezan) */}
        <path
          d="M18 8V23"
          stroke="#D4AF37"
          strokeWidth="2.3"
          strokeLinecap="round"
        />
        <circle cx="18" cy="7.5" r="2.1" fill="#D4AF37" />

        {/* Horizontal Precision Balance Beam */}
        <path
          d="M9 13.5H27"
          stroke="#FFFFFF"
          strokeWidth="2.1"
          strokeLinecap="round"
        />

        {/* Balanced Scale Nodes */}
        <path
          d="M9.5 13.5V17M26.5 13.5V17"
          stroke="#D4AF37"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <circle cx="9.5" cy="18" r="2" fill="#34D399" />
        <circle cx="26.5" cy="18" r="2" fill="#34D399" />

        {/* Smooth Flowing Financial Wave (Flow) */}
        <path
          d="M8 25.5C11.5 23 14.5 28 18 25.5C21.5 23 24.5 28 28 25.5"
          stroke="#D4AF37"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

/**
 * Extracts 1-2 uppercase initials from a customer or supplier name
 */
export function getPartyInitials(name: string): string {
  if (!name || !name.trim()) return 'MF';
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return words[0].slice(0, 2).toUpperCase();
}

interface PartyAvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  showBadge?: boolean;
  className?: string;
}

/**
 * Refined Fintech Party Avatar:
 * - Soft emerald-tinted off-white circle (#ECFDF5) with subtle emerald/gold border
 * - Crisp deep emerald monogram initials
 * - Verified gold-and-emerald badge indicator
 */
export function PartyAvatar({
  name,
  size = 'md',
  showBadge = true,
  className = ''
}: PartyAvatarProps) {
  const initials = getPartyInitials(name);
  const boxClass =
    size === 'sm'
      ? 'h-9 w-9 text-xs'
      : size === 'lg'
      ? 'h-13 w-13 text-base'
      : 'h-11 w-11 text-sm';

  return (
    <div
      className={`relative ${boxClass} rounded-xl bg-gradient-to-br from-emerald-50 to-[#FAF9F6] dark:from-emerald-950/60 dark:to-zinc-900 border border-emerald-800/15 dark:border-emerald-500/25 flex items-center justify-center shrink-0 select-none shadow-2xs ${className}`}
      aria-hidden="true"
    >
      <span className="avatar-initial-peach leading-none">{initials}</span>
      {showBadge && (
        <span
          className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-[#064E3B] border border-[#D4AF37] flex items-center justify-center shadow-2xs"
          title="Verified Ledger Account"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[#D4AF37]" />
        </span>
      )}
    </div>
  );
}
