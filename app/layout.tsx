import type { Metadata } from "next";
import { connection } from "next/server";
import "./globals.css";
import { Providers } from "@/components/ui/providers";

export const metadata: Metadata = {
  title: "VA Payroll",
  description: "Payroll system for VA contractors",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // A static page cannot carry the per-request script nonce from proxy.ts
  await connection();

  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}