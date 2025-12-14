このフォルダには Dependabot PR に追加する日本語テンプレートを格納します。

- `jp-dependabot-comment.md` は chuhlomin/render-template を使って置換されます。
- 利用例: `.github/workflows/localize-dependabot-comment.yml` が Dependabot PR を検知してテンプレートをコメントとして追加します。
- 利用例: `.github/workflows/localize-dependabot-comment.yml` が Dependabot PR を検知してテンプレートをコメントとして追加します。
- カスタマイズ: テンプレートに追加のプレースホルダ（`{{ .foo }}`）を入れた場合はワークフローの `vars` を更新してその値を渡してください。

テスト方法:

- Dependabot 風の PR をベースブランチ（main 等）に対して作成して `opened` イベントをトリガーします。
- Actions → ワークフローの実行ログで `Create localized comment` が実行されたかを確認します。

注意事項:

- `pull_request_target` を使っているため、PR のヘッドのコードはチェックアウトしません（安全）。
- 実運用で PR 本文を上書きしたい場合は `actions/github-script` を使用して慎重に行ってください（推奨はコメント追記）。

セキュリティ: このワークフローは `pull_request_target` トリガーで動作し、PR のヘッドのコードはチェックアウトして実行しません。実行するアクションはベースブランチ（デフォルトブランチ）のコードを使用します。
