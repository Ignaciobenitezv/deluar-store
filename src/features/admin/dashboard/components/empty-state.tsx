import { dashboardUi } from "../lib/dashboard-ui";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: React.ReactNode;
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className={`rounded-[20px] border border-dashed border-slate-200 bg-slate-50 p-5 ${dashboardUi.shadowSoft}`}>
      <p className="text-sm font-medium text-slate-900">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

