'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Upload,
  Check,
  FileCode2,
  Tags,
  Sparkles,
  ClipboardCheck,
  FileUp,
  Loader2,
  ArrowLeft,
  ArrowRight,
  X,
  FileText,
  FormInput,
  FileInput,
  FileOutput,
  Package,
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
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { SCRIPT_CATEGORIES } from '@/lib/shared-constants';

const STEPS = [
  { id: 1, label: 'Paste Code', icon: FileCode2 },
  { id: 2, label: 'Details', icon: Tags },
  { id: 3, label: 'AI Analysis', icon: Sparkles },
  { id: 4, label: 'Confirm', icon: ClipboardCheck },
];

const CATEGORIES = [...SCRIPT_CATEGORIES];

const LANGUAGES = [
  'python',
  'javascript',
  'typescript',
  'bash',
  'r',
  'perl',
  'ruby',
  'go',
  'rust',
  'other',
];

// Step indicator component (defined outside render to avoid recreating each render)
function StepIndicator({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-6">
      {STEPS.map((s, i) => {
        const Icon = s.icon;
        const isActive = step === s.id;
        const isCompleted = step > s.id;
        return (
          <div key={s.id} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`
                  flex items-center justify-center rounded-full transition-all duration-300 size-9
                  ${
                    isCompleted
                      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25'
                      : isActive
                        ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25 scale-110'
                        : 'bg-muted text-muted-foreground'
                  }
                `}
              >
                {isCompleted ? (
                  <Check className="size-4" />
                ) : (
                  <Icon className="size-4" />
                )}
              </div>
              <span
                className={`text-[10px] font-medium transition-colors ${
                  isActive
                    ? 'text-foreground'
                    : isCompleted
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-muted-foreground'
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`w-8 h-0.5 mx-1 mt-[-16px] transition-colors duration-300 ${
                  step > s.id ? 'bg-emerald-500' : 'bg-muted'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function UploadDialogSimple({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [step, setStep] = useState(1);
  const [fileContent, setFileContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [scriptName, setScriptName] = useState('');
  const [scriptDescription, setScriptDescription] = useState('');
  const [scriptCategory, setScriptCategory] = useState('Uncategorized');
  const [scriptLanguage, setScriptLanguage] = useState('python');
  const [analysis, setAnalysis] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState<{ name: string; updatedAt: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setStep(1);
    setFileContent('');
    setFileName('');
    setScriptName('');
    setScriptDescription('');
    setScriptCategory('Uncategorized');
    setScriptLanguage('python');
    setAnalysis(null);
    setAnalyzing(false);
    setSaving(false);
    setIsDragOver(false);
    setIsDuplicate(false);
    setDuplicateInfo(null);
  }, []);

  const handleOpenChange = useCallback(
    (v: boolean) => {
      if (!v) resetState();
      onOpenChange(v);
    },
    [onOpenChange, resetState]
  );

  // Check for duplicate filename when fileName changes
  useEffect(() => {
    if (!fileName) {
      setIsDuplicate(false);
      setDuplicateInfo(null);
      return;
    }
    const controller = new AbortController();
    fetch(`/api/scripts/check-duplicate?filename=${encodeURIComponent(fileName)}`, { signal: controller.signal })
      .then(r => r?.json())
      .then(data => {
        if (data?.exists) {
          setIsDuplicate(true);
          setDuplicateInfo({ name: data.script.name, updatedAt: data.script.updatedAt });
        } else {
          setIsDuplicate(false);
          setDuplicateInfo(null);
        }
      })
      .catch(() => {
        setIsDuplicate(false);
        setDuplicateInfo(null);
      });
    return () => controller.abort();
  }, [fileName]);

  const handleFileRead = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setFileContent(text);
      setFileName(file.name);
      // Auto-detect language from extension
      const ext = file.name.split('.').pop()?.toLowerCase();
      const langMap: Record<string, string> = {
        py: 'python',
        js: 'javascript',
        ts: 'typescript',
        sh: 'bash',
        r: 'r',
        pl: 'perl',
        rb: 'ruby',
        go: 'go',
        rs: 'rust',
      };
      if (ext && langMap[ext]) setScriptLanguage(langMap[ext]);
    };
    reader.readAsText(file);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(true);
    },
    []
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFileRead(files[0]);
      }
    },
    [handleFileRead]
  );

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch('/api/ai/analyze-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: fileContent, filename: fileName }),
      });
      const data = await res.json();
      setAnalysis(data.analysis);
      if (data.analysis?.description) setScriptDescription(data.analysis.description);
    } catch {
      /* ignore */
    }
    setAnalyzing(false);
    setStep(3);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const r = await fetch('/api/scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: scriptName,
          description: scriptDescription,
          filename: fileName,
          content: fileContent,
          category: scriptCategory,
          language: scriptLanguage,
          source: 'upload',
          params: analysis?.parameters ? JSON.stringify(analysis.parameters) : '[]',
          inputFiles: analysis?.inputFiles ? JSON.stringify(analysis.inputFiles) : '[]',
          outputFiles: analysis?.outputFiles ? JSON.stringify(analysis.outputFiles) : '[]',
        }),
      });
      if (!r.ok) throw new Error('Save failed');
      toast.success('Script saved successfully');
    } catch {
      toast.error('Failed to save script');
    }
    setSaving(false);
    handleOpenChange(false);
    onSaved();
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return !!fileContent.trim();
      case 2:
        return !!scriptName.trim();
      case 3:
        return true;
      case 4:
        return !saving;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step === 2) {
      handleAnalyze();
    } else if (step < 4) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-xl" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex items-center justify-center size-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-sm">
              <Upload className="size-4 text-white" />
            </div>
            Upload Script
          </DialogTitle>
          <DialogDescription>
            Add a new script to your collection. Paste code or drag a file, then let AI analyze it.
          </DialogDescription>
        </DialogHeader>

        <StepIndicator step={step} />

        <Separator />

        {/* Step 1: Paste Code / Drag & Drop */}
        {step === 1 && (
          <div className="space-y-4">
            <div
              className={`
                relative rounded-lg border-2 border-dashed transition-all duration-200
                ${
                  isDragOver
                    ? 'border-primary bg-primary/5 scale-[1.01]'
                    : 'border-muted-foreground/25 hover:border-muted-foreground/40'
                }
              `}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="p-4 text-center">
                <FileUp
                  className={`mx-auto size-10 mb-2 transition-colors ${
                    isDragOver ? 'text-primary' : 'text-muted-foreground/50'
                  }`}
                />
                <p className="text-sm font-medium text-muted-foreground">
                  Drag & drop a script file here
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  or use the paste area below
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileText className="size-3.5 mr-1.5" />
                  Browse Files
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".py,.js,.ts,.sh,.r,.pl,.rb,.go,.rs,.txt,.cxc,.pml"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileRead(file);
                  }}
                />
              </div>
            </div>

            {fileName && (
              <div className={`flex items-center gap-2 px-3 py-2 rounded-md border ${
                isDuplicate
                  ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                  : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
              }`}>
                <FileCode2 className={`size-4 ${isDuplicate ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`} />
                <span className={`text-sm font-medium ${isDuplicate ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                  {fileName}
                </span>
                {isDuplicate && (
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400 bg-amber-100/50 dark:bg-amber-900/30">
                    Existing script - will overwrite
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className={`ml-auto ${isDuplicate ? 'text-amber-600 hover:text-amber-800' : 'text-emerald-600 hover:text-emerald-800'}`}
                  onClick={() => {
                    setFileName('');
                    setFileContent('');
                    setIsDuplicate(false);
                    setDuplicateInfo(null);
                  }}
                >
                  <X className="size-3" />
                </Button>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="script-content" className="text-xs font-medium">
                Script Content
              </Label>
              <Textarea
                id="script-content"
                placeholder="Paste your script code here..."
                value={fileContent}
                onChange={(e) => {
                  setFileContent(e.target.value);
                  if (!fileName) setFileName('script.py');
                }}
                className="font-mono text-xs min-h-[180px] resize-y"
              />
            </div>
          </div>
        )}

        {/* Step 2: Name & Category */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="script-name" className="text-xs font-medium">
                Script Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="script-name"
                placeholder="e.g., Data Processor"
                value={scriptName}
                onChange={(e) => setScriptName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="script-description" className="text-xs font-medium">
                Description
              </Label>
              <Textarea
                id="script-description"
                placeholder="What does this script do?"
                value={scriptDescription}
                onChange={(e) => setScriptDescription(e.target.value)}
                className="text-sm min-h-[80px] resize-y"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Category</Label>
                <Select value={scriptCategory} onValueChange={setScriptCategory}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Language</Label>
                <Select value={scriptLanguage} onValueChange={setScriptLanguage}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang} value={lang}>
                        {lang.charAt(0).toUpperCase() + lang.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
              <Sparkles className="size-4 text-primary shrink-0" />
              <p className="text-xs text-muted-foreground">
                Click <strong>Next</strong> to let AI analyze your script for parameters, input/output files, and dependencies.
              </p>
            </div>
          </div>
        )}

        {/* Step 3: AI Analysis */}
        {step === 3 && (
          <div className="space-y-4">
            {analysis ? (
              <>
                {analysis.summary && (
                  <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                    <p className="text-sm text-emerald-800 dark:text-emerald-200">
                      {analysis.summary}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3">
                  {/* Parameters Card */}
                  {analysis.parameters?.length > 0 && (
                    <Card size="sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium flex items-center gap-1.5">
                          <FormInput className="size-3.5 text-amber-500" />
                          Parameters
                          <Badge variant="secondary" className="text-[10px] ml-auto">
                            {analysis.parameters.length}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-1.5">
                          {analysis.parameters.map((p: any, i: number) => (
                            <div
                              key={i}
                              className="flex items-center gap-2 text-xs px-2 py-1.5 bg-muted/50 rounded"
                            >
                              <code className="font-mono font-medium text-foreground">
                                {p.name}
                              </code>
                              {p.type && (
                                <Badge variant="outline" className="text-[9px] px-1 py-0">
                                  {p.type}
                                </Badge>
                              )}
                              {p.description && (
                                <span className="text-muted-foreground truncate">
                                  — {p.description}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Files Card */}
                  {(analysis.inputFiles?.length > 0 || analysis.outputFiles?.length > 0) && (
                    <Card size="sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium flex items-center gap-1.5">
                          <FileText className="size-3.5 text-blue-500" />
                          File I/O
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          {analysis.inputFiles?.length > 0 && (
                            <div>
                              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                                <FileInput className="size-2.5" /> Input
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {analysis.inputFiles.map((f: any, i: number) => (
                                  <Badge key={i} variant="secondary" className="text-[10px]">
                                    {typeof f === 'string' ? f : f.name || f.pattern}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {analysis.outputFiles?.length > 0 && (
                            <div>
                              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                                <FileOutput className="size-2.5" /> Output
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {analysis.outputFiles.map((f: any, i: number) => (
                                  <Badge key={i} variant="secondary" className="text-[10px]">
                                    {typeof f === 'string' ? f : f.name || f.pattern}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Dependencies Card */}
                  {analysis.dependencies?.length > 0 && (
                    <Card size="sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium flex items-center gap-1.5">
                          <Package className="size-3.5 text-purple-500" />
                          Dependencies
                          <Badge variant="secondary" className="text-[10px] ml-auto">
                            {analysis.dependencies.length}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex flex-wrap gap-1">
                          {analysis.dependencies.map((d: string) => (
                            <Badge key={d} variant="outline" className="text-[10px]">
                              {d}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <Sparkles className="size-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">
                  AI analysis not available
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Configure an LLM provider to enable AI analysis
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Confirm */}
        {step === 4 && (
          <div className="space-y-4">
            <Card size="sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ClipboardCheck className="size-4 text-emerald-500" />
                  Review & Save
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                  <span className="text-muted-foreground font-medium">Name</span>
                  <span className="font-medium">{scriptName}</span>

                  <span className="text-muted-foreground font-medium">File</span>
                  <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded w-fit">
                    {fileName}
                  </span>

                  <span className="text-muted-foreground font-medium">Language</span>
                  <span>{scriptLanguage.charAt(0).toUpperCase() + scriptLanguage.slice(1)}</span>

                  <span className="text-muted-foreground font-medium">Category</span>
                  <span>{scriptCategory}</span>

                  {scriptDescription && (
                    <>
                      <span className="text-muted-foreground font-medium">Description</span>
                      <span className="text-xs text-foreground/80 line-clamp-2">
                        {scriptDescription}
                      </span>
                    </>
                  )}
                </div>

                <Separator />

                {(analysis?.parameters?.length > 0 ||
                  analysis?.dependencies?.length > 0) && (
                  <div className="grid grid-cols-2 gap-3">
                    {analysis?.parameters?.length > 0 && (
                      <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-md border border-amber-200 dark:border-amber-800">
                        <p className="text-[10px] font-medium text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                          Parameters
                        </p>
                        <p className="text-lg font-bold text-amber-800 dark:text-amber-200">
                          {analysis.parameters.length}
                        </p>
                      </div>
                    )}
                    {analysis?.dependencies?.length > 0 && (
                      <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-md border border-purple-200 dark:border-purple-800">
                        <p className="text-[10px] font-medium text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                          Dependencies
                        </p>
                        <p className="text-lg font-bold text-purple-800 dark:text-purple-200">
                          {analysis.dependencies.length}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50 text-xs text-muted-foreground">
              <FileCode2 className="size-3.5 shrink-0" />
              <span>
                Script will be saved as <strong className="text-foreground">{fileName}</strong>
              </span>
            </div>
          </div>
        )}

        <Separator />

        <DialogFooter className="gap-2 sm:gap-0">
          {step > 1 && (
            <Button variant="outline" onClick={handleBack} disabled={analyzing}>
              <ArrowLeft className="size-4 mr-1" />
              Back
            </Button>
          )}
          <div className="flex-1" />
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          {step < 4 ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed() || analyzing}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {analyzing ? (
                <>
                  <Loader2 className="size-4 mr-1 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="size-4 ml-1" />
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 mr-1 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="size-4 mr-1" />
                  Save Script
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
