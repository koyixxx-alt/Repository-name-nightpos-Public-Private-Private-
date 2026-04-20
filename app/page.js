"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

const SETTINGS = {
  storeName: "Room YOLO",
  setMin: 60,
  ownerPin: "1234",
  salaryPin: "5678",
};

const MENU_CATEGORIES = [
  { id: "set", name: "セット" },
  { id: "drink", name: "ドリンク" },
  { id: "bottle", name: "ボトル" },
  { id: "champ", name: "シャンパン" },
  { id: "shimei", name: "指名・オプション" },
];

const INIT_MENU = [
  { id: 1, cat: "set", name: "通常セット 60分", price: 3000 },
  { id: 2, cat: "set", name: "ビールありセット 60分", price: 3500 },
  { id: 3, cat: "drink", name: "キャストドリンク", price: 1000 },
  { id: 4, cat: "drink", name: "ショット各種", price: 1000 },
  { id: 5, cat: "bottle", name: "黒霧島", price: 4000 },
  { id: 6, cat: "champ", name: "MAVAM（マバム）", price: 10000 },
  { id: 7, cat: "shimei", name: "指名料", price: 1000 },
];

const INIT_TABLES = [
  {
    id: "T-1",
    type: "occ",
    casts: ["あおい"],
    shimeis: ["あおい"],
    guests: ["田中様"],
    num: 2,
    inTime: "21:00",
    elMin: 40,
    items: [
      { n: "通常セット 60分", p: 3000, q: 1, sc: null },
      { n: "キャストドリンク", p: 1000, q: 2, sc: null },
      { n: "指名料", p: 1000, q: 1, sc: "あおい" },
    ],
  },
  {
    id: "T-2",
    type: "occ",
    casts: ["みき"],
    shimeis: [],
    guests: ["山田様", "鈴木様"],
    num: 3,
    inTime: "21:30",
    elMin: 25,
    items: [
      { n: "ビールありセット 60分", p: 3500, q: 1, sc: null },
      { n: "キャストドリンク", p: 1000, q: 1, sc: null },
    ],
  },
  {
    id: "T-3",
    type: "occ",
    casts: ["さくら"],
    shimeis: ["さくら"],
    guests: ["佐藤様"],
    num: 1,
    inTime: "22:00",
    elMin: 75,
    items: [
      { n: "通常セット 120分", p: 5000, q: 1, sc: null },
      { n: "MAVAM（マバム）", p: 10000, q: 1, sc: null },
    ],
  },
  {
    id: "C-1",
    type: "occ",
    casts: ["ゆな"],
    shimeis: [],
    guests: ["伊藤様"],
    num: 1,
    inTime: "23:10",
    elMin: 15,
    items: [{ n: "通常セット 60分", p: 3000, q: 1, sc: null }],
  },
  { id: "C-2", type: "empty", casts: [], shimeis: [], guests: [], num: 0, inTime: "", elMin: 0, items: [] },
  { id: "C-3", type: "empty", casts: [], shimeis: [], guests: [], num: 0, inTime: "", elMin: 0, items: [] },
  { id: "C-4", type: "empty", casts: [], shimeis: [], guests: [], num: 0, inTime: "", elMin: 0, items: [] },
];

const INIT_CASTS = [
  { id: 1, name: "あおい", kana: "アオイ", role: "キャスト", statusEmp: "在籍", status: "in", clockIn: "20:00", clockOut: "", elMin: 185, breakMin: 0, breakLog: [], wage: 1200, drink: 5, shimei: 2, champ: 10000 },
  { id: 2, name: "みき", kana: "ミキ", role: "キャスト", statusEmp: "在籍", status: "in", clockIn: "20:30", clockOut: "", elMin: 155, breakMin: 0, breakLog: [], wage: 1200, drink: 3, shimei: 1, champ: 0 },
  { id: 3, name: "さくら", kana: "サクラ", role: "キャスト", statusEmp: "在籍", status: "brk", clockIn: "21:00", clockOut: "", elMin: 125, breakMin: 15, breakLog: [{ from: "22:00", to: "22:15", min: 15 }], wage: 1200, drink: 2, shimei: 1, champ: 0 },
  { id: 4, name: "ゆな", kana: "ユナ", role: "キャスト", statusEmp: "在籍", status: "in", clockIn: "22:00", clockOut: "", elMin: 65, breakMin: 0, breakLog: [], wage: 1200, drink: 1, shimei: 0, champ: 0 },
  { id: 5, name: "たかし", kana: "タカシ", role: "ボーイ", statusEmp: "在籍", status: "in", clockIn: "20:00", clockOut: "", elMin: 185, breakMin: 0, breakLog: [], wage: 1000, drink: 0, shimei: 0, champ: 0 },
  { id: 6, name: "まりこ", kana: "マリコ", role: "キャスト", statusEmp: "除籍", status: "out", clockIn: "", clockOut: "", elMin: 0, breakMin: 0, breakLog: [], wage: 1200, drink: 0, shimei: 0, champ: 0 },
];

const INIT_CUSTOMERS = [
  { id: 1, name: "田中様", kana: "タナカ", rank: "vip", visit: 12, total: 480000, last: "本日", cast: "あおい", fav: "ハイボール", tel: "090-1111-0001" },
  { id: 2, name: "山田様", kana: "ヤマダ", rank: "reg", visit: 6, total: 180000, last: "本日", cast: "みき", fav: "ビール", tel: "090-1111-0002" },
  { id: 3, name: "佐藤様", kana: "サトウ", rank: "vip", visit: 18, total: 820000, last: "本日", cast: "さくら", fav: "シャンパン", tel: "090-1111-0003" },
  { id: 4, name: "伊藤様", kana: "イトウ", rank: "new", visit: 1, total: 3000, last: "本日", cast: "ゆな", fav: "未記録", tel: "090-1111-0004" },
  { id: 5, name: "渡辺様", kana: "ワタナベ", rank: "reg", visit: 8, total: 280000, last: "3日前", cast: "みき", fav: "焼酎", tel: "090-1111-0005" },
];

const INIT_INVOICES = [
  { txno: "TXN-0041", date: "2024-07-09", time: "23:45", tableId: "T-1", guests: ["田中様"], casts: ["あおい"], total: 6000, method: "現金" },
  { txno: "TXN-0042", date: "2024-07-09", time: "23:10", tableId: "T-2", guests: ["山田様"], casts: ["みき"], total: 3500, method: "カード" },
  { txno: "TXN-0043", date: "2024-07-09", time: "22:58", tableId: "T-3", guests: ["佐藤様"], casts: ["さくら"], total: 16000, method: "現金" },
];

function fmt(min) {
  return `${Math.floor(min / 60)}:${String(min % 60).padStart(2, "0")}`;
}

function fmtH(min) {
  if (min <= 0) return "−";
  return `${Math.floor(min / 60)}時間${String(min % 60).padStart(2, "0")}分`;
}

function nowTime() {
  const n = new Date();
  return `${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`;
}

function calcTotal(items) {
  return items.reduce((sum, item) => sum + item.p * item.q, 0);
}

function getTableColor(elMin) {
  if (elMin >= SETTINGS.setMin) return "t-over";
  if (elMin >= SETTINGS.setMin - 10) return "t-warn";
  if (elMin >= SETTINGS.setMin / 2) return "t-half";
  return "occ";
}

function getElapsedColor(elMin) {
  if (elMin >= SETTINGS.setMin) return "c-over";
  if (elMin >= SETTINGS.setMin - 10) return "c-warn";
  if (elMin >= SETTINGS.setMin / 2) return "c-half";
  return "c-normal";
}

function normalizeTable(row) {
  return {
    id: row.id,
    type: row.type ?? "empty",
    casts: Array.isArray(row.casts) ? row.casts : [],
    shimeis: Array.isArray(row.shimeis) ? row.shimeis : [],
    guests: Array.isArray(row.guests) ? row.guests : [],
    num: row.num ?? 0,
    inTime: row.in_time ?? "",
    elMin: row.elapsed_min ?? 0,
    items: Array.isArray(row.items) ? row.items : [],
  };
}

export default function Home() {
  const [page, setPage] = useState("floor");
  const [clock, setClock] = useState("");
  const [tables, setTables] = useState(INIT_TABLES);
  const [selectedTableId, setSelectedTableId] = useState("T-1");
  const [tableFilter, setTableFilter] = useState("all");
  const [orderDiscount, setOrderDiscount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuCat, setMenuCat] = useState("all");
  const [syncLabel, setSyncLabel] = useState("ローカル表示");

  const [casts, setCasts] = useState(INIT_CASTS);
  const [selectedCastId, setSelectedCastId] = useState(1);
  const [castTab, setCastTab] = useState("all");

  const [customers] = useState(INIT_CUSTOMERS);
  const [customerFilter, setCustomerFilter] = useState("all");
  const [selectedCustomerId, setSelectedCustomerId] = useState(1);

  const [menuItems, setMenuItems] = useState(INIT_MENU);
  const [menuMgmtCat, setMenuMgmtCat] = useState("set");

  const [invoices] = useState(INIT_INVOICES);
  const [reportPeriod, setReportPeriod] = useState("today");

  const [ownerUnlocked, setOwnerUnlocked] = useState(false);
  const [ownerPinInput, setOwnerPinInput] = useState("");
  const [salaryUnlocked, setSalaryUnlocked] = useState(false);
  const [salaryPinInput, setSalaryPinInput] = useState("");
  const [salaryPeriod, setSalaryPeriod] = useState("today");

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const w = ["日", "月", "火", "水", "木", "金", "土"];
      setClock(
        `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(
          d.getDate(),
        ).padStart(2, "0")}（${w[d.getDay()]}）\n${String(d.getHours()).padStart(
          2,
          "0",
        )}:${String(d.getMinutes()).padStart(2, "0")}`,
      );
    };
    tick();
    const timer = setInterval(tick, 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const loadTables = async () => {
      const { data, error } = await supabase.from("floor_tables").select("*");
      if (error || !data || data.length === 0) {
        setSyncLabel("Supabase未接続（サンプル表示）");
        return;
      }
      const next = data.map(normalizeTable);
      setTables(next);
      setSelectedTableId(next.find((t) => t.type !== "empty")?.id ?? next[0]?.id ?? "T-1");
      setSyncLabel("Supabase同期中");
    };
    loadTables();
  }, []);

  const selectedTable = useMemo(
    () => tables.find((t) => t.id === selectedTableId && t.type !== "empty") ?? null,
    [tables, selectedTableId],
  );

  const filteredTables = useMemo(() => {
    if (tableFilter === "occ") return tables.filter((t) => t.type !== "empty");
    if (tableFilter === "empty") return tables.filter((t) => t.type === "empty");
    return tables;
  }, [tables, tableFilter]);

  const orderSubtotal = selectedTable ? calcTotal(selectedTable.items) : 0;
  const usedDiscount = Math.min(orderDiscount, orderSubtotal);
  const orderTotal = Math.max(0, orderSubtotal - usedDiscount);

  const selectedCast = casts.find((c) => c.id === selectedCastId) ?? null;
  const activeCasts = casts.filter((c) => c.statusEmp !== "除籍");
  const dutyCount = activeCasts.filter((c) => c.status !== "out").length;

  const filteredCastGrid = useMemo(() => {
    if (castTab === "all") return casts.filter((c) => c.statusEmp !== "除籍");
    if (castTab === "retired") return casts.filter((c) => c.statusEmp === "除籍");
    return casts.filter((c) => c.role === castTab && c.statusEmp !== "除籍");
  }, [castTab, casts]);

  const filteredCustomers = useMemo(() => {
    if (customerFilter === "vip") return customers.filter((c) => c.rank === "vip");
    if (customerFilter === "new") return customers.filter((c) => c.rank === "new");
    return customers;
  }, [customers, customerFilter]);
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) ?? customers[0];

  const reportRows = useMemo(() => {
    const byCast = activeCasts.map((cast) => {
      const sales = invoices
        .filter((inv) => inv.casts.includes(cast.name))
        .reduce((sum, inv) => sum + inv.total, 0);
      return { name: cast.name, sales };
    });
    return byCast.sort((a, b) => b.sales - a.sales);
  }, [activeCasts, invoices]);

  const salaryRows = useMemo(() => {
    return activeCasts.map((cast) => {
      const baseHours = Math.max(0, cast.elMin - cast.breakMin) / 60;
      const base = Math.floor(baseHours * cast.wage);
      const drinkBack = cast.drink * 400;
      const shimeiBack = cast.shimei * 1000;
      const champBack = Math.floor(cast.champ * 0.1);
      const total = base + drinkBack + shimeiBack + champBack;
      return { ...cast, base, drinkBack, shimeiBack, champBack, total };
    });
  }, [activeCasts]);

  const updateTable = (tableId, updater) => {
    setTables((prev) =>
      prev.map((table) => {
        if (table.id !== tableId) return table;
        return updater(table);
      }),
    );
  };

  const addMenuToOrder = (menuItem) => {
    if (!selectedTable) return;
    updateTable(selectedTable.id, (table) => {
      const items = [...table.items];
      const idx = items.findIndex((item) => item.n === menuItem.name && item.sc === null);
      if (idx >= 0) items[idx] = { ...items[idx], q: items[idx].q + 1 };
      else items.push({ n: menuItem.name, p: menuItem.price, q: 1, sc: null });
      return { ...table, items };
    });
  };

  const addExtension = (min, price) => {
    if (!selectedTable) return;
    updateTable(selectedTable.id, (table) => ({
      ...table,
      elMin: table.elMin + min,
      items: [...table.items, { n: `延長 ${min}分`, p: price, q: 1, sc: null }],
    }));
  };

  const changeQty = (idx, delta) => {
    if (!selectedTable) return;
    updateTable(selectedTable.id, (table) => {
      const next = [...table.items];
      next[idx] = { ...next[idx], q: Math.max(1, next[idx].q + delta) };
      return { ...table, items: next };
    });
  };

  const deleteOrder = (idx) => {
    if (!selectedTable) return;
    updateTable(selectedTable.id, (table) => ({
      ...table,
      items: table.items.filter((_, i) => i !== idx),
    }));
  };

  const doQuickEnter = () => {
    const empty = tables.find((t) => t.type === "empty");
    if (!empty) return;
    updateTable(empty.id, () => ({
      id: empty.id,
      type: "occ",
      casts: ["未設定"],
      shimeis: [],
      guests: ["新規様"],
      num: 1,
      inTime: nowTime(),
      elMin: 0,
      items: [{ n: "通常セット 60分", p: 3000, q: 1, sc: null }],
    }));
    setSelectedTableId(empty.id);
  };

  const updateCastStatus = (castId, mode) => {
    setCasts((prev) =>
      prev.map((cast) => {
        if (cast.id !== castId) return cast;
        if (mode === "in") return { ...cast, status: "in", clockIn: nowTime(), clockOut: "" };
        if (mode === "out") return { ...cast, status: "out", clockOut: nowTime() };
        if (mode === "brk" && cast.status === "in") {
          return { ...cast, status: "brk", breakLog: [...cast.breakLog, { from: nowTime(), to: "", min: 0 }] };
        }
        if (mode === "brkEnd" && cast.status === "brk") {
          const logs = [...cast.breakLog];
          if (logs.length > 0) logs[logs.length - 1] = { ...logs[logs.length - 1], to: nowTime(), min: 15 };
          return { ...cast, status: "in", breakMin: cast.breakMin + 15, breakLog: logs };
        }
        return cast;
      }),
    );
  };

  const addMenuItem = () => {
    const cat = menuMgmtCat;
    const catName = MENU_CATEGORIES.find((c) => c.id === cat)?.name ?? cat;
    const nextId = Math.max(...menuItems.map((m) => m.id)) + 1;
    setMenuItems((prev) => [...prev, { id: nextId, cat, name: `${catName} 新メニュー`, price: 1000 }]);
  };

  const unlockOwner = () => {
    if (ownerPinInput === SETTINGS.ownerPin) setOwnerUnlocked(true);
    setOwnerPinInput("");
  };

  const unlockSalary = () => {
    if (salaryPinInput === SETTINGS.salaryPin) setSalaryUnlocked(true);
    setSalaryPinInput("");
  };

  const totalOccupied = tables.filter((t) => t.type !== "empty").length;

  return (
    <div className="app">
      <header className="hdr">
        <div className="logo">🌙</div>
        <div className="appname">
          NightPOS <span>{SETTINGS.storeName}</span>
        </div>
        <div className="hpill hpill-gr">
          <span className="ldot" />
          営業中
        </div>
        <div className="hpill hpill-ac">
          🪑 <strong>{totalOccupied}</strong>/{tables.length}
        </div>
        <div className="hclock">{clock}</div>
      </header>

      <nav className="nav">
        {[
          ["floor", "⬛ テーブル"],
          ["kintai", "🕐 勤怠"],
          ["customer", "🎴 顧客"],
          ["cast", "👤 キャスト"],
          ["report", "📊 レポート"],
          ["menu-mgmt", "🍽 メニュー"],
          ["owner", "🔐 オーナー"],
          ["salary", "💰 給与計算"],
        ].map(([id, label]) => (
          <button key={id} className={`ntab ${page === id ? "on" : ""}`} onClick={() => setPage(id)}>
            {label}
          </button>
        ))}
      </nav>

      {page === "floor" && (
        <main className="page">
          <div className="floor-wrap">
            <div className="toolbar">
              <div className="tlabel">フロアマップ</div>
              <div style={{ display: "flex", gap: 5 }}>
                <button className={`chip ${tableFilter === "all" ? "on" : ""}`} onClick={() => setTableFilter("all")}>全席</button>
                <button className={`chip ${tableFilter === "occ" ? "on" : ""}`} onClick={() => setTableFilter("occ")}>稼働中</button>
                <button className={`chip ${tableFilter === "empty" ? "on" : ""}`} onClick={() => setTableFilter("empty")}>空席</button>
              </div>
              <button className="btn btn-dk" onClick={doQuickEnter}>＋ 入店</button>
            </div>

            <div className="core">
              <div className="tscroll">
                <div className="legend">
                  <span>⏱ {SETTINGS.setMin}分設定：</span>
                  <span><span className="ldot2 c1" />通常</span>
                  <span><span className="ldot2 c2" />折返し</span>
                  <span><span className="ldot2 c3" />残10分</span>
                  <span><span className="ldot2 c4" />超過</span>
                </div>
                <div className="tgrid">
                  {filteredTables.map((t) => {
                    if (t.type === "empty") {
                      return (
                        <div key={t.id} className="tc empty" onClick={doQuickEnter}>
                          <div className="tc-top"><span className="tc-num">{t.id}</span></div>
                          <div className="empty-txt">＋ 入店</div>
                        </div>
                      );
                    }
                    return (
                      <div key={t.id} className={`tc ${getTableColor(t.elMin)} ${selectedTableId === t.id ? "sel" : ""}`} onClick={() => setSelectedTableId(t.id)}>
                        <div className="tc-top">
                          <span className="tc-num">{t.id}</span>
                          {t.elMin >= SETTINGS.setMin && <span className="ttag ttag-over">超過</span>}
                          {t.elMin < SETTINGS.setMin && t.elMin >= SETTINGS.setMin - 10 && <span className="ttag ttag-warn">残10分</span>}
                          {t.elMin < SETTINGS.setMin - 10 && t.elMin >= SETTINGS.setMin / 2 && <span className="ttag ttag-half">折返し</span>}
                        </div>
                        <div className="tc-cast">{t.casts.join("・")}</div>
                        <div className="tc-guest">{t.guests.join("・")}</div>
                        <div className="tc-num-guests">{t.num}名</div>
                        <div className={`tc-elapsed ${getElapsedColor(t.elMin)}`}>{fmt(t.elMin)}</div>
                        <div className="tc-amt">¥{calcTotal(t.items).toLocaleString()}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <aside className="rp">
                <div className="rp-hd">
                  <div className="rp-name">{selectedTable ? selectedTable.id : "席を選択"}</div>
                  <div className="rp-sub">
                    {selectedTable
                      ? `担当：${selectedTable.casts.join("・")}　${selectedTable.guests.join("・")} ${selectedTable.num}名　入店 ${selectedTable.inTime}`
                      : "フロアマップから卓をタップ"}
                  </div>
                  {selectedTable && <div className="rp-timer">⏱ 経過 {fmt(selectedTable.elMin)}</div>}
                </div>
                <div className="rp-scroll">
                  <div className="osec">
                    <div className="osec-hd">
                      <span>注文内容</span>
                      <span>{selectedTable ? `${selectedTable.items.reduce((s, x) => s + x.q, 0)}品` : "0品"}</span>
                    </div>
                    {!selectedTable && <div className="empty-note">席を選択してください</div>}
                    {selectedTable?.items.map((item, idx) => (
                      <div className="oitem" key={`${item.n}-${idx}`}>
                        <div className="oqw">
                          <button className="oqbtn" onClick={() => changeQty(idx, -1)}>−</button>
                          <div className="oqn">{item.q}</div>
                          <button className="oqbtn" onClick={() => changeQty(idx, 1)}>＋</button>
                        </div>
                        <div className="oname">{item.n}</div>
                        <div className="oprice">¥{(item.p * item.q).toLocaleString()}</div>
                        <button className="odel" onClick={() => deleteOrder(idx)}>✕</button>
                      </div>
                    ))}
                    <button className="add-btn" onClick={() => setMenuOpen((v) => !v)}>＋ メニューから追加</button>
                  </div>

                  <div className="bsec">
                    <div className="brow"><span>小計</span><span>{selectedTable ? `¥${orderSubtotal.toLocaleString()}` : "−"}</span></div>
                    <div className="brow">
                      <span style={{ color: "var(--rd)" }}>割引</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                        －
                        <input className="disc-in" type="number" min={0} value={orderDiscount} onChange={(e) => setOrderDiscount(Number(e.target.value) || 0)} />
                        円
                      </span>
                    </div>
                    <div className="brow btot"><span>合計</span><span>¥{orderTotal.toLocaleString()}</span></div>
                  </div>
                </div>

                <div className="rp-acts">
                  <button className="btn-kai">会　計</button>
                  <div className="sub-row">
                    <button className="sbtn" onClick={() => addExtension(30, 2000)}>⏱ 延長30分</button>
                    <button className="sbtn" onClick={() => addExtension(60, 3000)}>⏱ 延長60分</button>
                    <button className="sbtn" onClick={() => setOrderDiscount(0)}>割引クリア</button>
                  </div>
                </div>

                <div className="stats-grid">
                  <div className="scard"><div className="slbl">表示状態</div><div className="sval sm">{syncLabel}</div></div>
                  <div className="scard"><div className="slbl">稼働席</div><div className="sval">{totalOccupied}/{tables.length}</div></div>
                  <div className="scard"><div className="slbl">出勤中</div><div className="sval">{dutyCount}名</div></div>
                  <div className="scard"><div className="slbl">メニュー数</div><div className="sval">{menuItems.length}件</div></div>
                </div>
              </aside>

              <section className={`mp ${menuOpen ? "open" : ""}`}>
                <div className="mp-hd">
                  <div className="mp-title">メニュー追加</div>
                  <button className="mp-x" onClick={() => setMenuOpen(false)}>✕</button>
                </div>
                <div className="mp-cats">
                  <button className={`mcat ${menuCat === "all" ? "on" : ""}`} onClick={() => setMenuCat("all")}>すべて</button>
                  {MENU_CATEGORIES.map((cat) => (
                    <button key={cat.id} className={`mcat ${menuCat === cat.id ? "on" : ""}`} onClick={() => setMenuCat(cat.id)}>
                      {cat.name}
                    </button>
                  ))}
                </div>
                <div className="mp-list">
                  {menuItems
                    .filter((m) => menuCat === "all" || m.cat === menuCat)
                    .map((m) => (
                      <div key={m.id} className="mitem" onClick={() => addMenuToOrder(m)}>
                        <span className="mi-cat">{MENU_CATEGORIES.find((c) => c.id === m.cat)?.name ?? m.cat}</span>
                        <span className="mi-name">{m.name}</span>
                        <span className="mi-price">¥{m.price.toLocaleString()}</span>
                        <button className="mi-add">＋</button>
                      </div>
                    ))}
                </div>
              </section>
            </div>
          </div>
        </main>
      )}

      {page === "kintai" && (
        <main className="page pscroll">
          <div className="toolbar thin">
            <div className="tlabel">勤怠管理</div>
            <button className="btn btn-dk">📊 CSV</button>
          </div>
          <div className="kintai-body">
            <aside className="k-list">
              <div className="kl-hd">あいうえお順</div>
              <div className="kl-scroll">
                {activeCasts.map((cast) => (
                  <button key={cast.id} className={`kl-item ${selectedCastId === cast.id ? "sel" : ""}`} onClick={() => setSelectedCastId(cast.id)}>
                    <div className={`kl-av ${cast.role === "ボーイ" ? "av-boy" : "av-cast"}`}>{cast.name[0]}</div>
                    <div>
                      <div className="kl-name">{cast.name}</div>
                      <div className={`kl-st ${cast.status}`}>{cast.status === "in" ? "出勤中" : cast.status === "brk" ? "休憩中" : "未出勤"}</div>
                    </div>
                  </button>
                ))}
              </div>
            </aside>

            <section className="k-detail">
              {selectedCast && (
                <div className="card">
                  <div className="kd-top">
                    <div className={`kd-av ${selectedCast.role === "ボーイ" ? "av-boy" : "av-cast"}`}>{selectedCast.name[0]}</div>
                    <div>
                      <div className="kd-name">{selectedCast.name}</div>
                      <div className="kd-role">{selectedCast.role}</div>
                    </div>
                  </div>
                  <div className="punch-btns">
                    <button className="pbtn pbtn-in" onClick={() => updateCastStatus(selectedCast.id, "in")}>🟢 出勤打刻</button>
                    <button className="pbtn pbtn-brk" onClick={() => updateCastStatus(selectedCast.id, selectedCast.status === "brk" ? "brkEnd" : "brk")}>
                      {selectedCast.status === "brk" ? "✅ 休憩終了" : "☕ 休憩開始"}
                    </button>
                    <button className="pbtn pbtn-out" onClick={() => updateCastStatus(selectedCast.id, "out")}>🔴 退勤打刻</button>
                  </div>
                  <div className="kd-times">
                    <div className="kt-box"><div className="kt-lbl">出勤</div><div className="kt-val">{selectedCast.clockIn || "−"}</div></div>
                    <div className="kt-box"><div className="kt-lbl">退勤</div><div className="kt-val">{selectedCast.clockOut || "−"}</div></div>
                    <div className="kt-box"><div className="kt-lbl">勤務時間</div><div className="kt-val">{fmtH(selectedCast.elMin)}</div></div>
                  </div>
                  <div className="brk-log-wrap">
                    <div className="brk-log-hd">休憩履歴（{selectedCast.breakLog.length}回 / 合計{selectedCast.breakMin}分）</div>
                    {selectedCast.breakLog.length === 0 && <div className="brk-log-row">休憩なし</div>}
                    {selectedCast.breakLog.map((b, idx) => (
                      <div key={`${b.from}-${idx}`} className="brk-log-row">{idx + 1}回目: {b.from} 〜 {b.to || "休憩中"}</div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>
        </main>
      )}

      {page === "customer" && (
        <main className="page pscroll">
          <div className="sec-hd">
            <div>
              <div className="sec-title">顧客管理</div>
              <div className="subtxt">登録 {customers.length}名</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button className={`btn btn-ol ${customerFilter === "all" ? "on-ol" : ""}`} onClick={() => setCustomerFilter("all")}>全顧客</button>
              <button className={`btn btn-ol ${customerFilter === "vip" ? "on-ol" : ""}`} onClick={() => setCustomerFilter("vip")}>VIP</button>
              <button className={`btn btn-ol ${customerFilter === "new" ? "on-ol" : ""}`} onClick={() => setCustomerFilter("new")}>新規</button>
            </div>
          </div>
          <div className="cust-layout">
            <div className="cu-grid">
              {filteredCustomers.map((c) => (
                <button key={c.id} className={`cu-card ${selectedCustomerId === c.id ? "sel" : ""}`} onClick={() => setSelectedCustomerId(c.id)}>
                  <div className="cu-top">
                    <div className="cu-av">{c.name[0]}</div>
                    <div>
                      <div className="cu-name">{c.name}</div>
                      <div className="cu-kana">{c.kana}</div>
                      <span className={`rank-tag r-${c.rank}`}>{c.rank === "vip" ? "VIP" : c.rank === "reg" ? "レギュラー" : "新規"}</span>
                    </div>
                  </div>
                  <div className="cu-stats">
                    <div className="cs-box"><div className="cs-v">{c.visit}</div><div className="cs-l">来店回数</div></div>
                    <div className="cs-box"><div className="cs-v">¥{Math.round(c.total / 10000)}万</div><div className="cs-l">累計</div></div>
                    <div className="cs-box"><div className="cs-v">{c.last}</div><div className="cs-l">最終来店</div></div>
                  </div>
                </button>
              ))}
            </div>
            <div className="card cust-detail">
              <div className="sec-title">顧客詳細</div>
              <div className="kv">氏名: {selectedCustomer.name}</div>
              <div className="kv">電話: {selectedCustomer.tel}</div>
              <div className="kv">担当: {selectedCustomer.cast}</div>
              <div className="kv">好み: {selectedCustomer.fav}</div>
              <div className="kv">累計: ¥{selectedCustomer.total.toLocaleString()}</div>
            </div>
          </div>
        </main>
      )}

      {page === "cast" && (
        <main className="page pscroll">
          <div className="sec-hd">
            <div className="sec-title">キャスト管理</div>
            <button className="btn btn-dk">＋ 新規追加</button>
          </div>
          <div className="cast-tabs">
            <button className={`ctab ${castTab === "all" ? "on" : ""}`} onClick={() => setCastTab("all")}>在籍</button>
            <button className={`ctab ${castTab === "キャスト" ? "on" : ""}`} onClick={() => setCastTab("キャスト")}>キャスト</button>
            <button className={`ctab ${castTab === "ボーイ" ? "on" : ""}`} onClick={() => setCastTab("ボーイ")}>ボーイ</button>
            <button className={`ctab ${castTab === "retired" ? "on" : ""}`} onClick={() => setCastTab("retired")}>除籍</button>
          </div>
          <div className="cast-grid">
            {filteredCastGrid.map((c) => (
              <div className="cc-card" key={c.id}>
                <div className="cc-top">
                  <div className={`cc-av ${c.role === "ボーイ" ? "av-boy" : "av-cast"}`}>{c.name[0]}</div>
                  <div style={{ flex: 1 }}>
                    <div className="cc-name">{c.name}</div>
                    <div className="cc-role">{c.kana} | {c.role}</div>
                    <span className={`cc-st ${c.statusEmp === "除籍" ? "s-retired" : "s-in"}`}>{c.statusEmp}</span>
                  </div>
                </div>
                <div className="cc-info">
                  <span>時給: ¥{c.wage.toLocaleString()}</span>
                  <span>勤務: {fmtH(c.elMin)}</span>
                  <span>ドリンク: {c.drink}杯</span>
                  <span>指名: {c.shimei}本</span>
                </div>
                <div className="cc-actions">
                  <button className="btn btn-ol" style={{ flex: 1 }}>✏ 編集</button>
                  <button className="btn btn-rd">削除</button>
                </div>
              </div>
            ))}
          </div>
        </main>
      )}

      {page === "report" && (
        <main className="page pscroll">
          <div className="sec-title" style={{ marginBottom: 12 }}>レポート</div>
          <div className="rp-period-btns">
            {[
              ["today", "今日"],
              ["week", "今週"],
              ["month", "今月"],
              ["quarter", "3ヶ月"],
              ["year", "年間"],
            ].map(([id, label]) => (
              <button key={id} className={`rpbtn ${reportPeriod === id ? "on" : ""}`} onClick={() => setReportPeriod(id)}>
                {label}
              </button>
            ))}
          </div>
          <div className="rp-grid">
            <div className="rp-card"><div className="rp-lbl">売上合計</div><div className="rp-val">¥{invoices.reduce((s, i) => s + i.total, 0).toLocaleString()}</div><div className="rp-sub">{reportPeriod}集計</div></div>
            <div className="rp-card"><div className="rp-lbl">客単価</div><div className="rp-val">¥{Math.floor(invoices.reduce((s, i) => s + i.total, 0) / Math.max(invoices.length, 1)).toLocaleString()}</div><div className="rp-sub">{invoices.length}件</div></div>
            <div className="rp-card"><div className="rp-lbl">稼働席</div><div className="rp-val">{totalOccupied}/{tables.length}</div><div className="rp-sub">現在</div></div>
            <div className="rp-card"><div className="rp-lbl">在籍スタッフ</div><div className="rp-val">{activeCasts.length}名</div><div className="rp-sub">除籍除く</div></div>
          </div>
          <div className="card">
            <div className="sec-title" style={{ marginBottom: 10 }}>売上ランキング</div>
            <table className="sales-tbl">
              <thead>
                <tr><th>順位</th><th>キャスト</th><th>売上</th></tr>
              </thead>
              <tbody>
                {reportRows.map((row, idx) => (
                  <tr key={row.name}><td>{idx + 1}</td><td>{row.name}</td><td>¥{row.sales.toLocaleString()}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      )}

      {page === "menu-mgmt" && (
        <main className="page pscroll">
          <div className="sec-hd">
            <div className="sec-title">メニュー管理</div>
            <button className="btn btn-dk" onClick={addMenuItem}>＋ メニュー追加</button>
          </div>
          <div className="mm-wrap">
            <div className="mm-cats">
              <div className="mm-cat-hd">カテゴリ</div>
              {MENU_CATEGORIES.map((cat) => (
                <button key={cat.id} className={`mm-cat-item ${menuMgmtCat === cat.id ? "sel" : ""}`} onClick={() => setMenuMgmtCat(cat.id)}>
                  <span>{cat.name}</span>
                  <span>{menuItems.filter((m) => m.cat === cat.id).length}</span>
                </button>
              ))}
            </div>
            <div className="mm-items">
              <div className="mm-items-hd">{MENU_CATEGORIES.find((c) => c.id === menuMgmtCat)?.name} 一覧</div>
              {menuItems
                .filter((item) => item.cat === menuMgmtCat)
                .map((item) => (
                  <div key={item.id} className="mm-item-row">
                    <div className="mm-item-nm">{item.name}</div>
                    <div className="mm-item-pr">¥{item.price.toLocaleString()}</div>
                    <div className="mm-item-acts">
                      <button className="btn btn-ol">編集</button>
                      <button className="btn btn-rd" onClick={() => setMenuItems((prev) => prev.filter((m) => m.id !== item.id))}>削除</button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </main>
      )}

      {page === "owner" && (
        <main className="page pscroll">
          {!ownerUnlocked ? (
            <div className="pin-screen">
              <div className="sec-title">オーナー管理</div>
              <div className="subtxt">PINコードを入力してください</div>
              <input className="pin-input" type="password" maxLength={4} value={ownerPinInput} onChange={(e) => setOwnerPinInput(e.target.value.replace(/\D/g, ""))} />
              <button className="btn btn-dk" onClick={unlockOwner}>ロック解除</button>
            </div>
          ) : (
            <div className="owner-content">
              <div className="owner-sec">
                <div className="owner-sec-title">店舗設定</div>
                <div className="kv">店舗名: {SETTINGS.storeName}</div>
                <div className="kv">セット時間: {SETTINGS.setMin}分</div>
                <div className="kv">現稼働席: {totalOccupied}/{tables.length}</div>
              </div>
              <div className="owner-sec">
                <div className="owner-sec-title">本日サマリー</div>
                <div className="kv">売上: ¥{invoices.reduce((s, i) => s + i.total, 0).toLocaleString()}</div>
                <div className="kv">会計件数: {invoices.length}件</div>
                <div className="kv">出勤中: {dutyCount}名</div>
              </div>
              <button className="btn btn-ol" onClick={() => setOwnerUnlocked(false)}>ロック</button>
            </div>
          )}
        </main>
      )}

      {page === "salary" && (
        <main className="page pscroll">
          {!salaryUnlocked ? (
            <div className="pin-screen">
              <div className="sec-title">給与計算</div>
              <div className="subtxt">PINコードを入力してください</div>
              <input className="pin-input" type="password" maxLength={4} value={salaryPinInput} onChange={(e) => setSalaryPinInput(e.target.value.replace(/\D/g, ""))} />
              <button className="btn btn-dk" onClick={unlockSalary}>ロック解除</button>
            </div>
          ) : (
            <>
              <div className="sec-hd">
                <div className="sec-title">給与計算</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className={`btn btn-ol ${salaryPeriod === "today" ? "on-ol" : ""}`} onClick={() => setSalaryPeriod("today")}>日次</button>
                  <button className={`btn btn-ol ${salaryPeriod === "month" ? "on-ol" : ""}`} onClick={() => setSalaryPeriod("month")}>月次</button>
                </div>
              </div>
              <div className="card">
                <table className="sales-tbl">
                  <thead>
                    <tr>
                      <th>氏名</th><th>勤務</th><th>基本給</th><th>ドリンク</th><th>指名</th><th>シャンパン</th><th>支給額</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salaryRows.map((row) => (
                      <tr key={row.id}>
                        <td>{row.name}</td>
                        <td>{fmtH(row.elMin)}</td>
                        <td>¥{row.base.toLocaleString()}</td>
                        <td>¥{row.drinkBack.toLocaleString()}</td>
                        <td>¥{row.shimeiBack.toLocaleString()}</td>
                        <td>¥{row.champBack.toLocaleString()}</td>
                        <td style={{ fontWeight: 700 }}>¥{row.total.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </main>
      )}

      <style jsx global>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        :root{
          --bg:#f0f0f5; --white:#fff; --bdr:#e4e4ee; --bdr2:#d0d0dc;
          --text:#1a1a2e; --t2:#6b6b80; --t3:#b0b0c0;
          --ac:#374151; --acl:#f3f4f6; --gr:#22c55e; --grl:#dcfce7; --grd:#15803d;
          --rd:#ef4444; --rdl:#fef2f2; --or:#f97316; --orl:#fff7ed; --gd:#d97706; --gdl:#fefce8;
          --pu:#7c3aed; --pul:#f5f3ff;
          --sh:0 2px 12px rgba(0,0,0,.07); --sh2:0 6px 24px rgba(0,0,0,.12);
          --r:16px; --rm:10px; --rs:7px;
        }
        html,body{height:100%;overflow:hidden;background:var(--bg);color:var(--text);font-family:'Noto Sans JP',sans-serif;font-size:14px;}
        button{font-family:inherit;}
        .app{height:100vh;display:flex;flex-direction:column;}
        .hdr{height:56px;background:var(--white);border-bottom:1px solid var(--bdr);display:flex;align-items:center;padding:0 14px;gap:9px;box-shadow:var(--sh);z-index:20;}
        .logo{width:34px;height:34px;background:var(--ac);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:17px;}
        .appname{font-size:15px;font-weight:700;flex:1;}
        .appname span{font-size:11px;color:var(--t2);margin-left:4px;}
        .hpill{display:flex;align-items:center;gap:4px;padding:4px 10px;border-radius:16px;font-size:11px;font-weight:600;border:1.5px solid;white-space:nowrap;}
        .hpill-gr{background:var(--grl);color:var(--grd);border-color:#86efac;}
        .hpill-ac{background:var(--acl);color:var(--ac);border-color:var(--bdr2);}
        .ldot{width:6px;height:6px;border-radius:50%;background:var(--gr);}
        .hclock{font-size:11px;color:var(--t2);text-align:right;line-height:1.5;min-width:124px;white-space:pre-line;}
        .nav{display:flex;background:var(--white);border-bottom:1px solid var(--bdr);overflow-x:auto;}
        .ntab{height:40px;padding:0 13px;display:flex;align-items:center;font-size:12px;font-weight:500;color:var(--t3);border:none;background:transparent;cursor:pointer;border-bottom:3px solid transparent;white-space:nowrap;}
        .ntab.on{color:var(--ac);border-bottom-color:var(--ac);font-weight:700;}
        .page{flex:1;overflow:hidden;display:flex;flex-direction:column;}
        .pscroll{overflow-y:auto;padding:16px;}
        .floor-wrap{flex:1;display:flex;flex-direction:column;overflow:hidden;}
        .toolbar{padding:9px 14px;display:flex;align-items:center;gap:7px;background:var(--white);border-bottom:1px solid var(--bdr);flex-wrap:wrap;}
        .toolbar.thin{padding:9px 14px;margin:-16px -16px 12px -16px;}
        .tlabel{font-size:13px;font-weight:700;flex:1;}
        .chip{padding:5px 11px;border-radius:16px;border:1.5px solid var(--bdr2);background:var(--white);color:var(--t2);font-size:11px;font-weight:600;cursor:pointer;}
        .chip.on{background:var(--ac);border-color:var(--ac);color:#fff;}
        .btn{height:34px;padding:0 12px;border-radius:var(--rm);font-size:12px;font-weight:700;border:none;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:4px;}
        .btn-dk{background:var(--ac);color:#fff;}
        .btn-ol{background:var(--white);color:var(--t2);border:1.5px solid var(--bdr2);}
        .btn-rd{background:var(--rd);color:#fff;}
        .btn.on-ol{border-color:var(--ac);color:var(--ac);}
        .core{display:flex;flex:1;overflow:hidden;position:relative;}
        .tscroll{flex:1;overflow-y:auto;padding:10px 14px;}
        .legend{display:flex;gap:8px;font-size:10px;color:var(--t2);margin-bottom:9px;flex-wrap:wrap;}
        .ldot2{width:7px;height:7px;border-radius:2px;display:inline-block;margin-right:2px;}
        .ldot2.c1{background:var(--ac);} .ldot2.c2{background:var(--gd);} .ldot2.c3{background:var(--or);} .ldot2.c4{background:var(--rd);}
        .tgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;}
        .tc{background:var(--white);border:2px solid var(--bdr);border-radius:var(--r);padding:12px;cursor:pointer;position:relative;min-height:140px;display:flex;flex-direction:column;box-shadow:var(--sh);}
        .tc::after{content:'';position:absolute;top:0;left:0;right:0;height:4px;border-radius:var(--r) var(--r) 0 0;}
        .tc.sel{border-color:var(--ac);box-shadow:0 0 0 3px rgba(55,65,81,.12);}
        .tc.occ::after{background:var(--ac);}
        .tc.t-half{border-color:#fde68a;background:var(--gdl);} .tc.t-half::after{background:var(--gd);}
        .tc.t-warn{border-color:#fed7aa;background:var(--orl);} .tc.t-warn::after{background:var(--or);}
        .tc.t-over{border-color:#fecaca;background:var(--rdl);} .tc.t-over::after{background:var(--rd);}
        .tc.empty{background:#f8f8fc;opacity:.62;}
        .tc-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;}
        .tc-num{font-size:10px;font-weight:700;color:var(--t2);}
        .ttag{font-size:9px;font-weight:700;padding:1px 5px;border-radius:3px;}
        .ttag-half{background:var(--gdl);color:var(--gd);} .ttag-warn{background:var(--orl);color:var(--or);} .ttag-over{background:var(--rdl);color:var(--rd);}
        .tc-cast{font-size:11px;color:var(--t2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:3px;}
        .tc-guest{font-size:15px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:2px;}
        .tc-num-guests{font-size:10px;color:var(--t2);margin-bottom:8px;}
        .tc-elapsed{font-size:18px;font-weight:900;margin-top:auto;margin-bottom:4px;}
        .tc-elapsed.c-normal{color:var(--ac);} .tc-elapsed.c-half{color:var(--gd);} .tc-elapsed.c-warn{color:var(--or);} .tc-elapsed.c-over{color:var(--rd);}
        .tc-amt{font-size:12px;font-weight:700;color:var(--t2);}
        .empty-txt{flex:1;display:flex;align-items:center;justify-content:center;font-size:12px;color:var(--t3);}
        .rp{width:300px;background:var(--white);border-left:1px solid var(--bdr);display:flex;flex-direction:column;overflow:hidden;}
        .rp-hd{padding:11px 14px;background:var(--bg);border-bottom:1px solid var(--bdr);}
        .rp-name{font-size:17px;font-weight:900;margin-bottom:1px;}
        .rp-sub{font-size:11px;color:var(--t2);line-height:1.5;}
        .rp-timer{display:inline-block;margin-top:4px;font-size:11px;font-weight:700;padding:2px 7px;border-radius:4px;background:var(--acl);color:var(--ac);}
        .rp-scroll{flex:1;overflow-y:auto;}
        .osec{padding:10px 14px;border-bottom:1px solid var(--bdr);}
        .osec-hd{display:flex;justify-content:space-between;font-size:10px;font-weight:700;color:var(--t2);margin-bottom:6px;}
        .empty-note{font-size:12px;color:var(--t3);padding:5px 0;}
        .oitem{display:flex;align-items:center;gap:6px;padding:6px 8px;background:var(--bg);border-radius:var(--rm);margin-bottom:4px;border:1px solid var(--bdr);}
        .oqw{display:flex;align-items:center;gap:3px;}
        .oqbtn{width:20px;height:20px;border:1.5px solid var(--bdr2);border-radius:4px;background:var(--white);cursor:pointer;}
        .oqn{width:20px;text-align:center;font-size:12px;font-weight:700;}
        .oname{flex:1;font-size:11px;}
        .oprice{font-size:11px;font-weight:700;color:var(--t2);}
        .odel{width:18px;height:18px;border:none;border-radius:4px;background:var(--rdl);color:var(--rd);cursor:pointer;}
        .add-btn{width:100%;height:34px;background:var(--acl);color:var(--ac);border:2px dashed var(--bdr2);border-radius:var(--rm);font-size:12px;font-weight:700;cursor:pointer;margin-top:5px;}
        .bsec{padding:10px 14px;border-bottom:1px solid var(--bdr);}
        .brow{display:flex;justify-content:space-between;align-items:center;font-size:12px;color:var(--t2);margin-bottom:4px;}
        .brow.btot{font-size:18px;font-weight:900;color:var(--text);margin-top:9px;padding-top:9px;border-top:2px solid var(--bdr);margin-bottom:0;}
        .brow.btot span:last-child{color:var(--ac);}
        .disc-in{width:68px;height:26px;border:1.5px solid var(--bdr2);border-radius:5px;text-align:right;font-size:12px;font-weight:700;padding:0 6px;}
        .rp-acts{padding:10px 14px;border-top:1px solid var(--bdr);}
        .btn-kai{width:100%;height:48px;background:var(--ac);color:#fff;border:none;border-radius:var(--r);font-size:15px;font-weight:900;margin-bottom:6px;}
        .sub-row{display:flex;gap:5px;flex-wrap:wrap;}
        .sbtn{flex:1;min-width:58px;height:34px;background:var(--white);border:1.5px solid var(--bdr2);border-radius:var(--rm);color:var(--t2);font-size:11px;font-weight:700;cursor:pointer;}
        .stats-grid{display:grid;grid-template-columns:1fr 1fr;gap:5px;padding:9px 14px;background:var(--bg);border-top:1px solid var(--bdr);}
        .scard{background:var(--white);border:1px solid var(--bdr);border-radius:var(--rm);padding:7px 9px;}
        .slbl{font-size:9px;color:var(--t3);margin-bottom:1px;}
        .sval{font-size:14px;font-weight:900;} .sval.sm{font-size:11px;}
        .mp{position:absolute;top:0;bottom:0;right:300px;width:250px;background:var(--white);border-left:1px solid var(--bdr);border-right:1px solid var(--bdr);display:none;flex-direction:column;z-index:10;box-shadow:var(--sh2);}
        .mp.open{display:flex;}
        .mp-hd{padding:10px 12px;border-bottom:1px solid var(--bdr);display:flex;align-items:center;justify-content:space-between;}
        .mp-title{font-size:13px;font-weight:700;}
        .mp-x{width:24px;height:24px;border:1.5px solid var(--bdr2);border-radius:5px;background:var(--white);cursor:pointer;}
        .mp-cats{display:flex;gap:4px;padding:6px 11px;border-bottom:1px solid var(--bdr);flex-wrap:wrap;}
        .mcat{padding:3px 8px;border-radius:11px;border:1.5px solid var(--bdr2);background:var(--white);color:var(--t2);font-size:10px;font-weight:600;cursor:pointer;}
        .mcat.on{background:var(--ac);border-color:var(--ac);color:#fff;}
        .mp-list{flex:1;overflow-y:auto;padding:6px 11px;}
        .mitem{display:flex;align-items:center;gap:6px;padding:7px 8px;background:var(--bg);border-radius:var(--rm);margin-bottom:4px;border:1px solid var(--bdr);cursor:pointer;}
        .mi-cat{font-size:9px;padding:1px 5px;border-radius:3px;background:var(--acl);color:var(--ac);font-weight:700;}
        .mi-name{flex:1;font-size:11px;} .mi-price{font-size:11px;font-weight:700;color:var(--ac);}
        .mi-add{width:20px;height:20px;background:var(--ac);color:#fff;border:none;border-radius:4px;}

        .sec-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;gap:8px;flex-wrap:wrap;}
        .sec-title{font-size:15px;font-weight:700;}
        .subtxt{font-size:11px;color:var(--t2);}
        .card{background:var(--white);border-radius:var(--r);border:1px solid var(--bdr);padding:14px;box-shadow:var(--sh);}
        .sales-tbl{width:100%;border-collapse:collapse;font-size:12px;}
        .sales-tbl th{background:var(--acl);color:var(--t2);font-weight:700;padding:7px 9px;text-align:left;font-size:11px;}
        .sales-tbl td{padding:7px 9px;border-bottom:1px solid var(--bdr);}
        .sales-tbl tr:last-child td{border-bottom:none;}

        .kintai-body{display:flex;flex:1;overflow:hidden;}
        .k-list{width:210px;background:var(--white);border-right:1px solid var(--bdr);display:flex;flex-direction:column;}
        .kl-hd{padding:8px 12px;border-bottom:1px solid var(--bdr);font-size:10px;font-weight:700;color:var(--t2);}
        .kl-scroll{flex:1;overflow-y:auto;}
        .kl-item{width:100%;text-align:left;padding:9px 12px;border:none;border-bottom:1px solid var(--bdr);background:#fff;cursor:pointer;display:flex;align-items:center;gap:7px;}
        .kl-item.sel{background:var(--acl);border-left:3px solid var(--ac);}
        .kl-av{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;}
        .kl-name{font-size:12px;font-weight:700;}
        .kl-st{font-size:10px;margin-top:1px;}
        .kl-st.in{color:var(--grd);} .kl-st.brk{color:var(--gd);} .kl-st.out{color:var(--t3);}
        .k-detail{flex:1;overflow-y:auto;padding:14px;}
        .kd-top{display:flex;align-items:center;gap:11px;margin-bottom:12px;}
        .kd-av{width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:19px;font-weight:900;}
        .kd-name{font-size:18px;font-weight:900;}
        .kd-role{font-size:11px;color:var(--t2);margin-top:2px;}
        .punch-btns{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:14px;}
        .pbtn{height:56px;border-radius:var(--rm);font-size:12px;font-weight:700;cursor:pointer;border:2px solid;}
        .pbtn-in{background:var(--grl);color:var(--grd);border-color:#86efac;}
        .pbtn-out{background:var(--rdl);color:var(--rd);border-color:#fca5a5;}
        .pbtn-brk{background:var(--gdl);color:#92400e;border-color:#fde68a;}
        .kd-times{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-bottom:12px;}
        .kt-box{background:var(--bg);border-radius:var(--rm);padding:9px 11px;text-align:center;}
        .kt-lbl{font-size:10px;color:var(--t3);margin-bottom:2px;}
        .kt-val{font-size:14px;font-weight:700;}
        .brk-log-wrap{background:#fff;border-radius:var(--rm);border:1px solid var(--bdr);overflow:hidden;}
        .brk-log-hd{padding:7px 11px;background:var(--bg);font-size:10px;font-weight:700;color:var(--t2);border-bottom:1px solid var(--bdr);}
        .brk-log-row{padding:8px 11px;border-bottom:1px solid var(--bdr);font-size:12px;}
        .brk-log-row:last-child{border-bottom:none;}

        .cust-layout{display:grid;grid-template-columns:2fr 1fr;gap:12px;}
        .cu-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px;}
        .cu-card{background:var(--white);border:1.5px solid var(--bdr);border-radius:var(--r);padding:13px;cursor:pointer;box-shadow:var(--sh);text-align:left;}
        .cu-card.sel{border-color:var(--ac);}
        .cu-top{display:flex;align-items:center;gap:9px;margin-bottom:8px;}
        .cu-av{width:40px;height:40px;border-radius:50%;background:var(--acl);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:900;color:var(--ac);}
        .cu-name{font-size:14px;font-weight:700;}
        .cu-kana{font-size:10px;color:var(--t2);margin-top:1px;}
        .rank-tag{font-size:9px;padding:2px 6px;border-radius:4px;font-weight:700;margin-top:2px;display:inline-block;}
        .r-vip{background:var(--gdl);color:var(--gd);} .r-reg{background:var(--acl);color:var(--ac);} .r-new{background:var(--grl);color:var(--grd);}
        .cu-stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px;margin-top:7px;}
        .cs-box{background:var(--bg);border-radius:var(--rs);padding:5px 6px;text-align:center;}
        .cs-v{font-size:11px;font-weight:700;} .cs-l{font-size:9px;color:var(--t3);margin-top:1px;}
        .cust-detail{align-self:start;}
        .kv{font-size:12px;color:var(--t2);margin-top:6px;}

        .cast-tabs{display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap;}
        .ctab{padding:7px 16px;border-radius:20px;border:1.5px solid var(--bdr2);background:#fff;color:var(--t2);font-size:12px;font-weight:600;cursor:pointer;}
        .ctab.on{background:var(--ac);border-color:var(--ac);color:#fff;}
        .cast-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px;}
        .cc-card{background:#fff;border:1.5px solid var(--bdr);border-radius:var(--r);padding:13px;box-shadow:var(--sh);}
        .cc-top{display:flex;align-items:center;gap:9px;margin-bottom:10px;}
        .cc-av{width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:900;}
        .av-cast{background:var(--pul);color:var(--pu);} .av-boy{background:#eff6ff;color:#2563eb;}
        .cc-name{font-size:14px;font-weight:700;}
        .cc-role{font-size:10px;color:var(--t2);margin-top:1px;}
        .cc-st{display:inline-block;font-size:9px;font-weight:700;padding:2px 7px;border-radius:4px;margin-top:2px;}
        .s-in{background:var(--grl);color:var(--grd);} .s-retired{background:var(--rdl);color:var(--rd);}
        .cc-info{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:8px;font-size:10px;color:var(--t2);}
        .cc-actions{display:flex;gap:5px;margin-top:9px;}

        .rp-period-btns{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:16px;}
        .rpbtn{height:54px;border-radius:var(--rm);border:2px solid var(--bdr2);background:#fff;font-size:13px;font-weight:700;cursor:pointer;color:var(--t2);}
        .rpbtn.on{background:var(--ac);border-color:var(--ac);color:#fff;}
        .rp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(148px,1fr));gap:10px;margin-bottom:14px;}
        .rp-card{background:#fff;border-radius:var(--r);border:1px solid var(--bdr);padding:13px;box-shadow:var(--sh);}
        .rp-lbl{font-size:11px;color:var(--t2);margin-bottom:4px;} .rp-val{font-size:20px;font-weight:900;} .rp-sub{font-size:10px;color:var(--t3);margin-top:2px;}

        .mm-wrap{display:grid;grid-template-columns:220px 1fr;gap:12px;}
        .mm-cats{background:#fff;border-radius:var(--r);border:1px solid var(--bdr);overflow:hidden;box-shadow:var(--sh);align-self:start;}
        .mm-cat-hd{padding:9px 13px;border-bottom:1px solid var(--bdr);font-size:11px;font-weight:700;color:var(--t2);}
        .mm-cat-item{width:100%;border:none;background:#fff;padding:10px 13px;border-bottom:1px solid var(--bdr);cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:space-between;text-align:left;}
        .mm-cat-item:last-child{border-bottom:none;}
        .mm-cat-item.sel{background:var(--acl);font-weight:700;color:var(--ac);}
        .mm-items{background:#fff;border-radius:var(--r);border:1px solid var(--bdr);overflow:hidden;box-shadow:var(--sh);}
        .mm-items-hd{padding:9px 13px;border-bottom:1px solid var(--bdr);font-size:11px;font-weight:700;color:var(--t2);}
        .mm-item-row{display:flex;align-items:center;gap:8px;padding:9px 13px;border-bottom:1px solid var(--bdr);font-size:13px;}
        .mm-item-row:last-child{border-bottom:none;}
        .mm-item-nm{flex:1;font-weight:500;} .mm-item-pr{font-weight:700;color:var(--ac);min-width:80px;text-align:right;}
        .mm-item-acts{display:flex;gap:5px;flex-shrink:0;}

        .pin-screen{display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;gap:12px;}
        .pin-input{height:44px;border:1.5px solid var(--bdr2);border-radius:var(--rm);font-size:22px;font-weight:700;text-align:center;width:200px;letter-spacing:.35em;}
        .owner-content{display:flex;flex-direction:column;gap:12px;}
        .owner-sec{background:var(--white);border-radius:var(--r);border:1px solid var(--bdr);padding:14px;box-shadow:var(--sh);}
        .owner-sec-title{font-size:13px;font-weight:700;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid var(--bdr);}

        @media (max-width: 1100px){
          .tgrid{grid-template-columns:repeat(3,1fr);}
          .cust-layout{grid-template-columns:1fr;}
        }
        @media (max-width: 900px){
          .core{flex-direction:column;}
          .rp{width:100%;border-left:none;border-top:1px solid var(--bdr);min-height:340px;}
          .mp{right:0;width:100%;max-height:55%;top:auto;}
          .tgrid{grid-template-columns:repeat(2,1fr);}
          .kintai-body{flex-direction:column;}
          .k-list{width:100%;border-right:none;border-bottom:1px solid var(--bdr);max-height:220px;}
          .mm-wrap{grid-template-columns:1fr;}
          .rp-period-btns{grid-template-columns:repeat(3,1fr);}
        }
      `}</style>
    </div>
  );
}
