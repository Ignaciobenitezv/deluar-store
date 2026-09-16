"use client";

import { useSyncExternalStore } from "react";
import { IconMoon, IconSun } from "@/features/admin/shell/admin-nav-icons";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "deluar-admin-theme";

function subscribeToThemeAttribute(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributeFilter: ["data-admin-theme"] });
  return () => observer.disconnect();
}

function readIsDark() {
  return document.documentElement.dataset.adminTheme === "dark";
}

function readServerIsDark() {
  return false;
}

// Module-level, like admin-sidebar.tsx's toggleSidebarCollapsed — the React
// Compiler lint rule flags a DOM mutation written inside the component body
// as mutating "a value the compiler doesn't recognize as owned by this
// render," even though nothing here is reactive state. Hoisting it out
// keeps the mutation and the render clearly separate.
function applyTheme(next: "light" | "dark") {
  document.documentElement.dataset.adminTheme = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Private mode or storage disabled — theme still applies for this session.
  }
}

const options = [
  { value: "light" as const, label: "Modo claro", Icon: IconSun },
  { value: "dark" as const, label: "Modo oscuro", Icon: IconMoon },
];

/**
 * Configuración-only — a large segmented Claro/Oscuro control per the
 * Warefy reference, instead of the topbar's compact icon switch. This is a
 * standalone Client Component (interactivity stays correctly encapsulated
 * here, never leaking a handler across a Server/Client boundary) that
 * deliberately duplicates ThemeToggle's small read/write logic rather than
 * sharing a module with it, so this change can never touch the topbar's
 * file or its rendered output. Same theme mechanism: dataset attribute on
 * `<html>` + localStorage, applied immediately, no second theme system.
 */
export function AppearanceThemeSelector() {
  const isDark = useSyncExternalStore(subscribeToThemeAttribute, readIsDark, readServerIsDark);
  const current = isDark ? "dark" : "light";

  return (
    <div role="radiogroup" aria-label="Tema del panel de administración" className="grid grid-cols-2 gap-2">
      {options.map(({ value, label, Icon }) => {
        const active = value === current;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => applyTheme(value)}
            className={cn(
              "flex h-11 items-center justify-center gap-2 rounded-xl border text-[12.5px] font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              active
                ? "border-primary/40 bg-primary-soft text-primary"
                : "border-border bg-surface text-text-secondary hover:bg-surface-elevated hover:text-text-primary",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
