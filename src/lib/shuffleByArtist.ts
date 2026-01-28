/**
 * Fisher–Yates シャッフルを使ってランダムに配列をシャッフル
 */
function fisherYatesShuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * 同じアーティストの曲が連続しないようにトラックをシャッフルする
 *
 * アルゴリズム:
 * 1. アーティストごとにグループ化し、各グループをシャッフル
 * 2. ラウンドロビン方式でインターリーブ配置
 * 3. 残りの連続を解消するためスワップによる修正フェーズを実行
 *
 * 注意: 同じアーティストの曲が全体の半分以上を占める場合、
 * 完全に連続を避けることは不可能です。その場合はベストエフォートで処理します。
 *
 * @param tracks - シャッフル対象のトラック配列（artist_name プロパティを持つオブジェクト）
 * @returns 同じアーティストが連続しないようにシャッフルされた配列
 */
export function shuffleByArtist<T extends { artist_name: string }>(
  tracks: T[]
): T[] {
  if (tracks.length <= 1) {
    return [...tracks];
  }

  // アーティストごとにグループ化
  const artistGroups = new Map<string, T[]>();
  for (const track of tracks) {
    const group = artistGroups.get(track.artist_name) || [];
    group.push(track);
    artistGroups.set(track.artist_name, group);
  }

  // 各グループをシャッフルして新しい配列に置き換え
  for (const [artist, group] of artistGroups) {
    artistGroups.set(artist, fisherYatesShuffle(group));
  }

  // グループを曲数の多い順にソート
  const sortedGroups = [...artistGroups.entries()].sort(
    (a, b) => b[1].length - a[1].length
  );

  // インターリーブ方式で結果を構築
  const result: T[] = [];

  // 各グループから1曲ずつ取り出すためのインデックス
  const groupIndices = new Map<string, number>();
  for (const [artist] of sortedGroups) {
    groupIndices.set(artist, 0);
  }

  // 最大曲数を持つアーティストの曲数
  const maxCount = sortedGroups[0]?.[1].length ?? 0;

  // ラウンドロビン方式で配置
  for (let round = 0; round < maxCount; round++) {
    // 各ラウンドでグループの順番をシャッフルしてランダム性を追加
    const roundGroups = fisherYatesShuffle(sortedGroups.filter(
      ([, group]) => round < group.length
    ));

    for (const [artist, group] of roundGroups) {
      const idx = groupIndices.get(artist)!;
      if (idx < group.length) {
        result.push(group[idx]);
        groupIndices.set(artist, idx + 1);
      }
    }
  }

  // 最終チェック: まだ連続がある場合は追加のスワップを試みる
  // 最大試行回数を設定して無限ループを防ぐ（線形: n * 10）
  const maxSwapAttempts = result.length * 10;
  let totalAttempts = 0;

  while (totalAttempts < maxSwapAttempts) {
    let foundConsecutive = false;

    for (let i = 1; i < result.length; i++) {
      if (result[i].artist_name === result[i - 1].artist_name) {
        foundConsecutive = true;

        // 入れ替え可能な位置を探す
        let swapped = false;
        for (let j = 0; j < result.length; j++) {
          if (j === i || j === i - 1) continue;

          // j の位置のトラックを i の位置に持ってきた場合の条件チェック
          const canPlaceJAtI =
            result[j].artist_name !== result[i - 1].artist_name &&
            (i + 1 >= result.length ||
              result[j].artist_name !== result[i + 1].artist_name);

          if (!canPlaceJAtI) continue;

          // i のトラックを j の位置に持っていった場合の条件チェック
          const prevJ = j > 0 ? result[j - 1].artist_name : null;
          const nextJ = j < result.length - 1 ? result[j + 1].artist_name : null;

          const canPlaceIAtJ =
            (prevJ === null || result[i].artist_name !== prevJ) &&
            (nextJ === null || result[i].artist_name !== nextJ);

          if (canPlaceIAtJ) {
            [result[i], result[j]] = [result[j], result[i]];
            swapped = true;
            break;
          }
        }

        if (swapped) {
          break; // 最初からやり直す
        }
      }
    }

    totalAttempts++;

    // 連続がなくなったら終了
    if (!foundConsecutive) {
      break;
    }
  }

  return result;
}
