"use client";

import { useMemo, useState } from "react";
import NightposShell from "../components/NightposShell";
import { castsData } from "../lib/nightposData";

export default function CastPage() {
  const [tab, setTab] = useState("all");

  const list = useMemo(() => {
    if (tab === "all") return castsData.filter((c) => c.statusEmp !== "除籍");
    if (tab === "retired") return castsData.filter((c) => c.statusEmp === "除籍");
    return castsData.filter((c) => c.role === tab && c.statusEmp !== "除籍");
  }, [tab]);

  return (
    <NightposShell activePath="/cast" title="キャスト管理" subtitle="v4 準拠のスタッフ管理カード">
      <div className="sec-hd">
        <button className="btn btn-dk">＋ 新規追加</button>
      </div>
      <div className="cast-tabs">
        <button className={`ctab ${tab === "all" ? "on" : ""}`} onClick={() => setTab("all")}>在籍</button>
        <button className={`ctab ${tab === "キャスト" ? "on" : ""}`} onClick={() => setTab("キャスト")}>キャスト</button>
        <button className={`ctab ${tab === "ボーイ" ? "on" : ""}`} onClick={() => setTab("ボーイ")}>ボーイ</button>
        <button className={`ctab ${tab === "retired" ? "on" : ""}`} onClick={() => setTab("retired")}>除籍</button>
      </div>
      <div className="cast-grid">
        {list.map((c) => (
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
              <span>勤務: {Math.floor(c.elMin / 60)}:{String(c.elMin % 60).padStart(2, "0")}</span>
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
    </NightposShell>
  );
}
