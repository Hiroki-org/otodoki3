"use client";

import { usePathname } from "next/navigation";

import { logout } from "@/lib/auth/logout";
import { NavItem } from "@/components/NavItem";
import { NAV_ITEMS } from "@/lib/navigation";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-black/10 bg-background/80 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Bottom navigation"
    >
      <div className="mx-auto grid max-w-md grid-cols-4 px-2 py-2">
        {NAV_ITEMS.map((item) => {
          if (item.isLogout) {
            return (
              <NavItem
                key={item.label}
                icon={item.icon}
                label={item.label}
                isActive={false}
                onClick={() => void logout()}
              />
            );
          }

          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname?.startsWith(item.href ?? "") ?? false;

          return (
            <NavItem
              key={item.label}
              icon={item.icon}
              label={item.label}
              href={item.href as string}
              isActive={isActive}
            />
          );
        })}
      </div>
    </nav>
  );
}
