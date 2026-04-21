"use client";

import { useMemo, useState } from "react";
import NightposShell from "../components/NightposShell";
import { castsData, invoicesData } from "../lib/nightposData";

const OWNER_PIN = "1234";

export default function OwnerPage() {
  const [pin, setPin] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const totalSales = useMemo(() => invoicesData.reduce((sum, inv) => sum + inv.total, 0), []);
  const dutyCount = useMemo(
    () => castsData.filter((c) => c.statusEmp !== "除籍" && c.status !== "out").length,
    [],
  );

  const unlock = () => {
    if (pin === OWNER_PIN) setUnlocked(true);
    setPin("");
  };

  return (
    <NightposShell activePath="/owner" title="オーナー管理" subtitle="v4 準拠のPIN認証付き管理画面">
      {!unlocked ? (
        <div className="pin-screen np-card">
          <div className="sec-title">PINコードを入力してください</div>
          <input className="pin-input" type="password" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} />
          <button className="btn btn-dk" onClick={unlock}>ロック解除</button>
        </div>
      ) : (
        <div className="owner-content">
          <div className="owner-sec">
            <div className="owner-sec-title">店舗設定</div>
            <div className="kv">店舗名: Room YOLO</div>
            <div className="kv">セット時間: 60分</div>
            <div className="kv">営業時間: 20:00 - 02:00</div>
          </div>
          <div className="owner-sec">
            <div className="owner-sec-title">本日サマリー</div>
            <div className="kv">売上: ¥{totalSales.toLocaleString()}</div>
            <div className="kv">会計件数: {invoicesData.length}件</div>
            <div className="kv">出勤中: {dutyCount}名</div>
          </div>
          <button className="btn btn-ol" onClick={() => setUnlocked(false)}>ロック</button>
        </div>
      )}
    </NightposShell>
  );
}
