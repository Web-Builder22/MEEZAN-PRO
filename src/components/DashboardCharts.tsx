import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';

interface AnalyticsData {
  weeklyData: { date: string; sales: number; expenses: number; profit: number }[];
  categoryStats: { name: string; value: number }[];
}

interface DashboardChartsProps {
  analytics: AnalyticsData | null;
  lang: 'en' | 'ur';
}

export default function DashboardCharts({ analytics, lang }: DashboardChartsProps) {
  const chartData = analytics?.weeklyData || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      {/* Sales vs Expenses Trend */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-2xs min-w-0 overflow-hidden">
        <div className="flex items-center justify-between gap-2 mb-4">
          <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-zinc-100 truncate">
            {lang === 'en' ? 'Cash Flow & Sales Trend' : 'کل آمدنی اور اخراجات کا گراف'}
          </h3>
          <span className="text-[11px] font-mono font-semibold text-emerald-800 dark:text-emerald-400 shrink-0">
            {lang === 'en' ? '7-Day View' : '7 دن کا خلاصہ'}
          </span>
        </div>
        <div className="h-[220px] sm:h-[250px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.24} />
                  <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:hidden" />
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" className="hidden dark:block" />
              <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#042F24',
                  borderRadius: '12px',
                  border: '1px solid rgba(212, 175, 55, 0.45)',
                  color: '#fff',
                  fontSize: '12px'
                }}
              />
              <Legend verticalAlign="top" height={32} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 700 }} />
              <Area
                type="monotone"
                name={lang === 'en' ? 'Sales / Cash-In' : 'آمدنی / کیش ان'}
                dataKey="sales"
                stroke="#059669"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorSales)"
              />
              <Area
                type="monotone"
                name={lang === 'en' ? 'Expenses / Cash-Out' : 'اخراجات'}
                dataKey="expenses"
                stroke="#D4AF37"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorExpenses)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Net Profit Analysis */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-2xs min-w-0 overflow-hidden">
        <div className="flex items-center justify-between gap-2 mb-4">
          <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-zinc-100 truncate">
            {lang === 'en' ? 'Daily Net Profit (Rs)' : 'روزانہ کا خالص موازنہ منافع'}
          </h3>
          <span className="text-[11px] font-mono font-semibold text-[#B48A1E] dark:text-[#D4AF37] shrink-0">
            {lang === 'en' ? 'Net Margin' : 'خالص منافع'}
          </span>
        </div>
        <div className="h-[220px] sm:h-[250px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:hidden" />
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" className="hidden dark:block" />
              <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#042F24',
                  borderRadius: '12px',
                  border: '1px solid rgba(212, 175, 55, 0.45)',
                  color: '#fff',
                  fontSize: '12px'
                }}
              />
              <Legend verticalAlign="top" height={32} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 700 }} />
              <Bar
                name={lang === 'en' ? 'Net Profit' : 'خالص منافع'}
                dataKey="profit"
                fill="#065F46"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
