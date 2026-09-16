type EmptyStateProps = {
  title: string;
  description: string;
  action?: React.ReactNode;
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-background p-4 sm:p-5">
      <p className="text-[12.5px] font-medium text-text-primary sm:text-[13px]">{title}</p>
      <p className="mt-1.5 text-[12.5px] leading-5 text-text-secondary sm:mt-2 sm:text-[13px] sm:leading-6">
        {description}
      </p>
      {action ? <div className="mt-3 sm:mt-4">{action}</div> : null}
    </div>
  );
}
