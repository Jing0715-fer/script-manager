// @ts-nocheck
'use client';

import React from 'react';
import { ExternalLink, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TabEmptyState } from './shared';

interface AppsTabProps {
  apps: Array<{
    id: string; appId: string;
    app: { id: string; name: string; appType: string; icon: string; scriptExt: string; runCommand: string };
  }>;
  scriptId: string;
  params: Record<string, string>;
  inputFiles: Record<string, string>;
}

export function AppsTab({ apps, scriptId, params, inputFiles }: AppsTabProps) {
  return (
    <div className="flex-1 overflow-y-auto px-4 pb-4">
      <div className="mt-3 space-y-3">
        {apps.length > 0 ? apps.map((ea) => (
          <div key={ea.id} className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <ExternalLink className="size-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <span className="text-xs font-semibold">{ea.app.name}</span>
                  <p className="text-[10px] text-muted-foreground">{ea.app.appType}</p>
                </div>
              </div>
              <Badge variant="outline" className="text-[9px]">{ea.app.appType}</Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5 text-xs"
              onClick={async () => {
                try {
                  const r = await fetch('/api/generate-script', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ scriptId, appId: ea.appId, params, inputFiles }),
                  });
                  if (!r.ok) throw new Error('Generation failed');
                  const d = await r.json();
                  const b = new Blob([d.generatedScript], { type: 'text/plain' });
                  const u = URL.createObjectURL(b);
                  const a = document.createElement('a');
                  a.href = u;
                  a.download = d.filename;
                  a.click();
                  URL.revokeObjectURL(u);
                  toast.success('Launcher script generated & downloaded');
                } catch {
                  toast.error('Failed to generate launcher script');
                }
              }}
            >
              <Sparkles className="size-3.5" />
              Generate & Download Script
            </Button>
          </div>
        )) : (
          <TabEmptyState
            icon={<ExternalLink className="size-10 text-muted-foreground/20" />}
            title="No external apps linked"
            description="Link external applications to generate launcher scripts for this script."
            actions={
              <Button variant="outline" size="sm" className="gap-1.5 mt-2" onClick={() => {}}>
                <ExternalLink className="size-3.5" /> Add External App
              </Button>
            }
          />
        )}
      </div>
    </div>
  );
}
