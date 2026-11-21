import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { GoalCard, NewGoal, type GoalView } from "@/features/learning/components/goals";
import { listGoalsWithProgress } from "@/features/learning/service";

export const metadata = { title: "Objectius" };

async function Content() {
  const { goals, today } = await listGoalsWithProgress();
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {goals.map((g) => <GoalCard key={g.id} g={{ id: g.id, title: g.title, kind: g.kind, starts_on: g.starts_on, deadline: g.deadline, progress: g.progress } satisfies GoalView} />)}
      </div>
      <NewGoal today={today} />
    </div>
  );
}

export default function GoalsPage() {
  return <Suspense fallback={<Skeleton className="h-[400px]" />}><Content /></Suspense>;
}
