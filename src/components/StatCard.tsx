'use client';

import React from 'react';
import { formatCurrency, formatPercent } from '@/lib/calculations';

interface StatCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon?: string;
    variant?: 'default' | 'success' | 'danger' | 'warning' | 'info';
    isPercentage?: boolean;
    isCurrency?: boolean;
}

export default function StatCard({
    title,
    value,
    subtitle,
    icon,
    variant = 'default',
    isPercentage = false,
    isCurrency = false,
}: StatCardProps) {
    const numValue = typeof value === 'number' ? value : parseFloat(value);

    const variantStyles = {
        default: 'bg-gray-800 border-gray-700',
        success: 'bg-emerald-900/30 border-emerald-700',
        danger: 'bg-red-900/30 border-red-700',
        warning: 'bg-yellow-900/30 border-yellow-700',
        info: 'bg-blue-900/30 border-blue-700',
    };

    const valueColor = isPercentage
        ? numValue >= 0
            ? 'text-emerald-400'
            : 'text-red-400'
        : 'text-white';

    const displayValue = isCurrency
        ? formatCurrency(numValue)
        : isPercentage
            ? formatPercent(numValue)
            : value;

    return (
        <div className={`rounded-xl border p-4 ${variantStyles[variant]}`}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-gray-400 text-sm font-medium">{title}</p>
                    <p className={`text-2xl font-bold mt-1 ${valueColor}`}>{displayValue}</p>
                    {subtitle && (
                        <p className="text-gray-500 text-xs mt-1">{subtitle}</p>
                    )}
                </div>
                {icon && <span className="text-2xl">{icon}</span>}
            </div>
        </div>
    );
}
