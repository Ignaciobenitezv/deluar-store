"use client";

import { createContext, useContext, useMemo, useState } from "react";

/** Which side of the pairing is currently pointing at a day. */
export type LedgerHighlightSource = "band" | "ledger";

type LedgerHighlightValue = {
  activeDate: string | null;
  activeSource: LedgerHighlightSource | null;
  setActiveDate: (dateKey: string | null, source?: LedgerHighlightSource) => void;
};

const LedgerHighlightContext = createContext<LedgerHighlightValue>({
  activeDate: null,
  activeSource: null,
  setActiveDate: () => {},
});

/**
 * Binds the period band to the ledger below it: pointing at a day in the chart
 * marks the orders booked that day, and pointing at an order marks its day on
 * the chart. Both directions share this one piece of state.
 */
export function LedgerHighlightProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState<{
    date: string | null;
    source: LedgerHighlightSource | null;
  }>({ date: null, source: null });

  const value = useMemo<LedgerHighlightValue>(
    () => ({
      activeDate: active.date,
      activeSource: active.source,
      setActiveDate: (dateKey, source = "ledger") =>
        setActive(dateKey === null ? { date: null, source: null } : { date: dateKey, source }),
    }),
    [active],
  );

  return (
    <LedgerHighlightContext.Provider value={value}>
      {children}
    </LedgerHighlightContext.Provider>
  );
}

export function useLedgerHighlight() {
  return useContext(LedgerHighlightContext);
}
