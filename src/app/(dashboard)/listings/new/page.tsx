import Link from "next/link";
import ListingForm from "@/components/listing-form";

export default function NewListingPage() {
  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <Link href="/listings" className="text-sm text-zinc-500">← আমার লিস্টিং</Link>
      <h1 className="text-lg font-bold">নতুন সিট / রুম লিস্টিং</h1>
      <ListingForm />
    </div>
  );
}
