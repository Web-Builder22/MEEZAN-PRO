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
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xs min-w-0 overflow-hidden">
        <div className="flex items-center justify-between gap-2 mb-4">
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-zinc-100 truncate">
            {lang === 'en' ? 'Cash Flow & Sales Trend' : 'کل آمدنی اور اخراجات کا گراف'}
          </h3>
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 shrink-0">
            {lang === 'en' ? '7-Day View' : '7 دن کا خلاصہ'}
          </span>
        </div>
        <div className="h-[220px] sm:h-[250px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0B192C" stopOpacity={0.22}/>
                  <stop offset="95%" stopColor="#0B192C" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.18}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:hidden" />
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" className="hidden dark:block" />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#0B192C', 
                  borderRadius: '12px', 
                  border: '1px solid rgba(212, 175, 55, 0.35)',
                  color: '#fff',
                  fontSize: '12px'
                }} 
              />
              <Legend verticalAlign="top" height={32} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
              <Area type="monotone" name={lang === 'en' ? 'Sales / Cash-In' : 'آمدنی / کیش ان'} dataKey="sales" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
              <Area type="monotone" name={lang === 'en' ? 'Expenses / Cash-Out' : 'اخراجات'} dataKey="expenses" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorExpenses)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Net Profit Analysis */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xs min-w-0 overflow-hidden">
        <div className="flex items-center justify-between gap-2 mb-4">
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-zinc-100 truncate">
            {lang === 'en' ? 'Daily Net Profit (PKR)' : 'روزانہ کا خالص موازنہ منافع'}
          </h3>
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-[#D4AF37]/15 text-[#9A7B1C] dark:text-[#D4AF37] shrink-0">
            {lang === 'en' ? 'Net Margin' : 'خالص منافع'}
          </span>
        </div>
        <div className="h-[220px] sm:h-[250px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:hidden" />
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" className="hidden dark:block" />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
              <Tooltip
                contentStyle={{ 
                  backgroundColor: '#0B192C', 
                  borderRadius: '12px', 
                  border: '1px solid rgba(212, 175, 55, 0.35)',
                  color: '#fff',
                  fontSize: '12px'
                }} 
              />
              <Legend verticalAlign="top" height={32} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
              <Bar 
                name={lang === 'en' ? 'Net Profit' : 'خالص منافع'}
                dataKey="profit" 
                fill="#D4AF37" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
