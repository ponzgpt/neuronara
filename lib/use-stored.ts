"use client";
// useState that survives reloads. Reads after mount to keep server and client HTML identical;
// storage failures (private mode, blocked cookies) fall back to plain state.
import { useEffect, useState } from "react";

// `fromUrl`, when given, wins over storage (a shared link shows what the link says) and is never written to it.
export function useStored<T>(key: string, initial: T, fromUrl?: T): [T, (v: T) => void] {
  const [value, setValue] = useState(fromUrl ?? initial);
  const sig = JSON.stringify(fromUrl);
  useEffect(() => {
    if (fromUrl !== undefined) return setValue(fromUrl);
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) setValue(JSON.parse(raw));
    } catch {}
  }, [key, sig]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (v: T) => {
    setValue(v);
    try { localStorage.setItem(key, JSON.stringify(v)); } catch {}
  };
  return [value, set];
}
