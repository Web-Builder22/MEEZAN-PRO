import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Users,
  Wallet,
  TrendingUp,
  ShieldCheck,
  Download,
  MessageSquare,
  Check,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  ChevronDown,
  Lock,
  ArrowRight,
  ArrowUpRight,
  ArrowDownLeft,
  BarChart3,
  Layers,
  Store,
  Briefcase,
  Building2,
  UserCheck,
  BellRing,
  X,
  Plus,
  Search
} from 'lucide-react';
import LanguageToggle from './LanguageToggle';
import ThemeToggle from './ThemeToggle';
import { AuthScreenMode } from './AuthPages';
import { BRAND, MeezanFlowLogo } from '../brand';

interface InteractiveLandingProps {
  language: 'en' | 'ur';
  setLanguage: (lang: 'en' | 'ur') => void;
  onOpenAuth: (mode: AuthScreenMode) => void;
  handleGoogleSignIn: () => void;
  isAuthLoading: boolean;
  showInstallBtn: boolean;
  handleInstallClick: () => void;
  t: any;
}

export default function InteractiveLanding({
  language,
  setLanguage,
  onOpenAuth,
  showInstallBtn,
  handleInstallClick,
  t
}: InteractiveLandingProps) {
  // Sticky navbar scroll state
  const [isScrolled, setIsScrolled] = useState(false);

  // Hero Dashboard Preview Interactive Filter State
  const [previewFilter, setPreviewFilter] = useState<'all' | 'due' | 'paid'>('all');

  // How It Works Interactive Step State
  const [activeStep, setActiveStep] = useState<number>(0);

  // Benefits Interactive Audience Tab State
  const [activeAudience, setActiveAudience] = useState<'shopkeepers' | 'smallbiz' | 'freelancers' | 'entrepreneurs'>('shopkeepers');

  // FAQ Accordion State
  const [faqOpenIndex, setFaqOpenIndex] = useState<number | null>(0);

  // Legal / Info Modal State (Privacy Policy / Terms of Service)
  const [legalModal, setLegalModal] = useState<'privacy' | 'terms' | null>(null);

  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 12);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Features List (6 core capabilities required by specification)
  const features = [
    {
      icon: BookOpen,
      title: language === 'en' ? 'Digital Khata & Ledger Management' : 'ڈیجیٹل کھاتا اور لیجر مینجمنٹ',
      description:
        language === 'en'
          ? 'Maintain structured, error-free digital ledgers for every account. Every entry automatically updates running balances with complete audit history.'
          : 'ہر گاہک اور کاروباری کھاتے کا منظم اور غلطی سے پاک ڈیجیٹل ریکارڈ رکھیں۔ ہر اندراج کے ساتھ بقایا رقم خودکار طریقے سے اپ ڈیٹ ہوتی ہے۔',
      detail: language === 'en' ? 'Auto-calculated running balances' : 'خودکار چلنے والا بیلنس'
    },
    {
      icon: Users,
      title: language === 'en' ? 'Customer and Supplier Accounts' : 'کسٹمر اور سپلائر اکاؤنٹس',
      description:
        language === 'en'
          ? 'Separate dedicated directories for customers and wholesale suppliers. Track who owes you and what you owe vendors from one unified workspace.'
          : 'گاہکوں اور ہول سیل سپلائرز کے لیے الگ الگ منظم کھاتے۔ ایک ہی جگہ سے واجب الادا اور واجب الوصول رقوم کا مکمل حساب رکھیں۔',
      detail: language === 'en' ? 'Unified receivables & payables' : 'وصولی اور ادائیگی کا مکمل ریکارڈ'
    },
    {
      icon: TrendingUp,
      title: language === 'en' ? 'Credit and Debit Tracking' : 'کریڈٹ اور ڈیبٹ ٹریکنگ',
      description:
        language === 'en'
          ? 'Record credit sales (Udhaar), cash collections, and partial settlements in seconds. Filter transactions by date, type, or outstanding status.'
          : 'ادھار فروخت، نقد وصولی اور جزوی ادائیگیوں کا سیکنڈز میں اندراج کریں۔ تاریخ یا قسم کے لحاظ سے لین دین تلاش کریں۔',
      detail: language === 'en' ? 'Real-time double-entry logs' : 'فوری ڈبل انٹری حساب'
    },
    {
      icon: BellRing,
      title: language === 'en' ? 'Payment History and Due Reminders' : 'ادائیگی کی ہسٹری اور یاد دہانی',
      description:
        language === 'en'
          ? 'Send polite, formatted payment reminders via SMS or WhatsApp with a single click. Select multiple overdue accounts for unified bulk reminders.'
          : 'ایک کلک کے ذریعے ایس ایم ایس یا واٹس ایپ پر بقایا رقم کی باوقار یاد دہانی بھیجیں۔ بقایا دار گاہکوں کو اجتماعی پیغام بھیجنے کی سہولت۔',
      detail: language === 'en' ? 'Bulk SMS & WhatsApp dispatch' : 'بلک ایس ایم ایس اور واٹس ایپ'
    },
    {
      icon: BarChart3,
      title: language === 'en' ? 'Business Analytics and Reports' : 'کاروباری تجزیات اور رپورٹس',
      description:
        language === 'en'
          ? 'Visualize monthly cash flow, daily counter cash-in/cash-out, inventory valuation, and printable PDF customer statements at any time.'
          : 'ماہانہ کیش فلو، روزانہ کی نقد آمد وخرچ، اسٹاک کی مالیت اور پی ڈی ایف کھاتا اسٹیٹمنٹس کسی بھی وقت حاصل کریں۔',
      detail: language === 'en' ? 'Exportable PDF & CSV statements' : 'پی ڈی ایف اور ایکسل رپورٹس'
    },
    {
      icon: ShieldCheck,
      title: language === 'en' ? 'Secure Authentication and Account Protection' : 'محفوظ لاگ ان اور اکاؤنٹ کا تحفظ',
      description:
        language === 'en'
          ? 'Protected with Firebase Authentication, role-based access for Owners, Managers, and Staff, plus automatic pre-deletion backup checkpoints.'
          : 'فائر بیس سیکیورٹی، مالک اور عملے کے الگ اختیارات، اور ڈیٹا ڈیلیٹ ہونے سے پہلے خودکار بیک اپ کی مکمل سہولت۔',
      detail: language === 'en' ? 'Role-based access & cloud backups' : 'رول بیسڈ رسائی اور کلاؤڈ بیک اپ'
    }
  ];

  // How It Works 3-step data
  const workflowSteps = [
    {
      number: '01',
      title: language === 'en' ? 'Create your account' : 'اپنا اکاؤنٹ بنائیں',
      description:
        language === 'en'
          ? 'Sign up with your email or Google account, set your business name, and configure role permissions for your store team.'
          : 'اپنے ای میل یا گوگل اکاؤنٹ سے سائن اپ کریں، کاروبار کا نام درج کریں اور اپنے عملے کے اختیارات طے کریں۔',
      previewTitle: language === 'en' ? 'Workspace Initialization' : 'کاروباری پروفائل کی تیاری',
      previewRows: [
        { label: language === 'en' ? 'Business Profile' : 'کاروبار کا نام', value: language === 'en' ? 'Your Business / Shop Name' : 'آپ کے کاروبار یا دکان کا نام', meta: 'Verified' },
        { label: language === 'en' ? 'Primary Currency' : 'کرنسی', value: 'PKR (Pakistani Rupee)', meta: 'Default' },
        { label: language === 'en' ? 'Access Control' : 'رسائی کا کنٹرول', value: 'Owner, Manager, Cashier', meta: 'Active' }
      ]
    },
    {
      number: '02',
      title: language === 'en' ? 'Add customers and record transactions' : 'گاہک شامل کریں اور لین دین درج کریں',
      description:
        language === 'en'
          ? 'Create customer or supplier profiles with phone numbers and log credit sales, cash receipts, or invoices with instant balance calculation.'
          : 'فون نمبر کے ساتھ گاہک یا سپلائر کا کھاتا کھولیں اور ادھار فروخت، نقد وصولی یا بل کا فوری اندراج کریں۔',
      previewTitle: language === 'en' ? 'Instant Ledger Entry' : 'فوری کھاتا اندراج',
      previewRows: [
        { label: language === 'en' ? 'Customer Account' : 'گاہک کھاتا', value: language === 'en' ? 'Customer Name & Phone Number' : 'گاہک کا نام اور فون نمبر', meta: 'Directory' },
        { label: language === 'en' ? 'Transaction Type' : 'لین دین کی قسم', value: language === 'en' ? 'Credit (Udhaar) or Debit (Payment)' : 'ادھار فروخت یا نقد وصولی', meta: 'Double-Entry' },
        { label: language === 'en' ? 'Updated Balance' : 'نیا بیلنس', value: language === 'en' ? 'Automatic Running Balance' : 'خودکار چلنے والا بیلنس', meta: 'Real-Time' }
      ]
    },
    {
      number: '03',
      title: language === 'en' ? 'Track balances and manage payments' : 'بقایا جات ٹریک کریں اور ادائیگیاں سنبھالیں',
      description:
        language === 'en'
          ? 'Monitor total receivables on your live dashboard, dispatch SMS or WhatsApp due reminders, and download clean account statements.'
          : 'ڈیش بورڈ پر کل واجب الادا رقم دیکھیں، ایس ایم ایس یا واٹس ایپ کے ذریعے یاد دہانی بھیجیں اور پی ڈی ایف اسٹیٹمنٹ ڈاؤن لوڈ کریں۔',
      previewTitle: language === 'en' ? 'Receivables & Reminder Dispatch' : 'بقایا جات اور یاد دہانی',
      previewRows: [
        { label: language === 'en' ? 'Overdue Filter' : 'بقایا دار گاہک', value: language === 'en' ? 'Filter accounts with pending balances' : 'واجب الادا کھاتوں کی درجہ بندی', meta: 'Instant' },
        { label: language === 'en' ? 'Reminder Channel' : 'یاد دہانی کا ذریعہ', value: 'Unified Bulk SMS & WhatsApp Link', meta: 'Ready' },
        { label: language === 'en' ? 'Statement Export' : 'اسٹیٹمنٹ رپورٹ', value: 'PDF Ledger Report & JSON Backup', meta: '1-Click' }
      ]
    }
  ];

  // Benefits by Business Type
  const audienceBenefits = {
    shopkeepers: {
      label: language === 'en' ? 'Retailers & Shopkeepers' : 'دکاندار اور کریانہ اسٹورز',
      icon: Store,
      headline:
        language === 'en'
          ? 'Built for high-volume daily counter operations and customer udhaar'
          : 'روزانہ کی دکان داری، نقد کاؤنٹر اور گاہکوں کے ادھار کے لیے بہترین',
      description:
        language === 'en'
          ? `Kiryana stores, medical pharmacies, hardware shops, and electronics dealers use ${BRAND.name} to eliminate forgotten credit entries and speed up daily counter closing.`
          : `کریانہ اسٹورز، میڈیکل فارمیسی، ہارڈویئر اور الیکٹرانکس کے تاجر بھولے ہوئے ادھار سے بچنے اور روزانہ کا حساب منٹوں میں مکمل کرنے کے لیے ${BRAND.name} استعمال کرتے ہیں۔`,
      points: [
        language === 'en'
          ? 'Find any customer balance in under 2 seconds by name or phone number'
          : 'نام یا فون نمبر کے ذریعے صرف 2 سیکنڈ میں کسی بھی گاہک کا بقایا چیک کریں',
        language === 'en'
          ? 'Separate daily cash drawer (Cash-In / Cash-Out) from long-term credit ledgers'
          : 'روزانہ کے گلے (کیش ان / کیش آؤٹ) کو طویل مدتی ادھار کھاتوں سے الگ رکھیں',
        language === 'en'
          ? 'Print clean thermal or A4 invoices and track low-stock inventory items'
          : 'کمپیوٹرائزڈ بل پرنٹ کریں اور کم ہونے والے اسٹاک پر فوری الرٹ حاصل کریں'
      ]
    },
    smallbiz: {
      label: language === 'en' ? 'Small Businesses & Traders' : 'چھوٹے کاروبار اور ہول سیلرز',
      icon: Building2,
      headline:
        language === 'en'
          ? 'Complete control over wholesale receivables and supplier payables'
          : 'ہول سیل وصولیوں اور سپلائر کی ادائیگیوں پر مکمل کنٹرول',
      description:
        language === 'en'
          ? 'Distributors, commission agents, and regional traders manage hundreds of party accounts alongside vendor payable schedules without hiring a full-time bookkeeper.'
          : 'ڈسٹری بیوٹرز اور ہول سیل تاجر بغیر کسی پیچیدہ اکاؤنٹنگ سافٹ ویئر کے سینکڑوں پارٹی کھاتوں اور سپلائر بلوں کو باآسانی سنبھالتے ہیں۔',
      points: [
        language === 'en'
          ? 'Assign Manager or Employee roles so staff can log entries without deleting records'
          : 'مینیجر یا عملے کے الگ اکاؤنٹس بنائیں تاکہ ریکارڈ محفوظ رہے',
        language === 'en'
          ? 'Send batch SMS reminders to all overdue parties before weekly collection rounds'
          : 'ہفتہ وار وصولی سے پہلے تمام بقایا دار پارٹیوں کو ایک ساتھ ایس ایم ایس بھیجیں',
        language === 'en'
          ? 'Automatic pre-deletion backups ensure zero data loss from accidental edits'
          : 'خودکار بیک اپ سسٹم کی بدولت کسی بھی غلطی کی صورت میں ڈیٹا ضائع نہیں ہوتا'
      ]
    },
    freelancers: {
      label: language === 'en' ? 'Freelancers & Service Providers' : 'فری لانسرز اور سروس پرووائیڈرز',
      icon: Briefcase,
      headline:
        language === 'en'
          ? 'Track client retainers, project milestones, and pending invoices effortlessly'
          : 'کلائنٹس کے پراجیکٹس، اقساط اور واجب الادا بلوں کا آسان حساب',
      description:
        language === 'en'
          ? 'Consultants, repair technicians, agencies, and contractors keep clear records of advance deposits, milestone billings, and operating expenses.'
          : 'کنسلٹنٹس، ٹھیکیدار اور سروس فراہم کرنے والے افراد ایڈوانس رقوم، بقایا اقساط اور اخراجات کا مکمل ریکارڈ رکھ سکتے ہیں۔',
      points: [
        language === 'en'
          ? 'Generate itemized client invoices with tax and discount calculations'
          : 'ٹیکس اور رعایت کے حساب کے ساتھ پیشہ ورانہ کلائنٹ انوائس تیار کریں',
        language === 'en'
          ? 'Share polite payment statements directly over WhatsApp or SMS'
          : 'واٹس ایپ یا ایس ایم ایس پر براہ راست بل اور بقایا اسٹیٹمنٹ شیئر کریں',
        language === 'en'
          ? 'Monitor net monthly income after deducting recurring operational expenses'
          : 'اخراجات نکال کر ماہانہ خالص آمدنی کا واضح گراف دیکھیں'
      ]
    },
    entrepreneurs: {
      label: language === 'en' ? 'Growing Entrepreneurs' : 'نئے کاروباری افراد',
      icon: UserCheck,
      headline:
        language === 'en'
          ? 'Audit-ready financial visibility across mobile and desktop devices'
          : 'موبائل اور کمپیوٹر دونوں پر کاروباری مالیات کی مکمل نگرانی',
      description:
        language === 'en'
          ? 'Modern founders scaling retail or distribution ventures get real-time financial clarity from anywhere, backed by cloud synchronization and Bilingual English/Urdu support.'
          : 'نئے کاروباری مالکان کہیں سے بھی اپنے موبائل یا لیپ ٹاپ پر کاروبار کی مالی صورتحال، منافع اور کیش فلو کو انگریزی یا اردو میں دیکھ سکتے ہیں۔',
      points: [
        language === 'en'
          ? '6-month revenue vs. expense trend analytics for informed purchasing decisions'
          : 'بہتر کاروباری فیصلوں کے لیے 6 ماہ کی آمدنی اور اخراجات کا موازنہ',
        language === 'en'
          ? 'One-click JSON & CSV exports for external tax filing or offline archiving'
          : 'ٹیکس یا آف لائن ریکارڈ کے لیے ایک کلک میں ڈیٹا ایکسپورٹ کریں',
        language === 'en'
          ? 'Installable Progressive Web App (PWA) for fast access on any phone or laptop'
          : 'موبائل یا کمپیوٹر کی ہوم اسکرین پر ایپ کی طرح انسٹال کرنے کی سہولت'
      ]
    }
  };

  // FAQ Items
  const faqItems = [
    {
      q: language === 'en' ? `How do I create an account and get started with ${BRAND.name}?` : `${BRAND.name} پر اکاؤنٹ کیسے بنایا جائے اور شروعات کیسے کریں؟`,
      a: language === 'en'
        ? 'Click "Get Started Free" in the navigation bar to create your business account using your email address and password, or sign in with Google in one click. Once signed in, you can immediately add customers, suppliers, and transactions.'
        : 'نیویگیشن بار میں "Get Started Free" پر کلک کریں اور اپنے ای میل یا گوگل اکاؤنٹ کے ذریعے سائن اپ کریں۔ اکاؤنٹ بنتے ہی آپ فوری طور پر گاہک، سپلائر اور لین دین شامل کر سکتے ہیں۔'
    },
    {
      q: language === 'en' ? 'How is my business and financial data kept secure?' : 'میرے کاروبار اور کھاتوں کا ڈیٹا کس طرح محفوظ رہتا ہے؟',
      a: language === 'en'
        ? `${BRAND.name} uses Firebase Authentication and strict access rules so only authorized users can access your workspace. Additionally, the built-in Safety & Backup Hub automatically creates a restore snapshot before any deletion and allows manual JSON backup downloads anytime.`
        : `${BRAND.name} فائر بیس سیکیورٹی اور سخت رسائی کے اصول استعمال کرتا ہے۔ اس کے علاوہ کسی بھی ریکارڈ کو حذف کرنے سے پہلے خودکار بیک اپ بنتا ہے اور آپ کسی بھی وقت مکمل بیک اپ فائل اپنے پاس ڈاؤن لوڈ بھی کر سکتے ہیں۔`
    },
    {
      q: language === 'en' ? 'How do I record customer credit (Udhaar) and payments?' : 'گاہک کا ادھار اور وصول شدہ رقم کیسے درج کی جاتی ہے؟',
      a: language === 'en'
        ? `Open the Customers tab, select or add a customer folder, and log either a Credit (Udhaar given) or Payment (Debit received) entry. ${BRAND.name} automatically calculates the updated running balance and reflects it across your dashboard receivables.`
        : 'کسٹمرز ٹیب میں جا کر گاہک کا فولڈر منتخب کریں اور ادھار (Credit) یا وصولی (Payment) کی رقم درج کریں۔ سسٹم خودکار طریقے سے نیا بقایا بیلنس اپ ڈیٹ کر دے گا۔'
    },
    {
      q: language === 'en' ? 'Can I send payment reminders and statements to customers?' : 'کیا میں بقایا دار گاہکوں کو ادائیگی کی یاد دہانی اور اسٹیٹمنٹ بھیج سکتا ہوں؟',
      a: language === 'en'
        ? 'Yes. Inside each customer folder, you can send formatted WhatsApp or SMS statements and reminders using that customer’s verified transaction records.'
        : 'جی ہاں! آپ کسی بھی گاہک کے فولڈر سے انفرادی طور پر واٹس ایپ یا ایس ایم ایس کے ذریعے مکمل اسٹیٹمنٹ اور یاد دہانی بھیج سکتے ہیں۔'
    },
    {
      q: language === 'en' ? 'Can my shop manager or cashier use the app with restricted permissions?' : 'کیا دکان کا مینیجر یا کیشیئر محدود اختیارات کے ساتھ ایپ استعمال کر سکتا ہے؟',
      a: language === 'en'
        ? `Yes. ${BRAND.name} supports three distinct roles: Owner (full analytics, backups, and deletion rights), Manager (inventory, billing, and ledger management), and Employee (daily transaction and cash book entry without destructive permissions).`
        : `جی بالکل۔ ${BRAND.name} میں تین درجے موجود ہیں: مالک (مکمل کنٹرول اور بیک اپ)، مینیجر (اسٹاک اور بلنگ)، اور ملازم (صرف روزانہ کا اندراج، ریکارڈ ڈیلیٹ کرنے کی اجازت کے بغیر)۔`
    }
  ];

  const currentAudience = audienceBenefits[activeAudience];
  const AudienceIcon = currentAudience.icon;

  return (
    <div className="flex-1 flex flex-col bg-[#F8FAFC] dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 font-sans selection:bg-[#0B192C] selection:text-[#D4AF37]">
      {/* 1. STICKY NAVBAR */}
      <header
        className={`sticky top-0 z-50 transition-all duration-200 px-4 sm:px-8 ${
          isScrolled
            ? 'bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-b border-slate-200/90 dark:border-zinc-800 shadow-2xs'
            : 'bg-[#F8FAFC]/80 dark:bg-zinc-950/80 backdrop-blur-xs border-b border-slate-200/50 dark:border-zinc-800/60'
        }`}
      >
        <div className="max-w-7xl mx-auto h-16 flex items-center justify-between gap-8">
          {/* Brand Logo */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-2.5 shrink-0 group focus:outline-none"
          >
            <MeezanFlowLogo size="md" />
            <div className="flex flex-col">
              <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap leading-none">
                {BRAND.name}
              </span>
              <span className="text-[10px] font-medium text-slate-500 dark:text-zinc-400 hidden lg:inline mt-0.5">
                {BRAND.tagline}
              </span>
            </div>
          </a>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs sm:text-sm font-medium text-slate-600 dark:text-zinc-300">
            <button
              type="button"
              onClick={() => scrollToSection('features')}
              className="hover:text-[#0B192C] dark:hover:text-[#D4AF37] transition-colors cursor-pointer whitespace-nowrap"
            >
              {language === 'en' ? 'Features' : 'خصوصیات'}
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('how-it-works')}
              className="hover:text-[#0B192C] dark:hover:text-[#D4AF37] transition-colors cursor-pointer whitespace-nowrap"
            >
              {language === 'en' ? 'How It Works' : 'طریقہ کار'}
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('benefits')}
              className="hover:text-[#0B192C] dark:hover:text-[#D4AF37] transition-colors cursor-pointer whitespace-nowrap"
            >
              {language === 'en' ? 'Benefits' : 'فوائد'}
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('faq')}
              className="hover:text-[#0B192C] dark:hover:text-[#D4AF37] transition-colors cursor-pointer whitespace-nowrap"
            >
              {language === 'en' ? 'FAQ' : 'سوالات'}
            </button>
          </nav>

          {/* Actions Zone */}
          <div className="flex items-center gap-2.5 shrink-0">
            {showInstallBtn && (
              <button
                type="button"
                onClick={handleInstallClick}
                className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Download className="h-3.5 w-3.5 text-[#0B192C] dark:text-[#D4AF37]" />
                <span>{t.installApp}</span>
              </button>
            )}
            <LanguageToggle language={language} setLanguage={setLanguage} />
            <ThemeToggle />
            <button
              type="button"
              onClick={() => onOpenAuth('login')}
              className="px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold text-slate-700 dark:text-zinc-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer whitespace-nowrap"
            >
              {language === 'en' ? 'Login' : 'لاگ ان'}
            </button>
            <button
              type="button"
              onClick={() => onOpenAuth('signup')}
              className="px-4 py-2 rounded-lg bg-[#0B192C] hover:bg-[#132847] dark:bg-[#D4AF37] dark:hover:bg-[#C5A028] text-white dark:text-[#0B192C] text-xs sm:text-sm font-semibold shadow-2xs transition-colors cursor-pointer whitespace-nowrap"
            >
              {language === 'en' ? 'Get Started Free' : 'مفت شروع کریں'}
            </button>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section id="top" className="relative pt-12 pb-20 lg:pt-16 lg:pb-24 px-4 sm:px-8 overflow-hidden">
        {/* Subtle architectural grid background */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#18181b_1px,transparent_1px),linear-gradient(to_bottom,#18181b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_70%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-45"
        />

        <div className="relative max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center">
          {/* Left Column: Headline & Primary CTAs */}
          <div className="lg:col-span-6 text-left space-y-6">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#0B192C] dark:text-[#D4AF37]">
              <span>{BRAND.getTagline(language)}</span>
              <span aria-hidden="true">·</span>
              <span>{language === 'en' ? 'PKR Financial Suite' : 'پاکستانی کاروبار کے لیے'}</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-extrabold text-slate-900 dark:text-white tracking-tight leading-[1.1] text-balance">
              {language === 'en' ? (
                <>
                  Balance Your Business.{' '}
                  <span className="text-[#0B192C] dark:text-[#D4AF37] underline decoration-[#D4AF37] decoration-2 underline-offset-8">
                    Flow With Confidence.
                  </span>
                </>
              ) : (
                <>
                  اپنے کاروبار میں توازن لائیں۔{' '}
                  <span className="text-[#0B192C] dark:text-[#D4AF37]">اعتماد کے ساتھ آگے بڑھیں۔</span>
                </>
              )}
            </h1>

            <p className="text-base sm:text-lg text-slate-600 dark:text-zinc-300 leading-relaxed max-w-xl">
              {language === 'en'
                ? `${BRAND.name} brings precision bookkeeping, customer credit folders, daily cash flow, and supplier accounts into one modern financial management platform.`
                : `${BRAND.name} کے ساتھ ادھار کا حساب رکھیں، ادائیگیاں ٹریک کریں، گاہکوں کے فولڈرز منظم کریں اور اپنے کاروبار کو وسعت دیں۔`}
            </p>

            {/* Primary & Secondary CTAs */}
            <div className="pt-2 flex flex-wrap items-center gap-3.5">
              <button
                type="button"
                onClick={() => onOpenAuth('signup')}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#0B192C] hover:bg-[#132847] dark:bg-[#D4AF37] dark:hover:bg-[#C5A028] text-white dark:text-[#0B192C] font-semibold text-sm shadow-xs transition-all cursor-pointer whitespace-nowrap"
              >
                <span>{language === 'en' ? 'Get Started Free' : 'مفت اکاؤنٹ بنائیں'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => scrollToSection('features')}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 font-semibold text-sm transition-all cursor-pointer whitespace-nowrap"
              >
                <span>{language === 'en' ? 'Explore Features' : 'خصوصیات دیکھیں'}</span>
              </button>
            </div>

            {/* Quiet Unboxed Metadata */}
            <div className="pt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-slate-500 dark:text-zinc-400">
              <span>{language === 'en' ? 'Cloud-synced ledgers' : 'کلاؤڈ بیک اپ'}</span>
              <span aria-hidden="true">·</span>
              <span>{language === 'en' ? 'English & Urdu interface' : 'اردو اور انگریزی سپورٹ'}</span>
              <span aria-hidden="true">·</span>
              <span>{language === 'en' ? 'Firebase Authentication' : 'فائر بیس سیکیورٹی'}</span>
            </div>
          </div>

          {/* Right Column: Product Dashboard Preview (Clean Zero-State Workspace) */}
          <div className="lg:col-span-6">
            <div className="rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden text-left">
              {/* Preview Window Top Header */}
              <div className="px-5 py-3.5 bg-[#0B192C] text-white border-b border-slate-800 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <MeezanFlowLogo size="sm" />
                  <span className="text-xs font-bold text-white">
                    {BRAND.name}
                  </span>
                  <span className="text-slate-600" aria-hidden="true">
                    /
                  </span>
                  <span className="text-[11px] text-slate-300">
                    {language === 'en' ? 'Financial Overview' : 'ڈیش بورڈ کا منظر'}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-[#D4AF37] font-semibold tabular-nums">
                  PKR
                </span>
              </div>

              <div className="p-5 space-y-5">
                {/* Summary KPI Strip */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-zinc-950 border border-slate-200/70 dark:border-zinc-800">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400 mb-1">
                      <span>{language === 'en' ? 'Total Receivables' : 'کل واجب الادا'}</span>
                      <ArrowUpRight className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="text-sm sm:text-base font-bold font-mono text-slate-900 dark:text-white tabular-nums">
                      Rs 0
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                      {language === 'en' ? 'Customer credit ledger' : 'گاہک ادھار کھاتا'}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-zinc-950 border border-slate-200/70 dark:border-zinc-800">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400 mb-1">
                      <span>{language === 'en' ? 'Collections' : 'وصولیاں'}</span>
                      <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
                    </div>
                    <div className="text-sm sm:text-base font-bold font-mono text-emerald-700 dark:text-emerald-400 tabular-nums">
                      Rs 0
                    </div>
                    <div className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5 font-medium">
                      {language === 'en' ? 'Payments received' : 'وصول شدہ رقوم'}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-zinc-950 border border-slate-200/70 dark:border-zinc-800">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400 mb-1">
                      <span>{language === 'en' ? 'Cash Drawer' : 'نقد گلہ بیلنس'}</span>
                      <Wallet className="h-3.5 w-3.5 text-slate-600 dark:text-zinc-400" />
                    </div>
                    <div className="text-sm sm:text-base font-bold font-mono text-slate-900 dark:text-white tabular-nums">
                      Rs 0
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                      {language === 'en' ? 'Net counter cash' : 'موجودہ نقد رقم'}
                    </div>
                  </div>
                </div>

                {/* Financial Analytics Overview */}
                <div className="p-4 rounded-xl border border-slate-200/70 dark:border-zinc-800 bg-[#F8FAFC] dark:bg-zinc-950">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div>
                      <h2 className="text-xs font-bold text-slate-900 dark:text-white">
                        {language === 'en' ? 'Receivables vs. Collections Trend' : 'ادھار اور وصولی کا موازنہ'}
                      </h2>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                        {language === 'en'
                          ? 'Real-time analytics populate automatically as you record transactions'
                          : 'لین دین درج کرنے پر گراف خودکار طریقے سے اپ ڈیٹ ہوتا ہے'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-600 dark:text-zinc-400">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-xs bg-slate-300 dark:bg-zinc-700" />
                        <span>{language === 'en' ? 'Credit Issued' : 'ادھار'}</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-xs bg-emerald-700 dark:bg-emerald-500" />
                        <span>{language === 'en' ? 'Collected' : 'وصولی'}</span>
                      </span>
                    </div>
                  </div>

                  <div className="h-24 flex items-center justify-center rounded-lg border border-dashed border-slate-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/50 px-4 text-center">
                    <span className="text-xs text-slate-500 dark:text-zinc-400">
                      {language === 'en'
                        ? 'Sign in to view your live daily cash flow and net profit charts.'
                        : 'اپنے کاروبار کا روزانہ کیش فلو اور منافع کا گراف دیکھنے کے لیے لاگ ان کریں۔'}
                    </span>
                  </div>
                </div>

                {/* Recent Ledger Transactions Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {language === 'en' ? 'Recent Customer Ledger Entries' : 'حالیہ کھاتا اندراجات'}
                    </span>

                    {/* Segmented Control */}
                    <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-zinc-950 rounded-lg border border-slate-200/70 dark:border-zinc-800">
                      {(
                        [
                          { id: 'all', label: language === 'en' ? 'All' : 'تمام' },
                          { id: 'due', label: language === 'en' ? 'Due' : 'واجب الادا' },
                          { id: 'paid', label: language === 'en' ? 'Paid' : 'ادا شدہ' }
                        ] as const
                      ).map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setPreviewFilter(tab.id)}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                            previewFilter === tab.id
                              ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-2xs'
                              : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border border-slate-200/80 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 p-6 text-center space-y-2">
                    <p className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                      {language === 'en' ? 'Your Digital Ledger is Ready' : 'آپ کا ڈیجیٹل کھاتا تیار ہے'}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
                      {language === 'en'
                        ? 'Create an account or sign in to add customers, record credit (Udhaar) and cash payments, and track real-time balances.'
                        : 'گاہک شامل کرنے، ادھار اور نقد وصولی درج کرنے اور بقایا جات ٹریک کرنے کے لیے لاگ ان کریں۔'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. TRUST SECTION */}
      <section className="py-12 px-4 sm:px-8 bg-white dark:bg-zinc-900 border-y border-slate-200/80 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-xl bg-[#0B192C]/5 dark:bg-[#D4AF37]/15 border border-[#0B192C]/15 dark:border-[#D4AF37]/30 flex items-center justify-center text-[#0B192C] dark:text-[#D4AF37] shrink-0">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {language === 'en' ? 'Easy Record Keeping' : 'آسان اور منظم حساب کتاب'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 mt-1 leading-relaxed">
                {language === 'en'
                  ? 'Log credit sales, cash payments, and supplier bills in a structured ledger with automatic running balance calculations.'
                  : 'ادھار فروخت، نقد وصولی اور سپلائر بلوں کو منظم کھاتے میں درج کریں جہاں بقایا رقم خودکار طریقے سے اپ ڈیٹ ہوتی ہے۔'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-xl bg-[#0B192C]/5 dark:bg-[#D4AF37]/15 border border-[#0B192C]/15 dark:border-[#D4AF37]/30 flex items-center justify-center text-[#0B192C] dark:text-[#D4AF37] shrink-0">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {language === 'en' ? 'Secure Account Access' : 'محفوظ اکاؤنٹ رسائی'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 mt-1 leading-relaxed">
                {language === 'en'
                  ? 'Authenticated workspaces with granular Owner, Manager, and Staff permissions and automated pre-deletion backup checkpoints.'
                  : 'فائر بیس سیکیورٹی، مالک اور عملے کے الگ اختیارات اور ڈیٹا ڈیلیٹ ہونے سے پہلے خودکار بیک اپ کی سہولت۔'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-xl bg-[#0B192C]/5 dark:bg-[#D4AF37]/15 border border-[#0B192C]/15 dark:border-[#D4AF37]/30 flex items-center justify-center text-[#0B192C] dark:text-[#D4AF37] shrink-0">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {language === 'en' ? 'Smarter Payment Tracking' : 'ادائیگیوں کی بہتر نگرانی'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 mt-1 leading-relaxed">
                {language === 'en'
                  ? 'Identify overdue customer balances immediately and send formatted WhatsApp or SMS payment statements in seconds.'
                  : 'واجب الادا رقوم کی فوری نشاندہی کریں اور سیکنڈز میں واٹس ایپ یا ایس ایم ایس کے ذریعے یاد دہانی بھیجیں۔'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. FEATURES SECTION */}
      <section id="features" className="py-20 lg:py-24 px-4 sm:px-8 max-w-7xl mx-auto">
        <div className="max-w-2xl text-left mb-12 space-y-3">
          <div className="text-xs font-semibold text-[#0B192C] dark:text-[#D4AF37]">
            {language === 'en' ? 'Core Platform Capabilities' : 'پلیٹ فارم کی بنیادی خصوصیات'}
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white tracking-tight text-balance">
            {language === 'en'
              ? `Everything you need to run a balanced financial workflow`
              : 'مکمل اور شفاف کاروباری حساب کتاب چلانے کے لیے تمام ضروری فیچرز'}
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-zinc-400 leading-relaxed">
            {language === 'en'
              ? 'Purpose-built financial tools that keep your customer receivables, supplier payables, and daily cash drawer accurate.'
              : 'ایسے مالیاتی ٹولز جو آپ کے گاہکوں کے بقایا جات، سپلائرز کی ادائیگیوں اور روزانہ کی نقد رقم کو ہمیشہ درست رکھتے ہیں۔'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={idx}
                className="group bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/90 dark:border-zinc-800 p-6 flex flex-col justify-between hover:border-[#0B192C]/40 dark:hover:border-[#D4AF37]/50 transition-all duration-150"
              >
                <div className="space-y-4">
                  <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-zinc-800 group-hover:bg-[#0B192C] dark:group-hover:bg-[#D4AF37]/20 text-slate-800 dark:text-zinc-200 group-hover:text-[#D4AF37] dark:group-hover:text-[#D4AF37] flex items-center justify-center transition-colors">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                    {feat.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
                    {feat.description}
                  </p>
                </div>

                <div className="pt-5 mt-5 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-xs font-medium text-slate-500 dark:text-zinc-400">
                  <span>{feat.detail}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#0B192C] dark:group-hover:text-[#D4AF37] group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. HOW IT WORKS SECTION */}
      <section
        id="how-it-works"
        className="py-20 lg:py-24 px-4 sm:px-8 bg-white dark:bg-zinc-900 border-y border-slate-200/80 dark:border-zinc-800"
      >
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl text-left mb-12 space-y-3">
            <div className="text-xs font-semibold text-[#0B192C] dark:text-[#D4AF37]">
              {language === 'en' ? 'How It Works' : 'یہ کیسے کام کرتا ہے'}
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white tracking-tight text-balance">
              {language === 'en'
                ? 'Three simple steps from paper registers to structured digital accounts'
                : 'کاغذی رجسٹر سے جدید ڈیجیٹل کھاتے تک صرف تین آسان مراحل'}
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* Left: 3 Selectable Steps */}
            <div className="lg:col-span-6 space-y-4 text-left">
              {workflowSteps.map((step, index) => {
                const isSelected = activeStep === index;
                return (
                  <button
                    key={step.number}
                    type="button"
                    onClick={() => setActiveStep(index)}
                    className={`w-full text-left p-5 sm:p-6 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#F8FAFC] dark:bg-zinc-950 border-[#0B192C] dark:border-[#D4AF37] shadow-2xs'
                        : 'bg-white dark:bg-zinc-900 border-slate-200/90 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <span
                        className={`font-mono text-xs font-bold px-2.5 py-1 rounded-md tabular-nums ${
                          isSelected
                            ? 'bg-[#0B192C] text-[#D4AF37]'
                            : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400'
                        }`}
                      >
                        {step.number}
                      </span>
                      <div className="space-y-1.5">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          {step.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Right: Live Step Visual Preview */}
            <div className="lg:col-span-6 bg-[#F8FAFC] dark:bg-zinc-950 rounded-2xl border border-slate-200/90 dark:border-zinc-800 p-6 sm:p-8 text-left space-y-6">
              <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-zinc-800 pb-4">
                <div>
                  <span className="text-xs font-mono font-semibold text-[#0B192C] dark:text-[#D4AF37]">
                    Step {workflowSteps[activeStep].number}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                    {workflowSteps[activeStep].previewTitle}
                  </h3>
                </div>
                <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                  {BRAND.name}
                </span>
              </div>

              <div className="space-y-3">
                {workflowSteps[activeStep].previewRows.map((row, rIdx) => (
                  <div
                    key={rIdx}
                    className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="text-[11px] text-slate-500 dark:text-zinc-400">{row.label}</div>
                      <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white mt-0.5">
                        {row.value}
                      </div>
                    </div>
                    <span className="text-xs font-mono font-semibold text-[#0B192C] dark:text-[#D4AF37] tabular-nums shrink-0">
                      {row.meta}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex items-center justify-between gap-4">
                <div className="flex items-center gap-1.5">
                  {[0, 1, 2].map((dot) => (
                    <button
                      key={dot}
                      type="button"
                      onClick={() => setActiveStep(dot)}
                      aria-label={`View step ${dot + 1}`}
                      className={`h-1.5 rounded-full transition-all cursor-pointer ${
                        activeStep === dot
                          ? 'w-6 bg-[#0B192C] dark:bg-[#D4AF37]'
                          : 'w-2 bg-slate-300 dark:bg-zinc-700'
                      }`}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => onOpenAuth('signup')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0B192C] dark:text-[#D4AF37] hover:underline cursor-pointer"
                >
                  <span>{language === 'en' ? 'Start Step 01 Free' : 'پہلا مرحلہ مفت شروع کریں'}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. BENEFITS SECTION */}
      <section id="benefits" className="py-20 lg:py-24 px-4 sm:px-8 max-w-7xl mx-auto">
        <div className="max-w-2xl text-left mb-10 space-y-3">
          <div className="text-xs font-semibold text-[#0B192C] dark:text-[#D4AF37]">
            {language === 'en' ? 'Designed for Modern Businesses' : 'پاکستانی کاروباروں کی ضرورت کے مطابق'}
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white tracking-tight text-balance">
            {language === 'en'
              ? 'Built for shopkeepers, wholesalers, small businesses, and independent owners'
              : 'دکانداروں، چھوٹے کاروباروں، ہول سیلرز اور تاجروں کے لیے یکساں مفید'}
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-zinc-400 leading-relaxed">
            {language === 'en'
              ? 'Reduce manual bookkeeping overhead, eliminate calculation mistakes, and keep every account statement ready at a moment’s notice.'
              : 'دفتری کاغذی کارروائی کم کریں، حساب کی غلطیوں کا خاتمہ کریں اور ہر گاہک کا کھاتا ہمیشہ تیار رکھیں۔'}
          </p>
        </div>

        {/* Interactive Audience Selector Tabs */}
        <div className="flex flex-wrap items-center gap-2 mb-8">
          {(
            [
              { id: 'shopkeepers', label: language === 'en' ? 'Shopkeepers & Retail' : 'دکاندار اور ریٹیل' },
              { id: 'smallbiz', label: language === 'en' ? 'Small Businesses & Wholesalers' : 'چھوٹے کاروبار اور ہول سیلرز' },
              { id: 'freelancers', label: language === 'en' ? 'Freelancers & Services' : 'فری لانسرز' },
              { id: 'entrepreneurs', label: language === 'en' ? 'Independent Owners' : 'کاروباری مالکان' }
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveAudience(tab.id)}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer border whitespace-nowrap ${
                activeAudience === tab.id
                  ? 'bg-[#0B192C] text-white border-[#0B192C] dark:bg-[#D4AF37] dark:text-[#0B192C] dark:border-[#D4AF37] shadow-2xs'
                  : 'bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-800 hover:border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Selected Audience Benefit Detail + Operational Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch text-left">
          <div className="lg:col-span-7 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/90 dark:border-zinc-800 p-6 sm:p-8 flex flex-col justify-between">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2.5 text-xs font-semibold text-[#0B192C] dark:text-[#D4AF37]">
                <AudienceIcon className="h-4 w-4" />
                <span>{currentAudience.label}</span>
              </div>

              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                {currentAudience.headline}
              </h3>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
                {currentAudience.description}
              </p>

              <div className="space-y-3 pt-2">
                {currentAudience.points.map((pt, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="h-5 w-5 rounded-full bg-[#0B192C]/10 dark:bg-[#D4AF37]/20 text-[#0B192C] dark:text-[#D4AF37] flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="h-3 w-3" />
                    </div>
                    <span className="text-xs sm:text-sm text-slate-700 dark:text-zinc-300 font-medium">
                      {pt}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-zinc-400">
                {language === 'en' ? 'Ready for desktop & mobile browsers' : 'موبائل اور کمپیوٹر دونوں پر دستیاب'}
              </span>
              <button
                type="button"
                onClick={() => onOpenAuth('signup')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0B192C] dark:text-[#D4AF37] hover:underline cursor-pointer"
              >
                <span>{language === 'en' ? `Start with ${BRAND.name}` : 'اپنا اکاؤنٹ بنائیں'}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Right Column: Manual Bookkeeping vs. MeezanFlow Comparison */}
          <div className="lg:col-span-5 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/90 dark:border-zinc-800 p-6 sm:p-8 flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {language === 'en'
                  ? 'Why businesses switch from paper registers'
                  : `کاغذی رجسٹر کے مقابلے میں ${BRAND.name} کے فوائد`}
              </h3>

              <div className="divide-y divide-slate-200/70 dark:divide-zinc-800 text-xs">
                {[
                  {
                    aspect: language === 'en' ? 'Balance Calculation' : 'بیلنس کا حساب',
                    manual: language === 'en' ? 'Manual calculator totaling' : 'کیلکولیٹر سے دستی جمع تفریق',
                    digital: language === 'en' ? 'Instant automated ledger math' : 'خودکار اور غلطی سے پاک حساب'
                  },
                  {
                    aspect: language === 'en' ? 'Customer Statements' : 'بقایا کی یاد دہانی',
                    manual: language === 'en' ? 'Individual phone calls' : 'ایک ایک گاہک کو فون کال',
                    digital: language === 'en' ? '1-click WhatsApp & SMS statements' : 'ایک کلک میں واٹس ایپ اور ایس ایم ایس'
                  },
                  {
                    aspect: language === 'en' ? 'Record Safety' : 'ریکارڈ کا تحفظ',
                    manual: language === 'en' ? 'Risk of lost or damaged pages' : 'رجسٹر گم یا خراب ہونے کا خطرہ',
                    digital: language === 'en' ? 'Cloud sync & JSON rollback backups' : 'کلاؤڈ اور خودکار بیک اپ تحفظ'
                  },
                  {
                    aspect: language === 'en' ? 'Account Search' : 'کھاتا تلاش کرنا',
                    manual: language === 'en' ? 'Flipping through index pages' : 'صفحات پلٹ کر نام ڈھونڈنا',
                    digital: language === 'en' ? 'Instant search by name or phone' : 'نام یا نمبر سے فوری تلاش'
                  }
                ].map((cmp, idx) => (
                  <div key={idx} className="py-3.5 space-y-1.5">
                    <div className="font-bold text-slate-900 dark:text-white">{cmp.aspect}</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-slate-500 dark:text-zinc-400">
                        <span className="block text-[10px] text-slate-400">
                          {language === 'en' ? 'Paper Register' : 'کاغذی رجسٹر'}
                        </span>
                        {cmp.manual}
                      </div>
                      <div className="text-[#0B192C] dark:text-[#D4AF37] font-semibold">
                        <span className="block text-[10px] text-[#0B192C]/70 dark:text-[#D4AF37]/80">
                          {BRAND.name}
                        </span>
                        {cmp.digital}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FAQ SECTION */}
      <section
        id="faq"
        className="py-20 lg:py-24 px-4 sm:px-8 bg-white dark:bg-zinc-900 border-t border-slate-200/80 dark:border-zinc-800"
      >
        <div className="max-w-4xl mx-auto">
          <div className="text-left mb-10 space-y-3">
            <div className="text-xs font-semibold text-[#0B192C] dark:text-[#D4AF37]">
              {language === 'en' ? 'Frequently Asked Questions' : 'عام پوچھے جانے والے سوالات'}
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              {language === 'en'
                ? `Answers to common questions about ${BRAND.name}`
                : `${BRAND.name} کے بارے میں اہم سوالات کے جوابات`}
            </h2>
          </div>

          <div className="divide-y divide-slate-200 dark:divide-zinc-800 border-y border-slate-200 dark:border-zinc-800 text-left">
            {faqItems.map((item, idx) => {
              const isOpen = faqOpenIndex === idx;
              return (
                <div key={idx} className="py-4">
                  <button
                    type="button"
                    onClick={() => setFaqOpenIndex(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between gap-4 py-2 text-left cursor-pointer focus:outline-none group"
                  >
                    <span className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white group-hover:text-[#0B192C] dark:group-hover:text-[#D4AF37] transition-colors">
                      {item.q}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-[#0B192C] dark:text-[#D4AF37]' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <p className="pt-2 pb-3 text-xs sm:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed max-w-3xl">
                      {item.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 8. FINAL CTA SECTION */}
      <section className="py-20 px-4 sm:px-8 bg-[#F8FAFC] dark:bg-zinc-950 border-t border-slate-200/80 dark:border-zinc-800">
        <div className="max-w-4xl mx-auto bg-[#0B192C] text-white rounded-2xl border border-[#1E3A5F] p-8 sm:p-12 text-center shadow-xs space-y-6">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#D4AF37]">
            <span>{BRAND.getTagline(language)}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight text-balance">
            {language === 'en'
              ? 'Ready to balance your business accounts?'
              : 'کیا آپ اپنے کاروباری حساب کتاب کو متوازن بنانے کے لیے تیار ہیں؟'}
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto leading-relaxed">
            {language === 'en'
              ? `Create your ${BRAND.name} workspace today to organize customer ledgers, track payments, and keep your business operations flowing smoothly.`
              : `آج ہی اپنا ${BRAND.name} اکاؤنٹ بنائیں اور گاہکوں کے کھاتے، وصولیاں اور کاروباری ریکارڈ کو محفوظ طریقے سے منظم کریں۔`}
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3.5">
            <button
              type="button"
              onClick={() => onOpenAuth('signup')}
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-[#D4AF37] hover:bg-[#C5A028] text-[#0B192C] font-bold text-sm shadow-xs transition-all cursor-pointer whitespace-nowrap"
            >
              <span>{language === 'en' ? 'Get Started Free' : 'مفت اکاؤنٹ بنائیں'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onOpenAuth('login')}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-white font-semibold text-sm transition-all cursor-pointer whitespace-nowrap"
            >
              <span>{language === 'en' ? 'Sign In' : 'لاگ ان کریں'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* 9. SITE DIRECTORY & LEGAL LINKS */}
      <section
        aria-label="Site directory"
        className="bg-white dark:bg-zinc-900 border-t border-slate-200/80 dark:border-zinc-800 py-12 px-4 sm:px-8 text-left"
      >
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Brand Column */}
          <div className="md:col-span-5 space-y-3">
            <div className="flex items-center gap-2.5">
              <MeezanFlowLogo size="sm" />
              <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                {BRAND.name}
              </span>
            </div>
            <p className="text-xs font-semibold text-[#0B192C] dark:text-[#D4AF37]">
              {BRAND.getTagline(language)}
            </p>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 max-w-sm leading-relaxed">
              {language === 'en'
                ? 'Modern business accounting, customer credit folders, cash book management, and invoicing for small businesses, shopkeepers, and wholesalers.'
                : 'پاکستان بھر کے کاروباروں، دکانداروں اور ہول سیلرز کے لیے جدید اکاؤنٹنگ، ادھار ٹریکنگ، کیش بک اور انوائس مینجمنٹ سسٹم۔'}
            </p>
          </div>

          {/* Product Navigation */}
          <div className="md:col-span-3 space-y-2.5">
            <div className="text-xs font-bold text-slate-900 dark:text-white">
              {language === 'en' ? 'Product' : 'پروڈکٹ'}
            </div>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-zinc-400">
              <li>
                <button
                  type="button"
                  onClick={() => scrollToSection('features')}
                  className="hover:text-[#0B192C] dark:hover:text-[#D4AF37] cursor-pointer"
                >
                  {language === 'en' ? 'Features' : 'خصوصیات'}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => scrollToSection('how-it-works')}
                  className="hover:text-[#0B192C] dark:hover:text-[#D4AF37] cursor-pointer"
                >
                  {language === 'en' ? 'How It Works' : 'طریقہ کار'}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => scrollToSection('benefits')}
                  className="hover:text-[#0B192C] dark:hover:text-[#D4AF37] cursor-pointer"
                >
                  {language === 'en' ? 'Benefits' : 'فوائد'}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => scrollToSection('faq')}
                  className="hover:text-[#0B192C] dark:hover:text-[#D4AF37] cursor-pointer"
                >
                  {language === 'en' ? 'FAQ' : 'عام سوالات'}
                </button>
              </li>
            </ul>
          </div>

          {/* Account & Legal */}
          <div className="md:col-span-4 space-y-2.5">
            <div className="text-xs font-bold text-slate-900 dark:text-white">
              {language === 'en' ? 'Account & Legal' : 'اکاؤنٹ اور قانونی معلومات'}
            </div>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-zinc-400">
              <li>
                <button
                  type="button"
                  onClick={() => onOpenAuth('login')}
                  className="hover:text-[#0B192C] dark:hover:text-[#D4AF37] cursor-pointer"
                >
                  {language === 'en' ? 'Merchant Login' : 'مرچنٹ لاگ ان'}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenAuth('signup')}
                  className="hover:text-[#0B192C] dark:hover:text-[#D4AF37] cursor-pointer"
                >
                  {language === 'en' ? 'Create Free Account' : 'مفت اکاؤنٹ بنائیں'}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setLegalModal('privacy')}
                  className="hover:text-[#0B192C] dark:hover:text-[#D4AF37] cursor-pointer"
                >
                  {language === 'en' ? 'Privacy Policy' : 'پرائیویسی پالیسی'}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setLegalModal('terms')}
                  className="hover:text-[#0B192C] dark:hover:text-[#D4AF37] cursor-pointer"
                >
                  {language === 'en' ? 'Terms of Service' : 'شرائط و ضوابط'}
                </button>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Privacy Policy / Terms of Service Modal */}
      {legalModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-xl text-left space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {legalModal === 'privacy'
                  ? language === 'en'
                    ? `Privacy Policy · ${BRAND.name}`
                    : `پرائیویسی پالیسی · ${BRAND.name}`
                  : language === 'en'
                  ? `Terms of Service · ${BRAND.name}`
                  : `شرائط و ضوابط · ${BRAND.name}`}
              </h3>
              <button
                type="button"
                onClick={() => setLegalModal(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="text-xs sm:text-sm text-slate-600 dark:text-zinc-300 space-y-3 leading-relaxed max-h-80 overflow-y-auto pr-1">
              {legalModal === 'privacy' ? (
                <>
                  <p>
                    <strong>1. Data Ownership:</strong> Your customer ledgers, supplier records, cash book entries, and invoices belong strictly to your business account.
                  </p>
                  <p>
                    <strong>2. Authentication & Storage:</strong> {BRAND.name} authenticates sessions via Firebase Authentication and stores records in isolated workspace collections with automatic pre-deletion backups.
                  </p>
                  <p>
                    <strong>3. No Third-Party Sharing:</strong> Customer phone numbers and transaction histories are never sold or shared with third-party advertisers.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    <strong>1. Account Responsibility:</strong> Business owners are responsible for managing role permissions (Owner, Manager, Employee) within their organization.
                  </p>
                  <p>
                    <strong>2. Financial Record Accuracy:</strong> {BRAND.name} provides automated double-entry ledger calculations and exportable statements; users should periodically download backup snapshots for offline archiving.
                  </p>
                  <p>
                    <strong>3. Messaging Compliance:</strong> SMS and WhatsApp reminders are dispatched directly through the user’s device with explicit merchant consent.
                  </p>
                </>
              )}
            </div>
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setLegalModal(null)}
                className="px-4 py-2 rounded-lg bg-[#0B192C] hover:bg-[#132847] dark:bg-[#D4AF37] dark:text-[#0B192C] text-white text-xs font-semibold cursor-pointer"
              >
                {language === 'en' ? 'Close' : 'بند کریں'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
