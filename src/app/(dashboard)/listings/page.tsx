import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import MyListings from "./list";

export default async function MyListingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/listings");
  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">আমার লিস্টিং</h1>
        <Link href="/listings/new" className="px-4 py-2 rounded-full bg-zinc-900 text-white text-sm">+ নতুন লিস্টিং</Link>
      </div>
      <MyListings />
    </div>
  );
}
