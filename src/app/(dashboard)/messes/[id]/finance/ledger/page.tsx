"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type Member = { id: string; fullName: string };
type Entry = { id: string; date: string; type: string; description: string; debitPaisa: number; creditPaisa: number; balancePaisa: number };

export default function LedgerPage() {
  const { id } = useParams<{ id: string }>();
  const [members, setMembers] = useState<Member[]>([]);
  const [selected, setSelected] = useState("");
  const [ledger, setLedger] = useState<Entry[]>([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch(`/api/messes/${id}/members`).then((r) => r.json()).then((d) => {
      if (d.members) {
        const ms = d.members.map((m: { id: string; fullName: string }) => ({ id: m.id, fullName: m.fullName }));
        setMembers(ms);
        if (ms[0]) setSelected(ms[0].id);
      }
    });
  }, [id]);

  async function load(memberId: string) {
    if (!memberId) return;
    const res = await fetch(`/api/messes/${id}/ledger?memberId=${memberId}`);
    const data = await res.json();
    if (!res.ok) setMsg(data.error);
    else {
      setLedger(data.ledger);
      setMsg("");
    }
  }
  useEffect(() => { if (selected) load(selected); }, [selected, id]);

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <Link href={`/messes/${id}/finance`} className="text-sm text-zinc-500">← Finance Hub</Link>
      <h1 className="text-lg font-bold">Member Ledger</h1>

      <div className="bg-white border rounded-2xl p-4">
        <label className="text-xs">Select Member</label>
        <select value={selected} onChange={(e) => setSelected(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm mt-1">
          {members.map((m) => <option key={m.id} value={m.id}>{m.fullName}</option>)}
        </select>
      </div>

      {msg && <div className="rounded-xl bg-red-50 border p-3 text-sm text-red-700">{msg}</div>}

      <div className="bg-white border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs text-zinc-500"><tr><th className="text-left p-3">Date</th><th className="text-left p-3">Description</th><th className="text-right p-3">Debit</th><th className="text-right p-3">Credit</th><th className="text-right p-3">Balance</th></tr></thead>
          <tbody>
            {ledger.map((e) => (
              <tr key={e.id} className="border-t">
                <td className="p-3 text-xs">{e.date}</td>
                <td className="p-3 text-xs">{e.description}</td>
                <td className="p-3 text-right text-red-600">{e.debitPaisa ? `৳${(e.debitPaisa / 100).toFixed(2)}` : "—"}</td>
                <td className="p-3 text-right text-emerald-600">{e.creditPaisa ? `৳${(e.creditPaisa / 100).toFixed(2)}` : "—"}</td>
                <td className="p-3 text-right font-bold">৳{(e.balancePaisa / 100).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {ledger.length === 0 && <div className="p-6 text-center text-sm text-zinc-500">No ledger entries — add deposits to see credits. Meal costs appear via Settlement.</div>}
      </div>
      <p className="text-xs text-zinc-500">Historical ledger never deleted — void via reversal. Privacy: members can only view own ledger unless manager.</p>
    </div>
  );
}
