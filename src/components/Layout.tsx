"use client";

import { useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import { Sidebar } from "@/components/Sidebar";

type Props = {
  children: React.ReactNode;
};

export function Layout({ children }: Props) {
  const supabase = useMemo(() => createClient(), []);
  // middleware が基本的に未認証を弾くので、初期は true としてフラッシュを抑える
  const [isAuthenticated, setIsAuthenticated] = useState(true);

  useEffect(() => {
    let ignore = false;

    (async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (ignore) return;
        setIsAuthenticated(!error && !!data.user);
      } catch {
        if (ignore) return;
        setIsAuthenticated(false);
      }
    })();

    // 認証状態の変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (ignore) return;
      setIsAuthenticated(!!session?.user);
    });

    return () => {
      ignore = true;
      subscription?.unsubscribe();
    };
  }, [supabase]);

  return (
    <div className="min-h-screen">
      {isAuthenticated ? <Sidebar /> : null}
      <div className={`pb-20 ${isAuthenticated ? "md:ml-64" : ""}`}>{children}</div>
      {isAuthenticated ? <BottomNav /> : null}
    </div>
  );
}
