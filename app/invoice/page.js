"use client";

import { useState } from "react";
import NightposShell from "../components/NightposShell";
import { invoicesData } from "../lib/nightposData";

export default function InvoicePage() {
  const [selectedTxno, setSelectedTxno] = useState(invoicesData[0].txno);
  const selected = invoicesData.find((inv) => inv.txno === selectedTxno) ?? invoicesData[0];

  return (
    <NightposShell activePath="/invoice" title="会計伝票管理" subtitle="v4 準拠の伝票一覧と詳細">
      <div className="cust-layout">
        <div className="card">
          <table className="sales-tbl">
            <thead>
              <tr><th>取引No.</th><th>日付</th><th>時刻</th><th>席</th><th>顧客</th><th>担当</th><th>合計</th><th>支払</th></tr>
            </thead>
            <tbody>
              {invoicesData.map((inv) => (
                <tr key={inv.txno} onClick={() => setSelectedTxno(inv.txno)} style={{ cursor: "pointer", background: inv.txno === selectedTxno ? "var(--acl)" : "transparent" }}>
                  <td>{inv.txno}</td>
                  <td>{inv.date}</td>
                  <td>{inv.time}</td>
                  <td>{inv.tableId}</td>
                  <td>{inv.guests.join("・")}</td>
                  <td>{inv.casts.join("・")}</td>
                  <td>¥{inv.total.toLocaleString()}</td>
                  <td>{inv.method}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card cust-detail">
          <div className="sec-title">伝票詳細</div>
          <div className="kv">取引No.: {selected.txno}</div>
          <div className="kv">日時: {selected.date} {selected.time}</div>
          <div className="kv">席: {selected.tableId}</div>
          <div className="kv">顧客: {selected.guests.join("・")}</div>
          <div className="kv">担当: {selected.casts.join("・")}</div>
          <div className="kv">支払: {selected.method}</div>
          <div className="kv">合計: ¥{selected.total.toLocaleString()}</div>
        </div>
      </div>
    </NightposShell>
  );
}
