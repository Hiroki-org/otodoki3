import { Layout } from "@/components/Layout";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function TermsPage() {
  return (
    <Layout>
      <div className="p-6 pb-24 space-y-6">
        <div className="flex items-center gap-2">
          <Link
            href="/mypage"
            className="p-2 -ml-2 hover:bg-secondary rounded-full transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-2xl font-bold">利用規約</h1>
        </div>

        <div className="prose dark:prose-invert max-w-none space-y-4">
          <p className="text-muted-foreground">
            この利用規約（以下，「本規約」といいます。）は，otodoki（以下，「当サービス」といいます。）の利用条件を定めるものです。登録ユーザーの皆さま（以下，「ユーザー」といいます。）には，本規約に従って，本サービスをご利用いただきます。
          </p>

          <section>
            <h2 className="text-lg font-semibold mt-6 mb-2">第1条（適用）</h2>
            <p>
              本規約は，ユーザーと当サービスとの間の本サービスの利用に関わる一切の関係に適用されるものとします。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-6 mb-2">
              第2条（禁止事項）
            </h2>
            <p>
              ユーザーは，本サービスの利用にあたり，以下の行為をしてはなりません。
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>法令または公序良俗に違反する行為</li>
              <li>犯罪行為に関連する行為</li>
              <li>
                当サービスのサーバーまたはネットワークの機能を破壊したり，妨害したりする行為
              </li>
              <li>当サービスのサービスの運営を妨害するおそれのある行為</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-6 mb-2">
              第3条（免責事項）
            </h2>
            <p>
              当サービスの債務不履行責任は，当サービスの故意または重過失によらない場合には免責されるものとします。
            </p>
          </section>

          <p className="text-sm text-muted-foreground mt-8">
            ※これはサンプルの利用規約です。実際の運用に合わせて適切な内容に変更してください。
          </p>
        </div>
      </div>
    </Layout>
  );
}
