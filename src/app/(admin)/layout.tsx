import { AuthGuard } from "@/components/AuthGuard";
import { MobileNav, Sidebar } from "@/components/Sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="min-w-0 flex-1">
          <MobileNav />
          <main className="mx-auto max-w-6xl p-4 pb-28 md:p-10 md:pb-10">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
