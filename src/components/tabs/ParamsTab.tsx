'use client';

import React, { useState, useCallback } from 'react';
import { Sliders, Plus, Trash2, Variable, Bookmark, Save, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from '@/lib/framer-motion-shim';
import { toast } from 'sonner';
import { TabEmptyState } from './shared';

interface ParamsTabProps {
  params: Record<string, string>;
  onParamsChange: (params: Record<string, string>) => void;
  parsedParams: Array<{ name: string; required?: boolean; type?: string; default?: string; description?: string }>;
  scriptId?: string;
}

interface Preset {
  name: string;
  params: Record<string, string>;
  envVars: Array<{ key: string; value: string }>;
  createdAt: number;
}

const MAX_ENV_VARS = 10;
const MAX_PRESETS = 10;

export function ParamsTab({ params, onParamsChange, parsedParams, scriptId = '' }: ParamsTabProps) {
  // Environment variables state (lazy init from localStorage)
  const [envVars, setEnvVars] = useState<Array<{ key: string; value: string }>>(() => {
    if (!scriptId || typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(`scripthub-env-${scriptId}`);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  // Presets state (lazy init from localStorage)
  const [presets, setPresets] = useState<Preset[]>(() => {
    if (!scriptId || typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(`scripthub-presets-${scriptId}`);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const [presetName, setPresetName] = useState('');
  const [showPresetSave, setShowPresetSave] = useState(false);
  const [presetMenuOpen, setPresetMenuOpen] = useState(false);

  // Save env vars to localStorage on change
  const updateEnvVars = useCallback((next: Array<{ key: string; value: string }>) => {
    setEnvVars(next);
    if (scriptId) {
      try {
        localStorage.setItem(`scripthub-env-${scriptId}`, JSON.stringify(next));
      } catch { /* ignore */ }
    }
  }, [scriptId]);

  // Save presets to localStorage
  const savePresets = useCallback((next: Preset[]) => {
    setPresets(next);
    if (scriptId) {
      try {
        localStorage.setItem(`scripthub-presets-${scriptId}`, JSON.stringify(next));
      } catch { /* ignore */ }
    }
  }, [scriptId]);

  const addEnvVar = () => {
    if (envVars.length >= MAX_ENV_VARS) {
      toast.warning(`Maximum ${MAX_ENV_VARS} environment variables allowed`);
      return;
    }
    updateEnvVars([...envVars, { key: '', value: '' }]);
  };

  const removeEnvVar = (index: number) => {
    updateEnvVars(envVars.filter((_, i) => i !== index));
    toast.success('Environment variable removed');
  };

  const updateEnvVar = (index: number, field: 'key' | 'value', val: string) => {
    const next = [...envVars];
    next[index] = { ...next[index], [field]: val };
    updateEnvVars(next);
  };

  // Preset: Save current params + envVars as a named preset
  const handleSavePreset = () => {
    const name = presetName.trim();
    if (!name) {
      toast.error('Please enter a preset name');
      return;
    }
    if (presets.length >= MAX_PRESETS) {
      toast.warning(`Maximum ${MAX_PRESETS} presets allowed`);
      return;
    }
    // Check for duplicate name
    if (presets.some(p => p.name === name)) {
      // Overwrite existing preset
      const next = presets.map(p => p.name === name ? { name, params: { ...params }, envVars: [...envVars], createdAt: Date.now() } : p);
      savePresets(next);
      toast.success(`Preset "${name}" updated`);
    } else {
      const next = [...presets, { name, params: { ...params }, envVars: [...envVars], createdAt: Date.now() }];
      savePresets(next);
      toast.success(`Preset "${name}" saved`);
    }
    setPresetName('');
    setShowPresetSave(false);
  };

  // Preset: Load a preset
  const handleLoadPreset = (preset: Preset) => {
    onParamsChange(preset.params);
    updateEnvVars(preset.envVars);
    setPresetMenuOpen(false);
    toast.success(`Preset "${preset.name}" loaded`);
  };

  // Preset: Delete a preset
  const handleDeletePreset = (name: string) => {
    savePresets(presets.filter(p => p.name !== name));
    toast.success(`Preset "${name}" deleted`);
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-4">
      {/* Presets Section */}
      {(parsedParams.length > 0 || envVars.length > 0) && (
        <div className="mt-3 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Bookmark className="size-3.5 text-amber-500" />
              <span className="text-xs font-semibold">Presets</span>
              {presets.length > 0 && (
                <Badge variant="secondary" className="text-[9px] h-4 px-1.5">{presets.length}</Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="icon-xs"
                variant="ghost"
                onClick={() => setShowPresetSave(!showPresetSave)}
                className="text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                title="Save current params as preset"
              >
                <Save className="size-3" />
              </Button>
              {presets.length > 0 && (
                <Button
                  size="icon-xs"
                  variant="ghost"
                  onClick={() => setPresetMenuOpen(!presetMenuOpen)}
                  className="text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                  title="Load a preset"
                >
                  <ChevronDown className={`size-3 transition-transform ${presetMenuOpen ? 'rotate-180' : ''}`} />
                </Button>
              )}
            </div>
          </div>

          {/* Save preset input */}
          <AnimatePresence>
            {showPresetSave && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <Input
                    value={presetName}
                    onChange={e => setPresetName(e.target.value)}
                    placeholder="Preset name..."
                    className="h-7 text-[11px] flex-1"
                    onKeyDown={e => { if (e.key === 'Enter') handleSavePreset(); }}
                  />
                  <Button
                    size="icon-xs"
                    onClick={handleSavePreset}
                    className="bg-amber-500 hover:bg-amber-600 text-white shrink-0"
                  >
                    <Save className="size-3" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Preset list */}
          <AnimatePresence>
            {presetMenuOpen && presets.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <div className="space-y-1 mb-2">
                  {presets.map((preset) => (
                    <div
                      key={preset.name}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted/40 hover:bg-muted/60 transition-colors group cursor-pointer"
                      onClick={() => handleLoadPreset(preset)}
                    >
                      <Bookmark className="size-3 text-amber-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-[11px] font-medium truncate block">{preset.name}</span>
                        <span className="text-[9px] text-muted-foreground">
                          {Object.keys(preset.params).length} params, {preset.envVars.length} env
                        </span>
                      </div>
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        onClick={e => { e.stopPropagation(); handleDeletePreset(preset.name); }}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 shrink-0"
                      >
                        <Trash2 className="size-2.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Preset chips */}
          {presets.length > 0 && !presetMenuOpen && (
            <div className="flex flex-wrap gap-1 mb-2">
              {presets.map((preset) => (
                <Badge
                  key={preset.name}
                  variant="outline"
                  className="text-[9px] cursor-pointer tag-hover-lift hover:border-amber-400/50 transition-all"
                  onClick={() => handleLoadPreset(preset)}
                >
                  <Bookmark className="size-2.5 mr-0.5 text-amber-500" />
                  {preset.name}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Script Parameters */}
      <div className="mt-3 space-y-3">
        {parsedParams.length > 0 ? parsedParams.map((p) => (
          <div key={p.name} className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              {p.name}
              {p.required && <span className="text-red-500">*</span>}
              {p.type && <Badge variant="outline" className="text-[8px] h-3.5 px-1 ml-1">{p.type}</Badge>}
            </Label>
            {p.description && <p className="text-[10px] text-muted-foreground">{p.description}</p>}
            <Input
              value={params[p.name] ?? p.default ?? ''}
              onChange={e => onParamsChange({ ...params, [p.name]: e.target.value })}
              placeholder={p.description || p.name}
              className="h-8 text-xs"
            />
          </div>
        )) : (
          <TabEmptyState
            icon={<Sliders className="size-10 text-muted-foreground/20" />}
            title="No parameters"
            description="This script doesn't require any input parameters."
          />
        )}
      </div>

      {/* Environment Variables Section */}
      <div className="mt-6 pt-4 border-t">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <Variable className="size-3.5 text-emerald-500" />
            <span className="text-xs font-semibold">Environment Variables</span>
            {envVars.length > 0 && (
              <Badge variant="secondary" className="text-[9px] h-4 px-1.5">{envVars.length}</Badge>
            )}
          </div>
          <Button
            size="icon-xs"
            variant="ghost"
            onClick={addEnvVar}
            disabled={envVars.length >= MAX_ENV_VARS}
            className="text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
          >
            <Plus className="size-3" />
          </Button>
        </div>

        {envVars.length === 0 ? (
          <p className="text-[10px] text-muted-foreground/60 mb-2">
            Set key=value pairs to pass during execution. Stored locally per script.
          </p>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-2">
              {envVars.map((env, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-1.5"
                >
                  <Input
                    value={env.key}
                    onChange={e => updateEnvVar(index, 'key', e.target.value)}
                    placeholder="KEY"
                    className="h-7 text-[11px] font-mono flex-1 min-w-0"
                  />
                  <span className="text-muted-foreground/40 text-xs shrink-0">=</span>
                  <Input
                    value={env.value}
                    onChange={e => updateEnvVar(index, 'value', e.target.value)}
                    placeholder="value"
                    className="h-7 text-[11px] font-mono flex-1 min-w-0"
                  />
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    onClick={() => removeEnvVar(index)}
                    className="shrink-0 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}

        {envVars.length > 0 && (
          <p className="text-[9px] text-muted-foreground/50 mt-2">
            {envVars.length}/{MAX_ENV_VARS} variables -- Stored in localStorage
          </p>
        )}
      </div>
    </div>
  );
}
