"use client";

import { useMemo, useState } from "react";
import NightposShell from "../components/NightposShell";
import { customersData } from "../lib/nightposData";

export default function CustomerPage() {
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(customersData[0].id);

  const list = useMemo(() => {
    if (filter === "vip") return customersData.filter((c) => c.rank === "vip");
    if (filter === "new") return customersData.filter((c) => c.rank === "new");
    return customersData;
  }, [filter]);

  const selected = customersData.find((c) => c.id === selectedId) ?? customersData[0];

  return (
    <NightposShell activePath="/customer" title="顧客管理" subtitle="v4 準拠の顧客カード/詳細">
      <div className="sec-hd">
        <div style={{ display: "flex", gap: 6 }}>
          <button className={`btn btn-ol ${filter === "all" ? "on-ol" : ""}`} onClick={() => setFilter("all")}>全顧客</button>
          <button className={`btn btn-ol ${filter === "vip" ? "on-ol" : ""}`} onClick={() => setFilter("vip")}>VIP</button>
          <button className={`btn btn-ol ${filter === "new" ? "on-ol" : ""}`} onClick={() => setFilter("new")}>新規</button>
        </div>
      </div>
      <div className="cust-layout">
        <div className="cu-grid">
          {list.map((c) => (
            <button key={c.id} className={`cu-card ${selectedId === c.id ? "sel" : ""}`} onClick={() => setSelectedId(c.id)}>
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
          <div className="kv">氏名: {selected.name}</div>
          <div className="kv">電話: {selected.tel}</div>
          <div className="kv">担当: {selected.cast}</div>
          <div className="kv">好み: {selected.fav}</div>
          <div className="kv">累計: ¥{selected.total.toLocaleString()}</div>
        </div>
      </div>
    </NightposShell>
  );
}
