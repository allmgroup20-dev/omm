export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-white p-10 text-center">
      <div className="font-medium">{title}</div>
      {description && <div className="text-sm text-zinc-500 mt-1">{description}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
export function LoadingState({ text = "লোড হচ্ছে..." }: { text?: string }) {
  return <div className="rounded-2xl border bg-white p-10 text-center text-sm text-zinc-500 animate-pulse">{text}</div>;
}
export function ErrorState({ error, retry }: { error: string; retry?: () => void }) {
  return (
    <div className="rounded-2xl border bg-red-50 border-red-200 p-6 text-center">
      <div className="text-sm text-red-700">{error}</div>
      {retry && <button onClick={retry} className="mt-3 px-4 py-1.5 border rounded-full text-sm bg-white">Retry</button>}
    </div>
  );
}
