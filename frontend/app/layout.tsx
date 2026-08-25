import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { OfflineIndicator } from "@/components/layout/offline-indicator";
import { WebVitalsReporter } from "@/components/layout/web-vitals-reporter";
import { Providers } from "@/lib/runtime/providers";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const FAVICON_HREF = "/branding/favicon_logo.png";

export const metadata: Metadata = {
  title: "PandaCue App",
  description: "Everything you need to power your salon and spa",
  icons: {
    icon: [{ url: FAVICON_HREF, type: "image/png" }],
    apple: [{ url: FAVICON_HREF, type: "image/png" }],
  },
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
      className={`${montserrat.variable} ${montserrat.className} h-full antialiased`}
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
