import { BiasSelector }       from "@/components/journal/BiasSelector";
import { SessionSelector }     from "@/components/journal/SessionSelector";
import { PairWatchlist }       from "@/components/journal/PairWatchlist";
import { PsychologySelector }  from "@/components/journal/PsychologySelector";
import { ChecklistProgress }   from "@/components/journal/ChecklistProgress";
import { RulesList }           from "@/components/journal/RulesList";
import { TradeSummary }        from "@/components/journal/TradeSummary";
import { ChartSnapshots }      from "@/components/journal/ChartSnapshots";
import { DailyRitual }         from "@/components/journal/DailyRitual";

export default function Dashboard() {
  return (
    <div className="max-w-5xl mx-auto space-y-7 pb-10">

      {/* Daily pre-market readiness check — shows once per day */}
      <DailyRitual />

      {/* Selectors */}
      <div className="anim-fade-up d-100"><BiasSelector /></div>
      <div className="anim-fade-up d-200"><SessionSelector /></div>
      <div className="anim-fade-up d-300"><PairWatchlist /></div>

      {/* Progress */}
      <div className="anim-fade-up d-400">
        <ChecklistProgress />
      </div>

      {/* Rules */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="anim-fade-up d-500"><RulesList category="BASIS" /></div>
        <div className="anim-fade-up d-600"><RulesList category="ENTRY" /></div>
      </div>

      {/* Proof / Chart Snapshots */}
      <div className="anim-fade-up d-600">
        <ChartSnapshots />
      </div>

      {/* Psychology */}
      <div className="anim-fade-up d-700">
        <PsychologySelector />
      </div>

      {/* Summary + Decision */}
      <div className="anim-fade-up d-700">
        <TradeSummary />
      </div>

    </div>
  );
}
