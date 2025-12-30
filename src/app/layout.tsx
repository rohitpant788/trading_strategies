import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import TabNav from "@/components/TabNav";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ETF Shop 3.0 - LIFO Trading Portfolio Manager",
  description: "Manage your ETF investments with 20 DMA strategy and LIFO tracking",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased bg-gray-950 text-gray-100 min-h-screen`} suppressHydrationWarning>
        {/* Header */}
        <header className="fixed top-0 left-0 right-0 bg-gray-900/95 backdrop-blur border-b border-gray-800 z-50">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📊</span>
                <div>
                  <h1 className="text-lg font-bold text-white">ETF Shop 3.0</h1>
                  <p className="text-xs text-gray-400">20 DMA Strategy with LIFO</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Last Updated</p>
                <p className="text-sm text-gray-300" id="lastUpdated">--</p>
              </div>
            </div>
          </div>
        </header>

        {/* Main content with padding for fixed header/footer */}
        <main className="pt-20 pb-20 px-4 max-w-7xl mx-auto">
          {children}
        </main>

        {/* Bottom Tab Navigation */}
        <TabNav />
      </body>
    </html>
  );
}
