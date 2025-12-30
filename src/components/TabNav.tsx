'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
    { name: 'Strategy', path: '/', icon: '📋' },
    { name: 'ETFs List', path: '/etfs', icon: '📈' },
    { name: 'Holdings', path: '/holdings', icon: '💰' },
    { name: 'Trades', path: '/trades', icon: '✅' },
    { name: 'Capital', path: '/capital', icon: '🏦' },
    { name: 'XIRR', path: '/xirr', icon: '📊' },
    { name: 'SIP', path: '/sip', icon: '📅' },
];

export default function TabNav() {
    const pathname = usePathname();

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 z-50">
            <div className="max-w-7xl mx-auto">
                <div className="flex overflow-x-auto scrollbar-hide">
                    {tabs.map((tab) => {
                        const isActive = pathname === tab.path;
                        return (
                            <Link
                                key={tab.path}
                                href={tab.path}
                                className={`flex flex-col items-center justify-center min-w-[80px] py-2 px-3 transition-all ${isActive
                                        ? 'text-emerald-400 bg-gray-800'
                                        : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                                    }`}
                            >
                                <span className="text-lg mb-0.5">{tab.icon}</span>
                                <span className="text-xs font-medium whitespace-nowrap">{tab.name}</span>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </nav>
    );
}
