import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getRequestDb } from "@/db";
import { messes, messMembers, mealTypes, marketCategories, marketProducts, auditLogs } from "@/db/schema";
import { createMessSchema } from "@/lib/validators-mess";
import { generateMessCode, slugify } from "@/lib/mess";
import { validateChain } from "@/lib/bd-geo";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getRequestDb();
  // list messes where user is member
  const rows = await db
    .select({ mess: messes, member: messMembers })
    .from(messMembers)
    .innerJoin(messes, eq(messMembers.messId, messes.id))
    .where(eq(messMembers.userId, user.id));
  return NextResponse.json({ messes: rows.map((r) => ({ ...r.mess, role: r.member.role, memberStatus: r.member.status })) });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = createMessSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 400 });

  const data = parsed.data;
  // Government hierarchy validation (division → district → upazila → union)
  if (data.division || data.district || data.upazila || data.unionName) {
    const chain = validateChain({
      division: data.division?.trim() || "",
      district: data.district?.trim() || "",
      upazila: data.upazila?.trim() || "",
      union: data.unionName?.trim() || "",
    });
    if (!chain) return NextResponse.json({ error: "ঠিকানা সঠিক নয় — বিভাগ/জেলা/উপজেলা/ইউনিয়ন সরকারি তালিকা থেকে বেছে নিন" }, { status: 400 });
  }
  const db = await getRequestDb();
  const now = new Date().toISOString();
  const messId = nanoid();
  const code = generateMessCode();
  const thresholdPaisa = data.expenseApprovalThreshold !== undefined ? Math.round(data.expenseApprovalThreshold * 100) : 500000;

  try {
    await db.insert(messes).values({
      id: messId,
      name: data.name.trim(),
      code,
      description: data.description?.trim() || null,
      address: data.address?.trim() || null,
      division: data.division?.trim() || null,
      district: data.district?.trim() || null,
      upazila: data.upazila?.trim() || null,
      unionName: data.unionName?.trim() || null,
      area: data.area?.trim() || null,
      postalCode: data.postalCode?.trim() || null,
      contactInfo: data.contactInfo?.trim() || null,
      currency: data.currency || "BDT",
      timezone: data.timezone || "Asia/Dhaka",
      status: "active",
      startDate: data.startDate,
      defaultMealPrecision: data.defaultMealPrecision ?? 50,
      mealCostingModel: data.mealCostingModel ?? "food_only",
      costAllocation: data.costAllocation ?? "equal",
      expenseApprovalThresholdPaisa: thresholdPaisa,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now,
    });

    // creator as primary manager
    await db.insert(messMembers).values({
      id: nanoid(),
      messId,
      userId: user.id,
      role: "manager",
      isPrimaryManager: true,
      status: "active",
      joinedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    // default meal types if not provided
    const mealDefs = data.mealTypes?.length ? data.mealTypes : [{ name: "Breakfast" }, { name: "Lunch" }, { name: "Dinner" }];
    for (let i = 0; i < mealDefs.length; i++) {
      const m = mealDefs[i];
      await db.insert(mealTypes).values({
        id: nanoid(),
        messId,
        name: m.name.trim(),
        slug: slugify(m.name),
        sortOrder: m.sortOrder ?? i,
        isActive: true,
        createdAt: now,
      });
    }

    // default market categories + common products (Bangla, editable later)
    const defaultCats: { name: string; products: string[] }[] = [
      { name: "চাল", products: ["চাল"] },
      { name: "ডাল", products: ["মসুর ডাল", "মুগ ডাল"] },
      { name: "মাছ", products: ["ইলিশ", "রুই", "কাতলা", "পাঙ্গাশ"] },
      { name: "মাংস", products: ["গরুর মাংস", "মুরগি"] },
      { name: "ডিম", products: ["ডিম"] },
      { name: "সবজি", products: ["আলু", "পেঁয়াজ", "টমেটো", "বেগুন", "মরিচ"] },
      { name: "মসলা", products: ["হলুদ", "মরিচ গুঁড়া", "ধনিয়া", "জিরা"] },
      { name: "তেল", products: ["সয়াবিন তেল", "সরিষার তেল"] },
      { name: "দুধ", products: ["দুধ"] },
      { name: "অন্যান্য", products: [] },
    ];
    for (let i = 0; i < defaultCats.length; i++) {
      const catId = nanoid();
      const cat = defaultCats[i];
      await db.insert(marketCategories).values({
        id: catId,
        messId,
        parentId: null,
        name: cat.name,
        slug: slugify(cat.name),
        level: 0,
        sortOrder: i,
        isActive: true,
        createdAt: now,
      });
      for (const pname of cat.products) {
        await db.insert(marketProducts).values({
          id: nanoid(),
          messId,
          categoryId: catId,
          name: pname,
          slug: slugify(pname),
          defaultUnit: "kg",
          isArchived: false,
          createdAt: now,
        });
      }
    }

    await db.insert(auditLogs).values({
      id: nanoid(),
      messId,
      actorId: user.id,
      action: "create",
      entityType: "mess",
      entityId: messId,
      afterJson: JSON.stringify({ name: data.name, code }),
      createdAt: now,
    });

    return NextResponse.json({ ok: true, mess: { id: messId, code, name: data.name } });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("UNIQUE")) return NextResponse.json({ error: "Mess code collision, retry" }, { status: 409 });
    return NextResponse.json({ error: "Create failed", detail: msg }, { status: 500 });
  }
}
