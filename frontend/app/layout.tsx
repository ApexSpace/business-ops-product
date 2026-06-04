import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { OfflineIndicator } from "@/components/layout/offline-indicator";
import { WebVitalsReporter } from "@/components/layout/web-vitals-reporter";
import { Providers } from "@/lib/runtime/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CodeSol Business Automation",
  description: "Platform and business automation for app.codesoltech.com",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans" suppressHydrationWarning>
        <Providers>
          <WebVitalsReporter />
          {children}
          <OfflineIndicator />
        </Providers>
      </body>
    </html>
  );
}
