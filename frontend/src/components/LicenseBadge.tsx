import React from 'react';
import { ShieldCheck, Scale, AlertCircle } from 'lucide-react';

interface LicenseBadgeProps {
  license: string;
  className?: string;
}

export const LicenseBadge: React.FC<LicenseBadgeProps> = ({ license, className = '' }) => {
  const normLicense = (license || '').toLowerCase();

  let badgeColor = 'bg-slate-100 text-slate-700 border-slate-300';
  let Icon = Scale;

  if (normLicense.includes('cc0') || normLicense.includes('public domain')) {
    badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-300';
    Icon = ShieldCheck;
  } else if (normLicense.includes('cc-by') || normLicense.includes('cc by')) {
    badgeColor = 'bg-blue-50 text-blue-700 border-blue-300';
    Icon = Scale;
  } else if (normLicense.includes('all rights')) {
    badgeColor = 'bg-amber-50 text-amber-700 border-amber-300';
    Icon = AlertCircle;
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${badgeColor} ${className}`}
      title={`License: ${license}`}
    >
      <Icon className="w-3.5 h-3.5" />
      <span>{license || 'Public Domain'}</span>
    </span>
  );
};
