"use client";

import { useMemo, useState } from "react";
import NightposShell from "../components/NightposShell";
import { castsData } from "../lib/nightposData";

const SALARY_PIN = "5678";

function fmtH(min) {
  if (min <= 0) return "−";
  return `${Math.floor(min / 60)}時間${String(min % 60).padStart(2, "0")}分`;
}

export default function SalaryPage() {
  const [pin, setPin] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [period, setPeriod] = useState("today");

  const rows = useMemo(() => {
    return castsData
      .filter((cast) => cast.statusEmp !== "除籍")
      .map((cast) => {
        const baseHours = Math.max(0, cast.elMin - cast.breakMin) / 60;
        const base = Math.floor(baseHours * cast.wage);
        const drinkBack = cast.drink * 400;
        const shimeiBack = cast.shimei * 1000;
        const champBack = Math.floor(cast.champ * 0.1);
        const total = base + drinkBack + shimeiBack + champBack;
        return { ...cast, base, drinkBack, shimeiBack, champBack, total };
      });
  }, []);

  const unlock = () => {
    if (pin === SALARY_PIN) setUnlocked(true);
    setPin("");
  };

  return (
    <NightposShell activePath="/salary" title="給与計算" subtitle="v4 準拠の別PIN認証給与画面">
      {!unlocked ? (
        <div className="pin-screen np-card">
          <div className="sec-title">PINコードを入力してください</div>
          <input className="pin-input" type="password" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} />
          <button className="btn btn-dk" onClick={unlock}>ロック解除</button>
        </div>
      ) : (
        <>
          <div className="sec-hd">
            <div style={{ display: "flex", gap: 6 }}>
              <button className={`btn btn-ol ${period === "today" ? "on-ol" : ""}`} onClick={() => setPeriod("today")}>日次</button>
              <button className={`btn btn-ol ${period === "month" ? "on-ol" : ""}`} onClick={() => setPeriod("month")}>月次</button>
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
                {rows.map((row) => (
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
    </NightposShell>
  );
}
