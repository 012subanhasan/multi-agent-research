'use client';

import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { BarChart3, PieChart as PieIcon, TrendingUp } from 'lucide-react';

interface ChartDataItem {
  label: string;
  value: number;
}

interface ChartSpec {
  title: string;
  type: string; // 'bar' | 'line' | 'pie'
  data: ChartDataItem[];
}

interface ChartsViewProps {
  charts: ChartSpec[];
}

const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#3b82f6', '#10b981', '#f59e0b'];

export const ChartsView: React.FC<ChartsViewProps> = ({ charts }) => {
  if (!charts || charts.length === 0) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-6">
      {charts.map((chart, idx) => {
        const type = chart.type ? chart.type.toLowerCase() : 'bar';

        return (
          <div
            key={idx}
            className="glass-panel p-5 rounded-2xl border border-slate-800/80 shadow-lg flex flex-col justify-between"
          >
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
              {type === 'pie' ? (
                <PieIcon className="w-5 h-5 text-purple-400" />
              ) : type === 'line' ? (
                <TrendingUp className="w-5 h-5 text-pink-400" />
              ) : (
                <BarChart3 className="w-5 h-5 text-indigo-400" />
              )}
              <h4 className="text-sm font-semibold text-slate-200">{chart.title}</h4>
            </div>

            {/* Chart Area */}
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                {type === 'pie' ? (
                  <PieChart>
                    <Pie
                      data={chart.data}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      nameKey="label"
                    >
                      {chart.data.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '8px',
                        color: '#f8fafc',
                      }}
                    />
                    <Legend wrapperStyle={{ color: '#94a3b8', fontSize: '12px' }} />
                  </PieChart>
                ) : type === 'line' ? (
                  <LineChart data={chart.data} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '8px',
                        color: '#f8fafc',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#ec4899"
                      strokeWidth={3}
                      dot={{ fill: '#a855f7', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                ) : (
                  <BarChart data={chart.data} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '8px',
                        color: '#f8fafc',
                      }}
                    />
                    <Bar dataKey="value" fill="#6366f1" radius={[6, 6, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        );
      })}
    </div>
  );
};