"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "./AppShell";

/** Keep Next routing out of the shared Vite entry point. */
export function NextAppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return <AppShell fullWidth={pathname === "/trend-analysis" || pathname === "/insights" || pathname === "/data-sources"}>{children}</AppShell>;
}
