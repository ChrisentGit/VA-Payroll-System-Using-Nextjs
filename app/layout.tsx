import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { connection } from "next/server";
import "./globals.css";
import { Providers } from "@/components/ui/providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: { default: "Bluemoso Payroll", template: "%s | Bluemoso Payroll" },
  description: "Timesheets, payroll runs and payslips for remote contractors, in one place.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // A static page cannot carry the per-request script nonce from proxy.ts
  await connection();

  return (
    <html lang="en" className={inter.variable}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
