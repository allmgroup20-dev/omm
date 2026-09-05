"use client";
import { useEffect } from "react";

declare global {
  interface Window {
    turnstile?: { render: (el: string, opts: Record<string, unknown>) => string; reset: (id: string) => void };
    onTurnstileCallback?: (token: string) => void;
  }
}

export function TurnstileWidget({ siteKey, onVerify }: { siteKey: string; onVerify: (token: string) => void }) {
  useEffect(() => {
    if (!siteKey) return;
    const existing = document.querySelector('script[src*="challenges.cloudflare.com/turnstile"]');
    if (!existing) {
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
      s.async = true;
      s.defer = true;
      document.head.appendChild(s);
    }
    // Poll for render
    const id = setInterval(() => {
      const el = document.getElementById("cf-turnstile");
      if (el && window.turnstile) {
        clearInterval(id);
        window.onTurnstileCallback = onVerify;
        window.turnstile.render("#cf-turnstile", { sitekey: siteKey, callback: "onTurnstileCallback", theme: "light" });
      }
    }, 500);
    return () => clearInterval(id);
  }, [siteKey, onVerify]);

  if (!siteKey) return null;
  return <div id="cf-turnstile" className="mt-3" />;
}
