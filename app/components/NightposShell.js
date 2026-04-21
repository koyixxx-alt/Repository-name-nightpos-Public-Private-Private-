"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const navItems = [
  { href: "/kintai", label: "🕐 勤怠" },
  { href: "/customer", label: "🎴 顧客" },
  { href: "/cast", label: "👤 キャスト" },
  { href: "/report", label: "📊 レポート" },
  { href: "/menu-mgmt", label: "🍽 メニュー" },
  { href: "/owner", label: "🔐 オーナー" },
  { href: "/salary", label: "💰 給与計算" },
  { href: "/invoice", label: "🧾 会計伝票" },
];

export default function NightposShell({ activePath, title, subtitle, children }) {
  const [clock, setClock] = useState("");

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const week = ["日", "月", "火", "水", "木", "金", "土"];
      setClock(
        `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${String(
          now.getDate(),
        ).padStart(2, "0")}（${week[now.getDay()]}） ${String(now.getHours()).padStart(
          2,
          "0",
        )}:${String(now.getMinutes()).padStart(2, "0")}`,
      );
    };
    updateClock();
    const timer = setInterval(updateClock, 10000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="nightpos">
      <header className="np-hdr">
        <div className="np-logo">🌙</div>
        <div className="np-appname">
          NightPOS <span>{title}</span>
        </div>
        <div className="np-pill np-pill-open">営業中</div>
        <div className="np-clock">{clock}</div>
      </header>
      <nav className="np-nav">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className={`np-tab ${activePath === item.href ? "on" : ""}`}>
            {item.label}
          </Link>
        ))}
      </nav>
      <main className="np-main">
        <div className="np-page-head">
          <h1>{title}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {children}
      </main>
    </div>
  );
}
