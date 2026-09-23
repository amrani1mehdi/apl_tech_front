import type { ReactNode } from "react";
import { AuthShell } from "./AuthShell";

/* Signing in, signing up and getting back in share one frame, so the machine
   beside the form keeps running between them. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <AuthShell>{children}</AuthShell>;
}
