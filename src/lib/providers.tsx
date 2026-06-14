// @ts-nocheck
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useState, useEffect } from 'react';

// Global chunk load error recovery - auto-reloads on chunk errors (dev server restarts)
if (typeof window !== 'undefined') {
  const originalError = window.onerror;
  window.onerror = (message, source, lineno, colno, error) => {
    if (message && typeof message === 'string' && message.includes('Loading chunk')) {
      console.warn('[ChunkLoadError] Reloading page to recover from stale chunk...');
      window.location.reload();
      return true;
    }
    if (originalError) {
      return originalError(message, source, lineno, colno, error);
    }
    return false;
  };

  // Also handle unhandled promise rejections from dynamic imports
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    if (reason?.name === 'ChunkLoadError' || (reason?.message && reason.message.includes('Loading chunk'))) {
      console.warn('[ChunkLoadError] Reloading page to recover from stale chunk (promise)...');
      event.preventDefault();
      window.location.reload();
    }
  });
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <TooltipProvider delayDuration={300}>
          {children}
        </TooltipProvider>
        <Toaster
          position="bottom-right"
          richColors
          closeButton
          toastOptions={{
            duration: 3000,
            className: 'text-sm [border-left:3px] !pl-4',
            classNames: {
              success: '!border-l-emerald-500',
              error: '!border-l-red-500',
              warning: '!border-l-amber-500',
              info: '!border-l-sky-500',
            },
          }}
          style={
            {
              '--toast-animation': 'toast-slide-in-right 0.3s ease-out',
            } as React.CSSProperties
          }
        />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
