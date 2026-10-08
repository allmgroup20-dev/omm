import { redirect } from "next/navigation";

// Market hub removed — the entries list is the hub (has + New + filters + merge/delete).
export default async function MarketHubRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/messes/${id}/market/entries`);
}
