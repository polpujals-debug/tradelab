import { BookMarked, Bot } from "lucide-react";
import { headers } from "next/headers";
import { Suspense } from "react";
import { Hero } from "@/components/shared/hero";
import { Markdown } from "@/components/shared/markdown";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiReference, claudeInstructions } from "@/features/api-docs/content";
import { CopyButton } from "@/features/api-docs/copy-button";

export const metadata = { title: "API" };

async function Docs() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? `${proto}://${host}`;
  const instructions = claudeInstructions(base);
  return (
    <Tabs defaultValue="claude">
      <TabsList className="mb-4">
        <TabsTrigger value="claude"><Bot className="mr-1.5 inline size-3.5" />Instruccions per a Claude</TabsTrigger>
        <TabsTrigger value="ref"><BookMarked className="mr-1.5 inline size-3.5" />Referència</TabsTrigger>
      </TabsList>
      <TabsContent value="claude">
        <Card>
          <CardContent className="space-y-4 p-5 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/30 bg-primary/[0.07] p-3 text-sm text-muted">
              <span>Copia aquest text i enganxa&apos;l a Claude (xat i tasca programada). Recorda posar-hi la teva clau.</span>
              <CopyButton text={instructions} label="Copiar instruccions" />
            </div>
            <Markdown>{instructions}</Markdown>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="ref">
        <Card><CardContent className="p-5 sm:p-8"><Markdown>{apiReference(base)}</Markdown></CardContent></Card>
      </TabsContent>
    </Tabs>
  );
}

export default function ApiDocsPage() {
  return (
    <>
      <Hero icon={BookMarked} eyebrow="Integració amb Claude" title="API v1" description="Com Claude i la tasca programada envien anàlisis, operacions i informes a TradeLab." />
      <Suspense fallback={<Skeleton className="h-[800px]" />}><Docs /></Suspense>
    </>
  );
}
