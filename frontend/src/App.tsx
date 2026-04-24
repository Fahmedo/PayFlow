import React, { useState } from "react";
import { useWallet } from "./hooks/useWallet";
import SubscribeForm from "./components/SubscribeForm";
import Dashboard from "./components/Dashboard";

export default function App() {
  const { publicKey, connect, signAndSubmit, error } = useWallet();
  const [tab, setTab] = useState<"subscribe" | "dashboard">("dashboard");
  const [refresh, setRefresh] = useState(0);

  return (
    <div className="app-shell">
      {/* Header */}
      <div className="app-header">
        <h1 className="app-header__title">⚡ FlowPay</h1>
        <p className="app-header__subtitle">
          Decentralized recurring payments on Stellar
        </p>
      </div>

      {/* Wallet connect */}
      {!publicKey ? (
        <div className="card" style={{ textAlign: "center" }}>
          <p style={{ color: "var(--color-text-muted)", marginBottom: "var(--space-4)", fontSize: "var(--text-base)" }}>
            Connect your Freighter wallet to get started.
          </p>
          <button
            onClick={connect}
            className="btn-primary"
            style={{ width: "100%" }}
          >
            Connect Wallet
          </button>
          {error && <p style={{ color: "var(--color-danger)", marginTop: "var(--space-3)", fontSize: "var(--text-sm)" }}>{error}</p>}
        </div>
      ) : (
        <>
          {/* Connected bar */}
          <div className="card wallet-bar">
            <span className="wallet-bar__label">Connected</span>
            <span className="wallet-bar__address">
              {publicKey.slice(0, 6)}…{publicKey.slice(-4)}
            </span>
          </div>

          {/* Tabs */}
          <div className="tab-bar">
            {(["dashboard", "subscribe"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                /* Dynamic: active class is state-driven — className expression is intentional */
                className={`tab-button${tab === t ? " tab-button--active" : ""}`}
              >
                {t === "dashboard" ? "Dashboard" : "Subscribe"}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="card">
            {tab === "subscribe" ? (
              <SubscribeForm
                userKey={publicKey}
                onSign={signAndSubmit}
                onSuccess={() => { setTab("dashboard"); setRefresh((r) => r + 1); }}
              />
            ) : (
              <Dashboard
                userKey={publicKey}
                onSign={signAndSubmit}
                refreshTrigger={refresh}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
