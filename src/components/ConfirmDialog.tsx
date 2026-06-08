'use client';

import React from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Info } from 'lucide-react';

// ─── Props ────────────────────────────────────────────────────────

interface ConfirmDialogProps {
  open: boolean;
  onClose?: () => void;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  confirmLabel?: string;
  cancelText?: string;
  onConfirm: () => void;
  loading?: boolean;
  variant?: 'default' | 'destructive';
}

// ─── Component ────────────────────────────────────────────────────

export function ConfirmDialog({
  open,
  onClose,
  onOpenChange,
  title,
  description,
  confirmText,
  confirmLabel,
  cancelText = 'Cancel',
  onConfirm,
  loading = false,
  variant = 'default',
}: ConfirmDialogProps) {
  const isDestructive = variant === 'destructive';
  const handleClose = onOpenChange ? (v: boolean) => { if (!v) onOpenChange(false); } : (v: boolean) => { if (!v) onClose?.(); };
  const buttonLabel = confirmText ?? confirmLabel ?? 'Confirm';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[420px] glass-card-elevated backdrop-blur-xl border-white/10 dark:border-white/5 p-0 overflow-hidden">
        {/* Accent bar */}
        <div className={`h-1 w-full ${isDestructive ? 'bg-gradient-to-r from-rose-500 to-rose-400' : 'bg-gradient-to-r from-emerald-500 to-emerald-400'}`} />

        <div className="px-6 pt-4 pb-2">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${isDestructive ? 'bg-rose-500/10' : 'bg-emerald-500/10'}`}>
                {isDestructive ? (
                  <AlertTriangle className="size-5 text-rose-500" />
                ) : (
                  <Info className="size-5 text-emerald-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-base font-semibold leading-tight">{title}</DialogTitle>
              </div>
            </div>
            <DialogDescription className="text-sm text-muted-foreground leading-relaxed pl-[52px]">
              {description}
            </DialogDescription>
          </DialogHeader>
        </div>

        <DialogFooter className="px-6 pb-5 pt-2 flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange ? onOpenChange(false) : onClose?.()}
            disabled={loading}
            className="btn-press-scale"
          >
            {cancelText}
          </Button>
          <Button
            variant={isDestructive ? 'destructive' : 'default'}
            size="sm"
            onClick={onConfirm}
            disabled={loading}
            className={`btn-press-scale ${!isDestructive ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-500/20' : ''}`}
          >
            {loading ? (
              <>
                <span className="size-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              buttonLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
