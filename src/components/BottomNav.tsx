"use client";

import { usePathname } from "next/navigation";

import { logout } from "@/lib/auth/logout";
import { NavItem } from "@/components/NavItem";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-black/10 bg-background/80 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Bottom navigation"
    >
      <div className="mx-auto grid max-w-md grid-cols-4 px-2 py-2">
        <NavItem
          icon="♪"
          label="スワイプ"
          href="/"
          isActive={pathname === "/"}
        />
        <NavItem
          icon="📚"
          label="ライブラリ"
          href="/playlists"
          isActive={pathname?.startsWith("/playlists") ?? false}
        />
        <NavItem
          icon="🚪"
          label="ログアウト"
          href="#"
          isActive={false}
          onClick={() => {
            void logout();
          }}
        />
        <NavItem
          icon="👤"
          label="マイページ"
          href="/profile"
          isActive={pathname?.startsWith("/profile") ?? false}
        />
      </div>
    </nav>
  );
}
