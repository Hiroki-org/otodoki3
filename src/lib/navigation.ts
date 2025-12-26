export type NavItemSpec = {
  icon: string;
  label: string;
  href?: string;
  isLogout?: boolean;
};

export const NAV_ITEMS: NavItemSpec[] = [
  { icon: "♪", label: "スワイプ", href: "/" },
  { icon: "📚", label: "ライブラリ", href: "/playlists" },
  { icon: "🚪", label: "ログアウト", isLogout: true },
  { icon: "👤", label: "マイページ", href: "/profile" },
];