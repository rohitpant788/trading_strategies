// Global app state for managing main tabs and navigation
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type MainTab = 'etf-shop' | 'orb-tester' | 'weekly-strategy';

interface AppState {
    // Main tab state
    activeMainTab: MainTab;
    setActiveMainTab: (tab: MainTab) => void;

    // ETF Shop sub-tab
    activeEtfTab: string;
    setActiveEtfTab: (tab: string) => void;

    // ORB Tester sub-tab
    activeOrbTab: string;
    setActiveOrbTab: (tab: string) => void;

    // Weekly Strategy sub-tab
    activeWeeklyTab: string;
    setActiveWeeklyTab: (tab: string) => void;
}

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            // Initial state
            activeMainTab: 'etf-shop',
            activeEtfTab: '/',
            activeOrbTab: '/orb',
            activeWeeklyTab: '/orb/weekly',

            // Actions
            setActiveMainTab: (tab) => set({ activeMainTab: tab }),
            setActiveEtfTab: (tab) => set({ activeEtfTab: tab }),
            setActiveOrbTab: (tab) => set({ activeOrbTab: tab }),
            setActiveWeeklyTab: (tab) => set({ activeWeeklyTab: tab }),
        }),
        {
            name: 'app-storage', // localStorage key
        }
    )
);
