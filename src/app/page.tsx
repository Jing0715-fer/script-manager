'use client';

import dynamic from 'next/dynamic';

// Load the heavy page content client-side only to avoid SSR memory issues
const HomePageContent = dynamic(() => import('@/components/HomePageContent'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="size-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-8 text-white animate-pulse">
            <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"></path>
          </svg>
        </div>
        <h2 className="text-sm font-semibold text-foreground mb-1">Loading ScriptHub...</h2>
        <p className="text-xs text-muted-foreground">Preparing your scripts</p>
      </div>
    </div>
  ),
});

export default function Page() {
  return <HomePageContent />;
}
