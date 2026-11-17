"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { NAV } from "@/lib/nav";
import { IconLogout } from "@/components/Icons";

export function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky text-navy">
        <span className="display text-xl font-bold leading-none">K</span>
      </div>
      <div className="leading-tight">
        <p className="display text-lg font-semibold">Kids Store</p>
        <p className="text-[11px] uppercase tracking-[0.14em] text-white/50">Digital Studio</p>
      </div>
    </div>
  );
}

export function Sidebar() {
  const path = usePathname();
  const router = useRouter();

  async function logout() {
    await createClient().auth.signOut();
    router.replace("/login");
  }

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col justify-between bg-navy p-5 text-white md:flex">
      <div className="space-y-8">
        <Logo />
        <nav className="space-y-1">
          {NAV.map(({ href, label, Icon }) => {
            const active = path.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm transition ${
                  active ? "bg-white text-navy font-medium shadow-sm" : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon /> {label}
              </Link>
            );
          })}
        </nav>
      </div>
      <button onClick={logout} className="flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm text-white/60 transition hover:bg-white/10 hover:text-white">
        <IconLogout /> Cerrar sesión
      </button>
    </aside>
  );
}

export function MobileNav() {
  const path = usePathname();
  return (
    <>
      <header className="sticky top-0 z-20 flex items-center justify-between bg-navy px-4 py-3 text-white md:hidden">
        <Logo />
      </header>
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-6 border-t border-ink/10 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {NAV.map(({ href, label, Icon }) => {
          const active = path.startsWith(href);
          return (
            <Link key={href} href={href} className={`flex flex-col items-center gap-0.5 py-2.5 text-[10px] ${active ? "font-semibold text-navy" : "text-ink/45"}`}>
              <span className={`flex h-7 w-11 items-center justify-center rounded-full transition ${active ? "bg-sky" : ""}`}><Icon /></span>
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
