'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore, MainTab } from '@/store/appStore';

const mainTabs: { id: MainTab; name: string; icon: string; description: string; path: string }[] = [
    {
        id: 'etf-shop',
        name: 'ETF Shop',
        icon: '📊',
        description: '20 DMA Strategy with LIFO',
        path: '/',
    },
    {
        id: 'orb-tester',
        name: 'ORB Tester',
        icon: '🎯',
        description: '15-Min Opening Range Breakout',
        path: '/orb',
    },
    {
        id: 'weekly-strategy',
        name: 'Weekly Strategy',
        icon: '📅',
        description: 'BTC/USDT Weekly Trend Following',
        path: '/orb/weekly',
    },
];

export default function MainTabSwitcher() {
    const router = useRouter();
    const { activeMainTab, setActiveMainTab } = useAppStore();

    const handleTabClick = (tab: { id: MainTab; name: string; icon: string; description: string; path: string }) => {
        setActiveMainTab(tab.id);
        router.push(tab.path);
    };

    return (
        <div className="bg-gray-900/95 border-b border-gray-800">
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex gap-2">
                    {mainTabs.map((tab) => {
                        const isActive = activeMainTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => handleTabClick(tab)}
                                className={`flex items-center gap-3 px-6 py-3 transition-all relative ${isActive
                                    ? 'text-white'
                                    : 'text-gray-400 hover:text-gray-200'
                                    }`}
                            >
                                {/* Icon */}
                                <span className="text-xl">{tab.icon}</span>

                                {/* Text */}
                                <div className="text-left">
                                    <div className="font-bold text-sm">{tab.name}</div>
                                    <div className="text-xs opacity-75">{tab.description}</div>
                                </div>

                                {/* Active indicator */}
                                {isActive && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-blue-500" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
