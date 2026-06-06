import React from "react";
import type { Metadata } from "next";
import GlassCard from "@/components/GlassCard";
import BottomNav from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "Dashboard | RoomOS",
  description: "RoomOS home dashboard showing status summary and activity feed.",
};

export default function Home() {
  return (
    <main className="flex-1 flex flex-col gap-6 px-6 pt-5 pb-[120px] w-full relative">
      {/* Header Section */}
      <header className="flex flex-col items-start gap-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-[13px] text-white/60 font-medium">
            Good Evening, Yug 🌙
          </span>
          <h1 className="text-[24px] font-bold text-white leading-tight">
            The Chaos Kingdom 👑
          </h1>
        </div>
        <div className="inline-flex items-center px-3.5 py-1.5 rounded-[999px] border border-white/12 bg-white/[0.06] backdrop-blur-md">
          <span className="text-[13px] text-white/70 font-medium">
            Rahul is studying 🎧
          </span>
        </div>
      </header>

      {/* Summary Grid */}
      <section className="grid grid-cols-2 gap-[12px]">
        {/* Card 1: Balance */}
        <GlassCard className="flex flex-col justify-between items-start min-h-[110px] p-5">
          <span className="text-[28px]" role="img" aria-label="balance">💰</span>
          <div className="flex flex-col gap-0.5 mt-4">
            <span className="text-white/50 text-[12px]">Balance</span>
            <span className="text-white font-bold text-[16px]">₹240 pending</span>
          </div>
        </GlassCard>

        {/* Card 2: Shopping */}
        <GlassCard className="flex flex-col justify-between items-start min-h-[110px] p-5">
          <span className="text-[28px]" role="img" aria-label="shopping">🛒</span>
          <div className="flex flex-col gap-0.5 mt-4">
            <span className="text-white/50 text-[12px]">Shopping</span>
            <span className="text-white font-bold text-[16px]">3 items left</span>
          </div>
        </GlassCard>

        {/* Card 3: Chores */}
        <GlassCard className="flex flex-col justify-between items-start min-h-[110px] p-5">
          <span className="text-[28px]" role="img" aria-label="chores">✅</span>
          <div className="flex flex-col gap-0.5 mt-4">
            <span className="text-white/50 text-[12px]">Chores</span>
            <span className="text-white font-bold text-[16px]">2 remaining</span>
          </div>
        </GlassCard>

        {/* Card 4: Notes */}
        <GlassCard className="flex flex-col justify-between items-start min-h-[110px] p-5">
          <span className="text-[28px]" role="img" aria-label="notes">📝</span>
          <div className="flex flex-col gap-0.5 mt-4">
            <span className="text-white/50 text-[12px]">Notes</span>
            <span className="text-white font-bold text-[16px]">1 reminder</span>
          </div>
        </GlassCard>
      </section>

      {/* Room Health Score */}
      <section>
        <GlassCard className="flex flex-col gap-3 p-5">
          <div className="flex flex-col gap-1">
            <span className="text-white/40 text-[11px] font-semibold tracking-wider uppercase">
              ROOM HEALTH
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-[#9b7fe8] font-bold text-[36px] leading-none">
                78%
              </span>
              <span className="text-white/50 text-[13px]">
                Pretty organized 🏡
              </span>
            </div>
          </div>
          {/* Progress Bar */}
          <div className="w-full bg-white/10 h-[4px] rounded-full overflow-hidden">
            <div 
              className="bg-[#9b7fe8] h-full rounded-full" 
              style={{ width: "78%" }}
            />
          </div>
        </GlassCard>
      </section>

      {/* Recent Activity */}
      <section>
        <GlassCard className="flex flex-col gap-4 p-5">
          <h2 className="text-white/40 text-[11px] font-semibold tracking-wider uppercase">
            RECENT ACTIVITY
          </h2>
          <div className="flex flex-col">
            {/* Activity Item 1 */}
            <div className="flex items-center gap-3 py-3 border-b border-white/6 first:pt-0">
              <div className="w-[36px] h-[36px] rounded-full bg-[#9b7fe8] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                Y
              </div>
              <div className="flex flex-col">
                <p className="text-xs text-white">
                  <span className="font-bold text-white">Yug</span>{" "}
                  <span className="text-white/80">added Pizza Night 💰</span>
                </p>
                <span className="text-white/40 text-[10px] mt-0.5">2 mins ago</span>
              </div>
            </div>

            {/* Activity Item 2 */}
            <div className="flex items-center gap-3 py-3 border-b border-white/6">
              <div className="w-[36px] h-[36px] rounded-full bg-[#9b7fe8] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                R
              </div>
              <div className="flex flex-col">
                <p className="text-xs text-white">
                  <span className="font-bold text-white">Rahul</span>{" "}
                  <span className="text-white/80">bought Milk 🛒</span>
                </p>
                <span className="text-white/40 text-[10px] mt-0.5">1 hour ago</span>
              </div>
            </div>

            {/* Activity Item 3 */}
            <div className="flex items-center gap-3 py-3 last:border-b-0 last:pb-0">
              <div className="w-[36px] h-[36px] rounded-full bg-[#9b7fe8] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                R
              </div>
              <div className="flex flex-col">
                <p className="text-xs text-white">
                  <span className="font-bold text-white">Rahul</span>{" "}
                  <span className="text-white/80">completed Kitchen ✅</span>
                </p>
                <span className="text-white/40 text-[10px] mt-0.5">3 hours ago</span>
              </div>
            </div>
          </div>
        </GlassCard>
      </section>

      {/* Floating Bottom Nav */}
      <BottomNav active="home" />
    </main>
  );
}
