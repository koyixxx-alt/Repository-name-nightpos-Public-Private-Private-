"use client";

import { useMemo, useState } from "react";
import NightposShell from "../components/NightposShell";
import { menuCategories, menuData } from "../lib/nightposData";

export default function MenuMgmtPage() {
  const [activeCat, setActiveCat] = useState(menuCategories[0].id);
  const [menus, setMenus] = useState(menuData);

  const list = useMemo(() => menus.filter((m) => m.cat === activeCat), [menus, activeCat]);

  const addMenu = () => {
    const nextId = Math.max(...menus.map((m) => m.id)) + 1;
    const catName = menuCategories.find((c) => c.id === activeCat)?.name ?? activeCat;
    setMenus((prev) => [...prev, { id: nextId, cat: activeCat, name: `${catName} 新メニュー`, price: 1000 }]);
  };

  return (
    <NightposShell activePath="/menu-mgmt" title="メニュー管理" subtitle="v4 準拠のカテゴリ別メニュー編集">
      <div className="sec-hd">
        <button className="btn btn-dk" onClick={addMenu}>＋ メニュー追加</button>
      </div>
      <div className="mm-wrap">
        <div className="mm-cats">
          <div className="mm-cat-hd">カテゴリ</div>
          {menuCategories.map((cat) => (
            <button key={cat.id} className={`mm-cat-item ${activeCat === cat.id ? "sel" : ""}`} onClick={() => setActiveCat(cat.id)}>
              <span>{cat.name}</span>
              <span>{menus.filter((m) => m.cat === cat.id).length}</span>
            </button>
          ))}
        </div>
        <div className="mm-items">
          <div className="mm-items-hd">{menuCategories.find((c) => c.id === activeCat)?.name} 一覧</div>
          {list.map((item) => (
            <div key={item.id} className="mm-item-row">
              <div className="mm-item-nm">{item.name}</div>
              <div className="mm-item-pr">¥{item.price.toLocaleString()}</div>
              <div className="mm-item-acts">
                <button className="btn btn-ol">編集</button>
                <button className="btn btn-rd" onClick={() => setMenus((prev) => prev.filter((m) => m.id !== item.id))}>削除</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </NightposShell>
  );
}
