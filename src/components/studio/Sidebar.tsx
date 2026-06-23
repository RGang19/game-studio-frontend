import { Link } from "@tanstack/react-router";
import { useStudioContext } from "@/context/StudioContext";
import {
  Home,
  Gamepad2,
  Wand2,
  Trophy,
  User,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

const nav = [
  { to: "/", label: "Home", icon: Home },
  { to: "/templates", label: "Templates", icon: Gamepad2 },
  { to: "/create", label: "Create", icon: Wand2 },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function Sidebar() {
  const { sidebarCollapsed, setSidebarCollapsed } = useStudioContext();
  const collapsed = sidebarCollapsed;

  return (
    <aside
      className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r-2 border-sidebar-border bg-sidebar py-6 lg:flex transition-all duration-300 ease-in-out ${
        collapsed ? "w-[72px] px-2" : "w-64 px-4"
      }`}
    >
      {/* Logo */}
      <Link to="/" className={`mb-1 block ${collapsed ? "px-0 text-center" : "px-2"}`}>
        <h1 className="border-2 border-black bg-primary p-4 font-display text-2xl font-black leading-none tracking-tight shadow-[5px_5px_0_#101010]">
          {collapsed ? (
            <span className="block text-gradient text-lg">CS</span>
          ) : (
            <>
              <span className="block text-sidebar-foreground">GAME</span>
              <span className="block text-gradient">STUDIO</span>
            </>
          )}
        </h1>
        {!collapsed && (
          <p className="label-mono mt-3 text-[10px] text-muted-foreground">
            Prompt to Playable Game
          </p>
        )}
      </Link>

      {/* Navigation */}
      <nav className="mt-8 flex flex-1 flex-col gap-1">
        {nav.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: to === "/" }}
            className={`group flex items-center border-2 border-transparent rounded-none text-sm font-semibold text-muted-foreground transition-all hover:border-black hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${
              collapsed
                ? "justify-center px-0 py-3"
                : "gap-4 px-4 py-3"
            }`}
            activeProps={{
              className:
                "bg-sidebar-accent text-sidebar-foreground shadow-[inset_3px_0_0_0_var(--color-primary)]",
            }}
            title={collapsed ? label : undefined}
          >
            <Icon className="size-5 shrink-0 transition-colors group-hover:text-primary" />
            {!collapsed && (
              <span className="label-mono text-xs">{label}</span>
            )}
          </Link>
        ))}

      </nav>

      {/* Collapse toggle */}
      <div className={`flex ${collapsed ? "justify-center" : "justify-end px-2"}`}>
        <button
          onClick={() => setSidebarCollapsed(!collapsed)}
          className="flex size-8 items-center justify-center rounded-lg border border-sidebar-border bg-sidebar-accent/50 text-muted-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-foreground hover:border-primary/40"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronsRight className="size-4" />
          ) : (
            <ChevronsLeft className="size-4" />
          )}
        </button>
      </div>
    </aside>
  );
}
