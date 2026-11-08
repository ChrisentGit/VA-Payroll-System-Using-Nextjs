import { redirect } from "next/navigation";

// Signed-out visitors are sent on to /login by proxy.ts.
export default function Home() {
  redirect("/dashboard");
}
