// @ts-nocheck
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ExternalLink,
  Trash2,
  Pencil,
  Plus,
  Terminal,
  Monitor,
  FlaskConical,
  Code2,
  FileCode2,
  Check,
  X,
  Loader2,
  Link2,
  FolderOpen,
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
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const APP_PRESETS = [
  {
    id: 'chimerax',
    name: 'ChimeraX',
    appType: 'chimerax',
    scriptExt: '.cxc',
    icon: 'flask',
    appPath: '/usr/bin/chimerax',
    runCommand: 'chimerax --script {script}',
    description: 'UCSF ChimeraX - Molecular Visualization',
    IconComponent: FlaskConical,
  },
  {
    id: 'pymol',
    name: 'PyMOL',
    appType: 'pymol',
    scriptExt: '.pml',
    icon: 'flask',
    appPath: '/usr/bin/pymol',
    runCommand: 'pymol -cq {script}',
    description: 'PyMOL - Molecular Visualization',
    IconComponent: FlaskConical,
  },
  {
    id: 'vscode',
    name: 'VS Code',
    appType: 'editor',
    scriptExt: '.py',
    icon: 'code',
    appPath: '/usr/bin/code',
    runCommand: 'code {script}',
    description: 'Visual Studio Code - Code Editor',
    IconComponent: Code2,
  },
  {
    id: 'terminal',
    name: 'Terminal',
    appType: 'terminal',
    scriptExt: '.sh',
    icon: 'terminal',
    appPath: '/usr/bin/gnome-terminal',
    runCommand: 'bash {script}',
    description: 'Terminal - Script Execution',
    IconComponent: Terminal,
  },
];

const APP_TYPES = [
  { value: 'generic', label: 'Generic' },
  { value: 'chimerax', label: 'ChimeraX' },
  { value: 'pymol', label: 'PyMOL' },
  { value: 'editor', label: 'Code Editor' },
  { value: 'terminal', label: 'Terminal' },
  { value: 'custom', label: 'Custom' },
];

const ICON_OPTIONS = [
  { value: 'terminal', label: 'Terminal', IconComponent: Terminal },
  { value: 'code', label: 'Code', IconComponent: Code2 },
  { value: 'flask', label: 'Science', IconComponent: FlaskConical },
  { value: 'monitor', label: 'Desktop', IconComponent: Monitor },
  { value: 'file', label: 'File', IconComponent: FileCode2 },
];

interface ExternalAppData {
  id: string;
  name: string;
  description: string;
  appPath: string;
  appType: string;
  icon: string;
  scriptExt: string;
  runCommand: string;
  createdAt: string;
  updatedAt: string;
  _count?: { scripts: number };
}

export default function ExternalAppDialogSimple({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [apps, setApps] = useState<ExternalAppData[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [appType, setAppType] = useState('generic');
  const [appPath, setAppPath] = useState('');
  const [icon, setIcon] = useState('terminal');
  const [scriptExt, setScriptExt] = useState('.py');
  const [runCommand, setRunCommand] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const loadApps = useCallback(() => {
    setLoading(true);
    fetch('/api/external-apps')
      .then((r) => r.json())
      .then((data) => {
        setApps(data.apps || []);
        setLoading(false);
      })
      .catch(() => {
        toast.error('Failed to load external apps');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (open) {
      loadApps();
    }
  }, [open, loadApps]);

  const resetForm = useCallback(() => {
    setName('');
    setDescription('');
    setAppType('generic');
    setAppPath('');
    setIcon('terminal');
    setScriptExt('.py');
    setRunCommand('');
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

  const applyPreset = (preset: (typeof APP_PRESETS)[number]) => {
    setName(preset.name);
    setDescription(preset.description);
    setAppType(preset.appType);
    setAppPath(preset.appPath);
    setIcon(preset.icon);
    setScriptExt(preset.scriptExt);
    setRunCommand(preset.runCommand);
    setShowForm(true);
  };

  const startEdit = (app: ExternalAppData) => {
    setEditingId(app.id);
    setName(app.name);
    setDescription(app.description);
    setAppType(app.appType);
    setAppPath(app.appPath);
    setIcon(app.icon);
    setScriptExt(app.scriptExt);
    setRunCommand(app.runCommand);
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
        const r = await fetch(`/api/external-apps/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            description,
            appType,
            appPath,
            icon,
            scriptExt,
            runCommand,
          }),
        });
        if (!r.ok) throw new Error('Update failed');
      } else {
        const r = await fetch('/api/external-apps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            description,
            appType,
            appPath,
            icon,
            scriptExt,
            runCommand,
          }),
        });
        if (!r.ok) throw new Error('Create failed');
      }
      toast.success(editingId ? 'App updated' : 'App created');
      resetForm();
      loadApps();
    } catch {
      toast.error('Failed to save app');
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
      const r = await fetch(`/api/external-apps/${id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error('Delete failed');
      loadApps();
      toast.success('External app deleted');
    } catch {
      toast.error('Failed to delete app');
    }
  };

  const getAppTypeLabel = (value: string) => {
    return APP_TYPES.find((t) => t.value === value)?.label || value;
  };

  const getIconComponent = (iconName: string) => {
    return ICON_OPTIONS.find((o) => o.value === iconName)?.IconComponent || Terminal;
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-xl" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex items-center justify-center size-8 rounded-lg bg-gradient-to-br from-purple-400 to-purple-600 shadow-sm">
              <ExternalLink className="size-4 text-white" />
            </div>
            External Applications
          </DialogTitle>
          <DialogDescription>
            Manage external applications that can be launched with your scripts.
          </DialogDescription>
        </DialogHeader>

        {/* Existing apps list */}
        {apps.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">
              Configured Applications
            </Label>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {apps.map((app) => {
                const AppIcon = getIconComponent(app.icon);
                return (
                  <Card key={app.id} size="sm" className="py-2">
                    <CardContent className="py-0">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center size-8 rounded-md bg-purple-50 dark:bg-purple-900/20 shrink-0">
                          <AppIcon className="size-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">
                              {app.name}
                            </span>
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                              {getAppTypeLabel(app.appType)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {app.scriptExt}
                            </span>
                            {app._count && app._count.scripts > 0 && (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                <Link2 className="size-2.5" />
                                {app._count.scripts} script{app._count.scripts !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className="text-muted-foreground hover:text-foreground"
                            onClick={() => startEdit(app)}
                          >
                            <Pencil className="size-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className={`text-muted-foreground ${deleteConfirmId === app.id ? 'bg-destructive text-white hover:text-white' : 'hover:text-destructive'}`}
                            onClick={() => handleDelete(app.id)}
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {(apps.length > 0 || showForm) && <Separator />}

        {/* Quick Presets */}
        {!showForm && (
          <div className="space-y-3">
            <Label className="text-xs font-medium text-muted-foreground">
              Quick Setup from Preset
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {APP_PRESETS.map((preset) => {
                const PresetIcon = preset.IconComponent;
                return (
                  <Button
                    key={preset.id}
                    variant="outline"
                    className="h-auto py-3 px-3 flex flex-col items-start gap-1.5"
                    onClick={() => applyPreset(preset)}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <PresetIcon className="size-4 text-purple-600 dark:text-purple-400 shrink-0" />
                      <span className="text-sm font-medium">{preset.name}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground text-left leading-tight">
                      {preset.description}
                    </span>
                    <Badge variant="secondary" className="text-[9px] px-1 py-0 mt-0.5">
                      {preset.scriptExt}
                    </Badge>
                  </Button>
                );
              })}
            </div>

            <Separator />

            <Button
              variant="outline"
              className="w-full border-dashed"
              onClick={startAdd}
            >
              <Plus className="size-4 mr-1.5" />
              Custom Application
            </Button>
          </div>
        )}

        {/* Add/Edit Form */}
        {showForm && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">
                {editingId ? 'Edit Application' : 'New Application'}
              </Label>
              <Button variant="ghost" size="icon-xs" onClick={resetForm}>
                <X className="size-3" />
              </Button>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="app-name" className="text-xs font-medium">
                  Application Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="app-name"
                  placeholder="e.g., ChimeraX"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="app-description" className="text-xs font-medium">
                  Description
                </Label>
                <Textarea
                  id="app-description"
                  placeholder="Brief description of this application..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="text-sm min-h-[60px] resize-y"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">App Type</Label>
                  <Select value={appType} onValueChange={setAppType}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {APP_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="app-icon" className="text-xs font-medium">
                    Icon
                  </Label>
                  <Select value={icon} onValueChange={setIcon}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select icon" />
                    </SelectTrigger>
                    <SelectContent>
                      {ICON_OPTIONS.map((o) => {
                        const OptIcon = o.IconComponent;
                        return (
                          <SelectItem key={o.value} value={o.value}>
                            <div className="flex items-center gap-2">
                              <OptIcon className="size-3.5" />
                              {o.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="app-scriptext" className="text-xs font-medium flex items-center gap-1.5">
                    <FileCode2 className="size-3" />
                    Script Extension
                  </Label>
                  <Input
                    id="app-scriptext"
                    placeholder=".py"
                    value={scriptExt}
                    onChange={(e) => setScriptExt(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="app-path" className="text-xs font-medium flex items-center gap-1.5">
                    <FolderOpen className="size-3" />
                    App Path
                  </Label>
                  <Input
                    id="app-path"
                    placeholder="/usr/bin/app"
                    value={appPath}
                    onChange={(e) => setAppPath(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="app-runcommand" className="text-xs font-medium flex items-center gap-1.5">
                  <Terminal className="size-3" />
                  Run Command
                </Label>
                <Input
                  id="app-runcommand"
                  placeholder="e.g., chimerax --script {script}"
                  value={runCommand}
                  onChange={(e) => setRunCommand(e.target.value)}
                  className="font-mono text-xs"
                />
                <p className="text-[10px] text-muted-foreground">
                  Use {'{script}'} as a placeholder for the script file path
                </p>
              </div>
            </div>
          </div>
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
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {saving ? (
                  <>
                    <Loader2 className="size-4 mr-1 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="size-4 mr-1" />
                    {editingId ? 'Update' : 'Add Application'}
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
