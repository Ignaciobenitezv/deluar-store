"use client";

import { useSyncExternalStore } from "react";
import { Toggle } from "@/components/admin/ui/toggle";
import { IconMoon, IconSun } from "./admin-nav-icons";

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

export function ThemeToggle() {
  const isDark = useSyncExternalStore(subscribeToThemeAttribute, readIsDark, readServerIsDark);

  function handleChange(next: boolean) {
    const theme = next ? "dark" : "light";
    document.documentElement.dataset.adminTheme = theme;
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Private mode or storage disabled — theme still applies for this session.
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span aria-hidden="true" className="text-text-secondary">
        {isDark ? <IconMoon /> : <IconSun />}
      </span>
      <Toggle checked={isDark} onCheckedChange={handleChange} label="Cambiar tema" />
    </div>
  );
}
