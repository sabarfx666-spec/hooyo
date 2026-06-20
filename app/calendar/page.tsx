import { CalendarGrid } from "@/components/calendar/CalendarGrid";

export default function CalendarPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <h1 className="font-mono text-lg font-bold text-white tracking-widest uppercase">Calendar</h1>
      <CalendarGrid />
    </div>
  );
}
