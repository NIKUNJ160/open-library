import React from 'react';
import { Calendar } from 'lucide-react';

interface DateGroupSectionProps {
  title: string;
  count: number;
  children: React.ReactNode;
}

export const DateGroupSection: React.FC<DateGroupSectionProps> = ({ title, count, children }) => {
  return (
    <section className="mb-10">
      <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200">
        <Calendar className="w-5 h-5 text-brand-600" />
        <h2 className="text-xl font-bold text-slate-800 tracking-tight">{title}</h2>
        <span className="ml-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
          {count} {count === 1 ? 'Album' : 'Albums'}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {children}
      </div>
    </section>
  );
};
