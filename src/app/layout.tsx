import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/lib/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Script Manager",
  description: "Manage and execute your scripts",
};

// Local font stack — avoids Google Fonts dependency in offline / sandboxed envs.
// The --font-sans / --font-geist-mono vars are consumed by globals.css (@theme inline).
const fontStyle = `
  :root {
    --font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
    --font-geist-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
  }
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <head>
        <style dangerouslySetInnerHTML={{ __html: fontStyle }} />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <Providers>
          {children}
          <Toaster richColors position="bottom-right" />
        </Providers>
      </body>
    </html>
  );
}
