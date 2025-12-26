"use client";

import { usePathname } from "next/navigation";

import { logout } from "@/lib/auth/logout";
import { NavItem } from "@/components/NavItem";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="fixed left-0 top-0 bottom-0 z-30 hidden w-64 border-r border-black/10 bg-background/90 backdrop-blur md:block"
      aria-label="Sidebar"
    >
      <div className="flex h-full flex-col p-4">
        <div className="px-2 py-3 text-lg font-bold">otodoki3</div>
        <nav
          className="mt-4 flex flex-col gap-2"
          aria-label="Primary navigation"
        >
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
        </nav>
      </div>
    </aside>
  );
}
