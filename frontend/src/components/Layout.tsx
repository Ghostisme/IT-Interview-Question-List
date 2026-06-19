import { Outlet, NavLink } from "react-router-dom";
import { Package, ShoppingCart, Truck, MapPin } from "lucide-react";

const NAV = [
  { to: "/orders", label: "Orders", icon: ShoppingCart },
  { to: "/products", label: "Products", icon: Package },
  { to: "/logistics", label: "Logistics", icon: MapPin },
  { to: "/shipping", label: "Shipping", icon: Truck },
] as const;

export default function Layout() {
  return (
    <div className="flex h-screen bg-[var(--color-surface-alt)]">
      <aside className="w-60 flex-shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-[var(--color-border)]">
          <span className="text-lg font-semibold tracking-tight text-[var(--color-text)]">
            OTS
          </span>
          <span className="ml-2 text-xs text-[var(--color-text-muted)]">v1.0</span>
        </div>

        <nav className="flex-1 py-4 space-y-1 px-3">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-50 text-[var(--color-primary)]"
                    : "text-[var(--color-text-muted)] hover:bg-slate-50 hover:text-[var(--color-text)]"
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-[var(--color-border)] text-xs text-[var(--color-text-muted)]">
          Order Tracking System
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
