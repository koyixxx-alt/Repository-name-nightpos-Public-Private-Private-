"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

const SETTINGS = {
  storeName: "Room YOLO",
  setMin: 60,
};

const MENU = [
  { id: 1, cat: "set", name: "通常セット 60分", price: 3000 },
  { id: 2, cat: "set", name: "ビールありセット 60分", price: 3500 },
  { id: 3, cat: "drink", name: "キャストドリンク", price: 1000 },
  { id: 4, cat: "drink", name: "ショット各種", price: 1000 },
  { id: 5, cat: "champ", name: "MAVAM（マバム）", price: 10000 },
  { id: 6, cat: "shimei", name: "指名料", price: 1000 },
];

const CATEGORIES = [
  { id: "all", name: "すべて" },
  { id: "set", name: "セット" },
  { id: "drink", name: "ドリンク" },
  { id: "champ", name: "シャンパン" },
  { id: "shimei", name: "指名" },
];

const FALLBACK_TABLES = [
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
  { id: "C-1", type: "occ", casts: ["ゆな"], shimeis: [], guests: ["伊藤様"], num: 1, inTime: "23:10", elMin: 15, items: [{ n: "通常セット 60分", p: 3000, q: 1, sc: null }] },
  { id: "C-2", type: "empty", casts: [], shimeis: [], guests: [], num: 0, inTime: "", elMin: 0, items: [] },
  { id: "C-3", type: "empty", casts: [], shimeis: [], guests: [], num: 0, inTime: "", elMin: 0, items: [] },
  { id: "C-4", type: "empty", casts: [], shimeis: [], guests: [], num: 0, inTime: "", elMin: 0, items: [] },
];

function fmt(m) {
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
}

function calcTotal(items) {
  return items.reduce((sum, item) => sum + item.p * item.q, 0);
}

function getTC(elapsed, setMin) {
  if (elapsed >= setMin) return "t-over";
  if (elapsed >= setMin - 10) return "t-warn";
  if (elapsed >= setMin / 2) return "t-half";
  return "occ";
}

function getAC(elapsed, setMin) {
  if (elapsed >= setMin) return "c-over";
  if (elapsed >= setMin - 10) return "c-warn";
  if (elapsed >= setMin / 2) return "c-half";
  return "c-normal";
}

function getTag(elapsed, setMin) {
  if (elapsed >= setMin) return <span className="ttag ttag-over">超過</span>;
  if (elapsed >= setMin - 10) return <span className="ttag ttag-warn">残10分</span>;
  if (elapsed >= setMin / 2) return <span className="ttag ttag-half">折返し</span>;
  return null;
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
  const [tables, setTables] = useState(FALLBACK_TABLES);
  const [selectedId, setSelectedId] = useState("T-1");
  const [filter, setFilter] = useState("all");
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuCat, setMenuCat] = useState("all");
  const [discount, setDiscount] = useState(0);
  const [clock, setClock] = useState("");
  const [syncLabel, setSyncLabel] = useState("ローカル表示");

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const week = ["日", "月", "火", "水", "木", "金", "土"];
      setClock(
        `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(
          d.getDate(),
        ).padStart(2, "0")}（${week[d.getDay()]}）\n${String(d.getHours()).padStart(
          2,
          "0",
        )}:${String(d.getMinutes()).padStart(2, "0")}`,
      );
    };
    tick();
    const id = setInterval(tick, 10000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const loadTables = async () => {
      const { data, error } = await supabase.from("floor_tables").select("*");
      if (error || !data || data.length === 0) {
        setSyncLabel("Supabase未接続（サンプル表示）");
        return;
      }
      const loaded = data.map(normalizeTable);
      setTables(loaded);
      setSelectedId((prev) => prev ?? loaded.find((t) => t.type !== "empty")?.id ?? loaded[0]?.id);
      setSyncLabel("Supabase同期中");
    };
    loadTables();
  }, []);

  const selectedTable = tables.find((t) => t.id === selectedId && t.type !== "empty") ?? null;
  const totalOccupied = tables.filter((t) => t.type !== "empty").length;
  const totalSeats = tables.length;

  const listForGrid = useMemo(() => {
    if (filter === "occ") return tables.filter((t) => t.type !== "empty");
    if (filter === "empty") return tables.filter((t) => t.type === "empty");
    return tables;
  }, [tables, filter]);

  const menuList = useMemo(() => {
    if (menuCat === "all") return MENU;
    return MENU.filter((item) => item.cat === menuCat);
  }, [menuCat]);

  const subtotal = selectedTable ? calcTotal(selectedTable.items) : 0;
  const usedDiscount = Math.min(discount, subtotal);
  const total = Math.max(0, subtotal - usedDiscount);

  const updateTable = (tableId, updater) => {
    setTables((prev) =>
      prev.map((table) => {
        if (table.id !== tableId) return table;
        return updater(table);
      }),
    );
  };

  const selectTable = (table) => {
    if (table.type === "empty") return;
    setSelectedId(table.id);
  };

  const addMenu = (menu) => {
    if (!selectedTable) return;
    updateTable(selectedTable.id, (table) => {
      const items = [...table.items];
      const idx = items.findIndex((item) => item.n === menu.name && item.sc === null);
      if (idx >= 0) items[idx] = { ...items[idx], q: items[idx].q + 1 };
      else items.push({ n: menu.name, p: menu.price, q: 1, sc: null });
      return { ...table, items };
    });
  };

  const changeQty = (idx, delta) => {
    if (!selectedTable) return;
    updateTable(selectedTable.id, (table) => {
      const items = [...table.items];
      items[idx] = { ...items[idx], q: Math.max(1, items[idx].q + delta) };
      return { ...table, items };
    });
  };

  const deleteItem = (idx) => {
    if (!selectedTable) return;
    updateTable(selectedTable.id, (table) => ({
      ...table,
      items: table.items.filter((_, itemIdx) => itemIdx !== idx),
    }));
  };

  const addExtension = (min, price) => {
    if (!selectedTable) return;
    updateTable(selectedTable.id, (table) => ({
      ...table,
      elMin: table.elMin + min,
      items: [...table.items, { n: `延長 ${min}分`, p: price, q: 1, sc: null }],
    }));
  };

  const openFirstEmptySeat = () => {
    const empty = tables.find((t) => t.type === "empty");
    if (!empty) return;
    const now = new Date();
    const inTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    updateTable(empty.id, () => ({
      id: empty.id,
      type: "occ",
      casts: ["未設定"],
      shimeis: [],
      guests: ["新規様"],
      num: 1,
      inTime,
      elMin: 0,
      items: [{ n: "通常セット 60分", p: 3000, q: 1, sc: null }],
    }));
    setSelectedId(empty.id);
  };

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
          🪑 <strong>{totalOccupied}</strong>/{totalSeats}
        </div>
        <div className="hclock">{clock}</div>
      </header>

      <nav className="nav">
        <div className="ntab on">⬛ テーブル</div>
      </nav>

      <main className="page on">
        <div className="floor-wrap">
          <div className="toolbar">
            <div className="tlabel">フロアマップ</div>
            <div style={{ display: "flex", gap: 5 }}>
              <button className={`chip ${filter === "all" ? "on" : ""}`} onClick={() => setFilter("all")}>
                全席
              </button>
              <button className={`chip ${filter === "occ" ? "on" : ""}`} onClick={() => setFilter("occ")}>
                稼働中
              </button>
              <button className={`chip ${filter === "empty" ? "on" : ""}`} onClick={() => setFilter("empty")}>
                空席
              </button>
            </div>
            <button className="btn btn-dk" onClick={openFirstEmptySeat}>
              ＋ 入店
            </button>
          </div>

          <div className="core">
            <div className="tscroll">
              <div className="legend">
                <span>⏱ {SETTINGS.setMin}分設定：</span>
                <span><span className="ldot2 c1" />通常</span>
                <span><span className="ldot2 c2" />折返し（{SETTINGS.setMin / 2}分〜）</span>
                <span><span className="ldot2 c3" />残10分</span>
                <span><span className="ldot2 c4" />超過</span>
              </div>

              <div className="tgrid">
                {listForGrid.map((table) => {
                  if (table.type === "empty") {
                    return (
                      <div className="tc empty" key={table.id} onClick={openFirstEmptySeat}>
                        <div className="tc-top">
                          <span className="tc-num">{table.id}</span>
                        </div>
                        <div className="empty-txt">＋ 入店</div>
                      </div>
                    );
                  }

                  const seatClass = getTC(table.elMin, SETTINGS.setMin);
                  const elapsedClass = getAC(table.elMin, SETTINGS.setMin);
                  const amount = calcTotal(table.items);

                  return (
                    <div
                      key={table.id}
                      className={`tc ${seatClass} ${selectedId === table.id ? "sel" : ""}`}
                      onClick={() => selectTable(table)}
                    >
                      <div className="tc-top">
                        <span className="tc-num">{table.id}</span>
                        {getTag(table.elMin, SETTINGS.setMin)}
                      </div>
                      <div className="tc-cast">{table.casts.join("・")}</div>
                      <div className="tc-guest">{table.guests.join("・")}</div>
                      <div className="tc-num-guests">{table.num}名</div>
                      <div className={`tc-elapsed ${elapsedClass}`}>{fmt(table.elMin)}</div>
                      <div className="tc-amt">¥{amount.toLocaleString()}</div>
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
                    <span style={{ color: "var(--t3)" }}>
                      {selectedTable ? `${selectedTable.items.reduce((s, i) => s + i.q, 0)}品` : "0品"}
                    </span>
                  </div>
                  <div>
                    {!selectedTable && <div className="empty-note">席を選択してください</div>}
                    {selectedTable &&
                      selectedTable.items.map((item, idx) => (
                        <div className="oitem" key={`${item.n}-${idx}`}>
                          <div className="oqw">
                            <button className="oqbtn" onClick={() => changeQty(idx, -1)}>
                              −
                            </button>
                            <div className="oqn">{item.q}</div>
                            <button className="oqbtn" onClick={() => changeQty(idx, 1)}>
                              ＋
                            </button>
                          </div>
                          <div className="oname">{item.n}</div>
                          <div className="oprice">¥{(item.p * item.q).toLocaleString()}</div>
                          <button className="odel" onClick={() => deleteItem(idx)}>
                            ✕
                          </button>
                        </div>
                      ))}
                  </div>
                  <button className="add-btn" onClick={() => setMenuOpen((prev) => !prev)}>
                    ＋ メニューから追加
                  </button>
                </div>

                <div className="bsec">
                  <div className="brow">
                    <span>小計</span>
                    <span>{selectedTable ? `¥${subtotal.toLocaleString()}` : "−"}</span>
                  </div>
                  <div className="brow">
                    <span style={{ color: "var(--rd)" }}>割引</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      －
                      <input
                        className="disc-in"
                        type="number"
                        min={0}
                        value={discount}
                        onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                      />
                      円
                    </span>
                  </div>
                  <div className="brow btot">
                    <span>合計</span>
                    <span>{selectedTable ? `¥${total.toLocaleString()}` : "−"}</span>
                  </div>
                </div>
              </div>

              <div className="rp-acts">
                <button className="btn-kai">会　計</button>
                <div className="sub-row">
                  <button className="sbtn" onClick={() => addExtension(30, 2000)}>
                    ⏱ 延長30分
                  </button>
                  <button className="sbtn" onClick={() => addExtension(60, 3000)}>
                    ⏱ 延長60分
                  </button>
                  <button className="sbtn" onClick={() => setDiscount(0)}>
                    割引クリア
                  </button>
                </div>
              </div>

              <div className="stats-grid">
                <div className="scard">
                  <div className="slbl">表示状態</div>
                  <div className="sval" style={{ color: "var(--ac)", fontSize: 11 }}>{syncLabel}</div>
                </div>
                <div className="scard">
                  <div className="slbl">稼働席</div>
                  <div className="sval" style={{ color: "var(--gd)" }}>
                    {totalOccupied}/{totalSeats}
                  </div>
                </div>
                <div className="scard">
                  <div className="slbl">選択卓小計</div>
                  <div className="sval" style={{ color: "var(--gr)" }}>
                    ¥{selectedTable ? subtotal.toLocaleString() : "0"}
                  </div>
                </div>
                <div className="scard">
                  <div className="slbl">メニュー数</div>
                  <div className="sval" style={{ color: "var(--pu)" }}>
                    {MENU.length}件
                  </div>
                </div>
              </div>
            </aside>

            <section className={`mp ${menuOpen ? "open" : ""}`}>
              <div className="mp-hd">
                <div className="mp-title">メニュー追加</div>
                <button className="mp-x" onClick={() => setMenuOpen(false)}>
                  ✕
                </button>
              </div>
              <div className="mp-cats">
                {CATEGORIES.map((cat) => (
                  <button key={cat.id} className={`mcat ${menuCat === cat.id ? "on" : ""}`} onClick={() => setMenuCat(cat.id)}>
                    {cat.name}
                  </button>
                ))}
              </div>
              <div className="mp-list">
                {menuList.map((menu) => (
                  <div className="mitem" key={menu.id} onClick={() => addMenu(menu)}>
                    <span className="mi-cat">{CATEGORIES.find((cat) => cat.id === menu.cat)?.name ?? menu.cat}</span>
                    <span className="mi-name">{menu.name}</span>
                    <span className="mi-price">¥{menu.price.toLocaleString()}</span>
                    <button className="mi-add">＋</button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>

      <style jsx global>{`
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        :root {
          --bg: #f0f0f5;
          --white: #fff;
          --bdr: #e4e4ee;
          --bdr2: #d0d0dc;
          --text: #1a1a2e;
          --t2: #6b6b80;
          --t3: #b0b0c0;
          --ac: #374151;
          --acl: #f3f4f6;
          --gr: #22c55e;
          --grl: #dcfce7;
          --grd: #15803d;
          --rd: #ef4444;
          --rdl: #fef2f2;
          --or: #f97316;
          --orl: #fff7ed;
          --gd: #d97706;
          --gdl: #fefce8;
          --pu: #7c3aed;
          --sh: 0 2px 12px rgba(0, 0, 0, 0.07);
          --sh2: 0 6px 24px rgba(0, 0, 0, 0.12);
          --r: 16px;
          --rm: 10px;
        }
        html,
        body {
          overflow: hidden;
          background: var(--bg);
          color: var(--text);
          font-family: "Noto Sans JP", sans-serif;
          font-size: 14px;
        }
        .app {
          height: 100vh;
          display: flex;
          flex-direction: column;
          background: var(--bg);
        }
        .hdr {
          height: 56px;
          background: var(--white);
          border-bottom: 1px solid var(--bdr);
          display: flex;
          align-items: center;
          padding: 0 14px;
          gap: 9px;
          box-shadow: var(--sh);
          z-index: 20;
        }
        .logo {
          width: 34px;
          height: 34px;
          background: var(--ac);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .appname {
          font-size: 15px;
          font-weight: 700;
          flex: 1;
        }
        .appname span {
          font-size: 11px;
          font-weight: 400;
          color: var(--t2);
          margin-left: 4px;
        }
        .hpill {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 16px;
          font-size: 11px;
          font-weight: 600;
          border: 1.5px solid;
          white-space: nowrap;
        }
        .hpill-gr {
          background: var(--grl);
          color: var(--grd);
          border-color: #86efac;
        }
        .hpill-ac {
          background: var(--acl);
          color: var(--ac);
          border-color: var(--bdr2);
        }
        .ldot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--gr);
        }
        .hclock {
          font-size: 11px;
          color: var(--t2);
          text-align: right;
          line-height: 1.5;
          min-width: 124px;
          white-space: pre-line;
        }
        .nav {
          display: flex;
          background: var(--white);
          border-bottom: 1px solid var(--bdr);
        }
        .ntab {
          padding: 0 13px;
          height: 40px;
          display: flex;
          align-items: center;
          font-size: 12px;
          font-weight: 700;
          color: var(--ac);
          border-bottom: 3px solid var(--ac);
        }
        .page {
          flex: 1;
          overflow: hidden;
          display: flex;
        }
        .floor-wrap {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .toolbar {
          padding: 9px 14px;
          display: flex;
          align-items: center;
          gap: 7px;
          background: var(--white);
          border-bottom: 1px solid var(--bdr);
          flex-wrap: wrap;
        }
        .tlabel {
          font-size: 13px;
          font-weight: 700;
          flex: 1;
        }
        .chip {
          padding: 5px 11px;
          border-radius: 16px;
          border: 1.5px solid var(--bdr2);
          background: var(--white);
          color: var(--t2);
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
        }
        .chip.on {
          background: var(--ac);
          border-color: var(--ac);
          color: #fff;
        }
        .btn {
          height: 38px;
          padding: 0 14px;
          border-radius: var(--rm);
          font-size: 12px;
          font-weight: 700;
          border: none;
          cursor: pointer;
        }
        .btn-dk {
          background: var(--ac);
          color: #fff;
        }
        .core {
          display: flex;
          flex: 1;
          overflow: hidden;
          position: relative;
        }
        .tscroll {
          flex: 1;
          overflow-y: auto;
          padding: 10px 14px;
        }
        .legend {
          display: flex;
          gap: 8px;
          font-size: 10px;
          color: var(--t2);
          margin-bottom: 9px;
          flex-wrap: wrap;
        }
        .ldot2 {
          width: 7px;
          height: 7px;
          border-radius: 2px;
          display: inline-block;
          margin-right: 2px;
        }
        .ldot2.c1 {
          background: var(--ac);
        }
        .ldot2.c2 {
          background: var(--gd);
        }
        .ldot2.c3 {
          background: var(--or);
        }
        .ldot2.c4 {
          background: var(--rd);
        }
        .tgrid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }
        .tc {
          background: var(--white);
          border: 2px solid var(--bdr);
          border-radius: 16px;
          padding: 12px;
          cursor: pointer;
          position: relative;
          min-height: 140px;
          display: flex;
          flex-direction: column;
          box-shadow: var(--sh);
        }
        .tc::after {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          border-radius: 16px 16px 0 0;
        }
        .tc.sel {
          border-color: var(--ac);
          box-shadow: 0 0 0 3px rgba(55, 65, 81, 0.12);
        }
        .tc.occ::after {
          background: var(--ac);
        }
        .tc.t-half {
          border-color: #fde68a;
          background: var(--gdl);
        }
        .tc.t-half::after {
          background: var(--gd);
        }
        .tc.t-warn {
          border-color: #fed7aa;
          background: var(--orl);
        }
        .tc.t-warn::after {
          background: var(--or);
        }
        .tc.t-over {
          border-color: #fecaca;
          background: var(--rdl);
        }
        .tc.t-over::after {
          background: var(--rd);
        }
        .tc.empty {
          background: #f8f8fc;
          opacity: 0.62;
        }
        .tc-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 4px;
        }
        .tc-num {
          font-size: 10px;
          font-weight: 700;
          color: var(--t2);
        }
        .ttag {
          font-size: 9px;
          font-weight: 700;
          padding: 1px 5px;
          border-radius: 3px;
        }
        .ttag-half {
          background: var(--gdl);
          color: var(--gd);
        }
        .ttag-warn {
          background: var(--orl);
          color: var(--or);
        }
        .ttag-over {
          background: var(--rdl);
          color: var(--rd);
        }
        .tc-cast {
          font-size: 11px;
          color: var(--t2);
          margin-bottom: 3px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .tc-guest {
          font-size: 15px;
          font-weight: 700;
          margin-bottom: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .tc-num-guests {
          font-size: 10px;
          color: var(--t2);
          margin-bottom: 8px;
        }
        .tc-elapsed {
          font-size: 18px;
          font-weight: 900;
          margin-top: auto;
          margin-bottom: 4px;
        }
        .tc-elapsed.c-normal {
          color: var(--ac);
        }
        .tc-elapsed.c-half {
          color: var(--gd);
        }
        .tc-elapsed.c-warn {
          color: var(--or);
        }
        .tc-elapsed.c-over {
          color: var(--rd);
        }
        .tc-amt {
          font-size: 12px;
          font-weight: 700;
          color: var(--t2);
        }
        .empty-txt {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--t3);
          font-size: 12px;
        }
        .rp {
          width: 300px;
          background: var(--white);
          border-left: 1px solid var(--bdr);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .rp-hd {
          padding: 11px 14px;
          background: var(--bg);
          border-bottom: 1px solid var(--bdr);
        }
        .rp-name {
          font-size: 17px;
          font-weight: 900;
          margin-bottom: 1px;
        }
        .rp-sub {
          font-size: 11px;
          color: var(--t2);
          line-height: 1.5;
        }
        .rp-timer {
          display: inline-block;
          margin-top: 4px;
          font-size: 11px;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 4px;
          background: var(--acl);
          color: var(--ac);
        }
        .rp-scroll {
          flex: 1;
          overflow-y: auto;
        }
        .osec {
          padding: 10px 14px;
          border-bottom: 1px solid var(--bdr);
        }
        .osec-hd {
          font-size: 10px;
          font-weight: 700;
          color: var(--t2);
          margin-bottom: 6px;
          display: flex;
          justify-content: space-between;
        }
        .empty-note {
          font-size: 12px;
          color: var(--t3);
          padding: 5px 0;
        }
        .oitem {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 8px;
          background: var(--bg);
          border-radius: 10px;
          margin-bottom: 4px;
          border: 1px solid var(--bdr);
        }
        .oqw {
          display: flex;
          align-items: center;
          gap: 3px;
        }
        .oqbtn {
          width: 20px;
          height: 20px;
          border: 1.5px solid var(--bdr2);
          border-radius: 4px;
          background: var(--white);
          font-size: 12px;
          cursor: pointer;
        }
        .oqn {
          width: 20px;
          text-align: center;
          font-size: 12px;
          font-weight: 700;
        }
        .oname {
          flex: 1;
          font-size: 11px;
        }
        .oprice {
          font-size: 11px;
          font-weight: 700;
          color: var(--t2);
        }
        .odel {
          width: 18px;
          height: 18px;
          border: none;
          border-radius: 4px;
          background: var(--rdl);
          color: var(--rd);
          cursor: pointer;
        }
        .add-btn {
          width: 100%;
          height: 34px;
          background: var(--acl);
          color: var(--ac);
          border: 2px dashed var(--bdr2);
          border-radius: 10px;
          font-size: 12px;
          font-weight: 700;
          margin-top: 5px;
          cursor: pointer;
        }
        .bsec {
          padding: 10px 14px;
          border-bottom: 1px solid var(--bdr);
        }
        .brow {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          color: var(--t2);
          margin-bottom: 5px;
        }
        .brow.btot {
          font-size: 18px;
          font-weight: 900;
          color: var(--text);
          margin-top: 9px;
          padding-top: 9px;
          border-top: 2px solid var(--bdr);
          margin-bottom: 0;
        }
        .brow.btot span:last-child {
          color: var(--ac);
        }
        .disc-in {
          width: 68px;
          height: 26px;
          border: 1.5px solid var(--bdr2);
          border-radius: 5px;
          text-align: right;
          font-size: 12px;
          font-weight: 700;
          padding: 0 6px;
        }
        .rp-acts {
          padding: 10px 14px;
          border-top: 1px solid var(--bdr);
        }
        .btn-kai {
          width: 100%;
          height: 48px;
          background: var(--ac);
          color: #fff;
          border: none;
          border-radius: 16px;
          font-size: 15px;
          font-weight: 900;
          margin-bottom: 6px;
          letter-spacing: 0.04em;
        }
        .sub-row {
          display: flex;
          gap: 5px;
          flex-wrap: wrap;
        }
        .sbtn {
          flex: 1;
          min-width: 74px;
          height: 34px;
          background: var(--white);
          border: 1.5px solid var(--bdr2);
          border-radius: 10px;
          color: var(--t2);
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 5px;
          padding: 9px 14px;
          background: var(--bg);
          border-top: 1px solid var(--bdr);
        }
        .scard {
          background: var(--white);
          border: 1px solid var(--bdr);
          border-radius: 10px;
          padding: 7px 9px;
        }
        .slbl {
          font-size: 9px;
          color: var(--t3);
          margin-bottom: 1px;
        }
        .sval {
          font-size: 14px;
          font-weight: 900;
        }
        .mp {
          position: absolute;
          top: 0;
          bottom: 0;
          right: 300px;
          width: 250px;
          background: var(--white);
          border-left: 1px solid var(--bdr);
          border-right: 1px solid var(--bdr);
          display: none;
          flex-direction: column;
          z-index: 10;
          box-shadow: var(--sh2);
        }
        .mp.open {
          display: flex;
        }
        .mp-hd {
          padding: 10px 12px;
          border-bottom: 1px solid var(--bdr);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .mp-title {
          font-size: 13px;
          font-weight: 700;
        }
        .mp-x {
          width: 24px;
          height: 24px;
          border: 1.5px solid var(--bdr2);
          border-radius: 5px;
          background: var(--white);
          cursor: pointer;
        }
        .mp-cats {
          display: flex;
          gap: 4px;
          padding: 6px 11px;
          border-bottom: 1px solid var(--bdr);
          flex-wrap: wrap;
        }
        .mcat {
          padding: 3px 8px;
          border-radius: 11px;
          border: 1.5px solid var(--bdr2);
          background: var(--white);
          color: var(--t2);
          font-size: 10px;
          font-weight: 600;
          cursor: pointer;
        }
        .mcat.on {
          background: var(--ac);
          border-color: var(--ac);
          color: #fff;
        }
        .mp-list {
          flex: 1;
          overflow-y: auto;
          padding: 6px 11px;
        }
        .mitem {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 7px 8px;
          background: var(--bg);
          border-radius: 10px;
          margin-bottom: 4px;
          border: 1px solid var(--bdr);
          cursor: pointer;
        }
        .mi-cat {
          font-size: 9px;
          padding: 1px 5px;
          border-radius: 3px;
          background: var(--acl);
          color: var(--ac);
          font-weight: 700;
        }
        .mi-name {
          flex: 1;
          font-size: 11px;
        }
        .mi-price {
          font-size: 11px;
          font-weight: 700;
          color: var(--ac);
        }
        .mi-add {
          width: 20px;
          height: 20px;
          background: var(--ac);
          color: #fff;
          border: none;
          border-radius: 4px;
        }
        @media (max-width: 1200px) {
          .tgrid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        @media (max-width: 900px) {
          .core {
            flex-direction: column;
          }
          .rp {
            width: 100%;
            border-left: none;
            border-top: 1px solid var(--bdr);
            min-height: 340px;
          }
          .mp {
            right: 0;
            width: 100%;
            max-height: 55%;
            top: auto;
          }
          .tgrid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </div>
  );
}
