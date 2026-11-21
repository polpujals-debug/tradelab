import { connection } from "next/server";
import { Suspense } from "react";
import { StatTile } from "@/components/shared/hero";
import { Skeleton } from "@/components/ui/skeleton";
import { Practice } from "@/features/learning/components/practice";
import { nextPracticeQuestion, practiceStats } from "@/features/learning/service";
import { formatPct } from "@/lib/format";

export const metadata = { title: "Mode pràctica" };

async function Content() {
  await connection();
  const [first, stats] = await Promise.all([nextPracticeQuestion(), practiceStats()]);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Intents" value={String(stats.total)} tone="primary" />
        <StatTile label="Encert del biaix" value={formatPct(stats.accuracy, { decimals: 0 })} tone="profit" hint="històric" />
        <StatTile label="Darrers 20" value={formatPct(stats.recentAccuracy, { decimals: 0 })} tone="cyan" />
      </div>
      <Practice first={first} />
    </div>
  );
}

export default function PracticePage() {
  return <Suspense fallback={<Skeleton className="h-[560px]" />}><Content /></Suspense>;
}
