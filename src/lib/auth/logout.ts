"use client";

import { createClient } from "@/lib/supabase/client";

export async function logout(): Promise<void> {
    const supabase = createClient();
    await supabase.auth.signOut();
    // router を渡さず確実に遷移させる（BottomNav/Sidebar からも利用する）
    window.location.href = "/login";
}
