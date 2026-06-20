import { RulesList } from "@/components/journal/RulesList";
import { ChecklistProgress } from "@/components/journal/ChecklistProgress";
import { ChartSnapshots } from "@/components/journal/ChartSnapshots";

export default function ChecklistPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <h1 className="font-mono text-lg font-bold text-white tracking-widest uppercase">Rules Checklist</h1>
      <ChecklistProgress />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RulesList category="BASIS" />
        <RulesList category="ENTRY" />
      </div>
      <ChartSnapshots />
    </div>
  );
}
