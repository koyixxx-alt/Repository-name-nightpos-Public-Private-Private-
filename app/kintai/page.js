"use client";

import { useMemo, useState } from "react";
import NightposShell from "../components/NightposShell";
import { castsData } from "../lib/nightposData";

function nowTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function fmtH(min) {
  if (min <= 0) return "−";
  return `${Math.floor(min / 60)}時間${String(min % 60).padStart(2, "0")}分`;
}

export default function KintaiPage() {
  const [casts, setCasts] = useState(castsData.map((c) => ({ ...c, breakLog: [] })));
  const activeCasts = useMemo(() => casts.filter((c) => c.statusEmp !== "除籍"), [casts]);
  const [selectedId, setSelectedId] = useState(activeCasts[0]?.id ?? 1);
  const selected = casts.find((c) => c.id === selectedId) ?? activeCasts[0];

  const updateStatus = (mode) => {
    if (!selected) return;
    setCasts((prev) =>
      prev.map((cast) => {
        if (cast.id !== selected.id) return cast;
        if (mode === "in") return { ...cast, status: "in", clockIn: nowTime(), clockOut: "" };
        if (mode === "out") return { ...cast, status: "out", clockOut: nowTime() };
        if (mode === "brk" && cast.status === "in") {
          return { ...cast, status: "brk", breakLog: [...(cast.breakLog || []), { from: nowTime(), to: "" }] };
        }
        if (mode === "brkEnd" && cast.status === "brk") {
          const logs = [...(cast.breakLog || [])];
          if (logs.length > 0) logs[logs.length - 1] = { ...logs[logs.length - 1], to: nowTime() };
          return { ...cast, status: "in", breakMin: cast.breakMin + 15, breakLog: logs };
        }
        return cast;
      }),
    );
  };

  return (
    <NightposShell activePath="/kintai" title="勤怠管理" subtitle="v4 準拠の打刻・休憩管理">
      <div className="kintai-body np-card">
        <aside className="k-list">
          <div className="kl-hd">あいうえお順</div>
          <div className="kl-scroll">
            {activeCasts.map((cast) => (
              <button key={cast.id} className={`kl-item ${selected?.id === cast.id ? "sel" : ""}`} onClick={() => setSelectedId(cast.id)}>
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
          {selected && (
            <div className="card">
              <div className="kd-top">
                <div className={`kd-av ${selected.role === "ボーイ" ? "av-boy" : "av-cast"}`}>{selected.name[0]}</div>
                <div>
                  <div className="kd-name">{selected.name}</div>
                  <div className="kd-role">{selected.role}</div>
                </div>
              </div>
              <div className="punch-btns">
                <button className="pbtn pbtn-in" onClick={() => updateStatus("in")}>🟢 出勤打刻</button>
                <button className="pbtn pbtn-brk" onClick={() => updateStatus(selected.status === "brk" ? "brkEnd" : "brk")}>
                  {selected.status === "brk" ? "✅ 休憩終了" : "☕ 休憩開始"}
                </button>
                <button className="pbtn pbtn-out" onClick={() => updateStatus("out")}>🔴 退勤打刻</button>
              </div>
              <div className="kd-times">
                <div className="kt-box"><div className="kt-lbl">出勤時刻</div><div className="kt-val">{selected.clockIn || "−"}</div></div>
                <div className="kt-box"><div className="kt-lbl">退勤時刻</div><div className="kt-val">{selected.clockOut || "−"}</div></div>
                <div className="kt-box"><div className="kt-lbl">勤務時間</div><div className="kt-val">{fmtH(selected.elMin)}</div></div>
              </div>
            </div>
          )}
        </section>
      </div>
    </NightposShell>
  );
}
