"use client";

import { useEffect, useState } from "react";
import { subscribeEmail } from "@/lib/supabase";

// Looks-real email check (intentionally loose — the backend is the real gate).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Set on dismissal AND successful signup so the popup never shows again here.
const DISMISS_KEY = "pp_email_dismissed";
// Remembered email (any successful signup) → enables one-tap per-part alerts.
const EMAIL_KEY = "pp_email";
// Part IDs the visitor is already watching → bell shows "Watching" across loads.
const WATCH_KEY = "pp_watches";
// Engagement signal fired by the catalog when a Buy link is clicked.
export const ENGAGE_EVENT = "pp:engage";

function getWatches(): number[] {
  try {
    const w = JSON.parse(localStorage.getItem(WATCH_KEY) || "[]");
    return Array.isArray(w) ? w : [];
  } catch {
    return [];
  }
}

type Status = "idle" | "sending" | "ok" | "error";

export function EmailSignupForm({
  source,
  partId,
  variant = "footer",
  onSuccess,
}: {
  source: string;
  partId?: number;
  variant?: "footer" | "popup";
  onSuccess?: () => void;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [msg, setMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "sending") return;
    const value = email.trim();
    if (!EMAIL_RE.test(value)) {
      setStatus("error");
      setMsg("Please enter a valid email address.");
      return;
    }
    setStatus("sending");
    setMsg("");
    // A failure here must never break the page.
    try {
      const res = await subscribeEmail(value, source, partId);
      if (res.ok) {
        try { localStorage.setItem(EMAIL_KEY, value); } catch { /* ignore */ }
        setStatus("ok");
        setMsg("You're in — we'll be in touch.");
        onSuccess?.();
      } else {
        setStatus("error");
        setMsg(res.error || "Something went wrong — please try again.");
      }
    } catch {
      setStatus("error");
      setMsg("Something went wrong — please try again.");
    }
  }

  if (status === "ok") {
    return <p className={`email-confirm email-confirm-${variant}`}>{msg}</p>;
  }

  return (
    <form className={`email-form email-form-${variant}`} onSubmit={handleSubmit} noValidate>
      <div className="email-row">
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          className="email-input"
          placeholder="you@email.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status === "error") {
              setStatus("idle");
              setMsg("");
            }
          }}
          aria-label="Email address"
        />
        <button type="submit" className="email-submit" disabled={status === "sending"}>
          {status === "sending" ? "…" : "Notify me"}
        </button>
      </div>
      {status === "error" && (
        <p className="email-error" role="alert">
          {msg}
        </p>
      )}
    </form>
  );
}

// Dismissible popup. Only after a deliberate Buy click (ENGAGE_EVENT) —
// never on page entry or from scrolling.
export function EmailPopup() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      return;
    }
    let triggered = false;
    function reveal() {
      if (triggered) return;
      triggered = true;
      setOpen(true);
      window.removeEventListener(ENGAGE_EVENT, reveal);
    }
    // Only after a deliberate engagement signal (a Buy click) — never on page
    // entry or from scrolling around, which felt like an on-load popup.
    window.addEventListener(ENGAGE_EVENT, reveal);
    return () => {
      window.removeEventListener(ENGAGE_EVENT, reveal);
    };
  }, []);

  function dismiss() {
    setOpen(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore storage failures
    }
  }

  if (!open) return null;

  return (
    <div className="email-pop-backdrop" onClick={dismiss}>
      <div
        className="email-pop"
        role="dialog"
        aria-modal="true"
        aria-label="Price-drop alerts"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="email-pop-close" onClick={dismiss} aria-label="Close">
          ✕
        </button>
        <p className="email-pop-eyebrow">Price-drop alerts</p>
        <p className="email-pop-copy">
          Get price-drop alerts on Subaru parts — we&rsquo;ll email you when a part you&rsquo;re
          watching gets cheaper.
        </p>
        <EmailSignupForm
          source="popup"
          variant="popup"
          onSuccess={() => {
            try {
              localStorage.setItem(DISMISS_KEY, "1");
            } catch {
              // ignore
            }
            // Let the confirmation show briefly, then close.
            window.setTimeout(() => setOpen(false), 2600);
          }}
        />
      </div>
    </div>
  );
}

function Bell({ filled = false }: { filled?: boolean }) {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

// Quiet per-part price alert. One tap if we already have the visitor's email;
// otherwise a compact inline email (+ optional target price) field.
export function PartAlert({ partId }: { partId: number }) {
  const [watching, setWatching] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [email, setEmail] = useState("");
  const [target, setTarget] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [msg, setMsg] = useState("");

  // Reflect prior watches saved in localStorage (client-only, post-hydration).
  useEffect(() => {
    if (getWatches().includes(partId)) setWatching(true);
  }, [partId]);

  async function subscribe(emailValue: string, targetValue?: number) {
    setStatus("sending");
    setMsg("");
    try {
      const res = await subscribeEmail(emailValue, "part_alert", partId, targetValue);
      if (res.ok) {
        try {
          localStorage.setItem(EMAIL_KEY, emailValue);
          const arr = getWatches();
          if (!arr.includes(partId)) {
            arr.push(partId);
            localStorage.setItem(WATCH_KEY, JSON.stringify(arr));
          }
        } catch { /* ignore storage failures */ }
        setExpanded(false);
        setWatching(true);
        setStatus("ok");
        setMsg("We'll email you when it drops");
      } else {
        setStatus("error");
        setMsg(res.error || "Something went wrong — please try again.");
      }
    } catch {
      setStatus("error");
      setMsg("Something went wrong — please try again.");
    }
  }

  function handleClick() {
    if (status === "sending") return;
    let stored: string | null = null;
    try { stored = localStorage.getItem(EMAIL_KEY); } catch { /* ignore */ }
    if (stored) {
      subscribe(stored); // one-tap — we already know who they are
    } else {
      setExpanded((v) => !v);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "sending") return;
    const value = email.trim();
    if (!EMAIL_RE.test(value)) {
      setStatus("error");
      setMsg("Enter a valid email.");
      return;
    }
    const cleaned = target.replace(/[^0-9.]/g, "");
    const t = cleaned ? Number(cleaned) : undefined;
    subscribe(value, t !== undefined && Number.isFinite(t) ? t : undefined);
  }

  if (watching) {
    return (
      <div className="part-alert">
        <span className="part-alert-watching">
          <Bell filled /> {status === "ok" ? msg : "Watching"}
        </span>
      </div>
    );
  }

  return (
    <div className="part-alert">
      <button
        type="button"
        className="part-alert-btn"
        onClick={handleClick}
        disabled={status === "sending"}
        aria-expanded={expanded}
      >
        <Bell /> {status === "sending" ? "…" : "Alert me"}
      </button>

      {expanded && (
        <form className="part-alert-form" onSubmit={handleSubmit} noValidate>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            className="pa-input"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (status === "error") { setStatus("idle"); setMsg(""); }
            }}
            aria-label="Email address"
          />
          <span className="pa-price">
            <span className="pa-dollar" aria-hidden>$</span>
            <input
              type="text"
              inputMode="decimal"
              className="pa-price-input"
              placeholder="under (optional)"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              aria-label="Target price (optional)"
            />
          </span>
          <button type="submit" className="pa-submit" disabled={status === "sending"}>
            {status === "sending" ? "…" : "Watch"}
          </button>
        </form>
      )}

      {status === "error" && (
        <p className="email-error pa-error" role="alert">{msg}</p>
      )}
    </div>
  );
}
