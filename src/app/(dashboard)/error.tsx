"use client";
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-2xl border bg-red-50 border-red-200 p-6 text-center">
      <div className="font-semibold text-sm text-red-700">Something went wrong</div>
      <div className="text-xs text-red-600 mt-1">{error.message}</div>
      <button onClick={() => reset()} className="mt-3 px-4 py-1.5 border rounded-full text-sm bg-white">Try again</button>
    </div>
  );
}
