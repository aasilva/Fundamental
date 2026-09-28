import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "./login/actions";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fundamental — Carteira de Ações",
  description: "Acompanha as tuas ações, cotações e lucros/prejuízos",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  return (
    <html
      lang="pt"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-50 dark:bg-black">
        {user ? (
          <header className="flex items-center justify-between border-b border-black/10 bg-white px-6 py-3 dark:border-white/10 dark:bg-zinc-950">
            <span className="font-semibold text-zinc-950 dark:text-zinc-50">
              Fundamental
            </span>
            <div className="flex items-center gap-4">
              <Link
                href="/analysis"
                className="text-sm text-zinc-500 hover:underline dark:text-zinc-400"
              >
                Análises
              </Link>
              <Link
                href="/settings"
                className="text-sm text-zinc-500 hover:underline dark:text-zinc-400"
              >
                Definições
              </Link>
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                {user.email}
              </span>
              <form action={logout}>
                <button
                  type="submit"
                  className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                >
                  Sair
                </button>
              </form>
            </div>
          </header>
        ) : null}
        <div className="flex flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
