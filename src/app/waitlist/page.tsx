import { redirect } from "next/navigation";
import { useFormStatus } from "react-dom";

import { createClient } from "@/lib/supabase/server";

function SignOutButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-6 py-2 text-sm text-gray-600 hover:text-gray-800 underline disabled:opacity-50"
    >
      {pending ? "処理中..." : "別のアカウントでログイン"}
    </button>
  );
}

export default async function WaitlistPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    console.error("Error getting user:", error);
    redirect("/login");
  }

  const user = data.user;

  const handleSignOut = async () => {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full text-center bg-white p-8 rounded-xl shadow-lg">
        <div className="text-6xl mb-4">🎵</div>
        <h1 className="text-2xl font-bold mb-2">ウェイトリスト</h1>
        <p className="text-gray-600 mb-6">
          otodoki3 は現在クローズドベータ中です。
          <br />
          招待をお待ちください！
        </p>
        {user?.email && (
          <p className="text-sm text-gray-500 mb-4">
            現在は {user.email}{" "}
            でログインしています。招待が届くまで少々お待ちください。
          </p>
        )}
        <form action={handleSignOut}>
          <SignOutButton />
        </form>
      </div>
    </div>
  );
}
