import React, { useEffect, useState, useCallback } from "react";
import { getSubscription, buildCancelTx, buildPayPerUseTx } from "../stellar";

interface Props {
  userKey: string;
  onSign: (xdr: string) => Promise<string>;
  refreshTrigger: number;
}

type Sub = {
  merchant: string;
  amount: string;
  interval: number;
  last_charged: number;
  active: boolean;
};

function formatInterval(secs: number): string {
  if (secs >= 2_592_000) return `${Math.round(secs / 2_592_000)}mo`;
  if (secs >= 604_800) return `${Math.round(secs / 604_800)}w`;
  if (secs >= 86_400) return `${Math.round(secs / 86_400)}d`;
  return `${secs}s`;
}

export default function Dashboard({ userKey, onSign, refreshTrigger }: Props) {
  const [sub, setSub] = useState<Sub | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [ppuAmount, setPpuAmount] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSubscription(userKey);
      setSub(data);
    } catch {
      setSub(null);
    } finally {
      setLoading(false);
    }
  }, [userKey]);

  useEffect(() => { load(); }, [load, refreshTrigger]);

  async function handleCancel() {
    setActionStatus(null);
    try {
      const xdr = await buildCancelTx(userKey);
      const hash = await onSign(xdr);
      setActionStatus(`Cancelled. tx: ${hash.slice(0, 12)}…`);
      load();
    } catch (e: unknown) {
      setActionStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function handlePayPerUse() {
    setActionStatus(null);
    try {
      const stroops = BigInt(Math.round(parseFloat(ppuAmount) * 10_000_000));
      const xdr = await buildPayPerUseTx(userKey, stroops);
      const hash = await onSign(xdr);
      setActionStatus(`Paid! tx: ${hash.slice(0, 12)}…`);
    } catch (e: unknown) {
      setActionStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  if (loading) return <p style={{ color: "#64748b" }}>Loading subscription…</p>;

  if (!sub) {
    return (
      <div className="card">
        <p style={{ color: "#64748b" }}>No active subscription found.</p>
      </div>
    );
  }

  const nextCharge = new Date((sub.last_charged + sub.interval) * 1000).toLocaleDateString();
  const xlm = (Number(sub.amount) / 10_000_000).toFixed(7);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Your Subscription</h2>
          <span className={`badge ${sub.active ? "badge-active" : "badge-inactive"}`}>
            {sub.active ? "Active" : "Cancelled"}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 14 }}>
          <Row label="Merchant" value={`${sub.merchant.slice(0, 8)}…${sub.merchant.slice(-6)}`} />
          <Row label="Amount" value={`${xlm} XLM`} />
          <Row label="Interval" value={formatInterval(sub.interval)} />
          <Row label="Next charge" value={sub.active ? nextCharge : "—"} />
        </div>

        {sub.active && (
          <button
            onClick={handleCancel}
            style={{ background: "#7f1d1d", color: "#fca5a5", marginTop: 20, width: "100%" }}
          >
            Cancel Subscription
          </button>
        )}
      </div>

      {sub.active && (
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Pay-per-use</h3>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="number"
              min="0.0000001"
              step="0.0000001"
              placeholder="Amount in XLM"
              value={ppuAmount}
              onChange={(e) => setPpuAmount(e.target.value)}
            />
            <button
              onClick={handlePayPerUse}
              disabled={!ppuAmount}
              style={{ background: "#1d4ed8", color: "#fff", whiteSpace: "nowrap" }}
            >
              Pay now
            </button>
          </div>
        </div>
      )}

      {actionStatus && (
        <p style={{ fontSize: 13, color: actionStatus.startsWith("Error") ? "#f87171" : "#4ade80" }}>
          {actionStatus}
        </p>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ color: "#64748b" }}>{label}</span>
      <span style={{ fontFamily: "monospace" }}>{value}</span>
    </div>
  );
}
