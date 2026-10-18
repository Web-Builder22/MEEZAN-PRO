import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  ArrowLeft,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Lock,
  Mail,
  User as UserIcon,
  Building2,
  ArrowRight,
  Check,
  KeyRound,
  FileSpreadsheet,
  TrendingUp
} from 'lucide-react';
import { UserRole } from '../types';
import LanguageToggle from './LanguageToggle';
import ThemeToggle from './ThemeToggle';
import { BRAND, MeezanFlowLogo } from '../brand';

export type AuthScreenMode = 'login' | 'signup' | 'forgot-password';

interface AuthPagesProps {
  mode: AuthScreenMode;
  setMode: (mode: AuthScreenMode) => void;
  onBackToLanding: () => void;
  language: 'en' | 'ur';
  setLanguage: (lang: 'en' | 'ur') => void;
  authEmail: string;
  setAuthEmail: (val: string) => void;
  authPassword: string;
  setAuthPassword: (val: string) => void;
  authName: string;
  setAuthName: (val: string) => void;
  authBusiness: string;
  setAuthBusiness: (val: string) => void;
  authRole: UserRole;
  setAuthRole: (role: UserRole) => void;
  authError: string;
  setAuthError: (val: string) => void;
  authMessage: string;
  setAuthMessage: (val: string) => void;
  isAuthLoading: boolean;
  onAuthSubmit: (e: React.FormEvent) => Promise<void>;
  onForgotPassword: () => Promise<void>;
  onGoogleSignIn: () => Promise<void>;
  t: any;
}

export default function AuthPages({
  mode,
  setMode,
  onBackToLanding,
  language,
  setLanguage,
  authEmail,
  setAuthEmail,
  authPassword,
  setAuthPassword,
  authName,
  setAuthName,
  authBusiness,
  setAuthBusiness,
  authRole,
  setAuthRole,
  authError,
  setAuthError,
  authMessage,
  setAuthMessage,
  isAuthLoading,
  onAuthSubmit,
  onForgotPassword,
  onGoogleSignIn,
  t
}: AuthPagesProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    business?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  // Clear field errors and messages when switching auth modes
  useEffect(() => {
    setFieldErrors({});
    setAuthError('');
    setAuthMessage('');
  }, [mode]);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  };

  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: 'bg-slate-200 dark:bg-zinc-800' };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) {
      return {
        score: 1,
        label: language === 'en' ? 'Weak' : 'کمزور',
        color: 'bg-red-500',
        textColor: 'text-red-600 dark:text-red-400'
      };
    }
    if (score <= 2) {
      return {
        score: 2,
        label: language === 'en' ? 'Fair' : 'مناسب',
        color: 'bg-amber-500',
        textColor: 'text-amber-600 dark:text-amber-400'
      };
    }
    return {
      score: 3,
      label: language === 'en' ? 'Strong' : 'مضبوط',
      color: 'bg-emerald-600',
      textColor: 'text-emerald-600 dark:text-emerald-400'
    };
  };

  const passwordStrength = getPasswordStrength(authPassword);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: typeof fieldErrors = {};

    if (mode === 'forgot-password') {
      if (!authEmail.trim() || !validateEmail(authEmail)) {
        errors.email =
          language === 'en'
            ? 'Please enter a valid registered email address.'
            : 'براہ کرم درست ای میل ایڈریس درج کریں۔';
        setFieldErrors(errors);
        return;
      }
      setFieldErrors({});
      await onForgotPassword();
      return;
    }

    if (mode === 'signup') {
      if (!authName.trim() || authName.trim().length < 2) {
        errors.name =
          language === 'en'
            ? 'Please enter your full name (at least 2 characters).'
            : 'براہ کرم اپنا مکمل نام درج کریں۔';
      }
      if (!authBusiness.trim() || authBusiness.trim().length < 2) {
        errors.business =
          language === 'en'
            ? 'Please enter your business or shop name.'
            : 'براہ کرم اپنے کاروبار یا دکان کا نام درج کریں۔';
      }
    }

    if (!authEmail.trim() || !validateEmail(authEmail)) {
      errors.email =
        language === 'en'
          ? 'Please enter a valid email address (e.g., name@business.com).'
          : 'براہ کرم درست ای میل ایڈریس درج کریں۔';
    }

    if (!authPassword || authPassword.length < 6) {
      errors.password =
        language === 'en'
          ? 'Password must be at least 6 characters long.'
          : 'پاس ورڈ کم از کم 6 حروف کا ہونا چاہیے۔';
    }

    if (mode === 'signup') {
      if (!confirmPassword) {
        errors.confirmPassword =
          language === 'en'
            ? 'Please confirm your password.'
            : 'براہ کرم پاس ورڈ کی تصدیق کریں۔';
      } else if (confirmPassword !== authPassword) {
        errors.confirmPassword =
          language === 'en'
            ? 'Passwords do not match. Please re-enter.'
            : 'دونوں پاس ورڈ ایک جیسے نہیں ہیں۔';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    await onAuthSubmit(e);
  };

  return (
    <div className="flex-1 bg-[#F8FAFC] dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 flex flex-col font-sans">
      {/* Minimal Top Header */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-zinc-800 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto h-16 flex items-center justify-between gap-6">
          <button
            type="button"
            onClick={onBackToLanding}
            className="flex items-center gap-2.5 text-left group cursor-pointer focus:outline-none"
          >
            <MeezanFlowLogo size="md" />
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap leading-none">
                {BRAND.name}
              </span>
              <span className="text-[10px] font-medium text-slate-500 dark:text-zinc-400 hidden sm:inline mt-0.5">
                {BRAND.tagline}
              </span>
            </div>
          </button>

          <div className="flex items-center gap-3">
            <LanguageToggle language={language} setLanguage={setLanguage} />
            <ThemeToggle />
            <button
              type="button"
              onClick={onBackToLanding}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer whitespace-nowrap"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>{language === 'en' ? 'Back to Home' : 'واپس ہوم پیج'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Split Content */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-10 lg:py-14 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
        {/* Left Column: Authentication Form Card */}
        <div className="lg:col-span-6 xl:col-span-5 w-full max-w-md mx-auto lg:mx-0">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/90 dark:border-zinc-800 p-6 sm:p-8 shadow-xs">
            {/* Mode Switcher Tabs for Login / Sign Up */}
            {mode !== 'forgot-password' && (
              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-zinc-950 rounded-xl mb-6 border border-slate-200/60 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className={`py-2 px-4 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    mode === 'login'
                      ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {language === 'en' ? 'Sign In' : 'لاگ ان کریں'}
                </button>
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className={`py-2 px-4 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    mode === 'signup'
                      ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {language === 'en' ? 'Create Account' : 'نیا اکاؤنٹ بنائیں'}
                </button>
              </div>
            )}

            {/* Header Copy */}
            <div className="mb-6 text-left">
              {mode === 'login' && (
                <>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                    {language === 'en' ? `Welcome back to ${BRAND.name}` : `${BRAND.name} میں خوش آمدید`}
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                    {language === 'en'
                      ? 'Sign in to access your customer ledgers, receivables, and business reports.'
                      : 'اپنے کسٹمر کھاتے، بقایا جات اور کاروباری رپورٹس تک رسائی کے لیے لاگ ان کریں۔'}
                  </p>
                </>
              )}

              {mode === 'signup' && (
                <>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                    {language === 'en' ? 'Create your business account' : 'اپنا کاروباری اکاؤنٹ بنائیں'}
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                    {language === 'en'
                      ? 'Start organizing customer credit, cash flow, and supplier accounts in minutes.'
                      : 'چند منٹوں میں گاہکوں کا ادھار، کیش بک اور سپلائر کھاتے منظم کریں۔'}
                  </p>
                </>
              )}

              {mode === 'forgot-password' && (
                <>
                  <div className="h-10 w-10 rounded-xl bg-[#0B192C]/5 dark:bg-[#D4AF37]/15 border border-[#0B192C]/15 dark:border-[#D4AF37]/30 flex items-center justify-center text-[#0B192C] dark:text-[#D4AF37] mb-4">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                    {language === 'en' ? 'Reset your password' : 'پاس ورڈ ری سیٹ کریں'}
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                    {language === 'en'
                      ? 'Enter the email address associated with your business account and we will send you a password reset link.'
                      : 'اپنا رجسٹرڈ ای میل ایڈریس درج کریں، ہم آپ کو پاس ورڈ ری سیٹ کرنے کا لنک بھیجیں گے۔'}
                  </p>
                </>
              )}
            </div>

            {/* Alert Banners */}
            {authError && (
              <div
                role="alert"
                className="mb-5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs flex items-start gap-2.5 text-left"
              >
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed">{authError}</div>
              </div>
            )}

            {authMessage && (
              <div
                role="status"
                className="mb-5 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-xs flex items-start gap-2.5 text-left"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed">{authMessage}</div>
              </div>
            )}

            {/* Google OAuth Button (shown on Login & Sign Up) */}
            {mode !== 'forgot-password' && (
              <>
                <button
                  type="button"
                  disabled={isAuthLoading}
                  onClick={onGoogleSignIn}
                  className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-750 text-slate-800 dark:text-zinc-100 font-semibold text-xs sm:text-sm shadow-2xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>
                    {isAuthLoading
                      ? t.signingIn
                      : mode === 'login'
                      ? language === 'en'
                        ? 'Continue with Google'
                        : 'گوگل کے ساتھ لاگ ان کریں'
                      : language === 'en'
                      ? 'Sign up with Google'
                      : 'گوگل کے ساتھ اکاؤنٹ بنائیں'}
                  </span>
                </button>

                <div className="relative flex items-center justify-center my-5">
                  <div className="border-t border-slate-200 dark:border-zinc-800 w-full" />
                  <span className="bg-white dark:bg-zinc-900 px-3 text-xs text-slate-400 dark:text-zinc-500 whitespace-nowrap">
                    {language === 'en' ? 'or continue with email' : 'یا ای میل استعمال کریں'}
                  </span>
                </div>
              </>
            )}

            {/* Main Form */}
            <form onSubmit={handleFormSubmit} className="space-y-4 text-left" noValidate>
              {mode === 'signup' && (
                <>
                  {/* Full Name */}
                  <div>
                    <label
                      htmlFor="auth-full-name"
                      className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5"
                    >
                      {language === 'en' ? 'Full Name' : 'مکمل نام'}
                    </label>
                    <div className="relative">
                      <UserIcon className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="auth-full-name"
                        type="text"
                        value={authName}
                        onChange={(e) => {
                          setAuthName(e.target.value);
                          if (fieldErrors.name) setFieldErrors({ ...fieldErrors, name: undefined });
                        }}
                        placeholder={language === 'en' ? 'Enter your full name' : 'اپنا مکمل نام درج کریں'}
                        className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-xs sm:text-sm bg-white dark:bg-zinc-950 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
                          fieldErrors.name
                            ? 'border-red-400 focus:ring-red-500/20'
                            : 'border-slate-200 dark:border-zinc-800 focus:border-emerald-600 focus:ring-emerald-600/20'
                        }`}
                      />
                    </div>
                    {fieldErrors.name && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.name}</p>
                    )}
                  </div>

                  {/* Business Name */}
                  <div>
                    <label
                      htmlFor="auth-business-name"
                      className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5"
                    >
                      {language === 'en' ? 'Business / Shop Name' : 'کاروبار یا دکان کا نام'}
                    </label>
                    <div className="relative">
                      <Building2 className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="auth-business-name"
                        type="text"
                        value={authBusiness}
                        onChange={(e) => {
                          setAuthBusiness(e.target.value);
                          if (fieldErrors.business) setFieldErrors({ ...fieldErrors, business: undefined });
                        }}
                        placeholder={language === 'en' ? 'Enter your business or shop name' : 'اپنے کاروبار یا دکان کا نام درج کریں'}
                        className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-xs sm:text-sm bg-white dark:bg-zinc-950 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
                          fieldErrors.business
                            ? 'border-red-400 focus:ring-red-500/20'
                            : 'border-slate-200 dark:border-zinc-800 focus:border-emerald-600 focus:ring-emerald-600/20'
                        }`}
                      />
                    </div>
                    {fieldErrors.business && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.business}</p>
                    )}
                  </div>

                  {/* Account Role */}
                  <div>
                    <label
                      htmlFor="auth-role"
                      className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5"
                    >
                      {language === 'en' ? 'Account Role' : 'اکاؤنٹ کا کردار'}
                    </label>
                    <select
                      id="auth-role"
                      value={authRole}
                      onChange={(e) => setAuthRole(e.target.value as UserRole)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
                    >
                      <option value="Owner">
                        {language === 'en' ? 'Business Owner (Full Access)' : 'کاروبار کا مالک (مکمل اختیارات)'}
                      </option>
                      <option value="Manager">
                        {language === 'en' ? 'Store Manager (Ledger & Stock)' : 'اسٹور مینیجر (کھاتا اور اسٹاک)'}
                      </option>
                      <option value="Employee">
                        {language === 'en' ? 'Cashier / Staff (Daily Entries)' : 'کیشیئر / عملہ (روزانہ اندراج)'}
                      </option>
                    </select>
                  </div>
                </>
              )}

              {/* Email Address */}
              <div>
                <label
                  htmlFor="auth-email"
                  className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5"
                >
                  {language === 'en' ? 'Email Address' : 'ای میل ایڈریس'}
                </label>
                <div className="relative">
                  <Mail className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="auth-email"
                    type="email"
                    autoComplete="email"
                    value={authEmail}
                    onChange={(e) => {
                      setAuthEmail(e.target.value);
                      if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: undefined });
                    }}
                    placeholder={language === 'en' ? 'Enter your email address' : 'اپنا ای میل ایڈریس درج کریں'}
                    className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-xs sm:text-sm bg-white dark:bg-zinc-950 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
                      fieldErrors.email
                        ? 'border-red-400 focus:ring-red-500/20'
                        : 'border-slate-200 dark:border-zinc-800 focus:border-emerald-600 focus:ring-emerald-600/20'
                    }`}
                  />
                </div>
                {fieldErrors.email && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.email}</p>
                )}
              </div>

              {/* Password Field */}
              {mode !== 'forgot-password' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="auth-password"
                      className="block text-xs font-semibold text-slate-700 dark:text-zinc-300"
                    >
                      {language === 'en' ? 'Password' : 'پاس ورڈ'}
                    </label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => setMode('forgot-password')}
                        className="text-xs font-semibold text-[#0B192C] dark:text-[#D4AF37] hover:underline cursor-pointer"
                      >
                        {language === 'en' ? 'Forgot password?' : 'پاس ورڈ بھول گئے؟'}
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="auth-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      value={authPassword}
                      onChange={(e) => {
                        setAuthPassword(e.target.value);
                        if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: undefined });
                      }}
                      placeholder="••••••••"
                      className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-xs sm:text-sm bg-white dark:bg-zinc-950 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
                        fieldErrors.password
                          ? 'border-red-400 focus:ring-red-500/20'
                          : 'border-slate-200 dark:border-zinc-800 focus:border-[#0B192C] dark:focus:border-[#D4AF37] focus:ring-[#0B192C]/15 dark:focus:ring-[#D4AF37]/20'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 p-1 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.password}</p>
                  )}

                  {/* Password strength meter on Sign Up */}
                  {mode === 'signup' && authPassword.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 dark:text-zinc-400">
                          {language === 'en' ? 'Password strength' : 'پاس ورڈ کی مضبوطی'}
                        </span>
                        <span className={`font-semibold ${passwordStrength.textColor}`}>
                          {passwordStrength.label}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5 h-1">
                        {[1, 2, 3].map((step) => (
                          <div
                            key={step}
                            className={`rounded-full transition-colors ${
                              passwordStrength.score >= step
                                ? passwordStrength.color
                                : 'bg-slate-200 dark:bg-zinc-800'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Confirm Password Field (Sign Up Only) */}
              {mode === 'signup' && (
                <div>
                  <label
                    htmlFor="auth-confirm-password"
                    className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5"
                  >
                    {language === 'en' ? 'Confirm Password' : 'پاس ورڈ کی تصدیق کریں'}
                  </label>
                  <div className="relative">
                    <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="auth-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (fieldErrors.confirmPassword) {
                          setFieldErrors({ ...fieldErrors, confirmPassword: undefined });
                        }
                      }}
                      placeholder="••••••••"
                      className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-xs sm:text-sm bg-white dark:bg-zinc-950 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
                        fieldErrors.confirmPassword
                          ? 'border-red-400 focus:ring-red-500/20'
                          : 'border-slate-200 dark:border-zinc-800 focus:border-emerald-600 focus:ring-emerald-600/20'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 p-1 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {fieldErrors.confirmPassword && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                      {fieldErrors.confirmPassword}
                    </p>
                  )}
                </div>
              )}

              {/* Primary Submit Button */}
              <div className="pt-2">
                <button
                  id="submit-auth-btn"
                  type="submit"
                  disabled={isAuthLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#0B192C] hover:bg-[#132847] dark:bg-[#D4AF37] dark:hover:bg-[#C5A028] text-white dark:text-[#0B192C] font-semibold text-xs sm:text-sm shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAuthLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>
                        {mode === 'forgot-password'
                          ? language === 'en'
                            ? 'Sending Reset Link...'
                            : 'لنک بھیجا جا رہا ہے...'
                          : t.signingIn}
                      </span>
                    </>
                  ) : (
                    <>
                      <span>
                        {mode === 'login'
                          ? language === 'en'
                            ? 'Sign In to Dashboard'
                            : 'ڈیش بورڈ میں لاگ ان کریں'
                          : mode === 'signup'
                          ? language === 'en'
                            ? 'Create Free Account'
                            : 'مفت اکاؤنٹ بنائیں'
                          : language === 'en'
                          ? 'Send Reset Instructions'
                          : 'ری سیٹ لنک بھیجیں'}
                      </span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>

              {/* Mode Switching Footer Link */}
              <div className="pt-2 text-center text-xs text-slate-500 dark:text-zinc-400">
                {mode === 'login' && (
                  <p>
                    {language === 'en' ? "Don't have a business account? " : 'اکاؤنٹ موجود نہیں ہے؟ '}
                    <button
                      type="button"
                      onClick={() => setMode('signup')}
                      className="font-semibold text-[#0B192C] dark:text-[#D4AF37] hover:underline cursor-pointer"
                    >
                      {language === 'en' ? 'Sign up free' : 'مفت اکاؤنٹ بنائیں'}
                    </button>
                  </p>
                )}

                {mode === 'signup' && (
                  <p>
                    {language === 'en' ? 'Already have an account? ' : 'پہلے سے اکاؤنٹ موجود ہے؟ '}
                    <button
                      type="button"
                      onClick={() => setMode('login')}
                      className="font-semibold text-[#0B192C] dark:text-[#D4AF37] hover:underline cursor-pointer"
                    >
                      {language === 'en' ? 'Sign in' : 'لاگ ان کریں'}
                    </button>
                  </p>
                )}

                {mode === 'forgot-password' && (
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className="inline-flex items-center gap-1.5 font-semibold text-[#0B192C] dark:text-[#D4AF37] hover:underline cursor-pointer"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>{language === 'en' ? 'Return to Sign In' : 'واپس لاگ ان پر جائیں'}</span>
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Security Footer Note */}
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-zinc-400">
            <ShieldCheck className="h-4 w-4 text-[#0B192C] dark:text-[#D4AF37] shrink-0" />
            <span>
              {language === 'en'
                ? 'Protected by Firebase Authentication & role-based access control'
                : 'فائر بیس سیکیورٹی اور رول بیسڈ کنٹرول کے ذریعے محفوظ'}
            </span>
          </div>
        </div>

        {/* Right Column: Fintech Product Architecture & Trust Panel */}
        <div className="lg:col-span-6 xl:col-span-7 hidden lg:flex flex-col justify-between bg-[#0B192C] text-white rounded-2xl border border-[#1E3A5F] p-8 lg:p-10 shadow-xs text-left">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#D4AF37]">
              <span>{BRAND.getTagline(language)}</span>
            </div>

            <h2 className="text-2xl xl:text-3xl font-bold text-white tracking-tight leading-snug text-balance">
              {language === 'en'
                ? 'Every customer account, credit entry, and daily cash balance in one structured ledger.'
                : 'ہر گاہک کا کھاتا، ادھار کا حساب اور روزانہ کی نقد رقم ایک منظم ڈیجیٹل سسٹم میں۔'}
            </h2>

            <p className="text-sm text-slate-300 leading-relaxed max-w-xl">
              {language === 'en'
                ? `${BRAND.name} replaces manual paper registers and scattered spreadsheets with a precision accounting system that keeps your receivables accurate and your business flowing smoothly.`
                : `${BRAND.name} کاغذی رجسٹروں اور پیچیدہ حساب کتاب کی جگہ ایک قابلِ اعتماد مالیاتی سسٹم فراہم کرتا ہے جو آپ کے بقایا جات کو درست اور ریکارڈ کو محفوظ رکھتا ہے۔`}
            </p>

            {/* Key Capabilities Checklist */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              {[
                language === 'en' ? 'Customer & Supplier Ledgers' : 'کسٹمر اور سپلائر کھاتے',
                language === 'en' ? 'Daily Cash Book & Invoicing' : 'روزنامچہ کیش بک اور بلنگ',
                language === 'en' ? 'SMS & WhatsApp Reminders' : 'ایس ایم ایس اور واٹس ایپ یاد دہانی',
                language === 'en' ? 'Automated Cloud Backups' : 'خودکار کلاؤڈ بیک اپ تحفظ'
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2.5 text-xs font-medium text-slate-200">
                  <div className="h-4.5 w-4.5 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40 flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3" />
                  </div>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-8 mt-8 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>{BRAND.name} · {BRAND.category}</span>
            <span className="font-mono tabular-nums text-[#D4AF37]">Bilingual EN / اردو</span>
          </div>
        </div>
      </div>
    </div>
  );
}
