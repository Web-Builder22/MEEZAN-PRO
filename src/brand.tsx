import React from 'react';
import { Language } from './translations';

/**
 * Centralized Brand Configuration for MeezanFlow
 * "Meezan" represents balance and financial accuracy; "Flow" represents smooth business operations.
 */
export const BRAND = {
  name: 'MeezanFlow',
  nameUr: 'میزان فلو',
  tagline: 'Balance your business. Flow with confidence.',
  taglineUr: 'اپنے کاروبار میں توازن لائیں۔ اعتماد کے ساتھ آگے بڑھیں۔',
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
 * Minimal, distinctive MeezanFlow emblem inspired by:
 * - "Meezan": Precision financial balance beam & central fulcrum
 * - "Flow": Smooth continuous transaction wave underneath
 * Palette: Deep Navy (#0B192C), Crisp White (#FFFFFF), Subtle Gold (#D4AF37)
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
      ? 'h-7 w-7 rounded-lg'
      : normalizedSize === 'lg'
      ? 'h-11 w-11 rounded-xl'
      : 'h-9 w-9 rounded-xl';

  const svgSize = normalizedSize === 'sm' ? 'h-4 w-4' : normalizedSize === 'lg' ? 'h-6 w-6' : 'h-5 w-5';

  return (
    <div
      className={`${dimensions} bg-[#0B192C] dark:bg-[#0F223D] border border-[#D4AF37]/40 flex items-center justify-center shadow-2xs shrink-0 select-none ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={svgSize}
      >
        {/* Central Balance Axis (Meezan) */}
        <path
          d="M18 6.5V24.5"
          stroke="#D4AF37"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <circle cx="18" cy="6.5" r="2" fill="#D4AF37" />

        {/* Horizontal Equilibrium Beam */}
        <path
          d="M8.5 13H27.5"
          stroke="#FFFFFF"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Balanced Scale Pans / Nodes */}
        <circle cx="8.5" cy="17.5" r="2" fill="#D4AF37" />
        <circle cx="27.5" cy="17.5" r="2" fill="#D4AF37" />
        <path
          d="M8.5 13V16M27.5 13V16"
          stroke="#FFFFFF"
          strokeOpacity="0.85"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* Smooth Flowing Transaction Wave (Flow) */}
        <path
          d="M7 26.5C10.8 23.5 14.2 29.5 18 26.5C21.8 23.5 25.2 29.5 29 26.5"
          stroke="#D4AF37"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
