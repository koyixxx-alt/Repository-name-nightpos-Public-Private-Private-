"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { menuCategories as MENU_CATEGORIES, menuData as MENU_INITIAL } from "./lib/nightposData";

const SETTINGS = { setMin: 60 };

const INITIAL_TABLES = [
  { id: "T-1", type: "occ", casts: ["あおい"], guests: ["田中様"], num: 2, inTime: "21:00", elMin: 40, items: [{ n: "通常セット 60分", p: 3000, q: 1 }, { n: "キャストドリンク", p: 1000, q: 2 }] },
  { id: "T-2", type: "occ", casts: ["みき"], guests: ["山田様"], num: 2, inTime: "21:30", elMin: 25, items: [{ n: "ビールありセット 60分", p: 3500, q: 1 }] },
  { id: "T-3", type: "occ", casts: ["さくら"], guests: ["佐藤様"], num: 1, inTime: "22:00", elMin: 75, items: [{ n: "通常セット 120分", p: 5000, q: 1 }] },
  { id: "C-1", type: "occ", casts: ["ゆな"], guests: ["伊藤様"], num: 1, inTime: "23:10", elMin: 15, items: [{ n: "通常セット 60分", p: 3000, q: 1 }] },
  { id: "C-2", type: "empty", casts: [], guests: [], num: 0, inTime: "", elMin: 0, items: [] },
  { id: "C-3", type: "empty", casts: [], guests: [], num: 0, inTime: "", elMin: 0, items: [] },
  { id: "C-4", type: "empty", casts: [], guests: [], num: 0, inTime: "", elMin: 0, items: [] },
];

const calcTotal = (items) => items.reduce((sum, item) => sum + item.p * item.q, 0);
const fmt = (m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
const getSeatClass = (m) => (m >= SETTINGS.setMin ? "s-over" : m >= SETTINGS.setMin - 10 ? "s-warn" : m >= SETTINGS.setMin / 2 ? "s-half" : "s-normal");
const getTimeClass = (m) => (m >= SETTINGS.setMin ? "c-over" : m >= SETTINGS.setMin - 10 ? "c-warn" : m >= SETTINGS.setMin / 2 ? "c-half" : "c-normal");

function normalizeTable(row) {
  return {
    id: row.id,
    type: row.type ?? "empty",
    casts: Array.isArray(row.casts) ? row.casts : [],
    guests: Array.isArray(row.guests) ? row.guests : [],
    num: row.num ?? 0,
    inTime: row.in_time ?? "",
    elMin: row.elapsed_min ?? 0,
    items: Array.isArray(row.items) ? row.items : [],
  };
}
export default function Home() {
  const [clock, setClock] = useState("");
  const [syncLabel, setSyncLabel] = useState("ローカル表示");
  const [tables, setTables] = useState(INITIAL_TABLES);
  const [filter, setFilter] = useState("all");
  const [selectedTableId, setSelectedTableId] = useState("T-1");
  const [discount, setDiscount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuCat, setMenuCat] = useState("all");
  const [menus] = useState(MENU_INITIAL);

  useEffect(() => {
    const tick = () => {
      const n = new Date();
      const d = ["日", "月", "火", "水", "木", "金", "土"];
      setClock(
        `${n.getFullYear()}/${n.getMonth() + 1}/${n.getDate()}（${d[n.getDay()]}） ${String(
          n.getHours(),
        ).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`,
      );
    };
    tick();
    const timer = setInterval(tick, 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const loadFloorTables = async () => {
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
    loadFloorTables();
  }, []);

  const selectedTable = tables.find((t) => t.id === selectedTableId && t.type !== "empty") ?? null;
  const occupiedCount = tables.filter((t) => t.type !== "empty").length;

  const filteredTables = useMemo(() => {
    if (filter === "occ") return tables.filter((t) => t.type !== "empty");
    if (filter === "empty") return tables.filter((t) => t.type === "empty");
    return tables;
  }, [filter, tables]);

  const subtotal = selectedTable ? calcTotal(selectedTable.items) : 0;
  const total = Math.max(0, subtotal - Math.min(subtotal, discount));

  const updateTable = (id, updater) => {
    setTables((prev) => prev.map((t) => (t.id === id ? updater(t) : t)));
  };

  const quickEnter = () => {
    const empty = tables.find((t) => t.type === "empty");
    if (!empty) return;
    const now = new Date();
    const inTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    updateTable(empty.id, () => ({
      id: empty.id,
      type: "occ",
      casts: ["未設定"],
      guests: ["新規様"],
      num: 1,
      inTime,
      elMin: 0,
      items: [{ n: "通常セット 60分", p: 3000, q: 1 }],
    }));
    setSelectedTableId(empty.id);
  };

  const addMenuToOrder = (menu) => {
    if (!selectedTable) return;
    updateTable(selectedTable.id, (t) => {
      const items = [...t.items];
      const idx = items.findIndex((i) => i.n === menu.name);
      if (idx >= 0) items[idx] = { ...items[idx], q: items[idx].q + 1 };
      else items.push({ n: menu.name, p: menu.price, q: 1 });
      return { ...t, items };
    });
  };

  const changeQty = (idx, delta) => {
    if (!selectedTable) return;
    updateTable(selectedTable.id, (t) => {
      const items = [...t.items];
      items[idx] = { ...items[idx], q: Math.max(1, items[idx].q + delta) };
      return { ...t, items };
    });
  };

  const deleteItem = (idx) => {
    if (!selectedTable) return;
    updateTable(selectedTable.id, (t) => ({ ...t, items: t.items.filter((_, i) => i !== idx) }));
  };

  return (
    <div className="app">
      <header className="hdr">
        <div className="logo-text">
          Night<span>POS</span>
        </div>
        <div className="hdr-badge live">
          <span className="live-dot" />
          営業中
        </div>
        <div className="hdr-badge">
          稼働 {occupiedCount}/{tables.length}
        </div>
        <div className="hclock">{clock}</div>
      </header>

      <nav className="nav">
        <button className="ntab on">テーブル</button>
      </nav>

      <main className="page">
        <div className="floor-wrap">
          <div className="floor-left">
            <div className="floor-toolbar">
              <div style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>フロアマップ</div>
              <div className="filter-tabs">
                <button className={`ftab ${filter === "all" ? "on" : ""}`} onClick={() => setFilter("all")}>全席</button>
                <button className={`ftab ${filter === "occ" ? "on" : ""}`} onClick={() => setFilter("occ")}>稼働中</button>
                <button className={`ftab ${filter === "empty" ? "on" : ""}`} onClick={() => setFilter("empty")}>空席</button>
              </div>
              <button className="btn btn-purple" onClick={quickEnter}>
                + 入店
              </button>
            </div>

            <div className="floor-grid">
              {filteredTables.map((t) => (
                <div
                  key={t.id}
                  className={`tc ${t.type === "empty" ? "empty" : getSeatClass(t.elMin)} ${selectedTableId === t.id ? "sel" : ""}`}
                  onClick={() => (t.type === "empty" ? quickEnter() : setSelectedTableId(t.id))}
                >
                  {t.type === "empty" ? (
                    <>
                      <div className="tc-id">{t.id}</div>
                      <div className="empty-cta">+ 入店</div>
                    </>
                  ) : (
                    <>
                      <div className="tc-stripe" />
                      <div className="tc-id">{t.id}</div>
                      <div className="tc-cast">{t.casts.join("・")}</div>
                      <div className="tc-guest">{t.guests.join("・")}</div>
                      <div className="tc-pax">{t.num}名</div>
                      <div className={`tc-elapsed ${getTimeClass(t.elMin)}`}>{fmt(t.elMin)}</div>
                      <div className="tc-amount">¥{calcTotal(t.items).toLocaleString()}</div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          <aside className="rp">
            <div className="rp-head">
              <div className="rp-seat">{selectedTable ? selectedTable.id : "席を選択"}</div>
              <div className="rp-info">
                {selectedTable
                  ? `担当: ${selectedTable.casts.join("・")} / ${selectedTable.guests.join("・")} ${selectedTable.num}名`
                  : "フロアマップから卓をタップ"}
              </div>
              {selectedTable && <div className={`rp-timer ${getSeatClass(selectedTable.elMin)}`}>経過 {fmt(selectedTable.elMin)}</div>}
            </div>

            <div className="rp-body">
              <div className="order-sec">
                <div className="order-hd">
                  <span>注文内容</span>
                  <span>{selectedTable ? `${selectedTable.items.reduce((s, i) => s + i.q, 0)}品` : "0品"}</span>
                </div>
                {selectedTable?.items.map((item, idx) => (
                  <div key={`${item.n}-${idx}`} className="o-item">
                    <div className="o-qty">
                      <button className="qbtn" onClick={() => changeQty(idx, -1)}>
                        −
                      </button>
                      <div className="qnum">{item.q}</div>
                      <button className="qbtn" onClick={() => changeQty(idx, 1)}>
                        ＋
                      </button>
                    </div>
                    <div className="o-name">{item.n}</div>
                    <div className="o-price">¥{(item.p * item.q).toLocaleString()}</div>
                    <button className="o-del" onClick={() => deleteItem(idx)}>
                      ×
                    </button>
                  </div>
                ))}
                <button className="add-btn" onClick={() => setMenuOpen((v) => !v)}>
                  + メニューから追加
                </button>
              </div>

              <div className="bill-sec">
                <div className="bill-row">
                  <span>小計</span>
                  <span>¥{subtotal.toLocaleString()}</span>
                </div>
                <div className="bill-row">
                  <span>割引</span>
                  <span>
                    −{" "}
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
                <div className="bill-row total">
                  <span>合計</span>
                  <span>¥{total.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="rp-foot">
              <button className="btn-kai">会計</button>
              <div style={{ fontSize: 10, color: "var(--charcoal4)", marginTop: 8 }}>{syncLabel}</div>
            </div>
          </aside>

          <div className={`menu-panel ${menuOpen ? "open" : ""}`}>
            <div className="mp-head">
              <div className="mp-title">メニュー</div>
              <button className="mp-close" onClick={() => setMenuOpen(false)}>
                ×
              </button>
            </div>
            <div className="mp-cats">
              <button className={`mcat ${menuCat === "all" ? "on" : ""}`} onClick={() => setMenuCat("all")}>
                全て
              </button>
              {MENU_CATEGORIES.map((c) => (
                <button key={c.id} className={`mcat ${menuCat === c.id ? "on" : ""}`} onClick={() => setMenuCat(c.id)}>
                  {c.name}
                </button>
              ))}
            </div>
            <div className="mp-list">
              {menus
                .filter((m) => menuCat === "all" || m.cat === menuCat)
                .map((m) => (
                  <div key={m.id} className="mi" onClick={() => addMenuToOrder(m)}>
                    <span className="mi-dot" />
                    <span className="mi-name">{m.name}</span>
                    <span className="mi-price">¥{m.price.toLocaleString()}</span>
                    <button className="mi-add">+</button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
/*
"use client";

export default function Home() {
  return <div>tmp</div>;
}
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { menuCategories as MENU_CATEGORIES, menuData as MENU_INITIAL } from "./lib/nightposData";

const SETTINGS = { setMin: 60 };

const INITIAL_TABLES = [
  { id: "T-1", type: "occ", casts: ["あおい"], guests: ["田中様"], num: 2, inTime: "21:00", elMin: 40, items: [{ n: "通常セット 60分", p: 3000, q: 1 }, { n: "キャストドリンク", p: 1000, q: 2 }] },
  { id: "T-2", type: "occ", casts: ["みき"], guests: ["山田様"], num: 2, inTime: "21:30", elMin: 25, items: [{ n: "ビールありセット 60分", p: 3500, q: 1 }] },
  { id: "T-3", type: "occ", casts: ["さくら"], guests: ["佐藤様"], num: 1, inTime: "22:00", elMin: 75, items: [{ n: "通常セット 120分", p: 5000, q: 1 }] },
  { id: "C-1", type: "occ", casts: ["ゆな"], guests: ["伊藤様"], num: 1, inTime: "23:10", elMin: 15, items: [{ n: "通常セット 60分", p: 3000, q: 1 }] },
  { id: "C-2", type: "empty", casts: [], guests: [], num: 0, inTime: "", elMin: 0, items: [] },
  { id: "C-3", type: "empty", casts: [], guests: [], num: 0, inTime: "", elMin: 0, items: [] },
  { id: "C-4", type: "empty", casts: [], guests: [], num: 0, inTime: "", elMin: 0, items: [] },
];

const calcTotal = (items) => items.reduce((sum, item) => sum + item.p * item.q, 0);
const fmt = (m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
const getSeatClass = (m) => (m >= SETTINGS.setMin ? "s-over" : m >= SETTINGS.setMin - 10 ? "s-warn" : m >= SETTINGS.setMin / 2 ? "s-half" : "s-normal");
const getTimeClass = (m) => (m >= SETTINGS.setMin ? "c-over" : m >= SETTINGS.setMin - 10 ? "c-warn" : m >= SETTINGS.setMin / 2 ? "c-half" : "c-normal");

function normalizeTable(row) {
  return {
    id: row.id,
    type: row.type ?? "empty",
    casts: Array.isArray(row.casts) ? row.casts : [],
    guests: Array.isArray(row.guests) ? row.guests : [],
    num: row.num ?? 0,
    inTime: row.in_time ?? "",
    elMin: row.elapsed_min ?? 0,
    items: Array.isArray(row.items) ? row.items : [],
  };
}

export default function Home() {
  const [clock, setClock] = useState("");
  const [syncLabel, setSyncLabel] = useState("ローカル表示");
  const [tables, setTables] = useState(INITIAL_TABLES);
  const [filter, setFilter] = useState("all");
  const [selectedTableId, setSelectedTableId] = useState("T-1");
  const [discount, setDiscount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuCat, setMenuCat] = useState("all");
  const [menus] = useState(MENU_INITIAL);

  useEffect(() => {
    const tick = () => {
      const n = new Date();
      const d = ["日", "月", "火", "水", "木", "金", "土"];
      setClock(`${n.getFullYear()}/${n.getMonth() + 1}/${n.getDate()}（${d[n.getDay()]}） ${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`);
    };
    tick();
    const timer = setInterval(tick, 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const loadFloorTables = async () => {
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
    loadFloorTables();
  }, []);

  const selectedTable = tables.find((t) => t.id === selectedTableId && t.type !== "empty") ?? null;
  const occupiedCount = tables.filter((t) => t.type !== "empty").length;

  const filteredTables = useMemo(() => {
    if (filter === "occ") return tables.filter((t) => t.type !== "empty");
    if (filter === "empty") return tables.filter((t) => t.type === "empty");
    return tables;
  }, [filter, tables]);

  const subtotal = selectedTable ? calcTotal(selectedTable.items) : 0;
  const total = Math.max(0, subtotal - Math.min(subtotal, discount));

  const updateTable = (id, updater) => {
    setTables((prev) => prev.map((t) => (t.id === id ? updater(t) : t)));
  };

  const quickEnter = () => {
    const empty = tables.find((t) => t.type === "empty");
    if (!empty) return;
    const now = new Date();
    const inTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    updateTable(empty.id, () => ({ id: empty.id, type: "occ", casts: ["未設定"], guests: ["新規様"], num: 1, inTime, elMin: 0, items: [{ n: "通常セット 60分", p: 3000, q: 1 }] }));
    setSelectedTableId(empty.id);
  };

  const addMenuToOrder = (menu) => {
    if (!selectedTable) return;
    updateTable(selectedTable.id, (t) => {
      const items = [...t.items];
      const idx = items.findIndex((i) => i.n === menu.name);
      if (idx >= 0) items[idx] = { ...items[idx], q: items[idx].q + 1 };
      else items.push({ n: menu.name, p: menu.price, q: 1 });
      return { ...t, items };
    });
  };

  const changeQty = (idx, delta) => {
    if (!selectedTable) return;
    updateTable(selectedTable.id, (t) => {
      const items = [...t.items];
      items[idx] = { ...items[idx], q: Math.max(1, items[idx].q + delta) };
      return { ...t, items };
    });
  };

  const deleteItem = (idx) => {
    if (!selectedTable) return;
    updateTable(selectedTable.id, (t) => ({ ...t, items: t.items.filter((_, i) => i !== idx) }));
  };

  return (
    <div className="app">
      <header className="hdr">
        <div className="logo-text">Night<span>POS</span></div>
        <div className="hdr-badge live"><span className="live-dot" />営業中</div>
        <div className="hdr-badge">稼働 {occupiedCount}/{tables.length}</div>
        <div className="hclock">{clock}</div>
      </header>

      <nav className="nav">
        <button className="ntab on">テーブル</button>
      </nav>

      <main className="page">
        <div className="floor-wrap">
          <div className="floor-left">
            <div className="floor-toolbar">
              <div style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>フロアマップ</div>
              <div className="filter-tabs">
                <button className={`ftab ${filter === "all" ? "on" : ""}`} onClick={() => setFilter("all")}>全席</button>
                <button className={`ftab ${filter === "occ" ? "on" : ""}`} onClick={() => setFilter("occ")}>稼働中</button>
                <button className={`ftab ${filter === "empty" ? "on" : ""}`} onClick={() => setFilter("empty")}>空席</button>
              </div>
              <button className="btn btn-purple" onClick={quickEnter}>+ 入店</button>
            </div>

            <div className="floor-grid">
              {filteredTables.map((t) => (
                <div key={t.id} className={`tc ${t.type === "empty" ? "empty" : getSeatClass(t.elMin)} ${selectedTableId === t.id ? "sel" : ""}`} onClick={() => (t.type === "empty" ? quickEnter() : setSelectedTableId(t.id))}>
                  {t.type === "empty" ? (
                    <>
                      <div className="tc-id">{t.id}</div>
                      <div className="empty-cta">+ 入店</div>
                    </>
                  ) : (
                    <>
                      <div className="tc-stripe" />
                      <div className="tc-id">{t.id}</div>
                      <div className="tc-cast">{t.casts.join("・")}</div>
                      <div className="tc-guest">{t.guests.join("・")}</div>
                      <div className="tc-pax">{t.num}名</div>
                      <div className={`tc-elapsed ${getTimeClass(t.elMin)}`}>{fmt(t.elMin)}</div>
                      <div className="tc-amount">¥{calcTotal(t.items).toLocaleString()}</div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          <aside className="rp">
            <div className="rp-head">
              <div className="rp-seat">{selectedTable ? selectedTable.id : "席を選択"}</div>
              <div className="rp-info">
                {selectedTable
                  ? `担当: ${selectedTable.casts.join("・")} / ${selectedTable.guests.join("・")} ${selectedTable.num}名`
                  : "フロアマップから卓をタップ"}
              </div>
              {selectedTable && <div className={`rp-timer ${getSeatClass(selectedTable.elMin)}`}>経過 {fmt(selectedTable.elMin)}</div>}
            </div>

            <div className="rp-body">
              <div className="order-sec">
                <div className="order-hd">
                  <span>注文内容</span>
                  <span>{selectedTable ? `${selectedTable.items.reduce((s, i) => s + i.q, 0)}品` : "0品"}</span>
                </div>
                {selectedTable?.items.map((item, idx) => (
                  <div key={`${item.n}-${idx}`} className="o-item">
                    <div className="o-qty">
                      <button className="qbtn" onClick={() => changeQty(idx, -1)}>−</button>
                      <div className="qnum">{item.q}</div>
                      <button className="qbtn" onClick={() => changeQty(idx, 1)}>＋</button>
                    </div>
                    <div className="o-name">{item.n}</div>
                    <div className="o-price">¥{(item.p * item.q).toLocaleString()}</div>
                    <button className="o-del" onClick={() => deleteItem(idx)}>×</button>
                  </div>
                ))}
                <button className="add-btn" onClick={() => setMenuOpen((v) => !v)}>+ メニューから追加</button>
              </div>

              <div className="bill-sec">
                <div className="bill-row"><span>小計</span><span>¥{subtotal.toLocaleString()}</span></div>
                <div className="bill-row">
                  <span>割引</span>
                  <span>
                    − <input className="disc-in" type="number" min={0} value={discount} onChange={(e) => setDiscount(Number(e.target.value) || 0)} />円
                  </span>
                </div>
                <div className="bill-row total"><span>合計</span><span>¥{total.toLocaleString()}</span></div>
              </div>
            </div>

            <div className="rp-foot">
              <button className="btn-kai">会計</button>
              <div style={{ fontSize: 10, color: "var(--charcoal4)", marginTop: 8 }}>{syncLabel}</div>
            </div>
          </aside>

          <div className={`menu-panel ${menuOpen ? "open" : ""}`}>
            <div className="mp-head">
              <div className="mp-title">メニュー</div>
              <button className="mp-close" onClick={() => setMenuOpen(false)}>×</button>
            </div>
            <div className="mp-cats">
              <button className={`mcat ${menuCat === "all" ? "on" : ""}`} onClick={() => setMenuCat("all")}>全て</button>
              {MENU_CATEGORIES.map((c) => (
                <button key={c.id} className={`mcat ${menuCat === c.id ? "on" : ""}`} onClick={() => setMenuCat(c.id)}>
                  {c.name}
                </button>
              ))}
            </div>
            <div className="mp-list">
              {menus
                .filter((m) => menuCat === "all" || m.cat === menuCat)
                .map((m) => (
                  <div key={m.id} className="mi" onClick={() => addMenuToOrder(m)}>
                    <span className="mi-dot" />
                    <span className="mi-name">{m.name}</span>
                    <span className="mi-price">¥{m.price.toLocaleString()}</span>
                    <button className="mi-add">+</button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  castsData as CASTS_INITIAL,
  customersData as CUSTOMERS_INITIAL,
  invoicesData as INVOICES_INITIAL,
  menuCategories as MENU_CATEGORIES,
  menuData as MENU_INITIAL,
} from "./lib/nightposData";

const SETTINGS = { storeName: "Room YOLO", setMin: 60, ownerPin: "1234", salaryPin: "5678" };
const NAVS = ["テーブル", "勤怠", "顧客", "キャスト", "レポート", "会計伝票", "メニュー", "オーナー", "給与"];
const PAGE_IDS = ["floor", "kintai", "customer", "cast", "report", "invoice", "menu", "owner", "salary"];

const TABLES_INITIAL = [
  { id: "T-1", type: "occ", casts: ["あおい"], guests: ["田中様"], num: 2, inTime: "21:00", elMin: 40, items: [{ n: "通常セット 60分", p: 3000, q: 1 }, { n: "キャストドリンク", p: 1000, q: 2 }] },
  { id: "T-2", type: "occ", casts: ["みき"], guests: ["山田様"], num: 2, inTime: "21:30", elMin: 25, items: [{ n: "ビールありセット 60分", p: 3500, q: 1 }] },
  { id: "T-3", type: "occ", casts: ["さくら"], guests: ["佐藤様"], num: 1, inTime: "22:00", elMin: 75, items: [{ n: "通常セット 120分", p: 5000, q: 1 }] },
  { id: "C-1", type: "occ", casts: ["ゆな"], guests: ["伊藤様"], num: 1, inTime: "23:10", elMin: 15, items: [{ n: "通常セット 60分", p: 3000, q: 1 }] },
  { id: "C-2", type: "empty", casts: [], guests: [], num: 0, inTime: "", elMin: 0, items: [] },
  { id: "C-3", type: "empty", casts: [], guests: [], num: 0, inTime: "", elMin: 0, items: [] },
  { id: "C-4", type: "empty", casts: [], guests: [], num: 0, inTime: "", elMin: 0, items: [] },
];

const calcTotal = (items) => items.reduce((sum, item) => sum + item.p * item.q, 0);
const fmt = (m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
const fmtH = (m) => (m <= 0 ? "—" : `${Math.floor(m / 60)}時間${String(m % 60).padStart(2, "0")}分`);

function normalizeTable(row) {
  return {
    id: row.id,
    type: row.type ?? "empty",
    casts: Array.isArray(row.casts) ? row.casts : [],
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
  const [syncLabel, setSyncLabel] = useState("ローカル表示");
  const [tables, setTables] = useState(TABLES_INITIAL);
  const [tableFilter, setTableFilter] = useState("all");
  const [selectedTableId, setSelectedTableId] = useState("T-1");
  const [discount, setDiscount] = useState(0);
  const [menuCat, setMenuCat] = useState("all");
  const [menuOpen, setMenuOpen] = useState(false);

  const [casts, setCasts] = useState(CASTS_INITIAL);
  const [selectedCastId, setSelectedCastId] = useState(CASTS_INITIAL[0].id);
  const [castTab, setCastTab] = useState("all");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [selectedCustomerId, setSelectedCustomerId] = useState(CUSTOMERS_INITIAL[0].id);
  const [menus, setMenus] = useState(MENU_INITIAL);
  const [menuMgmtCat, setMenuMgmtCat] = useState(MENU_CATEGORIES[0].id);
  const [selectedInvoiceTx, setSelectedInvoiceTx] = useState(INVOICES_INITIAL[0].txno);
  const [ownerPin, setOwnerPin] = useState("");
  const [salaryPin, setSalaryPin] = useState("");
  const [ownerUnlocked, setOwnerUnlocked] = useState(false);
  const [salaryUnlocked, setSalaryUnlocked] = useState(false);
  const [reportPeriod, setReportPeriod] = useState("today");

  useEffect(() => {
    const tick = () => {
      const n = new Date();
      const d = ["日", "月", "火", "水", "木", "金", "土"];
      setClock(`${n.getFullYear()}/${n.getMonth() + 1}/${n.getDate()}（${d[n.getDay()]}） ${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`);
    };
    tick();
    const timer = setInterval(tick, 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const load = async () => {
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
    load();
  }, []);

  const selectedTable = tables.find((t) => t.id === selectedTableId && t.type !== "empty") ?? null;
  const selectedCast = casts.find((c) => c.id === selectedCastId) ?? casts[0];
  const selectedCustomer = CUSTOMERS_INITIAL.find((c) => c.id === selectedCustomerId) ?? CUSTOMERS_INITIAL[0];
  const selectedInvoice = INVOICES_INITIAL.find((i) => i.txno === selectedInvoiceTx) ?? INVOICES_INITIAL[0];
  const occupiedCount = tables.filter((t) => t.type !== "empty").length;
  const activeCasts = casts.filter((c) => c.statusEmp !== "除籍");

  const filteredTables = useMemo(() => {
    if (tableFilter === "occ") return tables.filter((t) => t.type !== "empty");
    if (tableFilter === "empty") return tables.filter((t) => t.type === "empty");
    return tables;
  }, [tableFilter, tables]);

  const filteredCustomers = useMemo(() => {
    if (customerFilter === "vip") return CUSTOMERS_INITIAL.filter((c) => c.rank === "vip");
    if (customerFilter === "new") return CUSTOMERS_INITIAL.filter((c) => c.rank === "new");
    return CUSTOMERS_INITIAL;
  }, [customerFilter]);

  const filteredCasts = useMemo(() => {
    if (castTab === "all") return casts.filter((c) => c.statusEmp !== "除籍");
    if (castTab === "retired") return casts.filter((c) => c.statusEmp === "除籍");
    return casts.filter((c) => c.role === castTab && c.statusEmp !== "除籍");
  }, [castTab, casts]);

  const reportRows = useMemo(
    () =>
      activeCasts
        .map((c) => ({ name: c.name, sales: INVOICES_INITIAL.filter((v) => v.casts.includes(c.name)).reduce((s, v) => s + v.total, 0) }))
        .sort((a, b) => b.sales - a.sales),
    [activeCasts],
  );

  const salaryRows = useMemo(
    () =>
      activeCasts.map((c) => {
        const wage = Math.floor(((c.elMin - c.breakMin) / 60) * c.wage);
        const drink = c.drink * 400;
        const shimei = c.shimei * 1000;
        const champ = Math.floor(c.champ * 0.1);
        return { ...c, wage, drink, shimei, champ, total: wage + drink + shimei + champ };
      }),
    [activeCasts],
  );

  const orderSubtotal = selectedTable ? calcTotal(selectedTable.items) : 0;
  const orderTotal = Math.max(0, orderSubtotal - Math.min(orderSubtotal, discount));
  const getSeatClass = (m) => (m >= SETTINGS.setMin ? "s-over" : m >= SETTINGS.setMin - 10 ? "s-warn" : m >= SETTINGS.setMin / 2 ? "s-half" : "s-normal");
  const getTimeClass = (m) => (m >= SETTINGS.setMin ? "c-over" : m >= SETTINGS.setMin - 10 ? "c-warn" : m >= SETTINGS.setMin / 2 ? "c-half" : "c-normal");

  const updateTable = (id, updater) => setTables((prev) => prev.map((t) => (t.id === id ? updater(t) : t)));
  const addMenuToOrder = (menu) => selectedTable && updateTable(selectedTable.id, (t) => {
    const items = [...t.items];
    const idx = items.findIndex((i) => i.n === menu.name);
    if (idx >= 0) items[idx] = { ...items[idx], q: items[idx].q + 1 };
    else items.push({ n: menu.name, p: menu.price, q: 1 });
    return { ...t, items };
  });
  const changeQty = (idx, d) => selectedTable && updateTable(selectedTable.id, (t) => {
    const items = [...t.items];
    items[idx] = { ...items[idx], q: Math.max(1, items[idx].q + d) };
    return { ...t, items };
  });
  const deleteItem = (idx) => selectedTable && updateTable(selectedTable.id, (t) => ({ ...t, items: t.items.filter((_, i) => i !== idx) }));
  const quickEnter = () => {
    const empty = tables.find((t) => t.type === "empty");
    if (!empty) return;
    const now = new Date();
    const inTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    updateTable(empty.id, () => ({ id: empty.id, type: "occ", casts: ["未設定"], guests: ["新規様"], num: 1, inTime, elMin: 0, items: [{ n: "通常セット 60分", p: 3000, q: 1 }] }));
    setSelectedTableId(empty.id);
  };
  const addMenuItem = () => {
    const nextId = Math.max(...menus.map((m) => m.id)) + 1;
    const name = MENU_CATEGORIES.find((c) => c.id === menuMgmtCat)?.name ?? menuMgmtCat;
    setMenus((prev) => [...prev, { id: nextId, cat: menuMgmtCat, name: `${name} 新メニュー`, price: 1000 }]);
  };

  return (
    <div className="app">
      <header className="hdr">
        <div className="logo-text">Night<span>POS</span></div>
        <div className="hdr-badge live"><span className="live-dot" />営業中</div>
        <div className="hdr-badge">稼働 {occupiedCount}/{tables.length}</div>
        <div className="hclock">{clock}</div>
      </header>

      <nav className="nav">
        {NAVS.map((label, idx) => {
          const id = PAGE_IDS[idx];
          return (
            <button key={id} className={`ntab ${page === id ? "on" : ""}`} onClick={() => setPage(id)}>
              {label}
            </button>
          );
        })}
      </nav>

      {page === "floor" && (
        <div className="page on">
          <div className="floor-wrap">
            <div className="floor-left">
              <div className="floor-toolbar">
                <div style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>フロアマップ</div>
                <div className="filter-tabs">
                  <button className={`ftab ${tableFilter === "all" ? "on" : ""}`} onClick={() => setTableFilter("all")}>全席</button>
                  <button className={`ftab ${tableFilter === "occ" ? "on" : ""}`} onClick={() => setTableFilter("occ")}>稼働中</button>
                  <button className={`ftab ${tableFilter === "empty" ? "on" : ""}`} onClick={() => setTableFilter("empty")}>空席</button>
                </div>
                <button className="btn btn-purple" onClick={quickEnter}>+ 入店</button>
              </div>
              <div className="floor-grid">
                {filteredTables.map((t) => (
                  <div key={t.id} className={`tc ${t.type === "empty" ? "empty" : getSeatClass(t.elMin)} ${selectedTableId === t.id ? "sel" : ""}`} onClick={() => (t.type === "empty" ? quickEnter() : setSelectedTableId(t.id))}>
                    {t.type === "empty" ? <><div className="tc-id">{t.id}</div><div className="empty-cta">+ 入店</div></> : <><div className="tc-stripe" /><div className="tc-id">{t.id}</div><div className="tc-cast">{t.casts.join("・")}</div><div className="tc-guest">{t.guests.join("・")}</div><div className="tc-pax">{t.num}名</div><div className={`tc-elapsed ${getTimeClass(t.elMin)}`}>{fmt(t.elMin)}</div><div className="tc-amount">¥{calcTotal(t.items).toLocaleString()}</div></>}
                  </div>
                ))}
              </div>
            </div>
            <aside className="rp">
              <div className="rp-head">
                <div className="rp-seat">{selectedTable ? selectedTable.id : "席を選択"}</div>
                <div className="rp-info">{selectedTable ? `担当: ${selectedTable.casts.join("・")} / ${selectedTable.guests.join("・")} ${selectedTable.num}名` : "フロアマップから卓をタップ"}</div>
                {selectedTable && <div className={`rp-timer ${getSeatClass(selectedTable.elMin)}`}>経過 {fmt(selectedTable.elMin)}</div>}
              </div>
              <div className="rp-body">
                <div className="order-sec">
                  <div className="order-hd"><span>注文内容</span><span>{selectedTable ? `${selectedTable.items.reduce((s, i) => s + i.q, 0)}品` : "0品"}</span></div>
                  {selectedTable?.items.map((i, idx) => (
                    <div key={`${i.n}-${idx}`} className="o-item">
                      <div className="o-qty"><button className="qbtn" onClick={() => changeQty(idx, -1)}>−</button><div className="qnum">{i.q}</div><button className="qbtn" onClick={() => changeQty(idx, 1)}>＋</button></div>
                      <div className="o-name">{i.n}</div><div className="o-price">¥{(i.p * i.q).toLocaleString()}</div><button className="o-del" onClick={() => deleteItem(idx)}>×</button>
                    </div>
                  ))}
                  <button className="add-btn" onClick={() => setMenuOpen((v) => !v)}>+ メニューから追加</button>
                </div>
                <div className="bill-sec">
                  <div className="bill-row"><span>小計</span><span>¥{orderSubtotal.toLocaleString()}</span></div>
                  <div className="bill-row"><span>割引</span><span>− <input className="disc-in" type="number" min={0} value={discount} onChange={(e) => setDiscount(Number(e.target.value) || 0)} />円</span></div>
                  <div className="bill-row total"><span>合計</span><span>¥{orderTotal.toLocaleString()}</span></div>
                </div>
              </div>
              <div className="rp-foot"><button className="btn-kai">会計</button><div style={{ fontSize: 10, color: "var(--charcoal4)" }}>{syncLabel}</div></div>
            </aside>
            <div className={`menu-panel ${menuOpen ? "open" : ""}`}>
              <div className="mp-head"><div className="mp-title">メニュー</div><button className="mp-close" onClick={() => setMenuOpen(false)}>×</button></div>
              <div className="mp-cats"><button className={`mcat ${menuCat === "all" ? "on" : ""}`} onClick={() => setMenuCat("all")}>全て</button>{MENU_CATEGORIES.map((c) => <button key={c.id} className={`mcat ${menuCat === c.id ? "on" : ""}`} onClick={() => setMenuCat(c.id)}>{c.name}</button>)}</div>
              <div className="mp-list">{menus.filter((m) => menuCat === "all" || m.cat === menuCat).map((m) => <div key={m.id} className="mi" onClick={() => addMenuToOrder(m)}><span className="mi-dot" /><span className="mi-name">{m.name}</span><span className="mi-price">¥{m.price.toLocaleString()}</span><button className="mi-add">+</button></div>)}</div>
            </div>
          </div>
        </div>
      )}

      {page === "kintai" && <div className="pscroll on"><div className="gc" style={{ padding: 14 }}><div className="sec-hd"><div style={{ fontWeight: 700 }}>勤怠管理</div><button className="btn btn-ghost">CSV</button></div><div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>{activeCasts.map((c) => <button key={c.id} className={`cast-row ${selectedCastId === c.id ? "sel" : ""}`} onClick={() => setSelectedCastId(c.id)}>{c.name} / {c.status}</button>)}<div className="card-lite"><div style={{ fontWeight: 700 }}>{selectedCast.name}</div><div style={{ fontSize: 12, color: "var(--charcoal4)" }}>{selectedCast.role}</div><div style={{ marginTop: 8, display: "flex", gap: 6 }}><button className="btn btn-ghost" onClick={() => setCasts((p) => p.map((x) => (x.id === selectedCast.id ? { ...x, status: "in" } : x)))}>出勤</button><button className="btn btn-ghost" onClick={() => setCasts((p) => p.map((x) => (x.id === selectedCast.id ? { ...x, status: "brk" } : x)))}>休憩</button><button className="btn btn-ghost" onClick={() => setCasts((p) => p.map((x) => (x.id === selectedCast.id ? { ...x, status: "out" } : x)))}>退勤</button></div></div></div></div></div>}

      {page === "customer" && <div className="pscroll on"><div className="sec-hd"><div style={{ display: "flex", gap: 6 }}><button className={`btn btn-ghost ${customerFilter === "all" ? "onX" : ""}`} onClick={() => setCustomerFilter("all")}>全顧客</button><button className={`btn btn-ghost ${customerFilter === "vip" ? "onX" : ""}`} onClick={() => setCustomerFilter("vip")}>VIP</button><button className={`btn btn-ghost ${customerFilter === "new" ? "onX" : ""}`} onClick={() => setCustomerFilter("new")}>新規</button></div></div><div className="cu-grid">{filteredCustomers.map((c) => <button key={c.id} className="cu-card" onClick={() => setSelectedCustomerId(c.id)}><div className="cu-name">{c.name}</div><div className="cu-kana">{c.kana}</div><div className="cu-stats"><div className="cs-box"><div className="cs-v">{c.visit}</div><div className="cs-l">来店</div></div><div className="cs-box"><div className="cs-v">¥{Math.round(c.total / 10000)}万</div><div className="cs-l">累計</div></div><div className="cs-box"><div className="cs-v">{c.rank}</div><div className="cs-l">ランク</div></div></div></button>)}</div><div className="gc" style={{ marginTop: 10, padding: 14 }}>{selectedCustomer.name} / 担当: {selectedCustomer.cast}</div></div>}

      {page === "cast" && <div className="pscroll on"><div className="cast-tabs"><button className={`ctab ${castTab === "all" ? "on" : ""}`} onClick={() => setCastTab("all")}>在籍</button><button className={`ctab ${castTab === "キャスト" ? "on" : ""}`} onClick={() => setCastTab("キャスト")}>キャスト</button><button className={`ctab ${castTab === "ボーイ" ? "on" : ""}`} onClick={() => setCastTab("ボーイ")}>ボーイ</button><button className={`ctab ${castTab === "retired" ? "on" : ""}`} onClick={() => setCastTab("retired")}>除籍</button></div><div className="cast-grid">{filteredCasts.map((c) => <div key={c.id} className="cc-card"><div className="cc-name">{c.name}</div><div className="cc-role">{c.role} / {c.statusEmp}</div><div style={{ marginTop: 6, fontSize: 11, color: "var(--charcoal4)" }}>時給: ¥{c.wage.toLocaleString()}</div></div>)}</div></div>}

      {page === "report" && <div className="pscroll on"><div className="period-btns">{["today", "week", "month", "custom", "year"].map((p) => <button key={p} className={`pbtn-rp ${reportPeriod === p ? "on" : ""}`} onClick={() => setReportPeriod(p)}>{p}</button>)}</div><div className="gc" style={{ padding: 14 }}><table className="tbl"><thead><tr><th>順位</th><th>キャスト</th><th>売上</th></tr></thead><tbody>{reportRows.map((r, i) => <tr key={r.name}><td>{i + 1}</td><td>{r.name}</td><td>¥{r.sales.toLocaleString()}</td></tr>)}</tbody></table></div></div>}

      {page === "invoice" && <div className="pscroll on"><div className="gc" style={{ padding: 14 }}><table className="tbl"><thead><tr><th>No</th><th>日付</th><th>席</th><th>顧客</th><th>合計</th></tr></thead><tbody>{INVOICES_INITIAL.map((v) => <tr key={v.txno} onClick={() => setSelectedInvoiceTx(v.txno)} style={{ cursor: "pointer", background: v.txno === selectedInvoiceTx ? "var(--purple-ll)" : "transparent" }}><td>{v.txno}</td><td>{v.date} {v.time}</td><td>{v.tableId}</td><td>{v.guests.join("・")}</td><td>¥{v.total.toLocaleString()}</td></tr>)}</tbody></table></div><div className="gc" style={{ marginTop: 10, padding: 14 }}>{selectedInvoice.txno} / {selectedInvoice.method}</div></div>}

      {page === "menu" && <div className="pscroll on"><div className="sec-hd"><button className="btn btn-purple" onClick={addMenuItem}>+ 追加</button></div><div className="mm-wrap"><div className="mm-cat-list">{MENU_CATEGORIES.map((c) => <button key={c.id} className={`mm-cat ${menuMgmtCat === c.id ? "sel" : ""}`} onClick={() => setMenuMgmtCat(c.id)}><span>{c.name}</span><span>{menus.filter((m) => m.cat === c.id).length}</span></button>)}</div><div className="mm-item-list">{menus.filter((m) => m.cat === menuMgmtCat).map((m) => <div key={m.id} className="mm-row"><div style={{ flex: 1 }}>{m.name}</div><div style={{ minWidth: 90, textAlign: "right", fontWeight: 700 }}>¥{m.price.toLocaleString()}</div><button className="btn btn-danger" style={{ height: 28 }} onClick={() => setMenus((prev) => prev.filter((x) => x.id !== m.id))}>削除</button></div>)}</div></div></div>}

      {page === "owner" && <div className="page on">{!ownerUnlocked ? <div className="pin-screen"><div className="pin-title">オーナー管理</div><div className="pin-hint">PIN（1234）</div><input className="pin-input" type="password" maxLength={4} value={ownerPin} onChange={(e) => setOwnerPin(e.target.value.replace(/\D/g, ""))} /><button className="btn btn-purple" onClick={() => { if (ownerPin === SETTINGS.ownerPin) setOwnerUnlocked(true); setOwnerPin(""); }}>解除</button></div> : <div className="pscroll on"><div className="owner-sec"><div className="owner-sec-title">サマリー</div><div>売上: ¥{INVOICES_INITIAL.reduce((s, v) => s + v.total, 0).toLocaleString()}</div></div><button className="btn btn-ghost" onClick={() => setOwnerUnlocked(false)}>ロック</button></div>}</div>}

      {page === "salary" && <div className="page on">{!salaryUnlocked ? <div className="pin-screen"><div className="pin-title">給与計算</div><div className="pin-hint">PIN（5678）</div><input className="pin-input" type="password" maxLength={4} value={salaryPin} onChange={(e) => setSalaryPin(e.target.value.replace(/\D/g, ""))} /><button className="btn btn-purple" onClick={() => { if (salaryPin === SETTINGS.salaryPin) setSalaryUnlocked(true); setSalaryPin(""); }}>解除</button></div> : <div className="pscroll on"><div className="gc" style={{ padding: 14 }}><table className="tbl"><thead><tr><th>氏名</th><th>勤務</th><th>時給分</th><th>DK</th><th>指名</th><th>CH</th><th>合計</th></tr></thead><tbody>{salaryRows.map((r) => <tr key={r.id}><td>{r.name}</td><td>{fmtH(r.elMin)}</td><td>¥{r.wage.toLocaleString()}</td><td>¥{r.drink.toLocaleString()}</td><td>¥{r.shimei.toLocaleString()}</td><td>¥{r.champ.toLocaleString()}</td><td>¥{r.total.toLocaleString()}</td></tr>)}</tbody></table></div><button className="btn btn-ghost" style={{ marginTop: 10 }} onClick={() => setSalaryUnlocked(false)}>ロック</button></div>}</div>}

      <style jsx global>{`
        *{box-sizing:border-box;margin:0;padding:0}
        :root{--paper:#f2f2f6;--charcoal:#1e1e28;--charcoal4:#7878a0;--purple:#6b4eff;--purple-l:rgba(107,78,255,.12);--purple-ll:rgba(107,78,255,.06);--glass:rgba(255,255,255,.72);--glass2:rgba(255,255,255,.52);--glass-border:rgba(255,255,255,.9);--glass-border2:rgba(255,255,255,.5);--line:rgba(100,100,140,.1);--line2:rgba(100,100,140,.16);--red:#e03e3e;--green:#16a366;--amber:#c47a00;--r:16px;--rm:10px;--rs:6px}
        html,body{height:100%;overflow:hidden;background:var(--paper);color:var(--charcoal);font-family:'Noto Sans JP',sans-serif}
        .app{height:100vh;display:flex;flex-direction:column}
        .hdr{height:56px;background:var(--glass);backdrop-filter:blur(20px);border-bottom:1px solid var(--glass-border);display:flex;align-items:center;padding:0 20px;gap:10px}
        .logo-text{font-size:16px;font-weight:900;flex:1}.logo-text span{color:var(--purple)}
        .hdr-badge{padding:4px 10px;border-radius:20px;font-size:10px;border:1px solid var(--glass-border2);background:var(--glass2)}.hdr-badge.live{color:var(--green)}
        .hclock{font-size:10px;color:var(--charcoal4)} .live-dot{display:inline-block;width:5px;height:5px;background:var(--green);border-radius:50%;margin-right:4px}
        .nav{display:flex;background:var(--glass);border-bottom:1px solid var(--line);overflow-x:auto}
        .ntab{padding:0 16px;height:40px;display:flex;align-items:center;border:none;background:transparent;color:var(--charcoal4);font-size:11px;border-bottom:2px solid transparent}
        .ntab.on{color:var(--purple);border-bottom-color:var(--purple)}
        .page{display:flex;flex:1;overflow:hidden;flex-direction:column}.pscroll{flex:1;overflow-y:auto;padding:16px}
        .floor-wrap{flex:1;display:flex;overflow:hidden}.floor-left{flex:1;display:flex;flex-direction:column}
        .floor-toolbar{padding:10px 14px;display:flex;align-items:center;gap:8px;background:var(--glass);border-bottom:1px solid var(--line)}
        .filter-tabs{display:flex;gap:4px}.ftab{padding:5px 10px;border-radius:20px;border:1px solid var(--glass-border2);background:var(--glass2);font-size:11px;color:var(--charcoal4)}.ftab.on{background:var(--charcoal);color:#fff}
        .btn{height:34px;padding:0 14px;border-radius:var(--rm);border:none;font-size:11px;font-weight:700}.btn-purple{background:var(--purple);color:#fff}.btn-ghost{background:var(--glass2);border:1px solid var(--glass-border2)}.btn-danger{background:var(--red);color:#fff}
        .floor-grid{flex:1;overflow-y:auto;padding:12px;display:grid;grid-template-columns:repeat(auto-fill,minmax(158px,1fr));gap:10px}
        .tc{background:var(--glass);border:1px solid var(--glass-border);border-radius:var(--r);padding:12px;position:relative;display:flex;flex-direction:column;min-height:130px}
        .tc-stripe{position:absolute;top:0;left:0;right:0;height:3px}.tc.s-normal .tc-stripe{background:var(--purple)}.tc.s-half .tc-stripe{background:var(--amber)}.tc.s-warn .tc-stripe{background:#e07b00}.tc.s-over .tc-stripe{background:var(--red)}
        .tc.empty{border:1px dashed var(--line2);background:var(--glass2)}.tc.sel{outline:2px solid var(--purple-l)}
        .tc-id{font-size:9px;color:var(--charcoal4)}.tc-cast{font-size:10px;color:var(--charcoal4)}.tc-guest{font-size:15px;font-weight:700}.tc-pax{font-size:10px;color:var(--charcoal4)}
        .tc-elapsed{font-size:24px;font-weight:900;font-family:monospace;margin-top:auto}.c-normal{color:var(--purple)}.c-half{color:var(--amber)}.c-warn{color:#e07b00}.c-over{color:var(--red)}.tc-amount{font-size:11px}.empty-cta{margin:auto;color:var(--charcoal4)}
        .rp{width:280px;background:var(--glass);border-left:1px solid var(--glass-border);display:flex;flex-direction:column}
        .rp-head{padding:14px 16px;border-bottom:1px solid var(--line)}.rp-seat{font-size:20px;font-weight:900}.rp-info{font-size:11px;color:var(--charcoal4)}
        .rp-timer{margin-top:6px;display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;background:var(--purple-l);color:var(--purple)}
        .rp-body{flex:1;overflow-y:auto}.order-sec{padding:12px 16px;border-bottom:1px solid var(--line)}.order-hd{display:flex;justify-content:space-between;font-size:10px;color:var(--charcoal4);margin-bottom:6px}
        .o-item{display:flex;align-items:center;gap:6px;padding:7px 8px;background:var(--glass2);border:1px solid var(--glass-border2);border-radius:10px;margin-bottom:4px}
        .o-qty{display:flex;align-items:center;gap:3px}.qbtn{width:20px;height:20px;border:1px solid var(--line2);border-radius:5px;background:transparent}.qnum{width:16px;text-align:center;font-size:12px}
        .o-name{flex:1;font-size:11px}.o-price{font-size:11px;font-family:monospace}.o-del{width:18px;height:18px;border:none;border-radius:4px;background:rgba(224,62,62,.1);color:var(--red)}
        .add-btn{width:100%;height:32px;background:transparent;border:1px dashed var(--purple);border-radius:10px;color:var(--purple);font-size:11px}
        .bill-sec{padding:12px 16px}.bill-row{display:flex;justify-content:space-between;font-size:12px;color:var(--charcoal4);margin-bottom:5px}.bill-row.total{font-size:18px;color:var(--charcoal);font-weight:900;margin-top:8px;padding-top:8px;border-top:1px solid var(--line)}
        .disc-in{width:66px;height:24px;border:1px solid var(--line2);border-radius:5px;text-align:right;background:transparent}
        .rp-foot{padding:12px 16px;border-top:1px solid var(--line)}.btn-kai{width:100%;height:44px;border:none;border-radius:var(--r);background:var(--charcoal);color:#fff}
        .menu-panel{position:absolute;top:0;bottom:0;right:280px;width:240px;background:var(--glass);border-left:1px solid var(--glass-border2);display:none;flex-direction:column}
        .menu-panel.open{display:flex}.mp-head{padding:10px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between}.mp-cats{display:flex;gap:4px;padding:8px;border-bottom:1px solid var(--line);flex-wrap:wrap}
        .mcat{padding:3px 8px;border-radius:14px;border:1px solid var(--glass-border2);background:var(--glass2);font-size:10px}.mcat.on{background:var(--charcoal);color:#fff}.mp-list{overflow-y:auto;padding:8px}
        .mi{display:flex;align-items:center;gap:6px;padding:7px;border-radius:10px}.mi:hover{background:var(--purple-ll)}.mi-dot{width:5px;height:5px;border-radius:50%;background:var(--purple)}.mi-name{flex:1;font-size:11px}.mi-price{font-size:11px}.mi-add{width:20px;height:20px;border:none;border-radius:4px;background:var(--charcoal);color:#fff}
        .gc{background:var(--glass);border:1px solid var(--glass-border);border-radius:var(--r);padding:10px}.tbl{width:100%;border-collapse:collapse}.tbl th,.tbl td{padding:7px 8px;border-bottom:1px solid var(--line);font-size:12px;text-align:left}
        .cast-row{height:34px;border:1px solid var(--line2);background:var(--glass2);border-radius:8px;text-align:left;padding:0 10px}.cast-row.sel{background:var(--purple-l)}
        .card-lite{background:var(--glass2);border:1px solid var(--glass-border2);border-radius:10px;padding:10px}
        .cu-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px}.cu-card{background:var(--glass);border:1px solid var(--glass-border);border-radius:var(--r);padding:10px;text-align:left}
        .cu-name{font-size:14px;font-weight:700}.cu-kana{font-size:10px;color:var(--charcoal4)}.cu-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-top:8px}.cs-box{background:var(--glass2);border:1px solid var(--glass-border2);border-radius:6px;padding:5px;text-align:center}.cs-v{font-size:12px}.cs-l{font-size:9px;color:var(--charcoal4)}
        .cast-tabs{display:flex;gap:6px;margin-bottom:10px}.ctab{padding:6px 10px;border:1px solid var(--glass-border2);background:var(--glass2);border-radius:14px}.ctab.on{background:var(--charcoal);color:#fff}
        .cast-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px}.cc-card{background:var(--glass);border:1px solid var(--glass-border);border-radius:var(--r);padding:10px}.cc-name{font-size:14px;font-weight:700}.cc-role{font-size:11px;color:var(--charcoal4)}
        .period-btns{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-bottom:10px}.pbtn-rp{height:40px;border:1px solid var(--glass-border2);border-radius:10px;background:var(--glass2)}.pbtn-rp.on{background:var(--charcoal);color:#fff}
        .mm-wrap{display:grid;grid-template-columns:220px 1fr;gap:10px}.mm-cat-list,.mm-item-list{background:var(--glass);border:1px solid var(--glass-border);border-radius:var(--r);overflow:hidden}
        .mm-cat{width:100%;text-align:left;padding:8px 10px;border:none;border-bottom:1px solid var(--line);background:transparent;display:flex;justify-content:space-between}.mm-cat.sel{background:var(--purple-l)}
        .mm-row{display:flex;align-items:center;gap:8px;padding:8px 10px;border-bottom:1px solid var(--line)}
        .pin-screen{display:flex;flex-direction:column;justify-content:center;align-items:center;gap:10px;flex:1}.pin-title{font-size:18px;font-weight:900}.pin-hint{font-size:11px;color:var(--charcoal4)}
        .pin-input{width:160px;height:42px;border:1px solid var(--line2);border-radius:10px;text-align:center;font-size:24px;letter-spacing:.3em;background:var(--glass2)}
        .owner-sec{background:var(--glass);border:1px solid var(--glass-border);border-radius:var(--r);padding:12px}.owner-sec-title{font-size:13px;font-weight:700;margin-bottom:6px}
        .onX{background:var(--charcoal)!important;color:#fff!important}
        @media(max-width:900px){.rp{display:none}.menu-panel{right:0;width:100%}.mm-wrap{grid-template-columns:1fr}.period-btns{grid-template-columns:repeat(3,1fr)}}
      `}</style>
    </div>
  );
}
/* duplicated legacy content intentionally commented out
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  castsData as CASTS_INITIAL,
  customersData as CUSTOMERS_INITIAL,
  invoicesData as INVOICES_INITIAL,
  menuCategories as MENU_CATEGORIES,
  menuData as MENU_INITIAL,
} from "./lib/nightposData";

const SETTINGS = {
  storeName: "Room YOLO",
  setMin: 60,
  ownerPin: "1234",
  salaryPin: "5678",
};

const TABLES_INITIAL = [
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
      { n: "MAVAM", p: 10000, q: 1, sc: null },
      { n: "指名料", p: 1000, q: 1, sc: "さくら" },
    ],
  },
  { id: "C-1", type: "occ", casts: ["ゆな"], shimeis: [], guests: ["伊藤様"], num: 1, inTime: "23:10", elMin: 15, items: [{ n: "通常セット 60分", p: 3000, q: 1, sc: null }] },
  { id: "C-2", type: "empty", casts: [], shimeis: [], guests: [], num: 0, inTime: "", elMin: 0, items: [] },
  { id: "C-3", type: "empty", casts: [], shimeis: [], guests: [], num: 0, inTime: "", elMin: 0, items: [] },
  { id: "C-4", type: "empty", casts: [], shimeis: [], guests: [], num: 0, inTime: "", elMin: 0, items: [] },
];

const NAVS = [
  ["floor", "テーブル"],
  ["kintai", "勤怠"],
  ["customer", "顧客"],
  ["cast", "キャスト"],
  ["report", "レポート"],
  ["invoice", "会計伝票"],
  ["menu", "メニュー"],
  ["owner", "オーナー"],
  ["salary", "給与"],
];

const fmt = (min) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, "0")}`;
const calcTotal = (items) => items.reduce((sum, item) => sum + item.p * item.q, 0);
const fmtH = (min) => (min <= 0 ? "—" : `${Math.floor(min / 60)}時間${String(min % 60).padStart(2, "0")}分`);

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
  const [tables, setTables] = useState(TABLES_INITIAL);
  const [selectedTableId, setSelectedTableId] = useState("T-1");
  const [tableFilter, setTableFilter] = useState("all");
  const [discount, setDiscount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuCat, setMenuCat] = useState("all");
  const [syncLabel, setSyncLabel] = useState("ローカル表示");

  const [casts, setCasts] = useState(CASTS_INITIAL);
  const [selectedCastId, setSelectedCastId] = useState(CASTS_INITIAL[0].id);
  const [castTab, setCastTab] = useState("all");

  const [customers] = useState(CUSTOMERS_INITIAL);
  const [customerFilter, setCustomerFilter] = useState("all");
  const [selectedCustomerId, setSelectedCustomerId] = useState(CUSTOMERS_INITIAL[0].id);

  const [menus, setMenus] = useState(MENU_INITIAL);
  const [menuMgmtCat, setMenuMgmtCat] = useState(MENU_CATEGORIES[0].id);
  const [invoices] = useState(INVOICES_INITIAL);
  const [selectedInvoiceTx, setSelectedInvoiceTx] = useState(INVOICES_INITIAL[0].txno);

  const [ownerUnlocked, setOwnerUnlocked] = useState(false);
  const [ownerPin, setOwnerPin] = useState("");
  const [salaryUnlocked, setSalaryUnlocked] = useState(false);
  const [salaryPin, setSalaryPin] = useState("");
  const [reportPeriod, setReportPeriod] = useState("today");

  useEffect(() => {
    const tick = () => {
      const n = new Date();
      const d = ["日", "月", "火", "水", "木", "金", "土"];
      setClock(
        `${n.getFullYear()}/${String(n.getMonth() + 1).padStart(2, "0")}/${String(n.getDate()).padStart(2, "0")}（${d[n.getDay()]}） ${String(
          n.getHours(),
        ).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`,
      );
    };
    tick();
    const timer = setInterval(tick, 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const loadFloorTables = async () => {
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
    loadFloorTables();
  }, []);

  const selectedTable = useMemo(
    () => tables.find((t) => t.id === selectedTableId && t.type !== "empty") ?? null,
    [tables, selectedTableId],
  );
  const selectedCast = casts.find((c) => c.id === selectedCastId) ?? casts[0];
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) ?? customers[0];
  const selectedInvoice = invoices.find((i) => i.txno === selectedInvoiceTx) ?? invoices[0];

  const activeCasts = casts.filter((c) => c.statusEmp !== "除籍");
  const occupiedCount = tables.filter((t) => t.type !== "empty").length;

  const tableList = useMemo(() => {
    if (tableFilter === "occ") return tables.filter((t) => t.type !== "empty");
    if (tableFilter === "empty") return tables.filter((t) => t.type === "empty");
    return tables;
  }, [tables, tableFilter]);

  const castList = useMemo(() => {
    if (castTab === "all") return casts.filter((c) => c.statusEmp !== "除籍");
    if (castTab === "retired") return casts.filter((c) => c.statusEmp === "除籍");
    return casts.filter((c) => c.role === castTab && c.statusEmp !== "除籍");
  }, [castTab, casts]);

  const customerList = useMemo(() => {
    if (customerFilter === "vip") return customers.filter((c) => c.rank === "vip");
    if (customerFilter === "new") return customers.filter((c) => c.rank === "new");
    return customers;
  }, [customerFilter, customers]);

  const reportRows = useMemo(() => {
    return activeCasts
      .map((cast) => ({
        name: cast.name,
        sales: invoices.filter((inv) => inv.casts.includes(cast.name)).reduce((sum, inv) => sum + inv.total, 0),
      }))
      .sort((a, b) => b.sales - a.sales);
  }, [activeCasts, invoices]);

  const salaryRows = useMemo(
    () =>
      activeCasts.map((cast) => {
        const wage = Math.floor((Math.max(0, cast.elMin - cast.breakMin) / 60) * cast.wage);
        const drink = cast.drink * 400;
        const shimei = cast.shimei * 1000;
        const champ = Math.floor(cast.champ * 0.1);
        return { ...cast, wage, drink, shimei, champ, total: wage + drink + shimei + champ };
      }),
    [activeCasts],
  );

  const orderSubtotal = selectedTable ? calcTotal(selectedTable.items) : 0;
  const orderTotal = Math.max(0, orderSubtotal - Math.min(orderSubtotal, discount));

  const updateTable = (id, updater) => {
    setTables((prev) => prev.map((t) => (t.id === id ? updater(t) : t)));
  };

  const getSeatClass = (elMin) => (elMin >= SETTINGS.setMin ? "s-over" : elMin >= SETTINGS.setMin - 10 ? "s-warn" : elMin >= SETTINGS.setMin / 2 ? "s-half" : "s-normal");
  const getTimeClass = (elMin) => (elMin >= SETTINGS.setMin ? "c-over" : elMin >= SETTINGS.setMin - 10 ? "c-warn" : elMin >= SETTINGS.setMin / 2 ? "c-half" : "c-normal");

  const addMenuToOrder = (menu) => {
    if (!selectedTable) return;
    updateTable(selectedTable.id, (t) => {
      const items = [...t.items];
      const idx = items.findIndex((i) => i.n === menu.name && i.sc === null);
      if (idx >= 0) items[idx] = { ...items[idx], q: items[idx].q + 1 };
      else items.push({ n: menu.name, p: menu.price, q: 1, sc: null });
      return { ...t, items };
    });
  };

  const changeQty = (idx, delta) => {
    if (!selectedTable) return;
    updateTable(selectedTable.id, (t) => {
      const items = [...t.items];
      items[idx] = { ...items[idx], q: Math.max(1, items[idx].q + delta) };
      return { ...t, items };
    });
  };

  const deleteItem = (idx) => {
    if (!selectedTable) return;
    updateTable(selectedTable.id, (t) => ({ ...t, items: t.items.filter((_, i) => i !== idx) }));
  };

  const quickEnter = () => {
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
    setSelectedTableId(empty.id);
  };

  const updateCastStatus = (mode) => {
    if (!selectedCast) return;
    const now = new Date();
    const nowStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    setCasts((prev) =>
      prev.map((c) => {
        if (c.id !== selectedCast.id) return c;
        if (mode === "in") return { ...c, status: "in", clockIn: nowStr, clockOut: "" };
        if (mode === "out") return { ...c, status: "out", clockOut: nowStr };
        if (mode === "brk" && c.status === "in") return { ...c, status: "brk", breakMin: c.breakMin + 15 };
        if (mode === "brkEnd" && c.status === "brk") return { ...c, status: "in" };
        return c;
      }),
    );
  };

  const addMenuItem = () => {
    const nextId = Math.max(...menus.map((m) => m.id)) + 1;
    const catName = MENU_CATEGORIES.find((c) => c.id === menuMgmtCat)?.name ?? menuMgmtCat;
    setMenus((prev) => [...prev, { id: nextId, cat: menuMgmtCat, name: `${catName} 新メニュー`, price: 1000 }]);
  };

  return (
    <div className="app">
      <header className="hdr">
        <div className="logo-text">Night<span>POS</span></div>
        <div className="hdr-badge live"><span className="live-dot" />営業中</div>
        <div className="hdr-badge">稼働 {occupiedCount}/{tables.length}</div>
        <div className="hclock">{clock}</div>
      </header>

      <nav className="nav">
        {NAVS.map(([id, label]) => (
          <button key={id} className={`ntab ${page === id ? "on" : ""}`} onClick={() => setPage(id)}>
            {label}
          </button>
        ))}
      </nav>

      {page === "floor" && (
        <div className="page on">
          <div className="floor-wrap">
            <div className="floor-left">
              <div className="floor-toolbar">
                <div style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>フロアマップ</div>
                <div className="filter-tabs">
                  <button className={`ftab ${tableFilter === "all" ? "on" : ""}`} onClick={() => setTableFilter("all")}>全席</button>
                  <button className={`ftab ${tableFilter === "occ" ? "on" : ""}`} onClick={() => setTableFilter("occ")}>稼働中</button>
                  <button className={`ftab ${tableFilter === "empty" ? "on" : ""}`} onClick={() => setTableFilter("empty")}>空席</button>
                </div>
                <button className="btn btn-purple" onClick={quickEnter}>+ 入店</button>
              </div>

              <div className="floor-grid">
                <div className="legend-bar">
                  <span><i className="ldot" style={{ background: "var(--purple)" }} />通常</span>
                  <span><i className="ldot" style={{ background: "var(--amber)" }} />折返し</span>
                  <span><i className="ldot" style={{ background: "#e07b00" }} />残10分</span>
                  <span><i className="ldot" style={{ background: "var(--red)" }} />超過</span>
                </div>

                {tableList.map((t) => (
                  <div
                    key={t.id}
                    className={`tc ${t.type === "empty" ? "empty" : getSeatClass(t.elMin)} ${selectedTableId === t.id ? "sel" : ""}`}
                    onClick={() => (t.type === "empty" ? quickEnter() : setSelectedTableId(t.id))}
                  >
                    {t.type === "empty" ? (
                      <>
                        <div className="tc-id">{t.id}</div>
                        <div className="empty-cta">+ 入店</div>
                      </>
                    ) : (
                      <>
                        <div className="tc-stripe" />
                        <div className="tc-id">{t.id}</div>
                        <div className="tc-cast">{t.casts.join("・")}</div>
                        <div className="tc-guest">{t.guests.join("・")}</div>
                        <div className="tc-pax">{t.num}名</div>
                        <div className={`tc-elapsed ${getTimeClass(t.elMin)}`}>{fmt(t.elMin)}</div>
                        <div className="tc-amount">¥{calcTotal(t.items).toLocaleString()}</div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <aside className="rp">
              <div className="rp-head">
                <div className="rp-seat">{selectedTable ? selectedTable.id : "席を選択"}</div>
                <div className="rp-info">
                  {selectedTable
                    ? `担当: ${selectedTable.casts.join("・")} / ${selectedTable.guests.join("・")} ${selectedTable.num}名`
                    : "フロアマップから卓をタップ"}
                </div>
                {selectedTable && <div className={`rp-timer ${getSeatClass(selectedTable.elMin)}`}>経過 {fmt(selectedTable.elMin)}</div>}
              </div>
              <div className="rp-body">
                <div className="order-sec">
                  <div className="order-hd">
                    <span>注文内容</span>
                    <span>{selectedTable ? `${selectedTable.items.reduce((s, i) => s + i.q, 0)}品` : "0品"}</span>
                  </div>
                  {selectedTable?.items.map((item, idx) => (
                    <div key={`${item.n}-${idx}`} className="o-item">
                      <div className="o-qty">
                        <button className="qbtn" onClick={() => changeQty(idx, -1)}>−</button>
                        <div className="qnum">{item.q}</div>
                        <button className="qbtn" onClick={() => changeQty(idx, 1)}>＋</button>
                      </div>
                      <div className="o-name">{item.n}</div>
                      <div className="o-price">¥{(item.p * item.q).toLocaleString()}</div>
                      <button className="o-del" onClick={() => deleteItem(idx)}>×</button>
                    </div>
                  ))}
                  {!selectedTable && <div style={{ fontSize: 11, color: "var(--charcoal4)" }}>席を選択してください</div>}
                  <button className="add-btn" onClick={() => setMenuOpen((v) => !v)}>+ メニューから追加</button>
                </div>

                <div className="bill-sec">
                  <div className="bill-row"><span>小計</span><span>¥{orderSubtotal.toLocaleString()}</span></div>
                  <div className="bill-row">
                    <span>割引</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      − <input className="disc-in" type="number" min={0} value={discount} onChange={(e) => setDiscount(Number(e.target.value) || 0)} />円
                    </span>
                  </div>
                  <div className="bill-row total"><span>合計</span><span>¥{orderTotal.toLocaleString()}</span></div>
                </div>
              </div>
              <div className="rp-foot">
                <button className="btn-kai">会計</button>
                <div className="sub-acts">
                  <button className="sact">途中伝票</button>
                  <button className="sact">延長30分</button>
                  <button className="sact">席替え</button>
                </div>
              </div>
            </aside>

            <div className={`menu-panel ${menuOpen ? "open" : ""}`}>
              <div className="mp-head">
                <div className="mp-title">メニュー</div>
                <button className="mp-close" onClick={() => setMenuOpen(false)}>×</button>
              </div>
              <div className="mp-cats">
                <button className={`mcat ${menuCat === "all" ? "on" : ""}`} onClick={() => setMenuCat("all")}>全て</button>
                {MENU_CATEGORIES.map((c) => (
                  <button key={c.id} className={`mcat ${menuCat === c.id ? "on" : ""}`} onClick={() => setMenuCat(c.id)}>
                    {c.name}
                  </button>
                ))}
              </div>
              <div className="mp-list">
                {menus
                  .filter((m) => menuCat === "all" || m.cat === menuCat)
                  .map((m) => (
                    <div key={m.id} className="mi" onClick={() => addMenuToOrder(m)}>
                      <span className="mi-dot" />
                      <span className="mi-name">{m.name}</span>
                      <span className="mi-price">¥{m.price.toLocaleString()}</span>
                      <button className="mi-add">+</button>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {page === "kintai" && (
        <div className="page on">
          <div className="kintai-wrap">
            <div className="kl">
              <div className="kl-hd">あいうえお順</div>
              <div className="kl-scroll">
                {activeCasts.map((c) => (
                  <button key={c.id} className={`kl-row ${selectedCastId === c.id ? "sel" : ""}`} onClick={() => setSelectedCastId(c.id)}>
                    <div className="kl-av">{c.name[0]}</div>
                    <div>
                      <div className="kl-name">{c.name}</div>
                      <div className={`kl-st ${c.status === "in" ? "st-in" : c.status === "brk" ? "st-brk" : "st-out"}`}>
                        {c.status === "in" ? "出勤中" : c.status === "brk" ? "休憩中" : "未出勤"}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="k-detail">
              <div className="kd-card">
                <div className="kd-top">
                  <div className="kd-av">{selectedCast.name[0]}</div>
                  <div>
                    <div className="kd-name">{selectedCast.name}</div>
                    <div className="kd-role">{selectedCast.role}</div>
                  </div>
                </div>
                <div className="punch-grid">
                  <button className="pbtn pb-in" onClick={() => updateCastStatus("in")}>出勤打刻</button>
                  <button className="pbtn pb-brk" onClick={() => updateCastStatus(selectedCast.status === "brk" ? "brkEnd" : "brk")}>
                    {selectedCast.status === "brk" ? "休憩終了" : "休憩開始"}
                  </button>
                  <button className="pbtn pb-out" onClick={() => updateCastStatus("out")}>退勤打刻</button>
                </div>
                <div className="time-grid">
                  <div className="t-box"><div className="t-lbl">出勤</div><div className="t-val">{selectedCast.clockIn || "—"}</div></div>
                  <div className="t-box"><div className="t-lbl">退勤</div><div className="t-val">{selectedCast.clockOut || "—"}</div></div>
                  <div className="t-box"><div className="t-lbl">勤務時間</div><div className="t-val">{fmtH(selectedCast.elMin)}</div></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {page === "customer" && (
        <div className="pscroll on">
          <div className="sec-hd">
            <div style={{ fontSize: 14, fontWeight: 700 }}>顧客管理</div>
            <div style={{ display: "flex", gap: 6 }}>
              <button className={`btn btn-ghost ${customerFilter === "all" ? "onX" : ""}`} onClick={() => setCustomerFilter("all")}>全顧客</button>
              <button className={`btn btn-ghost ${customerFilter === "vip" ? "onX" : ""}`} onClick={() => setCustomerFilter("vip")}>VIP</button>
              <button className={`btn btn-ghost ${customerFilter === "new" ? "onX" : ""}`} onClick={() => setCustomerFilter("new")}>新規</button>
            </div>
          </div>
          <div className="cu-grid">
            {customerList.map((c) => (
              <button key={c.id} className="cu-card" onClick={() => setSelectedCustomerId(c.id)}>
                <div className="cu-top">
                  <div className="cu-av">{c.name[0]}</div>
                  <div>
                    <div className="cu-name">{c.name}</div>
                    <div className="cu-kana">{c.kana}</div>
                  </div>
                </div>
                <div className="cu-stats">
                  <div className="cs-box"><div className="cs-v">{c.visit}</div><div className="cs-l">来店</div></div>
                  <div className="cs-box"><div className="cs-v">¥{Math.round(c.total / 10000)}万</div><div className="cs-l">累計</div></div>
                  <div className="cs-box"><div className="cs-v">{c.rank}</div><div className="cs-l">ランク</div></div>
                </div>
              </button>
            ))}
          </div>
          <div className="gc" style={{ marginTop: 10, padding: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>選択顧客: {selectedCustomer.name}</div>
            <div style={{ fontSize: 12, color: "var(--charcoal4)", marginTop: 5 }}>担当: {selectedCustomer.cast} / 電話: {selectedCustomer.tel}</div>
          </div>
        </div>
      )}

      {page === "cast" && (
        <div className="pscroll on">
          <div className="cast-tabs">
            <button className={`ctab ${castTab === "all" ? "on" : ""}`} onClick={() => setCastTab("all")}>在籍</button>
            <button className={`ctab ${castTab === "キャスト" ? "on" : ""}`} onClick={() => setCastTab("キャスト")}>キャスト</button>
            <button className={`ctab ${castTab === "ボーイ" ? "on" : ""}`} onClick={() => setCastTab("ボーイ")}>ボーイ</button>
            <button className={`ctab ${castTab === "retired" ? "on" : ""}`} onClick={() => setCastTab("retired")}>除籍</button>
          </div>
          <div className="cast-grid">
            {castList.map((c) => (
              <div key={c.id} className="cc-card">
                <div className="cc-top">
                  <div className="cc-av">{c.name[0]}</div>
                  <div>
                    <div className="cc-name">{c.name}</div>
                    <div className="cc-role">{c.role}</div>
                    <span className={`tag ${c.statusEmp === "除籍" ? "tag-red" : "tag-green"}`}>{c.statusEmp}</span>
                  </div>
                </div>
                <div className="cc-meta">
                  <span>時給: ¥{c.wage.toLocaleString()}</span>
                  <span>勤務: {fmtH(c.elMin)}</span>
                  <span>ドリンク: {c.drink}</span>
                  <span>指名: {c.shimei}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {page === "report" && (
        <div className="pscroll on">
          <div className="period-btns">
            {["today", "week", "month", "custom", "year"].map((p) => (
              <button key={p} className={`pbtn-rp ${reportPeriod === p ? "on" : ""}`} onClick={() => setReportPeriod(p)}>
                {p === "today" ? "今日" : p === "week" ? "今週" : p === "month" ? "今月" : p === "custom" ? "指定" : "年間"}
              </button>
            ))}
          </div>
          <div className="rp-kpi">
            <div className="kpi-card"><div className="kpi-lbl">売上合計</div><div className="kpi-val">¥{invoices.reduce((s, i) => s + i.total, 0).toLocaleString()}</div></div>
            <div className="kpi-card"><div className="kpi-lbl">会計件数</div><div className="kpi-val">{invoices.length}</div></div>
            <div className="kpi-card"><div className="kpi-lbl">客単価</div><div className="kpi-val">¥{Math.floor(invoices.reduce((s, i) => s + i.total, 0) / Math.max(invoices.length, 1)).toLocaleString()}</div></div>
          </div>
          <div className="gc" style={{ padding: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".07em", color: "var(--charcoal4)", marginBottom: 10 }}>キャスト売上</div>
            <table className="tbl">
              <thead><tr><th>順位</th><th>キャスト</th><th>売上</th></tr></thead>
              <tbody>{reportRows.map((r, idx) => <tr key={r.name}><td>{idx + 1}</td><td>{r.name}</td><td>¥{r.sales.toLocaleString()}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
      )}

      {page === "invoice" && (
        <div className="pscroll on">
          <div className="gc" style={{ padding: 14 }}>
            <table className="tbl">
              <thead>
                <tr><th>取引No.</th><th>日付</th><th>時刻</th><th>席</th><th>顧客</th><th>担当</th><th>合計</th><th>支払</th></tr>
              </thead>
              <tbody>
                {invoices.map((v) => (
                  <tr key={v.txno} onClick={() => setSelectedInvoiceTx(v.txno)} style={{ cursor: "pointer", background: selectedInvoiceTx === v.txno ? "var(--purple-ll)" : "transparent" }}>
                    <td>{v.txno}</td><td>{v.date}</td><td>{v.time}</td><td>{v.tableId}</td><td>{v.guests.join("・")}</td><td>{v.casts.join("・")}</td><td>¥{v.total.toLocaleString()}</td><td>{v.method}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="gc" style={{ marginTop: 10, padding: 14 }}>
            <div style={{ fontWeight: 700 }}>{selectedInvoice.txno}</div>
            <div style={{ fontSize: 12, color: "var(--charcoal4)", marginTop: 4 }}>{selectedInvoice.date} {selectedInvoice.time} / {selectedInvoice.tableId}</div>
          </div>
        </div>
      )}

      {page === "menu" && (
        <div className="pscroll on">
          <div className="sec-hd">
            <div style={{ fontSize: 14, fontWeight: 700 }}>メニュー管理</div>
            <button className="btn btn-purple" onClick={addMenuItem}>+ 商品追加</button>
          </div>
          <div className="mm-wrap">
            <div className="mm-cat-list">
              <div className="mm-hd">カテゴリ</div>
              {MENU_CATEGORIES.map((c) => (
                <button key={c.id} className={`mm-cat ${menuMgmtCat === c.id ? "sel" : ""}`} onClick={() => setMenuMgmtCat(c.id)}>
                  <span>{c.name}</span><span>{menus.filter((m) => m.cat === c.id).length}</span>
                </button>
              ))}
            </div>
            <div className="mm-item-list">
              <div className="mm-hd">{MENU_CATEGORIES.find((c) => c.id === menuMgmtCat)?.name}</div>
              {menus.filter((m) => m.cat === menuMgmtCat).map((m) => (
                <div key={m.id} className="mm-row">
                  <div style={{ flex: 1 }}>{m.name}</div>
                  <div style={{ minWidth: 90, textAlign: "right", fontWeight: 700 }}>¥{m.price.toLocaleString()}</div>
                  <button className="btn btn-danger" style={{ height: 28 }} onClick={() => setMenus((prev) => prev.filter((x) => x.id !== m.id))}>削除</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {page === "owner" && (
        <div className="page on">
          {!ownerUnlocked ? (
            <div className="pin-screen">
              <div className="pin-title">オーナー管理</div>
              <div className="pin-hint">PIN（初期値: 1234）</div>
              <input className="pin-input" type="password" maxLength={4} value={ownerPin} onChange={(e) => setOwnerPin(e.target.value.replace(/\D/g, ""))} />
              <button className="btn btn-purple" onClick={() => { if (ownerPin === SETTINGS.ownerPin) setOwnerUnlocked(true); setOwnerPin(""); }}>解除</button>
            </div>
          ) : (
            <div className="pscroll on">
              <div className="owner-sec">
                <div className="owner-sec-title">売上・利益</div>
                <div className="owner-kpi">
                  <div className="profit-card"><div className="pc-lbl">売上合計</div><div className="pc-val">¥{invoices.reduce((s, i) => s + i.total, 0).toLocaleString()}</div></div>
                  <div className="profit-card"><div className="pc-lbl">給与支払</div><div className="pc-val">¥{salaryRows.reduce((s, i) => s + i.total, 0).toLocaleString()}</div></div>
                </div>
              </div>
              <button className="btn btn-ghost" onClick={() => setOwnerUnlocked(false)}>ロック</button>
            </div>
          )}
        </div>
      )}

      {page === "salary" && (
        <div className="page on">
          {!salaryUnlocked ? (
            <div className="pin-screen">
              <div className="pin-title">給与計算</div>
              <div className="pin-hint">PIN（初期値: 5678）</div>
              <input className="pin-input" type="password" maxLength={4} value={salaryPin} onChange={(e) => setSalaryPin(e.target.value.replace(/\D/g, ""))} />
              <button className="btn btn-purple" onClick={() => { if (salaryPin === SETTINGS.salaryPin) setSalaryUnlocked(true); setSalaryPin(""); }}>解除</button>
            </div>
          ) : (
            <div className="pscroll on">
              <div className="gc" style={{ padding: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>スタッフ別給与明細</div>
                <table className="tbl">
                  <thead><tr><th>氏名</th><th>勤務</th><th>時給分</th><th>DK</th><th>指名</th><th>シャンパン</th><th>合計</th></tr></thead>
                  <tbody>
                    {salaryRows.map((r) => (
                      <tr key={r.id}>
                        <td>{r.name}</td><td>{fmtH(r.elMin)}</td><td>¥{r.wage.toLocaleString()}</td><td>¥{r.drink.toLocaleString()}</td><td>¥{r.shimei.toLocaleString()}</td><td>¥{r.champ.toLocaleString()}</td><td>¥{r.total.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button className="btn btn-ghost" onClick={() => setSalaryUnlocked(false)}>ロック</button>
            </div>
          )}
        </div>
      )}

      <style jsx global>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
        :root{--white:#fff;--off:#f8f8fb;--paper:#f2f2f6;--charcoal:#1e1e28;--charcoal2:#2c2c3a;--charcoal3:#484860;--charcoal4:#7878a0;--purple:#6b4eff;--purple2:#8b72ff;--purple-l:rgba(107,78,255,.12);--purple-ll:rgba(107,78,255,.06);--glass:rgba(255,255,255,.72);--glass2:rgba(255,255,255,.52);--glass-border:rgba(255,255,255,.9);--glass-border2:rgba(255,255,255,.5);--glass-shadow:0 8px 32px rgba(60,60,100,.1),0 1.5px 0 rgba(255,255,255,.85) inset;--green:#16a366;--green-l:rgba(22,163,102,.1);--red:#e03e3e;--red-l:rgba(224,62,62,.1);--amber:#c47a00;--amber-l:rgba(196,122,0,.1);--line:rgba(100,100,140,.1);--line2:rgba(100,100,140,.16);--r:16px;--rm:10px;--rs:6px}
        html,body{height:100%;overflow:hidden;background:var(--paper);color:var(--charcoal);font-family:'Noto Sans JP',sans-serif;font-size:14px}
        body::before{content:'';position:fixed;inset:0;background:linear-gradient(135deg,#eeeef8 0%,#f6f6ff 35%,#ece8ff 65%,#f4f4fa 100%);z-index:-2}
        body::after{content:'';position:fixed;inset:0;background:radial-gradient(ellipse 800px 500px at 20% 20%,rgba(180,170,255,.18) 0%,transparent 60%),radial-gradient(ellipse 600px 600px at 80% 80%,rgba(107,78,255,.1) 0%,transparent 60%);z-index:-1}
        .app{height:100vh;display:flex;flex-direction:column}
        .hdr{height:56px;background:var(--glass);backdrop-filter:blur(24px) saturate(180%);border-bottom:1px solid var(--glass-border);display:flex;align-items:center;padding:0 20px;gap:12px;flex-shrink:0}
        .logo-text{font-size:16px;font-weight:900;flex:1}.logo-text span{color:var(--purple)}
        .hdr-badge{padding:4px 12px;border-radius:20px;font-size:10px;font-weight:600;background:var(--glass2);border:1px solid var(--glass-border2);color:var(--charcoal3)}
        .hdr-badge.live{color:var(--green);border-color:rgba(22,163,102,.25);background:rgba(22,163,102,.08)}
        .live-dot{display:inline-block;width:5px;height:5px;border-radius:50%;background:var(--green);margin-right:4px;vertical-align:middle}
        .hclock{font-family:monospace;font-size:10px;color:var(--charcoal4);text-align:right;line-height:1.6}
        .nav{display:flex;background:var(--glass);backdrop-filter:blur(20px) saturate(160%);border-bottom:1px solid var(--line);overflow-x:auto}
        .ntab{padding:0 16px;height:40px;display:flex;align-items:center;font-size:11px;font-weight:600;color:var(--charcoal4);border:none;background:transparent;border-bottom:2px solid transparent;cursor:pointer;white-space:nowrap}
        .ntab.on{color:var(--purple);border-bottom-color:var(--purple)}
        .page{display:flex;flex:1;overflow:hidden;flex-direction:column}.page.on{display:flex}
        .pscroll{display:block;flex:1;overflow-y:auto;padding:16px}
        .floor-wrap{flex:1;display:flex;overflow:hidden}.floor-left{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0}
        .floor-toolbar{padding:10px 14px;display:flex;align-items:center;gap:8px;background:var(--glass);border-bottom:1px solid var(--line);backdrop-filter:blur(16px)}
        .filter-tabs{display:flex;gap:4px}.ftab{padding:5px 12px;border-radius:20px;font-size:11px;font-weight:600;border:1px solid var(--glass-border2);background:var(--glass2);color:var(--charcoal4);cursor:pointer}.ftab.on{background:var(--charcoal);border-color:var(--charcoal);color:#fff}
        .btn{height:36px;padding:0 16px;border-radius:var(--rm);font-size:11px;font-weight:700;border:none;cursor:pointer}
        .btn-purple{background:var(--purple);color:#fff}.btn-ghost{background:var(--glass2);color:var(--charcoal);border:1px solid var(--glass-border2)}.btn-danger{background:var(--red);color:#fff}
        .floor-grid{flex:1;overflow-y:auto;padding:12px;display:grid;grid-template-columns:repeat(auto-fill,minmax(158px,1fr));gap:10px;align-content:start}
        .legend-bar{display:flex;gap:12px;padding:0 0 10px;font-size:10px;color:var(--charcoal4);flex-wrap:wrap;grid-column:1/-1}.legend-bar span{display:flex;align-items:center;gap:4px}
        .ldot{width:6px;height:6px;border-radius:2px}
        .tc{background:var(--glass);backdrop-filter:blur(20px) saturate(160%);border:1px solid var(--glass-border);border-radius:var(--r);padding:12px;cursor:pointer;position:relative;display:flex;flex-direction:column;gap:3px;box-shadow:var(--glass-shadow);min-height:132px}
        .tc.sel{border-color:var(--purple)}.tc-stripe{position:absolute;top:0;left:0;right:0;height:3px;border-radius:var(--r) var(--r) 0 0}
        .tc.s-normal .tc-stripe{background:var(--purple)}.tc.s-half .tc-stripe{background:var(--amber)}.tc.s-warn .tc-stripe{background:#e07b00}.tc.s-over .tc-stripe{background:var(--red)}
        .tc.s-half{border-color:rgba(196,122,0,.25);background:rgba(255,250,240,.8)}.tc.s-warn{border-color:rgba(224,123,0,.25);background:rgba(255,247,238,.8)}.tc.s-over{border-color:rgba(224,62,62,.25);background:rgba(255,244,244,.8)}
        .tc.empty{background:var(--glass2);border:1px dashed var(--line2);box-shadow:none;opacity:.7}
        .tc-id{font-size:9px;font-weight:700;color:var(--charcoal4);letter-spacing:.1em}.tc-cast{font-size:10px;color:var(--charcoal4)}.tc-guest{font-size:15px;font-weight:700}.tc-pax{font-size:10px;color:var(--charcoal4)}
        .tc-elapsed{font-size:24px;font-weight:900;font-family:monospace;margin-top:auto}.c-normal{color:var(--purple)}.c-half{color:var(--amber)}.c-warn{color:#e07b00}.c-over{color:var(--red)}
        .tc-amount{font-size:11px;font-weight:600;color:var(--charcoal3)}.empty-cta{flex:1;display:flex;align-items:center;justify-content:center;font-size:12px;color:var(--charcoal4)}
        .rp{width:284px;flex-shrink:0;background:var(--glass);backdrop-filter:blur(24px) saturate(180%);border-left:1px solid var(--glass-border);display:flex;flex-direction:column}
        .rp-head{padding:14px 16px;border-bottom:1px solid var(--line)}.rp-seat{font-size:20px;font-weight:900}.rp-info{font-size:11px;color:var(--charcoal4);margin-top:3px;line-height:1.7}
        .rp-timer{display:inline-flex;margin-top:6px;font-family:monospace;font-size:11px;padding:3px 10px;border-radius:20px;background:var(--purple-l);color:var(--purple);border:1px solid rgba(107,78,255,.2)}.rp-timer.s-half{background:var(--amber-l);color:var(--amber)}.rp-timer.s-warn{background:rgba(224,123,0,.1);color:#e07b00}.rp-timer.s-over{background:var(--red-l);color:var(--red)}
        .rp-body{flex:1;overflow-y:auto}.order-sec{padding:12px 16px;border-bottom:1px solid var(--line)}.order-hd{font-size:10px;font-weight:700;color:var(--charcoal4);letter-spacing:.08em;margin-bottom:9px;display:flex;justify-content:space-between}
        .o-item{display:flex;align-items:center;gap:7px;padding:7px 9px;background:var(--glass2);border-radius:var(--rm);margin-bottom:5px;border:1px solid var(--glass-border2)}.o-qty{display:flex;align-items:center;gap:4px}
        .qbtn{width:20px;height:20px;border:1px solid var(--line2);border-radius:5px;background:var(--glass);cursor:pointer}.qnum{width:16px;text-align:center;font-size:12px;font-weight:700;font-family:monospace}
        .o-name{flex:1;font-size:11px}.o-price{font-size:11px;font-weight:700;font-family:monospace}.o-del{width:18px;height:18px;border:none;border-radius:4px;background:var(--red-l);color:var(--red)}
        .add-btn{width:100%;height:34px;background:transparent;border:1px dashed var(--purple2);border-radius:var(--rm);font-size:11px;font-weight:600;color:var(--purple);cursor:pointer}
        .bill-sec{padding:12px 16px;border-bottom:1px solid var(--line)}.bill-row{display:flex;justify-content:space-between;align-items:center;font-size:12px;color:var(--charcoal4);margin-bottom:5px}
        .bill-row.total{font-size:18px;font-weight:900;color:var(--charcoal);margin-top:10px;padding-top:10px;border-top:1px solid var(--line)}.bill-row.total span:last-child{color:var(--purple);font-family:monospace}
        .disc-in{width:66px;height:26px;border:1px solid var(--line2);border-radius:5px;text-align:right;font-size:11px;padding:0 6px;font-family:monospace;background:var(--glass2)}
        .rp-foot{padding:12px 16px;border-top:1px solid var(--line)}.btn-kai{width:100%;height:46px;background:var(--charcoal);color:#fff;border:none;border-radius:var(--r);font-size:14px;font-weight:700;margin-bottom:8px}
        .sub-acts{display:flex;gap:5px}.sact{flex:1;height:30px;background:var(--glass2);border:1px solid var(--glass-border2);border-radius:var(--rs);font-size:10px;color:var(--charcoal3)}
        .menu-panel{position:absolute;top:0;bottom:0;right:284px;width:240px;background:var(--glass);backdrop-filter:blur(28px) saturate(200%);border-left:1px solid var(--glass-border2);border-right:1px solid var(--glass-border2);display:none;flex-direction:column;z-index:20}
        .menu-panel.open{display:flex}.mp-head{padding:11px 12px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between}.mp-title{font-size:12px;font-weight:700}.mp-close{width:24px;height:24px;border:1px solid var(--line2);border-radius:6px;background:var(--glass2)}
        .mp-cats{display:flex;gap:4px;padding:8px 10px;border-bottom:1px solid var(--line);flex-wrap:wrap}.mcat{padding:3px 9px;border-radius:14px;border:1px solid var(--glass-border2);background:var(--glass2);font-size:10px;color:var(--charcoal4)}.mcat.on{background:var(--charcoal);border-color:var(--charcoal);color:#fff}
        .mp-list{flex:1;overflow-y:auto;padding:6px 10px}.mi{display:flex;align-items:center;gap:7px;padding:8px 9px;border-radius:var(--rm);margin-bottom:3px;cursor:pointer}.mi:hover{background:var(--purple-ll)}
        .mi-dot{width:5px;height:5px;border-radius:50%;background:var(--purple)}.mi-name{flex:1;font-size:11px}.mi-price{font-size:11px;font-weight:700;font-family:monospace}.mi-add{width:22px;height:22px;background:var(--charcoal);color:#fff;border:none;border-radius:5px}
        .kintai-wrap{flex:1;display:flex;overflow:hidden}.kl{width:188px;flex-shrink:0;background:var(--glass);border-right:1px solid var(--line);display:flex;flex-direction:column}
        .kl-hd{padding:9px 13px;border-bottom:1px solid var(--line);font-size:9px;font-weight:700;color:var(--charcoal4)}.kl-scroll{flex:1;overflow-y:auto}
        .kl-row{display:flex;align-items:center;gap:8px;padding:10px 13px;border:none;border-bottom:1px solid var(--line);background:transparent;cursor:pointer;text-align:left}.kl-row.sel{background:var(--purple-l)}
        .kl-av{width:30px;height:30px;border-radius:50%;background:var(--glass2);border:1px solid var(--glass-border2);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700}.kl-row.sel .kl-av{background:var(--purple);color:#fff}
        .kl-name{font-size:12px;font-weight:700}.kl-st{font-size:9px}.st-in{color:var(--green)}.st-brk{color:var(--amber)}.st-out{color:var(--charcoal4)}
        .k-detail{flex:1;overflow-y:auto;padding:16px}.kd-card{background:var(--glass);border:1px solid var(--glass-border);border-radius:var(--r);padding:16px;box-shadow:var(--glass-shadow)}
        .kd-top{display:flex;align-items:center;gap:12px;margin-bottom:14px}.kd-av{width:46px;height:46px;border-radius:50%;background:var(--charcoal);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900}
        .kd-name{font-size:18px;font-weight:900}.kd-role{font-size:11px;color:var(--charcoal4)}
        .punch-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px}.pbtn{height:56px;border-radius:var(--rm);font-size:11px;font-weight:700;border:1px solid}
        .pb-in{background:var(--green-l);color:var(--green);border-color:rgba(22,163,102,.25)}.pb-out{background:var(--red-l);color:var(--red);border-color:rgba(224,62,62,.25)}.pb-brk{background:var(--amber-l);color:var(--amber);border-color:rgba(196,122,0,.25)}
        .time-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.t-box{background:var(--glass2);border:1px solid var(--glass-border2);border-radius:var(--rm);padding:9px;text-align:center}.t-lbl{font-size:9px;color:var(--charcoal4)}.t-val{font-size:13px;font-weight:700;font-family:monospace}
        .sec-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
        .cu-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(238px,1fr));gap:10px}.cu-card{background:var(--glass);border:1px solid var(--glass-border);border-radius:var(--r);padding:14px;text-align:left}.cu-top{display:flex;align-items:center;gap:10px;margin-bottom:9px}
        .cu-av{width:40px;height:40px;border-radius:50%;background:var(--charcoal);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900}.cu-name{font-size:14px;font-weight:700}.cu-kana{font-size:10px;color:var(--charcoal4)}
        .cu-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:5px}.cs-box{background:var(--glass2);border:1px solid var(--glass-border2);border-radius:var(--rs);padding:6px;text-align:center}.cs-v{font-size:13px;font-weight:700;font-family:monospace}.cs-l{font-size:9px;color:var(--charcoal4)}
        .cast-tabs{display:flex;gap:5px;margin-bottom:14px;flex-wrap:wrap}.ctab{padding:6px 14px;border-radius:20px;border:1px solid var(--glass-border2);background:var(--glass2);color:var(--charcoal4);font-size:11px;font-weight:600;cursor:pointer}.ctab.on{background:var(--charcoal);border-color:var(--charcoal);color:#fff}
        .cast-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px}.cc-card{background:var(--glass);border:1px solid var(--glass-border);border-radius:var(--r);padding:14px;box-shadow:var(--glass-shadow)}
        .cc-top{display:flex;align-items:center;gap:10px;margin-bottom:11px}.cc-av{width:38px;height:38px;border-radius:50%;background:var(--charcoal);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900}
        .cc-name{font-size:14px;font-weight:700}.cc-role{font-size:10px;color:var(--charcoal4)}.cc-meta{display:grid;grid-template-columns:1fr 1fr;gap:3px;font-size:10px;color:var(--charcoal4)}
        .tag{display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600}.tag-green{background:var(--green-l);color:var(--green)}.tag-red{background:var(--red-l);color:var(--red)}
        .period-btns{display:grid;grid-template-columns:repeat(5,1fr);gap:7px;margin-bottom:14px}.pbtn-rp{height:48px;border-radius:var(--rm);background:var(--glass);border:1px solid var(--glass-border2);font-size:11px;font-weight:700;color:var(--charcoal4)}.pbtn-rp.on{background:var(--charcoal);border-color:var(--charcoal);color:#fff}
        .rp-kpi{display:grid;grid-template-columns:repeat(auto-fill,minmax(148px,1fr));gap:9px;margin-bottom:14px}.kpi-card{background:var(--glass);border:1px solid var(--glass-border);border-radius:var(--r);padding:14px;box-shadow:var(--glass-shadow)}
        .kpi-lbl{font-size:10px;color:var(--charcoal4)}.kpi-val{font-size:20px;font-weight:900;font-family:monospace}
        .gc{background:var(--glass);border:1px solid var(--glass-border);border-radius:var(--r);box-shadow:var(--glass-shadow)}
        .tbl{width:100%;border-collapse:collapse;font-size:12px}.tbl th{color:var(--charcoal4);font-weight:700;padding:7px 9px;text-align:left;font-size:9px;border-bottom:1px solid var(--line)}.tbl td{padding:8px 9px;border-bottom:1px solid var(--line)}
        .mm-wrap{display:grid;grid-template-columns:196px 1fr;gap:11px}.mm-cat-list,.mm-item-list{background:var(--glass);border:1px solid var(--glass-border);border-radius:var(--r);box-shadow:var(--glass-shadow);overflow:hidden}
        .mm-hd{padding:9px 12px;border-bottom:1px solid var(--line);font-size:10px;font-weight:700;color:var(--charcoal4)}
        .mm-cat{width:100%;border:none;background:transparent;padding:9px 12px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;text-align:left}.mm-cat.sel{background:var(--purple-l);color:var(--purple);font-weight:700}
        .mm-row{display:flex;align-items:center;gap:8px;padding:9px 12px;border-bottom:1px solid var(--line)}
        .pin-screen{display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;gap:10px}
        .pin-title{font-size:18px;font-weight:900}.pin-hint{font-size:11px;color:var(--charcoal4)}
        .pin-input{width:160px;height:44px;border:1px solid var(--line2);border-radius:var(--rm);text-align:center;font-size:24px;letter-spacing:.3em;background:var(--glass2)}
        .owner-sec{background:var(--glass);border:1px solid var(--glass-border);border-radius:var(--r);padding:14px;margin-bottom:10px}.owner-sec-title{font-size:13px;font-weight:700;margin-bottom:8px}
        .owner-kpi{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px}.profit-card{background:var(--glass2);border:1px solid var(--glass-border2);border-radius:10px;padding:10px}
        .pc-lbl{font-size:10px;color:var(--charcoal4)}.pc-val{font-size:18px;font-weight:900;font-family:monospace}
        .onX{background:var(--charcoal)!important;color:#fff!important;border-color:var(--charcoal)!important}
        @media(max-width:900px){.rp{display:none}.menu-panel{right:0;width:100%}.kintai-wrap{flex-direction:column}.kl{width:100%}.mm-wrap{grid-template-columns:1fr}.period-btns{grid-template-columns:repeat(3,1fr)}}
      `}</style>
    </div>
  );
}
*/
/*
import Link from "next/link";

const screens = [
  { href: "/kintai", label: "1. 勤怠管理画面" },
  { href: "/customer", label: "2. 顧客管理画面" },
  { href: "/cast", label: "3. キャスト管理画面" },
  { href: "/report", label: "4. レポート画面" },
  { href: "/menu-mgmt", label: "5. メニュー管理画面" },
  { href: "/owner", label: "6. オーナー管理画面（PIN認証）" },
  { href: "/salary", label: "7. 給与計算画面（別PIN）" },
  { href: "/invoice", label: "8. 会計伝票管理画面" },
];

export default function Home() {
  return (
    <main className="screen-index">
      <h1>NightPOS v4 画面一覧</h1>
      <p>以下のリンクから各画面を開けます。</p>
      <div className="index-grid">
        {screens.map((item) => (
          <Link key={item.href} href={item.href} className="index-card">
            {item.label}
          </Link>
        ))}
      </div>
    </main>
  );
}
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
*/
