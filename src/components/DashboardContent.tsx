"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { db, getSettings, UserStats } from "../db/schema";
import { 
  ArrowLeft, 
  Flame, 
  Award, 
  Layers, 
  BookMarked, 
  HelpCircle, 
  Sparkles, 
  Trophy,
  CheckCircle2
} from "lucide-react";

export default function DashboardContent() {
  const [stats, setStats] = useState<UserStats>({ streak: 0, xp: 0, level: 1, lastReviewDate: null });
  const [totalCards, setTotalCards] = useState(0);
  const [dueCards, setDueCards] = useState(0);
  const [bookmarkedCount, setBookmarkedCount] = useState(0);
  const [categoryCounts, setCategoryCounts] = useState<{ [key: string]: number }>({});
  const [difficultyCounts, setDifficultyCounts] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const userStats = await getSettings();
        setStats(userStats);

        const allCards = await db.cards.toArray();
        setTotalCards(allCards.length);

        const now = new Date();
        const due = allCards.filter(c => new Date(c.nextReview) <= now).length;
        setDueCards(due);

        const bookmarked = allCards.filter(c => c.bookmarked === 1).length;
        setBookmarkedCount(bookmarked);

        // Calculate categories breakdown
        const cats: { [key: string]: number } = {};
        const diffs: { [key: string]: number } = {};
        allCards.forEach(c => {
          cats[c.category] = (cats[c.category] || 0) + 1;
          diffs[c.difficulty] = (diffs[c.difficulty] || 0) + 1;
        });
        setCategoryCounts(cats);
        setDifficultyCounts(diffs);
      } catch (err) {
        console.error("Error loading dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="main-container items-center justify-center bg-[#0B0D19]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  // Calculate XP progress bar
  const xpInCurrentLevel = stats.xp % 100;
  const xpNeededForNextLevel = 100 - xpInCurrentLevel;
  const progressPercent = Math.min(100, Math.max(0, xpInCurrentLevel));

  return (
    <div className="main-container overflow-y-auto select-text px-4 pb-12">
      {/* Header */}
      <header className="py-4 flex items-center gap-4 border-b border-white/5 mb-6">
        <Link href="/" className="p-2 rounded-xl hover:bg-white/5 active:scale-95 transition-all text-gray-400 hover:text-gray-200">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-gray-100 flex items-center gap-2">
          <Trophy className="text-indigo-400 w-5 h-5" />
          Tiến Độ Học Tập
        </h1>
      </header>

      {/* --- XP Level Up Progress Box --- */}
      <section className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-24 p-5 mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-3 opacity-20">
          <Sparkles className="w-16 h-16 text-indigo-400" />
        </div>
        
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-indigo-500/20 rounded-xl text-indigo-400">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-indigo-300 font-bold uppercase tracking-wider">Cấp Độ Hiện Tại</div>
            <div className="text-xl font-black text-white">Level {stats.level} Developer</div>
          </div>
        </div>

        <div className="flex justify-between text-xs text-gray-400 mb-1.5 font-semibold">
          <span>{stats.xp} XP tích lũy</span>
          <span>Còn {xpNeededForNextLevel} XP để lên cấp</span>
        </div>
        
        {/* Progress bar */}
        <div className="w-full h-3 bg-black/40 rounded-full overflow-hidden border border-white/5">
          <div 
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </section>

      {/* --- Stats Grid --- */}
      <section className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white/[0.02] border border-white/5 rounded-24 p-4 flex flex-col justify-between">
          <div className="flex justify-between items-start text-orange-500 mb-3">
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Streak</span>
            <Flame className={`w-5 h-5 ${stats.streak > 0 ? "flame-active" : ""}`} />
          </div>
          <div>
            <div className="text-2xl font-black text-gray-100">{stats.streak}</div>
            <div className="text-[10px] text-gray-500 font-semibold uppercase">Ngày học liên tiếp</div>
          </div>
        </div>

        <div className="bg-white/[0.02] border border-white/5 rounded-24 p-4 flex flex-col justify-between">
          <div className="flex justify-between items-start text-indigo-400 mb-3">
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Tổng số thẻ</span>
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-gray-100">{totalCards}</div>
            <div className="text-[10px] text-gray-500 font-semibold uppercase">Thẻ trong bộ nhớ</div>
          </div>
        </div>

        <div className="bg-white/[0.02] border border-white/5 rounded-24 p-4 flex flex-col justify-between">
          <div className="flex justify-between items-start text-rose-400 mb-3">
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Cần ôn</span>
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-gray-100">{dueCards}</div>
            <div className="text-[10px] text-gray-500 font-semibold uppercase">Thẻ đến hạn hôm nay</div>
          </div>
        </div>

        <div className="bg-white/[0.02] border border-white/5 rounded-24 p-4 flex flex-col justify-between">
          <div className="flex justify-between items-start text-amber-400 mb-3">
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Đã Lưu</span>
            <BookMarked className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-gray-100">{bookmarkedCount}</div>
            <div className="text-[10px] text-gray-500 font-semibold uppercase">Thẻ đánh dấu yêu thích</div>
          </div>
        </div>
      </section>

      {/* --- Category Breakdown --- */}
      <section className="bg-white/[0.02] border border-white/5 rounded-24 p-5 mb-6">
        <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-indigo-400" />
          Phân bố theo chủ đề
        </h2>
        {Object.keys(categoryCounts).length > 0 ? (
          <div className="space-y-4">
            {Object.entries(categoryCounts).map(([cat, count]) => {
              const percentage = Math.round((count / totalCards) * 100);
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-gray-300">{cat}</span>
                    <span className="text-indigo-400">{count} thẻ ({percentage}%)</span>
                  </div>
                  <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-4 text-xs text-gray-500 font-medium">Chưa có chủ đề nào được nạp.</div>
        )}
      </section>

      {/* --- Difficulty Breakdown --- */}
      <section className="bg-white/[0.02] border border-white/5 rounded-24 p-5">
        <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Award className="w-4 h-4 text-indigo-400" />
          Độ Khó Trình Độ
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {["Junior", "Mid", "Senior", "Tech Lead"].map((levelName) => {
            const count = difficultyCounts[levelName] || 0;
            return (
              <div 
                key={levelName}
                className="p-3.5 bg-black/20 border border-white/5 rounded-xl flex items-center justify-between"
              >
                <span className={`text-xs font-bold ${
                  levelName === "Junior" ? "text-emerald-400" :
                  levelName === "Mid" ? "text-amber-400" :
                  levelName === "Senior" ? "text-rose-400" : "text-purple-400"
                }`}>
                  {levelName}
                </span>
                <span className="text-sm font-black text-gray-200">{count}</span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
