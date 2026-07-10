import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/ui/providers";

export const metadata: Metadata = {
  title: "VA Payroll",
  description: "Payroll system for VA contractors",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}