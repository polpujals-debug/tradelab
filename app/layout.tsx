import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "TradeLab", template: "%s · TradeLab" },
  description: "Plataforma personal de trading, anàlisi i aprenentatge.",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "TradeLab", statusBarStyle: "black-translucent" },
  applicationName: "TradeLab",
};

export const viewport: Viewport = {
  themeColor: "#05070D",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ca" className={`${GeistSans.variable} ${GeistMono.variable} dark`}>
      <body>
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster
          theme="dark"
          position="top-right"
          toastOptions={{ classNames: { toast: "!bg-card !border-border !text-fg !rounded-xl", description: "!text-muted" } }}
        />
      </body>
    </html>
  );
}
