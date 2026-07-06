import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { OfflineIndicator } from "@/components/layout/offline-indicator";
import { WebVitalsReporter } from "@/components/layout/web-vitals-reporter";
import { Providers } from "@/lib/runtime/providers";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
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
      className={`${poppins.variable} ${poppins.className} h-full antialiased`}
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
