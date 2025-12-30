'use client';

import React, { useState } from 'react';

interface Column<T> {
    key: keyof T | string;
    header: string;
    render?: (row: T, index: number) => React.ReactNode;
    sortable?: boolean;
    className?: string;
}

interface DataTableProps<T> {
    columns: Column<T>[];
    data: T[];
    keyField: keyof T;
    onRowClick?: (row: T) => void;
    emptyMessage?: string;
    isLoading?: boolean;
}

export default function DataTable<T>({
    columns,
    data,
    keyField,
    onRowClick,
    emptyMessage = 'No data available',
    isLoading = false,
}: DataTableProps<T>) {
    const [sortColumn, setSortColumn] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    const handleSort = (column: Column<T>) => {
        if (!column.sortable) return;

        const key = String(column.key);
        if (sortColumn === key) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(key);
            setSortDirection('asc');
        }
    };

    const sortedData = [...data].sort((a, b) => {
        if (!sortColumn) return 0;

        const aVal = (a as any)[sortColumn];
        const bVal = (b as any)[sortColumn];

        if (typeof aVal === 'number' && typeof bVal === 'number') {
            return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        }

        const aStr = String(aVal || '');
        const bStr = String(bVal || '');
        return sortDirection === 'asc'
            ? aStr.localeCompare(bStr)
            : bStr.localeCompare(aStr);
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="text-center py-12 text-gray-400">
                <p>{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className="border-b border-gray-700">
                        {columns.map((column) => (
                            <th
                                key={String(column.key)}
                                onClick={() => handleSort(column)}
                                className={`px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider ${column.sortable ? 'cursor-pointer hover:text-gray-200' : ''
                                    } ${column.className || ''}`}
                            >
                                <div className="flex items-center gap-1">
                                    {column.header}
                                    {column.sortable && sortColumn === String(column.key) && (
                                        <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                                    )}
                                </div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                    {sortedData.map((row, rowIndex) => (
                        <tr
                            key={String(row[keyField])}
                            onClick={() => onRowClick?.(row)}
                            className={`${onRowClick ? 'cursor-pointer hover:bg-gray-800/50' : ''
                                } transition-colors`}
                        >
                            {columns.map((column) => (
                                <td
                                    key={String(column.key)}
                                    className={`px-4 py-3 text-sm text-gray-200 ${column.className || ''}`}
                                >
                                    {column.render
                                        ? column.render(row, rowIndex)
                                        : String(row[column.key as keyof T] ?? '')}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
