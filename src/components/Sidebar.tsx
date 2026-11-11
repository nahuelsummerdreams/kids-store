"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "@/lib/nav";

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="flex w-full shrink-0 flex-col gap-6 bg-navy p-5 text-white md:min-h-screen md:w-64">
      <div>
        <p className="text-xs uppercase tracking-widest text-sky/70">Digital Studio</p>
        <p className="text-xl font-semibold">Kids Store</p>
      </div>
      <nav className="flex gap-1 overflow-x-auto md:flex-col">
        {NAV.map((item) => {
          const active = path.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap rounded-2xl px-4 py-2.5 text-sm transition ${
                active ? "bg-sky text-navy font-medium" : "text-white/80 hover:bg-white/10"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
