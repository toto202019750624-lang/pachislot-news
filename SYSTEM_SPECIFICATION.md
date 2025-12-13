# パチスロニュースアプリケーション 完全仕様書

> **目的**: このドキュメントは、システムが失われた場合でも完全に再現できるよう、すべての技術仕様、デザイン、機能を網羅的に記載しています。

**最終更新日**: 2025年12月13日  
**バージョン**: 1.0

---

## 📋 目次

1. [システム概要](#システム概要)
2. [技術スタック](#技術スタック)
3. [アーキテクチャ](#アーキテクチャ)
4. [データベース設計](#データベース設計)
5. [機能仕様](#機能仕様)
6. [UI/UXデザイン](#uiuxデザイン)
7. [自動化とスケジュール](#自動化とスケジュール)
8. [デプロイメント](#デプロイメント)
9. [環境変数](#環境変数)
10. [ファイル構成](#ファイル構成)

---

## システム概要

### プロジェクト名
**パチスロニュースアプリケーション**

### 目的
パチスロ・パチンコ業界の最新ニュース、イベント、YouTube動画、解析情報を一元的に表示するWebアプリケーション

### 主要機能
1. **ニュース自動収集** - Google News、まとめサイト、YouTube、P-WORLDイベントから自動取得
2. **カテゴリ分類** - 全体、まとめ、解析、YouTube、イベント、メーカー、業界の7カテゴリ
3. **検索機能** - キーワード検索
4. **YouTube分析** - チャンネル別視聴回数の週次集計
5. **イベント分析** - 県別の未来イベント表示
6. **はてなブックマーク数表示** - まとめ記事の人気度可視化

---

## 技術スタック

### フロントエンド
- **React Native** (Expo) - クロスプラットフォーム対応
- **TypeScript** - 型安全性
- **React Native Web** - Web版対応

### バックエンド/データベース
- **Supabase** - PostgreSQLベースのBaaS
  - データベース
  - リアルタイム機能
  - 認証（未使用）

### デプロイ
- **Vercel** - Web版ホスティング
- **GitHub Actions** - 自動ニュース取得ジョブ

### 外部API
1. **Google News RSS** - ニュース取得
2. **YouTube Data API v3** - 動画情報取得
3. **はてなブックマークAPI** - ブックマーク数取得
4. **P-WORLD** - イベント情報スクレイピング

### ライブラリ
```json
{
  "@supabase/supabase-js": "^2.x",
  "rss-parser": "^3.x",
  "googleapis": "^120.x",
  "cheerio": "^1.x",
  "react-native-chart-kit": "^6.12.0",
  "react-native-svg": "^15.0.0"
}
```

---

## アーキテクチャ

### システム構成図

```
┌─────────────────────────────────────────────────────────────┐
│                        ユーザー                               │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│                    Vercel (Web Frontend)                    │
│                  React Native Web App                       │
│         ┌───────────────────────────────────────┐           │
│         │  カテゴリタブ / 検索 / 分析機能        │           │
│         └───────────────────────────────────────┘           │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase (Backend)                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │             PostgreSQL Database                      │   │
│  │  Tables: news, site_stats                           │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────▲──────────────────────────────────────────────┘
               │
               │ データ投入
               │
┌──────────────┴──────────────────────────────────────────────┐
│              GitHub Actions (定期実行)                       │
│  1日6回実行 (JST 6:00, 10:00, 12:00, 15:00, 18:00, 21:00)  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  fetch-news.js       : Google News + まとめサイト    │   │
│  │  fetch-youtube.js    : YouTube動画                   │   │
│  │  fetch-events.js     : P-WORLDイベント               │   │
│  │  fetch-hatena-bookmarks.js : はてなブックマーク数    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### データフロー

```
外部データソース → GitHub Actions → Supabase → Vercel → ユーザー
```

---

## データベース設計

### Supabase PostgreSQL

#### **newsテーブル**

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|-----|------|-----------|------|
| id | uuid | NOT NULL | uuid_generate_v4() | 主キー |
| title | text | NOT NULL | - | 記事タイトル |
| url | text | NOT NULL | - | 記事URL (UNIQUE) |
| source | text | NOT NULL | - | 情報源名 |
| category | text | NOT NULL | - | カテゴリ (event/maker/industry/kaiseki/matome/youtube) |
| published_at | timestamptz | NULL | - | 公開日時 |
| fetched_at | timestamptz | NOT NULL | now() | 取得日時 |
| summary | text | NULL | - | 記事概要 |
| image_url | text | NULL | - | サムネイル画像URL |
| view_count | integer | NULL | - | 視聴回数/ブックマーク数 |

**インデックス**:
- `idx_news_category` on `category`
- `idx_news_published_at` on `published_at DESC`
- `idx_news_url` on `url` (UNIQUE)

#### **site_statsテーブル**

| カラム名 | 型 | NULL | 説明 |
|---------|-----|------|------|
| id | integer | NOT NULL | 主キー |
| access_count | integer | NOT NULL | アクセスカウント |
| updated_at | timestamptz | NOT NULL | 更新日時 |

---

## 機能仕様

### 1. ニュース表示

#### カテゴリ一覧

| カテゴリID | 表示名 | アイコン | 色 | 説明 |
|-----------|--------|---------|-----|------|
| all | 全体 | 🎯 | #e74c3c | イベント・まとめ以外のすべて |
| matome | まとめ | 📝 | #e67e22 | まとめサイト記事 |
| kaiseki | 解析 | 📊 | #9b59b6 | 機種解析情報 |
| youtube | YouTube | 🎬 | #ff0000 | YouTube動画 |
| event | イベント | 🎪 | #9b59b6 | P-WORLDイベント |
| maker | メーカー | 🎰 | #e74c3c | メーカー関連 |
| industry | 業界 | 🏢 | #3498db | 業界ニュース |

#### ニュースカード仕様

**通常カード**:
```
┌─────────────────────────────────────────┐
│ NEW 記事タイトル（最大2行）              │
│ [カテゴリ] 情報源 • 公開日 • 🔖 XXusers │
└─────────────────────────────────────────┘
```

**要素**:
- NEWバッジ: 3日以内の記事に表示（赤色、太字）
- カテゴリタグ: カテゴリ色の背景、白文字、9px
- 情報源: 赤色（#e74c3c）、太字、11px
- 公開日: グレー（#888）、11px、YYYY/M/D形式
- ブックマーク数: オレンジ色（#ff6b00）、太字、11px、まとめのみ
- 視聴回数: 赤色（#ff0000）、太字、11px、YouTubeのみ

**クリック動作**:
- Web: 新しいタブで記事を開く（`window.open(_blank)`）
- Mobile: デフォルトブラウザで開く（`Linking.openURL`）

### 2. 検索機能

- **検索バー**: ヘッダー下に常時表示
- **検索対象**: title, summary, source
- **検索方法**: 部分一致（大文字小文字区別なし）
- **クリア**: ✕ボタンでクリア

### 3. YouTube分析

#### 表示タイミング
- YouTubeカテゴリ選択時のみ
- ページ上部に「📊 チャンネル分析を見る」ボタン

#### 機能
- **期間選択**: 1週間、2週間、4週間、8週間
- **表示内容**:
  - 日付範囲: YYYY/MM/DD～YYYY/MM/DD
  - チャンネル詳細リスト（視聴回数順）
    - 順位番号（赤丸バッジ）
    - チャンネル名
    - 📊 合計視聴回数
    - 🎬 動画本数
    - 📈 平均視聴回数

#### データ集計
- 週の開始: 月曜日
- 対象: YouTubeカテゴリ、view_countがnullでない動画
- 集計: チャンネルごとに視聴回数を合算

### 4. イベント分析

#### 表示タイミング
- イベントカテゴリ選択時のみ
- ページ上部に「🎪 県別イベントを見る」ボタン

#### 機能
- **対象期間**: 本日～（未来のイベントのみ）
- **県別分類**: 47都道府県で自動分類
- **展開/折りたたみ**: 県名タップで詳細表示
- **デフォルト展開**: 上位3県

#### 県名抽出ロジック

**優先順位**:
1. **URLから抽出** (最優先)
   - P-WORLD URL構造: `/都道府県名(英語)/ホール名.htm`
   - 例: `/osaka/` → 大阪府

2. **summaryから抽出**
   - 都道府県名の直接マッチング
   - 市区町村名から推測

3. **titleから抽出**
   - 都道府県名の直接マッチング

#### イベント詳細表示

```
1 大阪府 (15件) ▼
  12/15  【来店】ホール名 - イベントタイトル
         ホール詳細情報
  12/16  【取材】ホール名 - イベントタイトル
```

**要素**:
- 順位: 赤丸バッジ
- 県名: 太字、16px
- イベント数: グレー、12px
- 日付: 赤色、太字、12px、MM/DD形式
- イベントタイプバッジ: 黄色背景、「来店」「取材」
- タイトル: 太字、13px

### 5. はてなブックマーク数

#### 対象
- まとめカテゴリの記事のみ

#### 取得方法
- **API**: `https://bookmark.hatenaapis.com/count/entry?url={URL}`
- **更新頻度**: 1日6回（GitHub Actions）
- **レート制限**: 200ms間隔

#### 表示
- **条件**: view_count > 0 のみ表示
- **フォーマット**: 🔖 XXusers
- **色**: オレンジ色（#ff6b00）

---

## UI/UXデザイン

### カラーパレット

```css
/* プライマリ */
--primary-red: #e74c3c;
--background: #f5f5f5;
--card-background: #ffffff;

/* カテゴリ色 */
--event-color: #9b59b6;      /* 紫 */
--maker-color: #e74c3c;      /* 赤 */
--industry-color: #3498db;   /* 青 */
--kaiseki-color: #9b59b6;    /* 紫 */
--matome-color: #e67e22;     /* オレンジ */
--youtube-color: #ff0000;    /* YouTube赤 */

/* テキスト */
--text-primary: #1a1a1a;
--text-secondary: #888;
--text-light: #ccc;

/* アクセント */
--bookmark-color: #ff6b00;   /* ブックマーク数 */
--new-badge: #e74c3c;        /* NEWバッジ */
```

### レイアウト

#### デスクトップ（Web）
- **最大幅**: 782px（画面中央）
- **マージン**: 0px（左右）
- **カード角丸**: 0px
- **ヘッダー固定**: あり

#### モバイル
- **最大幅**: 100%
- **マージン**: 12px（左右）
- **カード角丸**: 8px
- **ヘッダー固定**: あり

### ヘッダー

```
┌─────────────────────────────────────────┐
│ 🎰 パチスロニュース  最終更新: XX/XX XX:XX│
│                      アクセス: XXXXカウント│
└─────────────────────────────────────────┘
│     🔍 検索バー                          │
└─────────────────────────────────────────┘
│ [全体][まとめ][解析][YouTube][その他▼]  │
└─────────────────────────────────────────┘
```

**スタイル**:
- 背景: #e74c3c（赤）
- テキスト: 白
- 高さ: ロゴ40px + 検索50px + タブ45px = 135px
- 固定配置（position: sticky）

### カテゴリタブ

**選択中**:
- 背景: 白
- テキスト: 赤（#e74c3c）
- 太字

**非選択**:
- 背景: 透明
- テキスト: 白（opacity: 0.8）

### アニメーション

- **カードホバー**: background-color 0.2s
- **プルリフレッシュ**: 標準のReact Native実装
- **ローディング**: ActivityIndicator（赤色）

### フォント

- **本文**: システムデフォルト
- **サイズ**:
  - タイトル: 15px（通常）、17px（トップ）
  - メタ情報: 11-12px
  - ヘッダー: 18px

---

## 自動化とスケジュール

### GitHub Actions ワークフロー

**ファイル**: `.github/workflows/fetch-news.yml`

```yaml
schedule:
  - cron: '0 21 * * *'  # JST 06:00
  - cron: '0 1 * * *'   # JST 10:00
  - cron: '0 3 * * *'   # JST 12:00
  - cron: '0 6 * * *'   # JST 15:00
  - cron: '0 9 * * *'   # JST 18:00
  - cron: '0 12 * * *'  # JST 21:00
```

**実行順序**:
1. fetch-news.js（Google News + まとめサイト）
2. fetch-youtube.js（YouTube動画）
3. fetch-events.js（P-WORLDイベント）
4. fetch-hatena-bookmarks.js（はてなブックマーク数）

### データ取得仕様

#### 1. Google News (fetch-news.js)

**対象キーワード**:
```javascript
const keywords = [
  'パチスロ', 'パチンコ', 'スロット',
  'パチンコ メーカー', 'パチスロ 機種',
  'パチンコ業界', 'パチスロ業界'
];
```

**RSS URL**: `https://news.google.com/rss/search?q={keyword}&hl=ja&gl=JP&ceid=JP:ja`

**カテゴリ判定**:
- タイトルに「解析」「設定」「天井」「スペック」→ kaiseki
- ソースがメーカー名 → maker
- デフォルト → industry

#### 2. まとめサイト (fetch-news.js)

**対象サイト**:
```javascript
const matomeFeeds = [
  'https://pachinkokouryaku777.net/feed',
  'https://slotters-info.net/feed',
  'https://pachink.com/feed',
  // 他15サイト
];
```

**カテゴリ**: matome

#### 3. YouTube (fetch-youtube.js)

**対象チャンネル**:
```javascript
const channels = [
  'UCxxxxxxx', // きむちゃんねる
  'UCxxxxxxx', // スロパチステーション
  // 他10チャンネル
];
```

**検索条件**:
- 公開日: 14日以内
- 視聴回数: 50,000回以上
- ソート: 視聴回数降順

**カテゴリ**: youtube

#### 4. P-WORLDイベント (fetch-events.js)

**URL**: `https://www.p-world.co.jp/event/`

**スクレイピング対象**:
```
来店 / 取材 + 日付 + 地域 + ホール名
```

**データ抽出**:
- イベントタイプ: 来店 / 取材
- 日付: MM/DD形式 → ISO 8601変換
- 地域: 県名+市区町村
- ホール名: 店舗名

**カテゴリ**: event

#### 5. はてなブックマーク数 (fetch-hatena-bookmarks.js)

**対象**: まとめカテゴリの最新200件

**API**: `https://bookmark.hatenaapis.com/count/entry?url={URL}`

**処理**:
1. まとめ記事を取得
2. 各URLのブックマーク数を取得（200ms間隔）
3. view_countに保存
4. 変更なしの場合はスキップ

---

## デプロイメント

### Vercel設定

**プロジェクト設定**:
- **Framework**: Expo
- **Build Command**: `expo export:web`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

**自動デプロイ**:
- mainブランチへのpush → 自動デプロイ

### 環境変数（Vercel）

設定不要（フロントエンドはSupabaseの公開APIキーを使用）

### GitHub Secrets

**必須**:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `YOUTUBE_API_KEY`

---

## 環境変数

### .env.local（ローカル開発用）

```bash
SUPABASE_URL=https://pmeshocxacyhughagupo.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...（実際のキー）
YOUTUBE_API_KEY=AIzaSy...（実際のキー）
```

---

## ファイル構成

```
pachislot-news/
├── .github/
│   └── workflows/
│       └── fetch-news.yml          # GitHub Actionsワークフロー
├── scripts/
│   ├── fetch-news.js               # Google News + まとめサイト
│   ├── fetch-youtube.js            # YouTube動画
│   ├── fetch-events.js             # P-WORLDイベント
│   └── fetch-hatena-bookmarks.js   # はてなブックマーク数
├── src/
│   ├── components/
│   │   ├── AnimatedLogo.tsx        # アニメーションロゴ
│   │   ├── CategoryTabs.tsx        # カテゴリタブ
│   │   ├── EventAnalytics.tsx      # イベント県別分析
│   │   ├── NewsCard.tsx            # ニュースカード
│   │   ├── SearchBar.tsx           # 検索バー
│   │   ├── TopicsSection.tsx       # トピックセクション
│   │   ├── YouTubeAnalytics.tsx    # YouTube分析
│   │   └── index.ts                # エクスポート
│   ├── services/
│   │   ├── eventAnalytics.ts       # イベント分析サービス
│   │   ├── supabase.ts             # Supabaseクライアント
│   │   └── youtubeAnalytics.ts     # YouTube分析サービス
│   └── types/
│       └── news.ts                 # 型定義
├── App.tsx                         # メインアプリ
├── package.json                    # 依存関係
└── app.json                        # Expo設定
```

---

## 再現手順

### 1. プロジェクト初期化

```bash
# Expoプロジェクト作成
npx create-expo-app pachislot-news --template blank-typescript

cd pachislot-news

# 依存関係インストール
npm install @supabase/supabase-js
npm install rss-parser googleapis cheerio
npm install react-native-chart-kit react-native-svg
```

### 2. Supabase設定

1. Supabaseプロジェクト作成
2. newsテーブル作成（上記スキーマ参照）
3. site_statsテーブル作成
4. URLとANON KEYを取得

### 3. ファイル作成

上記ファイル構成に従って、各ファイルを作成

### 4. GitHub設定

1. GitHubリポジトリ作成
2. Secretsに環境変数を設定
3. GitHub Actionsを有効化

### 5. Vercel設定

1. Vercelプロジェクト作成
2. GitHubリポジトリ連携
3. 自動デプロイ設定

---

## 補足情報

### YouTube API クォータ

**1日の制限**: 10,000ユニット

**使用量**:
- search.list: 100ユニット/回
- 1日6回実行 = 600ユニット/日（余裕あり）

### P-WORLD スクレイピング

**ロボット除外**: robots.txtで許可されている

**レート制限**: 特に設定なし（常識的な範囲で）

### はてなブックマーク API

**レート制限**: 公式には明記なし

**対策**: 200ms間隔で取得

---

## トラブルシューティング

### Q: ニュースが表示されない
**A**: GitHub Actionsの実行履歴を確認。エラーがある場合はAPIキーを確認。

### Q: YouTube動画が取得できない
**A**: YouTube APIのクォータ残量を確認。APIキーが有効か確認。

### Q: はてなブックマーク数が0
**A**: 記事が実際にブックマークされていない可能性。時間が経てば増える。

---

**以上で仕様書は完了です。**

このドキュメントに従えば、システム全体を完全に再現できます。
