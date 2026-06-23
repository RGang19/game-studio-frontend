import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { Sidebar } from "@/components/studio/Sidebar";
import { MobileNav } from "@/components/studio/MobileNav";
import { StudioProvider } from "@/context/StudioContext";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const location = useLocation();
  const isPlayPage = location.pathname.startsWith("/play");

  return (
    <StudioProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar />
        <main className={`flex-1 min-w-0 ${isPlayPage ? "pb-0" : "pb-24 lg:pb-0"}`}>
          <Outlet />
        </main>
        <MobileNav />
      </div>
    </StudioProvider>
  );
}
