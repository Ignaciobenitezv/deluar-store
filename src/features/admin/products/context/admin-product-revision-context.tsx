"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { logger } from "@/lib/logger";

export type AdminProductRevisionSource = "detail" | "images" | "variants";

type AdminProductRevisionState = {
  currentRev: string;
  updatedAt: string;
};

type AdminProductRevisionCommit = {
  source: AdminProductRevisionSource;
  rev: string;
  updatedAt: string;
};

type AdminProductRevisionContextValue = AdminProductRevisionState & {
  applyCommit: (commit: AdminProductRevisionCommit) => void;
};

const AdminProductRevisionContext = createContext<AdminProductRevisionContextValue | null>(null);

type AdminProductRevisionProviderProps = {
  initialRev: string;
  initialUpdatedAt: string;
  children: React.ReactNode;
};

export function AdminProductRevisionProvider({
  initialRev,
  initialUpdatedAt,
  children,
}: AdminProductRevisionProviderProps) {
  const [state, setState] = useState<AdminProductRevisionState>({
    currentRev: initialRev,
    updatedAt: initialUpdatedAt,
  });
  const previousStateRef = useRef<AdminProductRevisionState>(state);

  const applyCommit = useCallback((commit: AdminProductRevisionCommit) => {
    setState((current) => {
      if (current.currentRev === commit.rev && current.updatedAt === commit.updatedAt) {
        return current;
      }

      logger.debug("admin.products.revision.provider_updated", {
        source: commit.source,
        previousRev: current.currentRev,
        nextRev: commit.rev,
        previousUpdatedAt: current.updatedAt,
        nextUpdatedAt: commit.updatedAt,
      });

      logger.debug("admin.products.revision.commit_applied", {
        source: commit.source,
        previousRev: current.currentRev,
        nextRev: commit.rev,
        previousUpdatedAt: current.updatedAt,
        nextUpdatedAt: commit.updatedAt,
      });

      return {
        currentRev: commit.rev,
        updatedAt: commit.updatedAt,
      };
    });
  }, []);

  const value = useMemo<AdminProductRevisionContextValue>(
    () => ({
      currentRev: state.currentRev,
      updatedAt: state.updatedAt,
      applyCommit,
    }),
    [applyCommit, state.currentRev, state.updatedAt],
  );

  useEffect(() => {
    logger.debug("admin.products.revision.provider_state", {
      previousRev: previousStateRef.current.currentRev,
      currentRev: state.currentRev,
      previousUpdatedAt: previousStateRef.current.updatedAt,
      updatedAt: state.updatedAt,
      source: "provider",
    });
    previousStateRef.current = state;
  }, [state]);

  return <AdminProductRevisionContext.Provider value={value}>{children}</AdminProductRevisionContext.Provider>;
}

export function useAdminProductRevision() {
  const context = useContext(AdminProductRevisionContext);

  if (!context) {
    throw new Error("useAdminProductRevision must be used within AdminProductRevisionProvider.");
  }

  return context;
}
