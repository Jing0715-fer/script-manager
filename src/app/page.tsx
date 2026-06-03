'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Terminal,
  Search,
  LayoutGrid,
  List,
  Sun,
  Moon,
  Settings,
  Upload,
  Menu,
  PanelRightClose,
  FolderOpen,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { ScriptList } from '@/components/ScriptList';
import { ScriptExecutionPanel } from '@/components/ScriptExecutionPanel';
import { UploadScriptDialog } from '@/components/UploadScriptDialog';
import { LLMSettingsDialog } from '@/components/LLMSettingsDialog';
import { useScriptStore } from '@/store/script-store';
import type { ScriptData } from '@/components/ScriptCard';

export default function HomePage() {
  const { theme, setTheme } = useTheme();
  const {
    selectedScriptId,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    viewMode,
    setViewMode,
    sidebarOpen,
    toggleSidebar,
    setSelectedScript,
  } = useScriptStore();

  const [uploadOpen, setUploadOpen] = useState(false);
  const [llmSettingsOpen, setLlmSettingsOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Fetch scripts for category sidebar counts
  const { data } = useQuery({
    queryKey: ['scripts', 'all'],
    queryFn: async () => {
      const res = await fetch('/api/scripts');
      if (!res.ok) throw new Error('Failed to fetch scripts');
      return res.json();
    },
  });

  const allScripts: ScriptData[] = data?.scripts || [];

  // Build category map
  const categoryMap: Record<string, number> = {};
  allScripts.forEach((s) => {
    const cat = s.category || 'Uncategorized';
    categoryMap[cat] = (categoryMap[cat] || 0) + 1;
  });

  // Sort categories alphabetically
  const sortedCategories = Object.entries(categoryMap).sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  const totalScripts = allScripts.length;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="flex items-center gap-2 px-3 py-2">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon-sm"
            className="lg:hidden"
            onClick={() => setMobileSidebarOpen(true)}
          >
            <Menu className="size-4" />
          </Button>

          {/* Logo and title */}
          <div className="flex items-center gap-2 mr-2">
            <Terminal className="size-5 text-green-500" />
            <h1 className="font-heading text-base font-semibold hidden sm:block">
              Script Manager
            </h1>
            <h1 className="font-heading text-base font-semibold sm:hidden">SM</h1>
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search scripts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>

          {/* View toggle */}
          <div className="hidden sm:flex items-center gap-0.5">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon-sm"
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="size-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon-sm"
              onClick={() => setViewMode('list')}
            >
              <List className="size-4" />
            </Button>
          </div>

          {/* Desktop sidebar toggle */}
          <Button
            variant="ghost"
            size="icon-sm"
            className="hidden lg:flex"
            onClick={toggleSidebar}
          >
            <Menu className="size-4" />
          </Button>

          <Separator orientation="vertical" className="h-5 mx-1" />

          {/* Actions */}
          <Button
            variant="outline"
            size="sm"
            className="hidden sm:flex"
            onClick={setUploadOpen.bind(null, true)}
          >
            <Upload className="size-3.5" />
            Upload
          </Button>

          <Button variant="ghost" size="icon-sm" className="relative" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute inset-0 m-auto size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setLlmSettingsOpen(true)}
          >
            <Settings className="size-4" />
          </Button>
        </div>
      </header>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        {sidebarOpen && (
          <aside className="hidden lg:flex w-56 flex-col border-r bg-muted/30">
            <div className="p-3">
              <div className="flex items-center gap-1.5 mb-3">
                <FolderOpen className="size-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase">
                  Categories
                </span>
              </div>
              <ScrollArea className="h-[calc(100vh-12rem)]">
                <div className="space-y-0.5">
                  {/* All category */}
                  <button
                    className={`w-full flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors ${
                      selectedCategory === 'All'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                    onClick={() => setSelectedCategory('All')}
                  >
                    <span>All Scripts</span>
                    <Badge variant="outline" className="text-[9px] h-4 px-1">
                      {totalScripts}
                    </Badge>
                  </button>

                  {sortedCategories.map(([cat, count]) => (
                    <button
                      key={cat}
                      className={`w-full flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors ${
                        selectedCategory === cat
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                      onClick={() => setSelectedCategory(cat)}
                    >
                      <span className="truncate">{cat}</span>
                      <Badge variant="outline" className="text-[9px] h-4 px-1 shrink-0">
                        {count}
                      </Badge>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </aside>
        )}

        {/* Mobile Sidebar */}
        <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
          <SheetContent side="left" className="w-64 p-0">
            <SheetHeader className="p-4 pb-2">
              <SheetTitle className="flex items-center gap-2">
                <FolderOpen className="size-4 text-muted-foreground" />
                Categories
              </SheetTitle>
              <SheetDescription>Filter scripts by category</SheetDescription>
            </SheetHeader>
            <div className="p-4 pt-0">
              <div className="space-y-0.5">
                <button
                  className={`w-full flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors ${
                    selectedCategory === 'All'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                  onClick={() => {
                    setSelectedCategory('All');
                    setMobileSidebarOpen(false);
                  }}
                >
                  <span>All Scripts</span>
                  <Badge variant="outline" className="text-[9px] h-4 px-1">
                    {totalScripts}
                  </Badge>
                </button>

                {sortedCategories.map(([cat, count]) => (
                  <button
                    key={cat}
                    className={`w-full flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors ${
                      selectedCategory === cat
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                    onClick={() => {
                      setSelectedCategory(cat);
                      setMobileSidebarOpen(false);
                    }}
                  >
                    <span className="truncate">{cat}</span>
                    <Badge variant="outline" className="text-[9px] h-4 px-1 shrink-0">
                      {count}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Main script list */}
        <main className="flex-1 overflow-y-auto">
          <ScriptList onUploadClick={() => setUploadOpen(true)} />
        </main>

        {/* Desktop Execution Panel */}
        {selectedScriptId && (
          <aside className="hidden lg:flex w-96 flex-col border-l bg-muted/30">
            <div className="flex items-center justify-between px-3 py-2 border-b">
              <span className="text-xs font-medium text-muted-foreground uppercase">
                Execution Panel
              </span>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setSelectedScript(null)}
              >
                <PanelRightClose className="size-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <ScriptExecutionPanel />
            </div>
          </aside>
        )}

        {/* Mobile Execution Panel */}
        <Sheet
          open={!!selectedScriptId}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedScript(null);
            }
          }}
        >
          <SheetContent side="right" className="w-full sm:w-96 p-0">
            <SheetHeader className="p-4 pb-2">
              <SheetTitle>Execution Panel</SheetTitle>
              <SheetDescription>Run and manage script execution</SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto">
              <ScriptExecutionPanel />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Footer */}
      <footer className="mt-auto border-t bg-muted/30 px-4 py-2">
        <p className="text-xs text-muted-foreground text-center">
          Script Manager &copy; 2025
        </p>
      </footer>

      {/* Dialogs */}
      <UploadScriptDialog open={uploadOpen} onOpenChange={setUploadOpen} />
      <LLMSettingsDialog open={llmSettingsOpen} onOpenChange={setLlmSettingsOpen} />
    </div>
  );
}
