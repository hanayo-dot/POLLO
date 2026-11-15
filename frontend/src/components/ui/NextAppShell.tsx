
"use client";

import { AppShell } from "./AppShell";

export function NextAppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
