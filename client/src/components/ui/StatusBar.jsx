import { Clock, CheckCircle, ChefHat, Bell, UtensilsCrossed } from 'lucide-react';

const STEPS = [
  { key: 'pending',  label: 'Placed',   icon: Clock },
  { key: 'approved', label: 'Approved', icon: CheckCircle },
  { key: 'preparing',label: 'Cooking',  icon: ChefHat },
  { key: 'ready',    label: 'Ready',    icon: Bell },
  { key: 'served',   label: 'Served',   icon: UtensilsCrossed },
];

export default function StatusBar({ currentStatus }) {
  const current = STEPS.findIndex((s) => s.key === currentStatus);

  return (
    <div className="flex items-center gap-0 px-4 py-3">
      {STEPS.map((step, i) => {
        const Icon = step.icon;
        const done    = i < current;
        const active  = i === current;
        const future  = i > current;

        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-300
                ${active ? 'bg-primary ring-4 ring-primary/20' : done ? 'bg-primary' : 'bg-border'}`}>
                <Icon size={15} className={done || active ? 'text-white' : 'text-muted'} />
              </div>
              <span className={`text-[10px] font-medium whitespace-nowrap
                ${active ? 'text-primary font-bold' : done ? 'text-primary' : 'text-muted'}`}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 mx-1 rounded transition-colors duration-300
                ${done ? 'bg-primary' : 'bg-border'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
