import { getCurrentUser } from "@/lib/session";
import { getDb } from "@/db";
import { messes, messMembers } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import SettingsForm from "./form";

export default async function SettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const db = getDb();
  const access = await db.select().from(messMembers).where(and(eq(messMembers.messId, id), eq(messMembers.userId, user.id))).limit(1);
  if (!access[0]) notFound();
  const mess = await db.select().from(messes).where(eq(messes.id, id)).limit(1);
  if (!mess[0]) notFound();
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-lg font-bold">মেস সেটিংস</h1>
      <SettingsForm mess={mess[0]} role={access[0].role} />
    </div>
  );
}
