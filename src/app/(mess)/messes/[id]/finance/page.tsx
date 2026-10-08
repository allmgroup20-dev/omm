import { redirect } from "next/navigation";

// Finance hub removed — dues is the money home (deposits/dues are 1 tap from mess home).
export default async function FinanceHubRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/messes/${id}/finance/dues`);
}
