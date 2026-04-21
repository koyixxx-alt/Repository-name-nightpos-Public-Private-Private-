export const castsData = [
  { id: 1, name: "あおい", kana: "アオイ", role: "キャスト", status: "in", statusEmp: "在籍", clockIn: "20:00", clockOut: "", elMin: 185, breakMin: 0, wage: 1200, drink: 5, shimei: 2, champ: 10000 },
  { id: 2, name: "みき", kana: "ミキ", role: "キャスト", status: "in", statusEmp: "在籍", clockIn: "20:30", clockOut: "", elMin: 155, breakMin: 0, wage: 1200, drink: 3, shimei: 1, champ: 0 },
  { id: 3, name: "さくら", kana: "サクラ", role: "キャスト", status: "brk", statusEmp: "在籍", clockIn: "21:00", clockOut: "", elMin: 125, breakMin: 15, wage: 1200, drink: 2, shimei: 1, champ: 0 },
  { id: 4, name: "ゆな", kana: "ユナ", role: "キャスト", status: "in", statusEmp: "在籍", clockIn: "22:00", clockOut: "", elMin: 65, breakMin: 0, wage: 1200, drink: 1, shimei: 0, champ: 0 },
  { id: 5, name: "たかし", kana: "タカシ", role: "ボーイ", status: "in", statusEmp: "在籍", clockIn: "20:00", clockOut: "", elMin: 185, breakMin: 0, wage: 1000, drink: 0, shimei: 0, champ: 0 },
  { id: 6, name: "まりこ", kana: "マリコ", role: "キャスト", status: "out", statusEmp: "除籍", clockIn: "", clockOut: "", elMin: 0, breakMin: 0, wage: 1200, drink: 0, shimei: 0, champ: 0 },
];

export const customersData = [
  { id: 1, name: "田中様", kana: "タナカ", rank: "vip", visit: 12, total: 480000, last: "本日", cast: "あおい", fav: "ハイボール", tel: "090-1111-0001" },
  { id: 2, name: "山田様", kana: "ヤマダ", rank: "reg", visit: 6, total: 180000, last: "本日", cast: "みき", fav: "ビール", tel: "090-1111-0002" },
  { id: 3, name: "佐藤様", kana: "サトウ", rank: "vip", visit: 18, total: 820000, last: "本日", cast: "さくら", fav: "シャンパン", tel: "090-1111-0003" },
  { id: 4, name: "伊藤様", kana: "イトウ", rank: "new", visit: 1, total: 3000, last: "本日", cast: "ゆな", fav: "未記録", tel: "090-1111-0004" },
  { id: 5, name: "渡辺様", kana: "ワタナベ", rank: "reg", visit: 8, total: 280000, last: "3日前", cast: "みき", fav: "焼酎", tel: "090-1111-0005" },
];

export const menuCategories = [
  { id: "set", name: "セット" },
  { id: "drink", name: "ドリンク" },
  { id: "bottle", name: "ボトル" },
  { id: "champ", name: "シャンパン" },
  { id: "shimei", name: "指名・オプション" },
];

export const menuData = [
  { id: 1, cat: "set", name: "通常セット 60分", price: 3000 },
  { id: 2, cat: "set", name: "ビールありセット 60分", price: 3500 },
  { id: 3, cat: "drink", name: "キャストドリンク", price: 1000 },
  { id: 4, cat: "drink", name: "ショット各種", price: 1000 },
  { id: 5, cat: "bottle", name: "黒霧島", price: 4000 },
  { id: 6, cat: "champ", name: "MAVAM（マバム）", price: 10000 },
  { id: 7, cat: "shimei", name: "指名料", price: 1000 },
];

export const invoicesData = [
  { txno: "TXN-0041", date: "2024-07-09", time: "23:45", tableId: "T-1", guests: ["田中様"], casts: ["あおい"], total: 6000, method: "現金" },
  { txno: "TXN-0042", date: "2024-07-09", time: "23:10", tableId: "T-2", guests: ["山田様"], casts: ["みき"], total: 3500, method: "カード" },
  { txno: "TXN-0043", date: "2024-07-09", time: "22:58", tableId: "T-3", guests: ["佐藤様"], casts: ["さくら"], total: 16000, method: "現金" },
];
