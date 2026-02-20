import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/components/providers/ThemeProvider';

export const metadata: Metadata = {
  title: 'Nelantir Nexus',
  description: 'Nelantir Nexus: create and publish technical content in one workflow',
};

const themeScript = `
  (function() {
    try {
      const savedTheme = localStorage.getItem('nelantir-nexus-theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const theme = savedTheme === 'dark' || savedTheme === 'light'
        ? savedTheme
        : (prefersDark ? 'dark' : 'light');
      document.documentElement.classList.toggle('dark', theme === 'dark');
      document.documentElement.setAttribute('data-theme', theme);
    } catch (error) {}
  })();
`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-background text-foreground antialiased">
        <a href="#main-content" className="skip-link">
          본문으로 건너뛰기
        </a>
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
