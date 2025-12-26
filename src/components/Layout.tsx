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
    let mounted = true;
    (async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (!mounted) return;
        setIsAuthenticated(!error && !!data.user);
      } catch {
        if (!mounted) return;
        setIsAuthenticated(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  return (
    <div className="min-h-screen">
      {isAuthenticated ? <Sidebar /> : null}
      <div className="md:ml-64 pb-20">{children}</div>
      {isAuthenticated ? <BottomNav /> : null}
    </div>
  );
}
