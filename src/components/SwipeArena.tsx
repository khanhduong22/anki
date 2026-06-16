"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { db, Card, getSettings, updateSettings } from "../db/schema";
import { seedDatabase } from "../db/seedData";
import { calculateSM2 } from "../srs/sm2";
import { 
  Flame, 
  Award, 
  RotateCw, 
  Layers, 
  Sparkles, 
  Check, 
  X, 
  BookMarked,
  RefreshCw,
  BarChart3,
  Settings
} from "lucide-react";
import ImportExport from "./ImportExport";


export default function SwipeArena() {
  // Database States
  const [queue, setQueue] = useState<Card[]>([]);
  const [stats, setStats] = useState({ streak: 0, xp: 0, level: 1, lastReviewDate: null as string | null });
  const [loading, setLoading] = useState(true);
  
  // Navigation & UI States
  const [isFlipped, setIsFlipped] = useState(false);
  const [activeTab, setActiveTab] = useState<"review" | "all">("review");
  const [showDataDrawer, setShowDataDrawer] = useState(false);
  
  // Tinder Gesture States
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);
  
  // AI Explanations States
  const [showAiDrawer, setShowAiDrawer] = useState(false);
  const [geminiKey, setGeminiKey] = useState("");
  const [aiExplanation, setAiExplanation] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [showKeyInput, setShowKeyInput] = useState(false);
  
  // XP Event popups
  const [xpPopups, setXpPopups] = useState<{ id: number; x: number; y: number }[]>([]);
  const popupIdRef = useRef(0);

  const refreshQueue = useCallback(async () => {
    let cardList: Card[] = [];
    if (activeTab === "review") {
      // Fetch cards scheduled for today or earlier
      const now = new Date();
      cardList = await db.cards.where("nextReview").belowOrEqual(now).toArray();
    } else {
      // Practice mode: all cards
      cardList = await db.cards.toArray();
    }
    
    // Shuffle the queue to make it feel dynamic
    setQueue(cardList.sort(() => Math.random() - 0.5));
    setIsFlipped(false);
  }, [activeTab]);

  // Initialize DB and Seed
  useEffect(() => {
    const init = async () => {
      try {
        await seedDatabase();
        const userStats = await getSettings();
        setStats(userStats);
        
        // Load Gemini Key from localStorage if exists
        const storedKey = localStorage.getItem("gemini_api_key");
        if (storedKey) setGeminiKey(storedKey);
        
        await refreshQueue();
      } catch (err) {
        console.error("DB Initialization error:", err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [refreshQueue]);

  const currentCard = queue[0];


  // Tinder Drag Handlers
  const handleDragStart = (clientX: number, clientY: number) => {
    if (isFlipped) return; // Only swipeable in Question state (or let's allow it but typically front only)
    setIsDragging(true);
    setDragStart({ x: clientX, y: clientY });
  };

  const handleDragMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    const dx = clientX - dragStart.x;
    const dy = clientY - dragStart.y;
    setDragOffset({ x: dx, y: dy });

    if (dx > 50) {
      setSwipeDirection("right");
    } else if (dx < -50) {
      setSwipeDirection("left");
    } else {
      setSwipeDirection(null);
    }
  };

  const handleDragEnd = async () => {
    if (!isDragging) return;
    setIsDragging(false);

    const threshold = 120;
    if (dragOffset.x > threshold) {
      // Swipe Right (Got it - Pass)
      await handleCardRating(5);
    } else if (dragOffset.x < -threshold) {
      // Swipe Left (Review - Fail)
      await handleCardRating(1);
    } else {
      // Snap back
      setDragOffset({ x: 0, y: 0 });
      setSwipeDirection(null);
    }
  };

  // Touch handlers mapping
  const onTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleDragStart(touch.clientX, touch.clientY);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleDragMove(touch.clientX, touch.clientY);
  };

  // Mouse handlers mapping
  const onMouseDown = (e: React.MouseEvent) => {
    handleDragStart(e.clientX, e.clientY);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (e.buttons !== 1) return; // only drag on left click
    handleDragMove(e.clientX, e.clientY);
  };

  // Handle Card SRS rating (SM-2)
  const handleCardRating = async (quality: number) => {
    if (!currentCard) return;

    // Trigger Swipe Animation out
    const directionSign = quality >= 3 ? 1 : -1;
    setDragOffset({ x: directionSign * 500, y: dragOffset.y });
    
    // Wait briefly for animation to complete
    setTimeout(async () => {
      try {
        const nextState = calculateSM2(
          quality,
          currentCard.repetitions,
          currentCard.interval,
          currentCard.easeFactor
        );

        const nextReviewDate = new Date();
        nextReviewDate.setDate(nextReviewDate.getDate() + nextState.interval);

        // Update card in DB
        await db.cards.update(currentCard.id!, {
          repetitions: nextState.repetitions,
          interval: nextState.interval,
          easeFactor: nextState.easeFactor,
          nextReview: nextReviewDate,
        });

        // Award XP and update Streak
        let earnedXp = 0;
        let streakUpdated = stats.streak;

        if (quality >= 3) {
          earnedXp = 10;
          // Spawn floating XP indicator
          spawnXpIndicator();

          // Streak update logic
          const todayStr = new Date().toISOString().slice(0, 10);
          if (stats.lastReviewDate !== todayStr) {
            streakUpdated = stats.streak + 1;
          }
        }

        const newXp = stats.xp + earnedXp;
        const newLevel = Math.floor(newXp / 100) + 1; // 100 XP per level

        const newStats = {
          ...stats,
          xp: newXp,
          level: newLevel,
          streak: streakUpdated,
          lastReviewDate: new Date().toISOString().slice(0, 10),
        };

        setStats(newStats);
        await updateSettings(newStats);

        // Remove card from queue
        setQueue((prev) => prev.slice(1));
        setIsFlipped(false);
        setDragOffset({ x: 0, y: 0 });
        setSwipeDirection(null);
      } catch (err) {
        console.error("Error rating card:", err);
      }
    }, 200);
  };

  const spawnXpIndicator = () => {
    const id = popupIdRef.current++;
    // Place indicator roughly in center
    setXpPopups((prev) => [...prev, { id, x: 200, y: 300 }]);
    setTimeout(() => {
      setXpPopups((prev) => prev.filter((p) => p.id !== id));
    }, 1000);
  };

  // Toggle Flip Card
  const toggleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  // Bookmark toggling
  const toggleBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentCard) return;
    const newBookmark = currentCard.bookmarked === 1 ? 0 : 1;
    await db.cards.update(currentCard.id!, { bookmarked: newBookmark });
    setQueue(prev => prev.map((c, i) => i === 0 ? { ...c, bookmarked: newBookmark } : c));
  };

  // AI Drawer Handlers
  const openAiDrawer = async () => {
    if (!currentCard) return;
    setShowAiDrawer(true);
    setAiExplanation("");
    
    if (!geminiKey) {
      setShowKeyInput(true);
      return;
    }

    await getAiExplanation(geminiKey);
  };

  const saveGeminiKey = (key: string) => {
    setGeminiKey(key);
    localStorage.setItem("gemini_api_key", key);
    setShowKeyInput(false);
    getAiExplanation(key);
  };

  const getAiExplanation = async (apiKey: string) => {
    setAiLoading(true);
    try {
      const prompt = `Giải thích ngắn gọn, dễ hiểu nhất dành cho một lập trình viên ở mức độ phỏng vấn về chủ đề này:\n\nHỏi: ${currentCard.question}\nĐáp: ${currentCard.answer}\nCode mẫu nếu có: ${currentCard.codeSnippet || "Không"}\n\nYêu cầu định dạng markdown, dùng code block, tập trung vào bản chất cốt lõi và ví dụ cụ thể. Đừng dài dòng giải thích lý thuyết chung chung.`;
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (!response.ok) {
        throw new Error("Lỗi khi kết nối tới API Gemini. Vui lòng kiểm tra lại API Key.");
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "Không nhận được phản hồi từ AI.";
      setAiExplanation(text);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setAiExplanation("Lỗi: " + message);
    } finally {
      setAiLoading(false);
    }
  };


  // Card transform inline styles
  const cardTransformStyle = {
    transform: isDragging
      ? `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0) rotate(${dragOffset.x * 0.04}deg)`
      : `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0)`,
    transition: isDragging ? "none" : "transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
  };

  if (loading) {
    return (
      <div className="main-container items-center justify-center">
        <RefreshCw className="w-10 h-10 text-indigo-400 animate-spin" />
        <span className="text-sm text-gray-400 mt-4">Đang chuẩn bị bộ thẻ...</span>
      </div>
    );
  }

  return (
    <div className="main-container select-none">
      
      {/* Floating XP Numbers */}
      {xpPopups.map((p) => (
        <span
          key={p.id}
          className="xp-indicator"
          style={{ left: `${p.x}px`, top: `${p.y}px` }}
        >
          +10 XP
        </span>
      ))}

      {/* --- Top Header (Stats) --- */}
      <header className="px-4 py-3 flex items-center justify-between border-b border-white/5 bg-[#0B0D19]/60 backdrop-blur-md z-50">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
            <Flame className={`w-4 h-4 text-orange-500 ${stats.streak > 0 ? "flame-active" : ""}`} />
            <span className="text-xs font-bold text-orange-400">{stats.streak} ngày</span>
          </div>
          <div className="flex items-center gap-1 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full">
            <Award className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold text-indigo-300">Level {stats.level}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Practice/Review Switch */}
          <button 
            onClick={() => setActiveTab(activeTab === "review" ? "all" : "review")}
            className="p-2 rounded-xl hover:bg-white/5 active:scale-95 transition-all text-gray-400 hover:text-gray-200 cursor-pointer animate-none"
            title={activeTab === "review" ? "Chuyển sang Chế độ Học Thử" : "Chuyển sang Chế độ Ôn Tập"}
          >
            <Layers className={`w-5 h-5 ${activeTab === "all" ? "text-indigo-400" : ""}`} />
          </button>
          
          {/* Dashboard Link */}
          <Link 
            href="/dashboard"
            className="p-2 rounded-xl hover:bg-white/5 active:scale-95 transition-all text-gray-400 hover:text-gray-200 cursor-pointer"
            title="Xem Thống Kê"
          >
            <BarChart3 className="w-5 h-5" />
          </Link>

          {/* Admin Link */}
          <Link 
            href="/admin"
            className="p-2 rounded-xl hover:bg-white/5 active:scale-95 transition-all text-gray-400 hover:text-gray-200 cursor-pointer"
            title="Quản Lý Thẻ (Admin)"
          >
            <Settings className="w-5 h-5" />
          </Link>
        </div>

      </header>

      {/* --- Main Gesture Arena --- */}
      <main className="flex-1 flex flex-col justify-center items-center p-4 relative overflow-hidden">
        
        {currentCard ? (
          <div className="w-full max-w-[360px] h-[500px] relative">
            
            {/* Tinder Swipe Badges */}
            {swipeDirection === "right" && <div className="swipe-badge right opacity-100 transform scale-100 rotate-[10deg]">GOT IT</div>}
            {swipeDirection === "left" && <div className="swipe-badge left opacity-100 transform scale-100 rotate-[-10deg]">REVIEW</div>}

            {/* Behind Offset Card Stack Shadow */}
            {queue.length > 1 && (
              <div 
                className="absolute inset-0 rounded-24 bg-white/[0.01] border border-white/[0.02] scale-[0.96] translate-y-3 z-0 pointer-events-none"
                style={{ borderRadius: "24px" }}
              />
            )}
            {queue.length > 2 && (
              <div 
                className="absolute inset-0 rounded-24 bg-white/[0.005] border border-white/[0.01] scale-[0.92] translate-y-6 -z-10 pointer-events-none"
                style={{ borderRadius: "24px" }}
              />
            )}

            {/* Active Card */}
            <div
              className="perspective-container w-full h-full cursor-grab active:cursor-grabbing relative z-10"
              style={cardTransformStyle}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={handleDragEnd}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={handleDragEnd}
              onMouseLeave={handleDragEnd}
            >
              <div className={`flip-card-inner ${isFlipped ? "is-flipped" : ""}`}>
                
                {/* --- FRONT: Question Face --- */}
                <div className="card-face card-face-front p-6 flex flex-col">
                  {/* Tags Header */}
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 bg-white/5 rounded-full text-indigo-400">
                      {currentCard.category}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                        currentCard.difficulty === "Junior" ? "bg-emerald-500/10 text-emerald-400" :
                        currentCard.difficulty === "Mid" ? "bg-amber-500/10 text-amber-400" : "bg-rose-500/10 text-rose-400"
                      }`}>
                        {currentCard.difficulty}
                      </span>
                      <button 
                        onClick={toggleBookmark}
                        className="text-gray-400 hover:text-amber-400 transition-colors"
                      >
                        <BookMarked className={`w-4 h-4 ${currentCard.bookmarked === 1 ? "fill-amber-400 text-amber-400" : ""}`} />
                      </button>
                    </div>
                  </div>

                  {/* Question Title */}
                  <div className="flex-1 flex items-center justify-center text-center">
                    <h3 className="text-lg font-bold leading-relaxed text-gray-100 px-2 select-text">
                      {currentCard.question}
                    </h3>
                  </div>

                  {/* Tap Info Indicator */}
                  <div className="mt-auto text-center py-2 text-[10px] text-gray-500 font-medium">
                    CHẠM HAI LẦN HOẶC BẤM NÚT XOAY ĐỂ XEM ĐÁP ÁN
                  </div>
                </div>

                {/* --- BACK: Answer Face --- */}
                <div className="card-face card-face-back p-6 flex flex-col">
                  {/* Header tags */}
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 bg-white/5 rounded-full text-indigo-400">
                      ĐÁP ÁN • {currentCard.category}
                    </span>
                    <button 
                      onClick={openAiDrawer}
                      className="flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 hover:border-indigo-500/40 rounded-full text-[10px] font-bold text-indigo-300 hover:text-white transition-all cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                      Giải thích bằng AI
                    </button>
                  </div>

                  {/* Answer Text & Code Scroll area */}
                  <div className="flex-1 overflow-y-auto space-y-4 pr-1 select-text">
                    <p className="text-sm leading-relaxed text-gray-200 font-medium">
                      {currentCard.answer}
                    </p>

                    {currentCard.codeSnippet && (
                      <pre className="text-xs p-3 rounded-lg overflow-x-auto bg-black/40 text-emerald-400 font-mono">
                        <code>{currentCard.codeSnippet}</code>
                      </pre>
                    )}
                  </div>

                  {/* Back face Rating Buttons */}
                  <div className="mt-4 pt-4 border-t border-white/5 flex gap-2">
                    <button
                      onClick={() => handleCardRating(1)}
                      className="flex-1 py-2 rounded-xl border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer"
                    >
                      <X className="w-4 h-4" /> Xem lại (Hard)
                    </button>
                    <button
                      onClick={() => handleCardRating(5)}
                      className="flex-1 py-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer"
                    >
                      <Check className="w-4 h-4" /> Thuộc rồi (Easy)
                    </button>
                  </div>
                </div>

              </div>
            </div>

          </div>
        ) : (
          /* Empty Queue State */
          <div className="text-center p-6 bg-white/[0.02] border border-white/5 rounded-24 max-w-[320px] shadow-2xl backdrop-blur-md">
            <Check className="w-12 h-12 text-emerald-400 mx-auto mb-4 bg-emerald-500/10 p-2.5 rounded-full border border-emerald-500/20 animate-bounce" />
            <h3 className="text-lg font-bold text-gray-100 mb-2">Đã Hoàn Thành!</h3>
            <p className="text-xs text-gray-400 leading-relaxed mb-6">
              {activeTab === "review" 
                ? "Tuyệt vời! Bạn đã hoàn thành toàn bộ các thẻ cần ôn tập của ngày hôm nay."
                : "Không còn thẻ nào trong hệ thống. Hãy thêm thẻ mới bằng công cụ Quản lý Dữ liệu."}
            </p>
            <div className="space-y-2">
              {activeTab === "review" && (
                <button
                  onClick={() => setActiveTab("all")}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-xs font-semibold text-white transition-all cursor-pointer"
                >
                  Luyện tập với toàn bộ thẻ
                </button>
              )}
              <button
                onClick={refreshQueue}
                className="w-full py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-semibold text-gray-300 border border-white/10 transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Tải lại hàng chờ
              </button>
            </div>
          </div>
        )}

      </main>

      {/* --- Bottom Action Bar --- */}
      {currentCard && (
        <footer className="px-6 py-4 flex justify-center items-center gap-6 border-t border-white/5 bg-[#0B0D19]/60 backdrop-blur-md z-50">
          <button
            onClick={() => handleCardRating(1)}
            disabled={isFlipped}
            className={`p-3.5 rounded-full bg-rose-500/10 border border-rose-500/20 hover:border-rose-500/50 hover:bg-rose-500/20 text-rose-400 active:scale-90 transition-all shadow-lg cursor-pointer ${isFlipped ? "opacity-30 cursor-not-allowed" : ""}`}
            title="Swipe Left (Review)"
          >
            <X className="w-6 h-6" />
          </button>
          
          <button
            onClick={toggleFlip}
            className="p-4 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white active:scale-90 transition-all shadow-lg shadow-indigo-600/30 cursor-pointer"
            title="Lật thẻ xem đáp án"
          >
            <RotateCw className={`w-7 h-7 transition-transform duration-500 ${isFlipped ? "rotate-180" : ""}`} />
          </button>

          <button
            onClick={() => handleCardRating(5)}
            disabled={isFlipped}
            className={`p-3.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/50 hover:bg-emerald-500/20 text-emerald-400 active:scale-90 transition-all shadow-lg cursor-pointer ${isFlipped ? "opacity-30 cursor-not-allowed" : ""}`}
            title="Swipe Right (Got it)"
          >
            <Check className="w-6 h-6" />
          </button>
        </footer>
      )}

      {/* --- AI Drawer slide-up --- */}
      {showAiDrawer && (
        <div className="drawer-overlay" onClick={() => setShowAiDrawer(false)}>
          <div className="drawer-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-100 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                Giải Thích Chi Tiết Bằng Gemini
              </h3>
              <button 
                onClick={() => setShowAiDrawer(false)}
                className="p-1 rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {showKeyInput ? (
              <div className="space-y-4 py-4">
                <p className="text-xs text-gray-400 leading-relaxed">
                  Để sử dụng tính năng giải thích bằng AI hoàn toàn miễn phí và bảo mật (không lưu trữ trên máy chủ), vui lòng nhập **Gemini API Key** của bạn. Bạn có thể lấy Key miễn phí tại <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline">Google AI Studio</a>.
                </p>
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="Nhập API Key ở đây..."
                    className="flex-1 bg-white/5 border border-white/10 focus:border-indigo-500/50 rounded-xl px-3 py-2.5 text-sm text-gray-200 focus:outline-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveGeminiKey((e.target as HTMLInputElement).value);
                    }}
                  />
                  <button
                    onClick={(e) => {
                      const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                      saveGeminiKey(input.value);
                    }}
                    className="px-4 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-xs font-semibold text-white cursor-pointer"
                  >
                    Lưu Key
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-2 select-text">
                {aiLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
                    <span className="text-xs text-gray-400">Gemini AI đang suy nghĩ...</span>
                  </div>
                ) : (
                  <div className="text-sm text-gray-200 leading-relaxed space-y-4 overflow-y-auto max-h-[350px] pr-1">
                    <p className="whitespace-pre-wrap">{aiExplanation}</p>
                    
                    {/* Key Setting Options */}
                    <div className="pt-6 border-t border-white/5 flex justify-end">
                      <button
                        onClick={() => setShowKeyInput(true)}
                        className="text-[10px] text-gray-500 hover:text-gray-400 underline cursor-pointer"
                      >
                        Đổi API Key
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- Data Manager Drawer --- */}
      {showDataDrawer && (
        <ImportExport 
          onClose={() => setShowDataDrawer(false)}
          onRefreshCards={refreshQueue}
        />
      )}

    </div>
  );
}
