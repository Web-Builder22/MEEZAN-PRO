import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Users,
  TrendingUp,
  ShieldCheck,
  Download,
  Check,
  CheckCircle2,
  ChevronDown,
  ArrowRight,
  BarChart3,
  Layers,
  Store,
  Briefcase,
  Building2,
  UserCheck,
  BellRing,
  X,
  LayoutDashboard,
  Phone,
  Mail,
  MapPin,
  Send,
  HelpCircle,
  Shield,
  Globe
} from 'lucide-react';
import LanguageToggle from './LanguageToggle';
import ThemeToggle from './ThemeToggle';
import { AuthScreenMode } from './AuthPages';
import { BRAND, MeezanFlowLogo } from '../brand';
import { motion } from 'motion/react';

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

  // Benefits Interactive Audience Tab State
  const [activeAudience, setActiveAudience] = useState<
    'shopkeepers' | 'smallbiz' | 'freelancers' | 'entrepreneurs'
  >('shopkeepers');

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

  // Smooth easing cubic-bezier(0.16, 1, 0.3, 1) with 0.6s transition duration
  const smoothEase = [0.16, 1, 0.3, 1] as const;

  // Contact / Help form state
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactSubject, setContactSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [isSubmittingMessage, setIsSubmittingMessage] = useState(false);
  const [messageSuccess, setMessageSuccess] = useState(false);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactMessage.trim()) return;
    setIsSubmittingMessage(true);
    setTimeout(() => {
      setIsSubmittingMessage(false);
      setMessageSuccess(true);
      setContactName('');
      setContactEmail('');
      setContactSubject('');
      setContactMessage('');
      setTimeout(() => setMessageSuccess(false), 5000);
    }, 600);
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Consolidated Core Platform Capabilities (3x2 CSS Grid)
  const features = [
    {
      icon: BookOpen,
      title: language === 'en' ? 'Digital Khata & Ledger Management' : 'ڈیجیٹل کھاتا اور لیجر مینجمنٹ',
      description:
        language === 'en'
          ? 'Maintain structured, error-free digital ledgers for every account with automatic running balance calculations and full audit logs.'
          : 'ہر گاہک اور کاروباری کھاتے کا منظم اور غلطی سے پاک ڈیجیٹل ریکارڈ رکھیں جہاں بقایا رقم خودکار طریقے سے اپ ڈیٹ ہوتی ہے۔',
      detail: language === 'en' ? 'Auto-calculated running balances' : 'خودکار چلنے والا بیلنس'
    },
    {
      icon: Users,
      title: language === 'en' ? 'Customer & Supplier Accounts' : 'کسٹمر اور سپلائر اکاؤنٹس',
      description:
        language === 'en'
          ? 'Dedicated directories for customers and wholesale suppliers. Track who owes you and what you owe vendors from one unified workspace.'
          : 'گاہکوں اور ہول سیل سپلائرز کے لیے الگ الگ منظم کھاتے۔ ایک ہی جگہ سے واجب الادا اور واجب الوصول رقوم کا مکمل حساب رکھیں۔',
      detail: language === 'en' ? 'Unified receivables & payables' : 'وصولی اور ادائیگی کا مکمل ریکارڈ'
    },
    {
      icon: TrendingUp,
      title: language === 'en' ? 'Credit & Debit Tracking' : 'کریڈٹ اور ڈیبٹ ٹریکنگ',
      description:
        language === 'en'
          ? 'Record credit sales (Udhaar), cash collections, and partial settlements in seconds. Filter transactions by date, type, or status.'
          : 'ادھار فروخت، نقد وصولی اور جزوی ادائیگیوں کا سیکنڈز میں اندراج کریں۔ تاریخ یا قسم کے لحاظ سے لین دین تلاش کریں۔',
      detail: language === 'en' ? 'Real-time double-entry logs' : 'فوری ڈبل انٹری حساب'
    },
    {
      icon: BellRing,
      title: language === 'en' ? 'Payment History & Due Reminders' : 'ادائیگی کی ہسٹری اور یاد دہانی',
      description:
        language === 'en'
          ? 'Set promised payment dates and dispatch polite, formatted payment reminders via SMS or WhatsApp with a single click.'
          : 'ایک کلک کے ذریعے ایس ایم ایس یا واٹس ایپ پر بقایا رقم کی باوقار یاد دہانی اور مکمل اسٹیٹمنٹ بھیجیں۔',
      detail: language === 'en' ? '1-click SMS & WhatsApp dispatch' : 'ایس ایم ایس اور واٹس ایپ یاد دہانی'
    },
    {
      icon: BarChart3,
      title: language === 'en' ? 'Invoicing, Inventory & Statements' : 'بلنگ، اسٹاک اور پی ڈی ایف اسٹیٹمنٹ',
      description:
        language === 'en'
          ? 'Monitor daily counter cash-in/cash-out, track low-stock inventory items, and export printable PDF customer statements anytime.'
          : 'روزانہ کی نقد آمد و خرچ، اسٹاک کی مالیت اور پی ڈی ایف کھاتا اسٹیٹمنٹس کسی بھی وقت حاصل کریں۔',
      detail: language === 'en' ? 'Exportable PDF statements' : 'پرنٹ ایبل پی ڈی ایف رپورٹس'
    },
    {
      icon: ShieldCheck,
      title: language === 'en' ? 'Secure Role Access & Cloud Backups' : 'محفوظ رسائی اور خودکار بیک اپ',
      description:
        language === 'en'
          ? 'Protected with Firebase Authentication, role-based access for Owners, Managers, and Staff, plus automatic pre-deletion backup checkpoints.'
          : 'فائر بیس سیکیورٹی، مالک اور عملے کے الگ اختیارات، اور ڈیٹا ڈیلیٹ ہونے سے پہلے خودکار بیک اپ کی مکمل سہولت۔',
      detail: language === 'en' ? 'Role-based access & cloud backups' : 'رول بیسڈ رسائی اور کلاؤڈ بیک اپ'
    }
  ];

  // Redesigned Workspace Initialization & Workflow Cards (matching clean feature card styling)
  const workflowSteps = [
    {
      number: '01',
      icon: Layers,
      badge: language === 'en' ? 'Workspace Initialization' : 'کاروباری پروفائل کی تیاری',
      title: language === 'en' ? 'Initialize Your Business Workspace' : 'اپنا کاروباری اکاؤنٹ بنائیں',
      description:
        language === 'en'
          ? 'Sign up with email or Google, set your shop name, default currency (PKR), and role permissions for Owners, Managers, and Cashiers.'
          : 'اپنے ای میل یا گوگل اکاؤنٹ سے سائن اپ کریں، کاروبار کا نام درج کریں اور اپنے عملے کے اختیارات طے کریں۔',
      specs: [
        {
          label: language === 'en' ? 'Business Profile' : 'کاروبار کا نام',
          value: language === 'en' ? 'Verified Store Identity' : 'تصدیق شدہ کاروباری پروفائل'
        },
        {
          label: language === 'en' ? 'Primary Currency' : 'بنیادی کرنسی',
          value: 'PKR (Pakistani Rupee)'
        },
        {
          label: language === 'en' ? 'Access Control' : 'رسائی کا کنٹرول',
          value: language === 'en' ? 'Owner, Manager & Cashier' : 'مالک، مینیجر اور کیشیئر'
        }
      ],
      detail: language === 'en' ? 'Ready in under 60 seconds' : 'صرف 60 سیکنڈ میں تیار'
    },
    {
      number: '02',
      icon: Users,
      badge: language === 'en' ? 'Instant Ledger Entry' : 'فوری کھاتا اندراج',
      title: language === 'en' ? 'Add Customers & Log Transactions' : 'گاہک شامل کریں اور لین دین درج کریں',
      description:
        language === 'en'
          ? 'Create customer or supplier profiles with phone numbers and record credit sales, cash payments, or voice notes with instant balance updates.'
          : 'فون نمبر کے ساتھ گاہک یا سپلائر کا کھاتا کھولیں اور ادھار فروخت، نقد وصولی یا بل کا فوری اندراج کریں۔',
      specs: [
        {
          label: language === 'en' ? 'Party Directory' : 'گاہک کھاتا',
          value: language === 'en' ? 'Customer & Supplier Folders' : 'گاہک اور سپلائر فولڈرز'
        },
        {
          label: language === 'en' ? 'Entry Modes' : 'لین دین کی قسم',
          value: language === 'en' ? 'Credit, Debit & Voice Notes' : 'ادھار، وصولی اور وائس نوٹ'
        },
        {
          label: language === 'en' ? 'Ledger Math' : 'نیا بیلنس',
          value: language === 'en' ? 'Automatic Running Balance' : 'خودکار چلنے والا بیلنس'
        }
      ],
      detail: language === 'en' ? 'Zero manual calculation errors' : 'حساب کی غلطیوں سے پاک'
    },
    {
      number: '03',
      icon: CheckCircle2,
      badge: language === 'en' ? 'Receivables & Statements' : 'بقایا جات اور اسٹیٹمنٹ',
      title: language === 'en' ? 'Track Balances & Collect Faster' : 'بقایا جات ٹریک کریں اور ادائیگیاں سنبھالیں',
      description:
        language === 'en'
          ? 'Monitor live receivables on your dashboard, send 1-click WhatsApp or SMS due reminders, and download clean PDF account statements.'
          : 'ڈیش بورڈ پر کل واجب الادا رقم دیکھیں، واٹس ایپ یا ایس ایم ایس کے ذریعے یاد دہانی بھیجیں اور پی ڈی ایف اسٹیٹمنٹ ڈاؤن لوڈ کریں۔',
      specs: [
        {
          label: language === 'en' ? 'Collection Alerts' : 'بقایا دار گاہک',
          value: language === 'en' ? 'Overdue & Promised Date Tracking' : 'واجب الادا کھاتوں کی نشاندہی'
        },
        {
          label: language === 'en' ? 'Reminder Channel' : 'یاد دہانی کا ذریعہ',
          value: language === 'en' ? '1-Click WhatsApp & SMS Links' : 'فوری واٹس ایپ اور ایس ایم ایس'
        },
        {
          label: language === 'en' ? 'Statement Export' : 'اسٹیٹمنٹ رپورٹ',
          value: language === 'en' ? 'Printable PDF & JSON Backups' : 'پی ڈی ایف رپورٹ اور بیک اپ'
        }
      ],
      detail: language === 'en' ? 'Faster payment recovery' : 'بقایا جات کی تیز تر وصولی'
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
          ? 'Real-time revenue vs. expense visibility for informed purchasing decisions'
          : 'بہتر کاروباری فیصلوں کے لیے آمدنی اور اخراجات کا واضح موازنہ',
        language === 'en'
          ? 'One-click JSON & PDF exports for external tax filing or offline archiving'
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
      q:
        language === 'en'
          ? `How do I create an account and get started with ${BRAND.name}?`
          : `${BRAND.name} پر اکاؤنٹ کیسے بنایا جائے اور شروعات کیسے کریں؟`,
      a:
        language === 'en'
          ? 'Click "Get Started" in the navigation bar to create your business account using your email address and password, or sign in with Google in one click. Once signed in, you can immediately add customers, suppliers, and transactions.'
          : 'نیویگیشن بار میں "Get Started" پر کلک کریں اور اپنے ای میل یا گوگل اکاؤنٹ کے ذریعے سائن اپ کریں۔ اکاؤنٹ بنتے ہی آپ فوری طور پر گاہک، سپلائر اور لین دین شامل کر سکتے ہیں۔'
    },
    {
      q:
        language === 'en'
          ? 'How is my business and financial data kept secure?'
          : 'میرے کاروبار اور کھاتوں کا ڈیٹا کس طرح محفوظ رہتا ہے؟',
      a:
        language === 'en'
          ? `${BRAND.name} uses Firebase Authentication and strict access rules so only authorized users can access your workspace. Additionally, the built-in Safety & Backup Hub automatically creates a restore snapshot before any deletion and allows manual JSON backup downloads anytime.`
          : `${BRAND.name} فائر بیس سیکیورٹی اور سخت رسائی کے اصول استعمال کرتا ہے۔ اس کے علاوہ کسی بھی ریکارڈ کو حذف کرنے سے پہلے خودکار بیک اپ بنتا ہے اور آپ کسی بھی وقت مکمل بیک اپ فائل اپنے پاس ڈاؤن لوڈ بھی کر سکتے ہیں۔`
    },
    {
      q:
        language === 'en'
          ? 'How do I record customer credit (Udhaar) and payments?'
          : 'گاہک کا ادھار اور وصول شدہ رقم کیسے درج کی جاتی ہے؟',
      a:
        language === 'en'
          ? `Open the Customers tab, select or add a customer folder, and log either a Credit (Udhaar given) or Payment (Debit received) entry. ${BRAND.name} automatically calculates the updated running balance and reflects it across your dashboard receivables.`
          : 'کسٹمرز ٹیب میں جا کر گاہک کا فولڈر منتخب کریں اور ادھار (Credit) یا وصولی (Payment) کی رقم درج کریں۔ سسٹم خودکار طریقے سے نیا بقایا بیلنس اپ ڈیٹ کر دے گا۔'
    },
    {
      q:
        language === 'en'
          ? 'Can I send payment reminders and statements to customers?'
          : 'کیا میں بقایا دار گاہکوں کو ادائیگی کی یاد دہانی اور اسٹیٹمنٹ بھیج سکتا ہوں؟',
      a:
        language === 'en'
          ? 'Yes. Inside each customer folder, you can send formatted WhatsApp or SMS statements and reminders using that customer’s verified transaction records.'
          : 'جی ہاں! آپ کسی بھی گاہک کے فولڈر سے انفرادی طور پر واٹس ایپ یا ایس ایم ایس کے ذریعے مکمل اسٹیٹمنٹ اور یاد دہانی بھیج سکتے ہیں۔'
    },
    {
      q:
        language === 'en'
          ? 'Can my shop manager or cashier use the app with restricted permissions?'
          : 'کیا دکان کا مینیجر یا کیشیئر محدود اختیارات کے ساتھ ایپ استعمال کر سکتا ہے؟',
      a:
        language === 'en'
          ? `Yes. ${BRAND.name} supports three distinct roles: Owner (full analytics, backups, and deletion rights), Manager (inventory, billing, and ledger management), and Employee (daily transaction and cash book entry without destructive permissions).`
          : `جی بالکل۔ ${BRAND.name} میں تین درجے موجود ہیں: مالک (مکمل کنٹرول اور بیک اپ)، مینیجر (اسٹاک اور بلنگ)، اور ملازم (صرف روزانہ کا اندراج، ریکارڈ ڈیلیٹ کرنے کی اجازت کے بغیر)۔`
    }
  ];

  const currentAudience = audienceBenefits[activeAudience];
  const AudienceIcon = currentAudience.icon;

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 font-sans selection:bg-[#064E3B] selection:text-[#D4AF37]">
      {/* 1. STICKY NAVBAR */}
      <header
        className={`sticky top-0 z-50 transition-all duration-200 px-4 sm:px-8 ${
          isScrolled
            ? 'bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-b border-slate-200/90 dark:border-zinc-800 shadow-2xs'
            : 'bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xs border-b border-slate-200/60 dark:border-zinc-800/60'
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
              <span className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 dark:text-white whitespace-nowrap leading-none">
                Meezan<span className="text-[#059669] dark:text-[#D4AF37]">Flow</span>
              </span>
              <span className="text-[10px] font-medium text-slate-500 dark:text-zinc-400 hidden lg:inline mt-0.5">
                {BRAND.tagline}
              </span>
            </div>
          </a>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs sm:text-sm font-semibold text-slate-700 dark:text-zinc-300">
            <button
              type="button"
              onClick={() => scrollToSection('features')}
              className="hover:text-[#059669] dark:hover:text-[#D4AF37] transition-colors cursor-pointer whitespace-nowrap"
            >
              {language === 'en' ? 'Features' : 'خصوصیات'}
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('how-it-works')}
              className="hover:text-[#059669] dark:hover:text-[#D4AF37] transition-colors cursor-pointer whitespace-nowrap"
            >
              {language === 'en' ? 'How It Works' : 'طریقہ کار'}
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('benefits')}
              className="hover:text-[#059669] dark:hover:text-[#D4AF37] transition-colors cursor-pointer whitespace-nowrap"
            >
              {language === 'en' ? 'Benefits' : 'فوائد'}
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('faq')}
              className="hover:text-[#059669] dark:hover:text-[#D4AF37] transition-colors cursor-pointer whitespace-nowrap"
            >
              {language === 'en' ? 'FAQ' : 'سوالات'}
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('support')}
              className="hover:text-[#059669] dark:hover:text-[#D4AF37] transition-colors cursor-pointer whitespace-nowrap"
            >
              {language === 'en' ? 'Support' : 'مدد و رابطہ'}
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
                <Download className="h-3.5 w-3.5 text-[#059669] dark:text-[#D4AF37]" />
                <span>{t.installApp}</span>
              </button>
            )}
            <LanguageToggle language={language} setLanguage={setLanguage} />
            <ThemeToggle />
            <button
              type="button"
              onClick={() => onOpenAuth('login')}
              className="px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold text-slate-800 dark:text-zinc-200 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer whitespace-nowrap"
            >
              {language === 'en' ? 'Login' : 'لاگ ان'}
            </button>
            <button
              type="button"
              onClick={() => onOpenAuth('signup')}
              className="px-4 py-2 rounded-xl bg-meezan-btn text-white text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer whitespace-nowrap"
            >
              {language === 'en' ? 'Get Started' : 'مفت شروع کریں'}
            </button>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section id="top" className="relative pt-12 pb-16 lg:pt-16 lg:pb-20 px-4 sm:px-8 overflow-hidden bg-white dark:bg-zinc-950">
        {/* Subtle architectural grid background */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#18181b_1px,transparent_1px),linear-gradient(to_bottom,#18181b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_70%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-45"
        />

        {/* Ambient Floating Emerald & Gold Gradient Shapes */}
        <motion.div
          aria-hidden="true"
          animate={{ y: [0, -16, 0], x: [0, 10, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          className="pointer-events-none absolute -top-20 left-1/4 h-80 w-80 rounded-full bg-emerald-600/12 dark:bg-emerald-500/15 blur-3xl"
        />
        <motion.div
          aria-hidden="true"
          animate={{ y: [0, 18, 0], x: [0, -12, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          className="pointer-events-none absolute top-28 right-10 h-72 w-72 rounded-full bg-[#D4AF37]/15 dark:bg-[#D4AF37]/12 blur-3xl"
        />

        <div className="relative max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center">
          {/* Left Column: Headline, Single Punchy High-Contrast Sentence & Primary CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-6 text-left space-y-6"
          >
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#064E3B] dark:text-[#D4AF37]">
              <span>MeezanFlow Financial Suite</span>
              <span aria-hidden="true">·</span>
              <span>{language === 'en' ? 'Intelligent Business Ledger' : 'پاکستانی کاروبار کے لیے'}</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-extrabold text-slate-900 dark:text-white tracking-tight leading-[1.08] text-balance">
              {language === 'en' ? (
                <>
                  Every Account.{' '}
                  <span className="text-[#064E3B] dark:text-[#10B981] underline decoration-[#D4AF37] decoration-2 underline-offset-8">
                    Perfectly Balanced.
                  </span>
                </>
              ) : (
                <>
                  ہر کھاتا۔{' '}
                  <span className="text-[#064E3B] dark:text-[#D4AF37]">مکمل توازن کے ساتھ۔</span>
                </>
              )}
            </h1>

            {/* Single punchy sentence with larger font size and high contrast */}
            <p className="text-lg sm:text-xl font-semibold text-slate-800 dark:text-zinc-100 leading-relaxed max-w-xl">
              {language === 'en'
                ? 'Manage customer ledgers, automate credit and debit tracking, and send instant WhatsApp statements from one intelligent workspace.'
                : 'ایک ہی جدید پلیٹ فارم سے گاہکوں کے کھاتے، ادھار و وصولی اور واٹس ایپ اسٹیٹمنٹس کو مکمل درستگی کے ساتھ منظم کریں۔'}
            </p>

            {/* Primary & Secondary CTAs */}
            <div className="pt-2 flex flex-wrap items-center gap-3.5">
              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => onOpenAuth('signup')}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-meezan-btn text-white font-bold text-sm sm:text-base shadow-md transition-all cursor-pointer whitespace-nowrap"
              >
                <span>{language === 'en' ? 'Get Started' : 'مفت اکاؤنٹ بنائیں'}</span>
                <ArrowRight className="h-4 w-4" />
              </motion.button>

              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => onOpenAuth('login')}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-900 dark:text-zinc-100 font-bold text-sm sm:text-base transition-all cursor-pointer whitespace-nowrap"
              >
                <span>{language === 'en' ? 'Login to Account' : 'لاگ ان کریں'}</span>
              </motion.button>
            </div>

            {/* Quiet Unboxed Metadata */}
            <div className="pt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-semibold text-slate-600 dark:text-zinc-300">
              <span>{language === 'en' ? 'Cloud-synced ledgers' : 'کلاؤڈ بیک اپ'}</span>
              <span aria-hidden="true">·</span>
              <span>{language === 'en' ? 'WhatsApp PDF statements' : 'واٹس ایپ پی ڈی ایف رپورٹ'}</span>
              <span aria-hidden="true">·</span>
              <span>{language === 'en' ? 'Firebase Authentication' : 'فائر بیس سیکیورٹی'}</span>
            </div>
          </motion.div>

          {/* Right Column: Meezan Flow Promotional Image */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-6"
          >
            <div className="rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl overflow-hidden">
              <img
                src="/assets/aistudio/Shopkeeper_Promoting_Meezan_Flow_Card_b6c05299.png"
                alt="Meezan Flow — Smart Digital Khata & Business Ledger"
                className="w-full h-auto object-cover block"
                loading="eager"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* 4. CONSOLIDATED CORE PLATFORM CAPABILITIES SECTION (3x2 CSS Grid) */}
      <section
        id="features"
        className="py-20 lg:py-24 px-4 sm:px-8 bg-[#FAF9F6] dark:bg-zinc-900/50 border-t border-slate-200/80 dark:border-zinc-800"
      >
        <div className="max-w-7xl mx-auto">
          {/* Section Heading with Smooth Scroll-Triggered Entrance */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.6, ease: smoothEase }}
            className="max-w-2xl text-left mb-12 space-y-3"
          >
            <div className="text-xs font-extrabold uppercase tracking-wider text-[#059669] dark:text-[#D4AF37]">
              {language === 'en' ? 'Core Platform Capabilities' : 'پلیٹ فارم کی بنیادی خصوصیات'}
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight text-balance">
              {language === 'en'
                ? 'Everything you need to run a balanced financial workflow'
                : 'مکمل اور شفاف کاروباری حساب کتاب چلانے کے لیے تمام ضروری فیچرز'}
            </h2>
            <p className="text-sm sm:text-base font-medium text-slate-700 dark:text-zinc-300 leading-relaxed">
              {language === 'en'
                ? 'Purpose-built financial tools that keep your customer receivables, supplier payables, and daily cash drawer accurate.'
                : 'ایسے مالیاتی ٹولز جو آپ کے گاہکوں کے بقایا جات، سپلائرز کی ادائیگیوں اور روزانہ کی نقد رقم کو ہمیشہ درست رکھتے ہیں۔'}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
            {features.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-30px' }}
                  transition={{ duration: 0.6, delay: idx * 0.12, ease: smoothEase }}
                  whileHover={{ y: -4 }}
                  className="interactive-card group bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/90 dark:border-zinc-800 p-6 flex flex-col justify-between hover:border-[#059669]/60 dark:hover:border-[#D4AF37]/50 shadow-2xs cursor-pointer"
                >
                  <div className="space-y-4">
                    <div className="h-11 w-11 rounded-xl bg-emerald-50 dark:bg-zinc-800 group-hover:bg-[#064E3B] dark:group-hover:bg-[#D4AF37]/20 text-[#064E3B] dark:text-emerald-400 group-hover:text-[#D4AF37] flex items-center justify-center transition-colors">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                      {feat.title}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-zinc-300 leading-relaxed">
                      {feat.description}
                    </p>
                  </div>

                  <div className="pt-5 mt-5 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-xs font-bold text-[#064E3B] dark:text-emerald-400">
                    <span>{feat.detail}</span>
                    <ArrowRight className="h-4 w-4 text-[#059669] dark:text-[#D4AF37] group-hover:translate-x-0.5 transition-all" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. MID-PAGE CALL-TO-ACTION BANNER (Right after Features section) */}
      <section className="py-12 sm:py-16 px-4 sm:px-8 bg-white dark:bg-zinc-950">
        <div className="max-w-7xl mx-auto">
          <div className="bg-meezan-header text-white rounded-3xl border border-emerald-700/40 p-8 sm:p-10 lg:p-12 shadow-lg flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-2 text-left max-w-2xl">
              <span className="inline-block text-xs font-extrabold uppercase tracking-wider text-[#D4AF37]">
                {language === 'en' ? 'Start Your Digital Ledger Today' : 'آج ہی اپنا ڈیجیٹل کھاتا شروع کریں'}
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {language === 'en'
                  ? 'Ready to balance your business accounts?'
                  : 'کیا آپ اپنے کاروباری حساب کتاب کو متوازن بنانے کے لیے تیار ہیں؟'}
              </h2>
              <p className="text-sm sm:text-base text-emerald-100 font-medium leading-relaxed">
                {language === 'en'
                  ? 'Join shopkeepers, wholesalers, and business owners managing every rupee with zero paperwork.'
                  : 'ہزاروں دکانداروں اور تاجروں کی طرح اپنے کاروبار کے ہر روپے کا حساب مکمل اعتماد سے رکھیں۔'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => onOpenAuth('signup')}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-[#D4AF37] hover:bg-[#C5A028] text-[#042F24] font-extrabold text-sm sm:text-base shadow-sm transition-all cursor-pointer whitespace-nowrap"
              >
                <span>{language === 'en' ? 'Get Started' : 'مفت اکاؤنٹ بنائیں'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onOpenAuth('login')}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-emerald-500/50 bg-emerald-950/50 hover:bg-emerald-900/60 text-white font-bold text-sm sm:text-base transition-all cursor-pointer whitespace-nowrap"
              >
                <span>{language === 'en' ? 'Login' : 'لاگ ان کریں'}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 6. WORKSPACE INITIALIZATION & HOW IT WORKS (Redesigned to strictly match clean feature card layout) */}
      <section
        id="how-it-works"
        className="py-20 lg:py-24 px-4 sm:px-8 bg-white dark:bg-zinc-900 border-y border-slate-200/80 dark:border-zinc-800"
      >
        <div className="max-w-7xl mx-auto">
          {/* Section Heading with Smooth Scroll-Triggered Entrance */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.6, ease: smoothEase }}
            className="max-w-2xl text-left mb-12 space-y-3"
          >
            <div className="text-xs font-extrabold uppercase tracking-wider text-[#059669] dark:text-[#D4AF37]">
              {language === 'en' ? 'Workspace Initialization & Setup' : 'کاروباری پروفائل اور طریقہ کار'}
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight text-balance">
              {language === 'en'
                ? 'Three simple steps from paper registers to structured digital accounts'
                : 'کاغذی رجسٹر سے جدید ڈیجیٹل کھاتے تک صرف تین آسان مراحل'}
            </h2>
            <p className="text-sm sm:text-base font-medium text-slate-700 dark:text-zinc-300 leading-relaxed">
              {language === 'en'
                ? 'Set up your Workspace Initialization, add customer folders, and start tracking balances in minutes.'
                : 'منٹوں میں اپنا کاروباری پروفائل تیار کریں، گاہک فولڈرز بنائیں اور بقایا جات ٹریک کریں۔'}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
            {workflowSteps.map((step, index) => {
              const StepIcon = step.icon;
              return (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-30px' }}
                  transition={{ duration: 0.6, delay: index * 0.12, ease: smoothEase }}
                  whileHover={{ y: -4 }}
                  className="interactive-card group bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200/90 dark:border-zinc-800 p-6 flex flex-col justify-between hover:border-[#059669]/60 dark:hover:border-[#D4AF37]/50 shadow-2xs cursor-pointer"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="h-11 w-11 rounded-xl bg-emerald-50 dark:bg-zinc-800 group-hover:bg-[#064E3B] dark:group-hover:bg-[#D4AF37]/20 text-[#064E3B] dark:text-emerald-400 group-hover:text-[#D4AF37] flex items-center justify-center transition-colors">
                        <StepIcon className="h-5 w-5" />
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-50 dark:bg-emerald-950/60 text-[#064E3B] dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                        <span>Step {step.number}</span>
                        <span>·</span>
                        <span>{step.badge}</span>
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                      {step.title}
                    </h3>

                    <p className="text-sm text-slate-600 dark:text-zinc-300 leading-relaxed">
                      {step.description}
                    </p>

                    <div className="pt-2 space-y-2">
                      {step.specs.map((spec, sIdx) => (
                        <div
                          key={sIdx}
                          className="px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200/70 dark:border-zinc-800 flex items-center justify-between gap-3 text-xs"
                        >
                          <span className="font-semibold text-slate-500 dark:text-zinc-400">
                            {spec.label}
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white text-right">
                            {spec.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-5 mt-5 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between">
                    <span className="text-xs font-bold text-[#064E3B] dark:text-emerald-400">
                      {step.detail}
                    </span>
                    <button
                      type="button"
                      onClick={() => onOpenAuth('signup')}
                      className="inline-flex items-center gap-1 text-xs font-extrabold text-[#059669] dark:text-[#D4AF37] hover:underline cursor-pointer"
                    >
                      <span>{language === 'en' ? 'Get Started' : 'شروع کریں'}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 7. BENEFITS SECTION */}
      <section id="benefits" className="py-20 lg:py-24 px-4 sm:px-8 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.6, ease: smoothEase }}
          className="max-w-2xl text-left mb-10 space-y-3"
        >
          <div className="text-xs font-extrabold uppercase tracking-wider text-[#059669] dark:text-[#D4AF37]">
            {language === 'en' ? 'Designed for Modern Businesses' : 'پاکستانی کاروباروں کی ضرورت کے مطابق'}
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight text-balance">
            {language === 'en'
              ? 'Built for shopkeepers, wholesalers, small businesses, and independent owners'
              : 'دکانداروں، چھوٹے کاروباروں، ہول سیلرز اور تاجروں کے لیے یکساں مفید'}
          </h2>
          <p className="text-sm sm:text-base font-medium text-slate-700 dark:text-zinc-300 leading-relaxed">
            {language === 'en'
              ? 'Reduce manual bookkeeping overhead, eliminate calculation mistakes, and keep every account statement ready at a moment’s notice.'
              : 'دفتری کاغذی کارروائی کم کریں، حساب کی غلطیوں کا خاتمہ کریں اور ہر گاہک کا کھاتا ہمیشہ تیار رکھیں۔'}
          </p>
        </motion.div>

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
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer border whitespace-nowrap ${
                activeAudience === tab.id
                  ? 'bg-[#064E3B] text-white border-[#064E3B] dark:bg-[#D4AF37] dark:text-[#042F24] dark:border-[#D4AF37] shadow-2xs'
                  : 'bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-800 hover:border-[#059669]/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Selected Audience Benefit Detail + Operational Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch text-left">
          <div className="lg:col-span-7 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/90 dark:border-zinc-800 p-6 sm:p-8 flex flex-col justify-between shadow-2xs">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2.5 text-xs font-extrabold uppercase tracking-wider text-[#059669] dark:text-[#D4AF37]">
                <AudienceIcon className="h-4 w-4" />
                <span>{currentAudience.label}</span>
              </div>

              <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {currentAudience.headline}
              </h3>

              <p className="text-sm text-slate-600 dark:text-zinc-300 leading-relaxed">
                {currentAudience.description}
              </p>

              <div className="space-y-3 pt-2">
                {currentAudience.points.map((pt, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="h-5 w-5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-[#064E3B] dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="h-3 w-3 stroke-[2.5]" />
                    </div>
                    <span className="text-sm text-slate-800 dark:text-zinc-200 font-semibold">
                      {pt}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                {language === 'en' ? 'Ready for desktop & mobile browsers' : 'موبائل اور کمپیوٹر دونوں پر دستیاب'}
              </span>
              <button
                type="button"
                onClick={() => onOpenAuth('signup')}
                className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#059669] dark:text-[#D4AF37] hover:underline cursor-pointer"
              >
                <span>{language === 'en' ? `Start with ${BRAND.name}` : 'اپنا اکاؤنٹ بنائیں'}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Right Column: Manual Bookkeeping vs. MeezanFlow Comparison */}
          <div className="lg:col-span-5 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/90 dark:border-zinc-800 p-6 sm:p-8 flex flex-col justify-between shadow-2xs">
            <div className="space-y-4">
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                {language === 'en'
                  ? 'Why businesses switch from paper registers'
                  : `کاغذی رجسٹر کے مقابلے میں ${BRAND.name} کے فوائد`}
              </h3>

              <div className="divide-y divide-slate-200/70 dark:divide-zinc-800 text-xs sm:text-sm">
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
                    <div className="font-extrabold text-slate-900 dark:text-white">{cmp.aspect}</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-slate-500 dark:text-zinc-400">
                        <span className="block text-[10px] uppercase font-bold text-slate-400">
                          {language === 'en' ? 'Paper Register' : 'کاغذی رجسٹر'}
                        </span>
                        {cmp.manual}
                      </div>
                      <div className="text-[#064E3B] dark:text-emerald-400 font-bold">
                        <span className="block text-[10px] uppercase font-extrabold text-[#059669] dark:text-[#D4AF37]">
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

      {/* 8. FAQ SECTION */}
      <section
        id="faq"
        className="py-20 lg:py-24 px-4 sm:px-8 bg-[#FAF9F6] dark:bg-zinc-900 border-t border-slate-200/80 dark:border-zinc-800"
      >
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.6, ease: smoothEase }}
            className="text-left mb-10 space-y-3"
          >
            <div className="text-xs font-extrabold uppercase tracking-wider text-[#059669] dark:text-[#D4AF37]">
              {language === 'en' ? 'Frequently Asked Questions' : 'عام پوچھے جانے والے سوالات'}
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {language === 'en'
                ? `Answers to common questions about ${BRAND.name}`
                : `${BRAND.name} کے بارے میں اہم سوالات کے جوابات`}
            </h2>
          </motion.div>

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
                    <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white group-hover:text-[#059669] dark:group-hover:text-[#D4AF37] transition-colors">
                      {item.q}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-[#059669] dark:text-[#D4AF37]' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <p className="pt-2 pb-3 text-sm text-slate-700 dark:text-zinc-300 leading-relaxed max-w-3xl">
                      {item.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 9. SUPPORT, HELPLINES & CONTACT SECTION (Smooth Scroll Entrance & Micro-Interactions) */}
      <section
        id="support"
        className="py-20 lg:py-24 px-4 sm:px-8 bg-white dark:bg-zinc-950 border-t border-slate-200/80 dark:border-zinc-800"
      >
        <div className="max-w-7xl mx-auto space-y-16">
          {/* Section Main Header with Smooth Fade-up */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.6, ease: smoothEase }}
            className="max-w-2xl text-left space-y-3"
          >
            <div className="text-xs font-extrabold uppercase tracking-wider text-[#059669] dark:text-[#D4AF37]">
              {language === 'en' ? 'Support & Help Desk' : 'ہیلپ ڈیسک و رابطہ'}
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight text-balance">
              {language === 'en'
                ? 'We are here to support your business every step of the way'
                : 'ہم آپ کے کاروباری سفر کے ہر قدم پر آپ کی رہنمائی کے لیے حاضر ہیں'}
            </h2>
            <p className="text-sm sm:text-base font-medium text-slate-700 dark:text-zinc-300 leading-relaxed">
              {language === 'en'
                ? 'Reach our dedicated merchant assistance team via direct hotlines, WhatsApp, verified office addresses, or send us a message below.'
                : 'کسی بھی رہنمائی کے لیے ہمارے ہیلپ لائن نمبرز، واٹس ایپ، تصدیق شدہ دفتری پتہ پر رابطہ کریں یا نیچے پیغام ارسال کریں۔'}
            </p>
          </motion.div>

          {/* 1. HELPLINES SECTION */}
          <div className="space-y-6 text-left">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.6, ease: smoothEase }}
              className="flex items-center gap-2.5"
            >
              <div className="h-2 w-2 rounded-full bg-[#059669]" />
              <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-widest text-[#064E3B] dark:text-[#D4AF37]">
                HELPLINES
              </h3>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  title: language === 'en' ? 'Toll-Free Merchant Helpline' : 'ٹول فری مرچنٹ ہیلپ لائن',
                  number: '0800-MEEZAN (0800-633926)',
                  timing: language === 'en' ? 'Mon – Sat: 9:00 AM – 9:00 PM' : 'پیر تا ہفتہ: صبح 9 تا رات 9 بجے',
                  badge: language === 'en' ? 'Toll-Free' : 'مفت کال',
                  icon: Phone
                },
                {
                  title: language === 'en' ? 'Direct Mobile Helpline' : 'ڈائریکٹ موبائل ہیلپ لائن',
                  number: '+92 300 848 3333',
                  timing: language === 'en' ? '24/7 Priority Support' : '24/7 فوری رابطہ سروس',
                  badge: language === 'en' ? 'Direct Line' : 'موبائل لائن',
                  icon: Phone
                },
                {
                  title: language === 'en' ? 'Urdu & Regional Language Desk' : 'اردو و علاقائی زبانوں کی ہیلپ لائن',
                  number: '+92 42 3578 9900',
                  timing: language === 'en' ? 'Mon – Fri: 9:00 AM – 6:00 PM' : 'پیر تا جمعہ: صبح 9 تا شام 6 بجے',
                  badge: language === 'en' ? 'Regional Support' : 'علاقائی رہنمائی',
                  icon: Globe
                }
              ].map((item, idx) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-30px' }}
                    transition={{
                      duration: 0.6,
                      delay: idx * 0.12,
                      ease: smoothEase
                    }}
                    whileHover={{ y: -4 }}
                    className="interactive-card bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/90 dark:border-zinc-800 p-6 flex flex-col justify-between shadow-2xs cursor-pointer group"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="h-11 w-11 rounded-xl bg-emerald-50 dark:bg-zinc-800 text-[#064E3B] dark:text-emerald-400 group-hover:bg-[#064E3B] group-hover:text-[#D4AF37] dark:group-hover:bg-[#D4AF37]/20 flex items-center justify-center transition-colors">
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100/70 dark:bg-emerald-950/70 text-[#064E3B] dark:text-emerald-300">
                          {item.badge}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-600 dark:text-zinc-400">
                          {item.title}
                        </h4>
                        <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-1 font-mono tracking-tight">
                          {item.number}
                        </p>
                      </div>
                    </div>
                    <div className="pt-4 mt-4 border-t border-slate-100 dark:border-zinc-800 text-xs font-semibold text-slate-500 dark:text-zinc-400">
                      {item.timing}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* 2. OTHER CHANNELS SECTION */}
          <div className="space-y-6 text-left">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.6, ease: smoothEase }}
              className="flex items-center gap-2.5"
            >
              <div className="h-2 w-2 rounded-full bg-[#059669]" />
              <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-widest text-[#064E3B] dark:text-[#D4AF37]">
                OTHER CHANNELS
              </h3>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  title: language === 'en' ? 'Official WhatsApp Business' : 'آفیشل واٹس ایپ بزنس',
                  detail: '+92 300 848 3333',
                  actionText: language === 'en' ? 'Chat on WhatsApp' : 'واٹس ایپ پر میسج کریں',
                  url: 'https://wa.me/923008483333',
                  icon: Users,
                  hint: language === 'en' ? 'Instant voice & text support' : 'فوری ٹیکسٹ و وائس سپورٹ'
                },
                {
                  title: language === 'en' ? 'Email Support & Billing' : 'ای میل سپورٹ و بلنگ',
                  detail: 'support@meezanflow.com',
                  actionText: language === 'en' ? 'Send Email' : 'ای میل بھیجیں',
                  url: 'mailto:support@meezanflow.com',
                  icon: Mail,
                  hint: language === 'en' ? 'Typical reply within 2 hours' : '2 گھنٹے کے اندر تسلی بخش جواب'
                },
                {
                  title: language === 'en' ? 'Merchant Community & FAQ' : 'مرچنٹ فورم و رہنمائی',
                  detail: 'community.meezanflow.com',
                  actionText: language === 'en' ? 'Explore Guides' : 'رہنمائی گائیڈز دیکھیں',
                  url: '#faq',
                  icon: HelpCircle,
                  hint: language === 'en' ? 'Interactive tutorials & docs' : 'رہنما ویڈیوز اور مضامین'
                }
              ].map((channel, idx) => {
                const Icon = channel.icon;
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-30px' }}
                    transition={{
                      duration: 0.6,
                      delay: idx * 0.12,
                      ease: smoothEase
                    }}
                    whileHover={{ y: -4 }}
                    className="interactive-card bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/90 dark:border-zinc-800 p-6 flex flex-col justify-between shadow-2xs cursor-pointer group"
                  >
                    <div className="space-y-4">
                      <div className="h-11 w-11 rounded-xl bg-emerald-50 dark:bg-zinc-800 text-[#064E3B] dark:text-emerald-400 group-hover:bg-[#064E3B] group-hover:text-[#D4AF37] dark:group-hover:bg-[#D4AF37]/20 flex items-center justify-center transition-colors">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-600 dark:text-zinc-400">
                          {channel.title}
                        </h4>
                        <p className="text-base font-extrabold text-slate-900 dark:text-white mt-1 break-all">
                          {channel.detail}
                        </p>
                      </div>
                    </div>
                    <div className="pt-4 mt-4 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-500 dark:text-zinc-400">
                        {channel.hint}
                      </span>
                      <span className="font-extrabold text-[#059669] dark:text-[#D4AF37] group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                        <span>{channel.actionText}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* 3. REGULATORY ESCALATION SECTION */}
          <div className="space-y-6 text-left">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.6, ease: smoothEase }}
              className="flex items-center gap-2.5"
            >
              <div className="h-2 w-2 rounded-full bg-[#059669]" />
              <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-widest text-[#064E3B] dark:text-[#D4AF37]">
                REGULATORY ESCALATION
              </h3>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ duration: 0.6, ease: smoothEase }}
              className="bg-slate-50 dark:bg-zinc-900/60 rounded-2xl border border-slate-200/90 dark:border-zinc-800 p-6 sm:p-8"
            >
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                <div className="md:col-span-8 space-y-3">
                  <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#064E3B] dark:text-[#D4AF37]">
                    <Shield className="h-4 w-4" />
                    <span>Compliance & Grievance Redressal</span>
                  </div>
                  <h4 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                    {language === 'en'
                      ? 'Enterprise Dispute Resolution & Escalation Cell'
                      : 'شکایات ازالہ و قانونی ریگولیٹری رہنمائی'}
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-zinc-300 leading-relaxed">
                    {language === 'en'
                      ? 'If your inquiry remains unresolved after 48 business hours via standard channels, your ticket is automatically forwarded to the MeezanFlow Escalation Committee under ticket reference ID.'
                      : 'اگر آپ کی شکایت کا 48 گھنٹوں میں حل نہ ہو سکے تو معاملہ خودکار طور پر ہماری اعلیٰ ریگولیٹری کمیٹی کو منتقل کر دیا جاتا ہے۔'}
                  </p>
                </div>
                <div className="md:col-span-4 bg-white dark:bg-zinc-900 rounded-xl p-4 border border-slate-200 dark:border-zinc-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-500 dark:text-zinc-400">Escalation Email:</span>
                    <span className="font-bold text-[#059669] dark:text-[#D4AF37]">grievance@meezanflow.com</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-500 dark:text-zinc-400">Response SLA:</span>
                    <span className="font-bold text-slate-900 dark:text-white">Within 24 Hours</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-500 dark:text-zinc-400">Escalation Officer:</span>
                    <span className="font-bold text-slate-900 dark:text-white">M. Nouman (Chief Ops)</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* 4. OFFICE & LOCATION SECTION */}
          <div className="space-y-6 text-left">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.6, ease: smoothEase }}
              className="flex items-center gap-2.5"
            >
              <div className="h-2 w-2 rounded-full bg-[#059669]" />
              <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-widest text-[#064E3B] dark:text-[#D4AF37]">
                OFFICE & LOCATION
              </h3>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {
                  city: language === 'en' ? 'Lahore Operations Head Office' : 'لاہور ہیڈ آفس',
                  address: 'Level 4, Arfa Software Technology Park, Ferozepur Road, Lahore, Pakistan',
                  contact: '+92 42 3578 9900',
                  timing: 'Mon – Sat: 9:00 AM – 6:00 PM',
                  badge: 'Principal Office'
                },
                {
                  city: language === 'en' ? 'Karachi Regional Hub' : 'کراچی ریجنل آفس',
                  address: 'Suite 203, Finance & Trade Centre (FTC), Main Shahrah-e-Faisal, Karachi, Pakistan',
                  contact: '+92 21 3456 7890',
                  timing: 'Mon – Fri: 9:00 AM – 5:30 PM',
                  badge: 'Regional Hub'
                }
              ].map((office, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-30px' }}
                  transition={{
                    duration: 0.6,
                    delay: idx * 0.12,
                    ease: smoothEase
                  }}
                  whileHover={{ y: -4 }}
                  className="interactive-card bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/90 dark:border-zinc-800 p-6 sm:p-7 flex flex-col justify-between shadow-2xs group"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="h-11 w-11 rounded-xl bg-emerald-50 dark:bg-zinc-800 text-[#064E3B] dark:text-emerald-400 group-hover:bg-[#064E3B] group-hover:text-[#D4AF37] dark:group-hover:bg-[#D4AF37]/20 flex items-center justify-center transition-colors">
                        <MapPin className="h-5 w-5" />
                      </div>
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100/70 dark:bg-emerald-950/70 text-[#064E3B] dark:text-emerald-300">
                        {office.badge}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                        {office.city}
                      </h4>
                      <p className="text-sm text-slate-600 dark:text-zinc-300 mt-2 leading-relaxed">
                        {office.address}
                      </p>
                    </div>
                  </div>
                  <div className="pt-4 mt-4 border-t border-slate-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-mono font-bold text-[#059669] dark:text-[#D4AF37]">
                      {office.contact}
                    </span>
                    <span className="text-slate-500 dark:text-zinc-400 font-medium">
                      {office.timing}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* 5. SEND US A MESSAGE SECTION */}
          <div className="space-y-6 text-left">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.6, ease: smoothEase }}
              className="flex items-center gap-2.5"
            >
              <div className="h-2 w-2 rounded-full bg-[#059669]" />
              <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-widest text-[#064E3B] dark:text-[#D4AF37]">
                SEND US A MESSAGE
              </h3>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ duration: 0.6, ease: smoothEase }}
              className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200/90 dark:border-zinc-800 p-6 sm:p-10 shadow-sm"
            >
              <form onSubmit={handleSendMessage} className="space-y-5 max-w-3xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider">
                      {language === 'en' ? 'Your Name' : 'آپ کا نام'} *
                    </label>
                    <input
                      type="text"
                      required
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder={language === 'en' ? 'e.g. Tariq Mehmood' : 'مثال: طارق محمود'}
                      className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-white transition-all focus:border-[#059669]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider">
                      {language === 'en' ? 'Email or Mobile Number' : 'ای میل یا موبائل نمبر'} *
                    </label>
                    <input
                      type="text"
                      required
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder={language === 'en' ? 'e.g. 0300-1234567 or you@gmail.com' : 'مثال: 03001234567'}
                      className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-white transition-all focus:border-[#059669]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider">
                    {language === 'en' ? 'Subject / Inquiry Category' : 'موضوع / سوال کی قسم'}
                  </label>
                  <input
                    type="text"
                    value={contactSubject}
                    onChange={(e) => setContactSubject(e.target.value)}
                    placeholder={language === 'en' ? 'e.g. Customer Ledger Sync or Billing' : 'مثال: کھاتا سنک یا بلنگ'}
                    className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-white transition-all focus:border-[#059669]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider">
                    {language === 'en' ? 'Your Message' : 'آپ کا پیغام'} *
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    placeholder={
                      language === 'en'
                        ? 'Describe how we can assist your business...'
                        : 'ہمیں تفصیل سے بتائیں ہم آپ کے کاروبار کی کیسے مدد کر سکتے ہیں...'
                    }
                    className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-white transition-all focus:border-[#059669] resize-none"
                  />
                </div>

                <div className="pt-2 flex flex-wrap items-center justify-between gap-4">
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    whileHover={{ y: -2 }}
                    type="submit"
                    disabled={isSubmittingMessage}
                    className="relative overflow-hidden inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl bg-meezan-btn text-white text-sm font-extrabold shadow-md cursor-pointer transition-all disabled:opacity-50"
                  >
                    <span>
                      {isSubmittingMessage
                        ? language === 'en'
                          ? 'Sending Message...'
                          : 'پیغام بھیجا جا رہا ہے...'
                        : language === 'en'
                        ? 'Send Message'
                        : 'پیغام بھیجیں'}
                    </span>
                    <Send className="h-4 w-4" />
                  </motion.button>

                  {messageSuccess && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="inline-flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-3.5 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800/60"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>
                        {language === 'en'
                          ? 'Thank you! Your message has been received. Our team will contact you shortly.'
                          : 'شکریہ! آپ کا پیغام موصول ہو چکا ہے۔ ہماری ٹیم جلد رابطہ کرے گی۔'}
                      </span>
                    </motion.div>
                  )}
                </div>
              </form>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 9. SITE DIRECTORY & LEGAL LINKS (Dark Theme Visual Anchor) */}
      <section
        aria-label="Site directory"
        className="bg-[#042F24] border-t border-white/10 py-14 px-4 sm:px-8 text-left"
      >
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-10">
          {/* Brand Column */}
          <div className="md:col-span-5 space-y-3.5">
            <div className="flex items-center gap-2.5">
              <MeezanFlowLogo size="sm" />
              <span className="text-lg font-extrabold tracking-tight text-white">
                {BRAND.name}
              </span>
            </div>
            <p className="text-sm font-bold text-emerald-400">
              {BRAND.getTagline(language)}
            </p>
            <p className="text-sm text-gray-300 max-w-sm leading-relaxed font-medium">
              {language === 'en'
                ? 'Modern business accounting, customer credit folders, cash book management, and invoicing for small businesses, shopkeepers, and wholesalers.'
                : 'پاکستان بھر کے کاروباروں، دکانداروں اور ہول سیلرز کے لیے جدید اکاؤنٹنگ، ادھار ٹریکنگ، کیش بک اور انوائس مینجمنٹ سسٹم۔'}
            </p>
          </div>

          {/* Product Navigation */}
          <div className="md:col-span-3 space-y-3.5">
            <div className="text-sm font-extrabold uppercase tracking-wider text-white">
              {language === 'en' ? 'Product' : 'پروڈکٹ'}
            </div>
            <ul className="space-y-2.5 text-sm sm:text-base font-medium text-gray-300">
              <li>
                <button
                  type="button"
                  onClick={() => scrollToSection('features')}
                  className="text-gray-300 hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  {language === 'en' ? 'Features' : 'خصوصیات'}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => scrollToSection('how-it-works')}
                  className="text-gray-300 hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  {language === 'en' ? 'How It Works' : 'طریقہ کار'}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => scrollToSection('benefits')}
                  className="text-gray-300 hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  {language === 'en' ? 'Benefits' : 'فوائد'}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => scrollToSection('faq')}
                  className="text-gray-300 hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  {language === 'en' ? 'FAQ' : 'عام سوالات'}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => scrollToSection('support')}
                  className="text-gray-300 hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  {language === 'en' ? 'Support & Helplines' : 'مدد و ہیلپ لائن'}
                </button>
              </li>
            </ul>
          </div>

          {/* Account & Legal */}
          <div className="md:col-span-4 space-y-3.5">
            <div className="text-sm font-extrabold uppercase tracking-wider text-white">
              {language === 'en' ? 'Account & Legal' : 'اکاؤنٹ اور قانونی معلومات'}
            </div>
            <ul className="space-y-2.5 text-sm sm:text-base font-medium text-gray-300">
              <li>
                <button
                  type="button"
                  onClick={() => onOpenAuth('login')}
                  className="text-gray-300 hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  {language === 'en' ? 'Merchant Login' : 'مرچنٹ لاگ ان'}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenAuth('signup')}
                  className="text-gray-300 hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  {language === 'en' ? 'Create Free Account' : 'مفت اکاؤنٹ بنائیں'}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setLegalModal('privacy')}
                  className="text-gray-300 hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  {language === 'en' ? 'Privacy Policy' : 'پرائیویسی پالیسی'}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setLegalModal('terms')}
                  className="text-gray-300 hover:text-emerald-400 transition-colors cursor-pointer"
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
                className="px-5 py-2.5 rounded-xl bg-meezan-btn text-white text-xs font-bold cursor-pointer"
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
