import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

// Use system font stack instead of next/font/google to avoid build-time network fetch
const geistSans = { variable: "" };
const geistMono = { variable: "" };

export const metadata: Metadata = {
  title: "ScriptHub - Structural Biology Script Manager",
  description: "Manage, generate, and execute ChimeraX and PyMOL scripts for structural biology workflows.",
  keywords: ["ScriptHub", "ChimeraX", "PyMOL", "structural biology", "script manager", "Z.ai"],
  authors: [{ name: "Z.ai Team" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
