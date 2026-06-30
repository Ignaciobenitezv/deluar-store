import { dashboardUi } from "../lib/dashboard-ui";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: React.ReactNode;
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div
      className={`rounded-[18px] border border-dashed border-slate-200/60 bg-slate-50 p-4 sm:rounded-[20px] sm:p-5 ${dashboardUi.shadowSoft}`}
    >
      <p className="text-[13px] font-medium text-slate-900 sm:text-sm">{title}</p>
      <p className="mt-1.5 text-[13px] leading-5 text-slate-500 sm:mt-2 sm:text-sm sm:leading-6">
        {description}
      </p>
      {action ? <div className="mt-3 sm:mt-4">{action}</div> : null}
    </div>
  );
}
