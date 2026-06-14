// @ts-nocheck
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Settings,
  Eye,
  EyeOff,
  Trash2,
  Pencil,
  Plus,
  Server,
  Key,
  Globe,
  Cpu,
  Star,
  Loader2,
  Check,
  X,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const PROVIDERS = [
  { value: 'z-ai', label: 'Z-AI' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'google', label: 'Google AI' },
  { value: 'ollama', label: 'Ollama (Local)' },
  { value: 'custom', label: 'Custom' },
];

interface LlmConfigData {
  id: string;
  name: string;
  provider: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function LLMConfigDialogSimple({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [configs, setConfigs] = useState<LlmConfigData[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [provider, setProvider] = useState('z-ai');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const loadConfigs = useCallback(() => {
    fetch('/api/llm-config')
      .then((r) => r.json())
      .then((data) => setConfigs(data.configs || []))
      .catch(() => {
        toast.error('Failed to load LLM configurations');
      });
  }, []);

  useEffect(() => {
    if (open) {
      fetch('/api/llm-config')
        .then((r) => r.json())
        .then((data) => {
          setConfigs(data.configs || []);
          setLoading(false);
        })
        .catch(() => {
          toast.error('Failed to load LLM configurations');
          setLoading(false);
        });
    }
  }, [open]);

  const resetForm = useCallback(() => {
    setName('');
    setProvider('z-ai');
    setApiKey('');
    setShowApiKey(false);
    setBaseUrl('');
    setModel('');
    setIsDefault(false);
    setEditingId(null);
    setShowForm(false);
    setDeleteConfirmId(null);
  }, []);

  const handleOpenChange = useCallback(
    (v: boolean) => {
      if (!v) resetForm();
      onOpenChange(v);
    },
    [onOpenChange, resetForm]
  );

  const startEdit = (config: LlmConfigData) => {
    setEditingId(config.id);
    setName(config.name);
    setProvider(config.provider);
    setApiKey(config.apiKey);
    setBaseUrl(config.baseUrl);
    setModel(config.model);
    setIsDefault(config.isDefault);
    setShowForm(true);
  };

  const startAdd = () => {
    resetForm();
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingId) {
        const r = await fetch(`/api/llm-config/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, provider, apiKey, baseUrl, model, isDefault }),
        });
        if (!r.ok) throw new Error('Update failed');
      } else {
        const r = await fetch('/api/llm-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, provider, apiKey, baseUrl, model, isDefault }),
        });
        if (!r.ok) throw new Error('Create failed');
      }
      toast.success(editingId ? 'Configuration updated' : 'Configuration created');
      resetForm();
      loadConfigs();
    } catch {
      toast.error('Failed to save configuration');
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (deleteConfirmId !== id) {
      setDeleteConfirmId(id);
      setTimeout(() => setDeleteConfirmId(null), 3000);
      return;
    }
    setDeleteConfirmId(null);
    try {
      const r = await fetch(`/api/llm-config/${id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error('Delete failed');
      loadConfigs();
      toast.success('LLM configuration deleted');
    } catch {
      toast.error('Failed to delete configuration');
    }
  };

  const getProviderLabel = (value: string) => {
    return PROVIDERS.find((p) => p.value === value)?.label || value;
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-xl" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex items-center justify-center size-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 shadow-sm">
              <Settings className="size-4 text-white" />
            </div>
            LLM Configuration
          </DialogTitle>
          <DialogDescription>
            Manage your AI provider configurations for script analysis and generation.
          </DialogDescription>
        </DialogHeader>

        {/* Existing configs list */}
        {configs.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">
              Configured Providers
            </Label>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {configs.map((config) => (
                <Card key={config.id} size="sm" className="py-2">
                  <CardContent className="py-0">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center size-8 rounded-md bg-muted shrink-0">
                        <Cpu className="size-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">
                            {config.name}
                          </span>
                          {config.isDefault && (
                            <Badge className="text-[9px] px-1.5 py-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                              <Star className="size-2.5 mr-0.5" />
                              Default
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                            {getProviderLabel(config.provider)}
                          </Badge>
                          {config.model && (
                            <span className="text-[10px] text-muted-foreground truncate">
                              {config.model}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => startEdit(config)}
                        >
                          <Pencil className="size-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className={`text-muted-foreground ${deleteConfirmId === config.id ? 'bg-destructive text-white hover:text-white' : 'hover:text-destructive'}`}
                          onClick={() => handleDelete(config.id)}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {configs.length > 0 && showForm && <Separator />}

        {/* Add/Edit Form */}
        {showForm ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">
                {editingId ? 'Edit Configuration' : 'New Configuration'}
              </Label>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={resetForm}
              >
                <X className="size-3" />
              </Button>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="config-name" className="text-xs font-medium">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="config-name"
                  placeholder="e.g., My OpenAI Config"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Provider</Label>
                  <Select value={provider} onValueChange={setProvider}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVIDERS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="config-model" className="text-xs font-medium">
                    Model
                  </Label>
                  <Input
                    id="config-model"
                    placeholder="e.g., gpt-4o"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="config-apikey" className="text-xs font-medium flex items-center gap-1.5">
                  <Key className="size-3" />
                  API Key
                </Label>
                <div className="relative">
                  <Input
                    id="config-apikey"
                    type={showApiKey ? 'text' : 'password'}
                    placeholder="sk-..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="pr-10"
                  />
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="config-baseurl" className="text-xs font-medium flex items-center gap-1.5">
                  <Globe className="size-3" />
                  Base URL
                </Label>
                <Input
                  id="config-baseurl"
                  placeholder="https://api.openai.com/v1 (optional)"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label className="text-xs font-medium flex items-center gap-1.5">
                    <Star className="size-3" />
                    Default Provider
                  </Label>
                  <p className="text-[10px] text-muted-foreground">
                    Use this config as the default for AI operations
                  </p>
                </div>
                <Switch checked={isDefault} onCheckedChange={setIsDefault} />
              </div>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            className="w-full border-dashed"
            onClick={startAdd}
          >
            <Plus className="size-4 mr-1.5" />
            Add Configuration
          </Button>
        )}

        {showForm && (
          <>
            <Separator />
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!name.trim() || saving}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {saving ? (
                  <>
                    <Loader2 className="size-4 mr-1 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="size-4 mr-1" />
                    {editingId ? 'Update' : 'Save'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
