import { cookies } from "next/headers";
import { Suspense } from "react";
import { MobileHeader, MobileNav } from "@/components/layout/mobile-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { countUnreadReports } from "@/features/market-reports/queries";

async function SidebarWithState() {
  const [store, unread] = await Promise.all([cookies(), countUnreadReports().catch(() => 0)]);
  return <Sidebar initialCollapsed={store.get("tl_sidebar")?.value === "1"} unreadReports={unread} />;
}

async function MobileNavWithState() {
  const unread = await countUnreadReports().catch(() => 0);
  return <MobileNav unreadReports={unread} />;
}

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh">
      <a href="#contingut" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-primary focus:px-3 focus:py-2 focus:text-white">
        Salta al contingut
      </a>
      <Suspense fallback={<Sidebar initialCollapsed={false} unreadReports={0} />}>
        <SidebarWithState />
      </Suspense>
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader />
        <main id="contingut" className="mx-auto w-full max-w-[1400px] flex-1 px-4 pb-28 pt-6 sm:px-6 md:pb-10 lg:px-8 lg:pt-8">
          {children}
        </main>
      </div>
      <Suspense fallback={<MobileNav unreadReports={0} />}>
        <MobileNavWithState />
      </Suspense>
    </div>
  );
}
