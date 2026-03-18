import { redirect } from "next/navigation";

// Root redirects to dashboard — auth handled by AppShell
export default function RootPage() {
  redirect("/dashboard");
}
