"use client";

import { useMemo, useState } from "react";
import NightposShell from "../components/NightposShell";
import { castsData, invoicesData } from "../lib/nightposData";

export default function ReportPage() {
  const [period, setPeriod] = useState("today");

  const ranking = useMemo(() => {
    return castsData
      .filter((c) => c.statusEmp !== "除籍")
      .map((cast) => ({
        name: cast.name,
        sales: invoicesData.filter((i) => i.casts.includes(cast.name)).reduce((sum, inv) => sum + inv.total, 0),
      }))
      .sort((a, b) => b.sales - a.sales);
  }, []);

  const totalSales = invoicesData.reduce((sum, inv) => sum + inv.total, 0);

  return (
    <NightposShell activePath="/report" title="レポート" subtitle="v4 準拠の集計カードとランキング">
      <div className="rp-period-btns">
        {[
          ["today", "今日"],
          ["week", "今週"],
          ["month", "今月"],
          ["quarter", "3ヶ月"],
          ["year", "年間"],
        ].map(([id, label]) => (
          <button key={id} className={`rpbtn ${period === id ? "on" : ""}`} onClick={() => setPeriod(id)}>
            {label}
          </button>
        ))}
      </div>
      <div className="rp-grid">
        <div className="rp-card"><div className="rp-lbl">売上合計</div><div className="rp-val">¥{totalSales.toLocaleString()}</div><div className="rp-sub">{period}集計</div></div>
        <div className="rp-card"><div className="rp-lbl">会計件数</div><div className="rp-val">{invoicesData.length}件</div><div className="rp-sub">伝票ベース</div></div>
        <div className="rp-card"><div className="rp-lbl">客単価</div><div className="rp-val">¥{Math.floor(totalSales / Math.max(invoicesData.length, 1)).toLocaleString()}</div><div className="rp-sub">平均</div></div>
        <div className="rp-card"><div className="rp-lbl">在籍スタッフ</div><div className="rp-val">{castsData.filter((c) => c.statusEmp !== "除籍").length}名</div><div className="rp-sub">除籍除く</div></div>
      </div>
      <div className="card">
        <div className="sec-title" style={{ marginBottom: 10 }}>売上ランキング</div>
        <table className="sales-tbl">
          <thead>
            <tr><th>順位</th><th>キャスト</th><th>売上</th></tr>
          </thead>
          <tbody>
            {ranking.map((row, idx) => (
              <tr key={row.name}><td>{idx + 1}</td><td>{row.name}</td><td>¥{row.sales.toLocaleString()}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </NightposShell>
  );
}
