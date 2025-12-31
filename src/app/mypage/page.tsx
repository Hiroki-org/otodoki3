import { createClient } from "@/lib/supabase/server";
import { Layout } from "@/components/Layout";
import { LogoutButton } from "./LogoutButton";
import { redirect } from "next/navigation";
import {
  User,
  Heart,
  XCircle,
  ListMusic,
  Info,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import packageJson from "../../../package.json";
import { SettingsSection } from "./SettingsSection";
import Link from "next/link";

export default async function MyPage() {
  const supabase = await createClient();

  const authRes = await supabase.auth.getUser();
  const user = authRes.data?.user;
  const authError = authRes.error;

  if (authError || !user) {
    redirect("/login");
  }

  // Fetch stats in parallel (user-scoped)
  const [likesResult, dislikesResult, playlistsResult] = await Promise.all([
    supabase
      .from("likes")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("dislikes")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("playlists")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);

  // Log query errors for observability
  if (likesResult.error)
    console.error("Failed to fetch likes:", likesResult.error);
  if (dislikesResult.error)
    console.error("Failed to fetch dislikes:", dislikesResult.error);
  if (playlistsResult.error)
    console.error("Failed to fetch playlists:", playlistsResult.error);

  const hasError = !!(
    likesResult.error ||
    dislikesResult.error ||
    playlistsResult.error
  );

  const likesCount = likesResult.count ?? 0;
  const dislikesCount = dislikesResult.count ?? 0;
  const playlistsCount = playlistsResult.count ?? 0;

  return (
    <Layout>
      <div className="p-6 pb-24 space-y-8">
        {/* Header */}
        <h1 className="text-2xl font-bold">マイページ</h1>

        {/* User Info */}
        <div className="flex items-center gap-4 p-4 bg-card border border-border rounded-2xl">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
            <User className="w-8 h-8 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground">ログイン中</p>
            <p className="font-medium truncate">{user?.email}</p>
          </div>
        </div>

        {/* Stats */}
        {hasError && (
          <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>データの取得に失敗しました。</span>
          </div>
        )}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-card border border-border p-4 rounded-2xl flex flex-col items-center justify-center gap-2">
            <Heart className="w-6 h-6 text-pink-500" />
            <span className="text-2xl font-bold">{likesCount || 0}</span>
            <span className="text-xs text-muted-foreground">Likes</span>
          </div>
          <div className="bg-card border border-border p-4 rounded-2xl flex flex-col items-center justify-center gap-2">
            <XCircle className="w-6 h-6 text-blue-500" />
            <span className="text-2xl font-bold">{dislikesCount || 0}</span>
            <span className="text-xs text-muted-foreground">Skips</span>
          </div>
          <div className="bg-card border border-border p-4 rounded-2xl flex flex-col items-center justify-center gap-2">
            <ListMusic className="w-6 h-6 text-purple-500" />
            <span className="text-2xl font-bold">{playlistsCount || 0}</span>
            <span className="text-xs text-muted-foreground">Playlists</span>
          </div>
        </div>

        {/* Settings */}
        <SettingsSection />

        {/* App Info */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold px-2">アプリ情報</h2>
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="p-4 flex items-center justify-between border-b border-border">
              <div className="flex items-center gap-3">
                <Info className="w-5 h-5" />
                <span>バージョン</span>
              </div>
              <span className="text-muted-foreground">
                {packageJson.version}
              </span>
            </div>
            <Link
              href="/terms"
              className="p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="w-5" /> {/* Spacer for alignment */}
                <span>利用規約</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground/30" />
            </Link>
          </div>
        </div>

        <LogoutButton />
      </div>
    </Layout>
  );
}
