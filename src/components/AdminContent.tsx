"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { db, Card } from "../db/schema";
import { 
  ArrowLeft, 
  Settings, 
  Trash2, 
  Edit3, 
  Plus, 
  Search, 
  Save, 
  X, 
  Database,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import ImportExport from "./ImportExport";

export default function AdminContent() {
  const [cards, setCards] = useState<Card[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  
  // Card Editor Form States
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [codeSnippet, setCodeSnippet] = useState("");
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState<Card["difficulty"]>("Mid");
  
  // Sub-tabs in Admin page
  const [adminTab, setAdminTab] = useState<"list" | "data">("list");
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadCards = useCallback(async () => {
    try {
      const allCards = await db.cards.toArray();
      setCards(allCards);
    } catch (err) {
      console.error("Error loading cards in admin:", err);
    }
  }, []);

  useEffect(() => {
    const fetchCards = async () => {
      await loadCards();
    };
    fetchCards();
  }, [loadCards]);



  const showStatus = (type: "success" | "error", text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Delete Card
  const handleDeleteCard = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa thẻ này không?")) return;
    try {
      await db.cards.delete(id);
      showStatus("success", "Đã xóa thẻ thành công!");
      loadCards();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      showStatus("error", "Lỗi khi xóa: " + message);
    }
  };

  // Open editor for creating card
  const handleOpenCreate = () => {
    setFormMode("create");
    setQuestion("");
    setAnswer("");
    setCodeSnippet("");
    setCategory("");
    setDifficulty("Mid");
    setIsEditorOpen(true);
  };

  // Open editor for editing card
  const handleOpenEdit = (card: Card) => {
    setSelectedCard(card);
    setFormMode("edit");
    setQuestion(card.question);
    setAnswer(card.answer);
    setCodeSnippet(card.codeSnippet || "");
    setCategory(card.category);
    setDifficulty(card.difficulty);
    setIsEditorOpen(true);
  };

  // Save Card (Insert or Update)
  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !answer.trim()) {
      showStatus("error", "Câu hỏi và Câu trả lời không được bỏ trống!");
      return;
    }

    try {
      if (formMode === "create") {
        const newCard: Omit<Card, "id"> = {
          question,
          answer,
          codeSnippet,
          category: category.trim() || "Chung",
          difficulty,
          repetitions: 0,
          interval: 0,
          easeFactor: 2.5,
          nextReview: new Date(),
          bookmarked: 0,
          isCustom: 1,
        };
        await db.cards.add(newCard as Card);
        showStatus("success", "Đã thêm thẻ mới thành công!");
      } else {
        if (!selectedCard) return;
        await db.cards.update(selectedCard.id!, {
          question,
          answer,
          codeSnippet,
          category: category.trim() || "Chung",
          difficulty,
        });
        showStatus("success", "Đã cập nhật thẻ thành công!");
      }
      setIsEditorOpen(false);
      loadCards();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      showStatus("error", "Lỗi khi lưu thẻ: " + message);
    }
  };

  // Filter cards based on search query
  const filteredCards = cards.filter(
    (c) =>
      c.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="main-container overflow-y-auto select-text px-4 pb-12">
      {/* Header */}
      <header className="py-4 flex items-center gap-4 border-b border-white/5 mb-6">
        <Link href="/" className="p-2 rounded-xl hover:bg-white/5 active:scale-95 transition-all text-gray-400 hover:text-gray-200">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-gray-100 flex items-center gap-2">
          <Settings className="text-indigo-400 w-5 h-5" />
          Trang Quản Trị
        </h1>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-white/10 mb-6">
        <button
          onClick={() => setAdminTab("list")}
          className={`flex-1 pb-3 text-sm font-semibold transition-colors ${
            adminTab === "list" 
              ? "border-b-2 border-indigo-500 text-indigo-400" 
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          Danh sách Thẻ ({filteredCards.length})
        </button>
        <button
          onClick={() => setAdminTab("data")}
          className={`flex-1 pb-3 text-sm font-semibold transition-colors ${
            adminTab === "data" 
              ? "border-b-2 border-indigo-500 text-indigo-400" 
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          Nhập / Xuất dữ liệu
        </button>
      </div>

      {/* Status Alerts */}
      {statusMessage && (
        <div className={`p-4 rounded-xl flex items-start gap-3 mb-6 animate-pulse ${
          statusMessage.type === "success" 
            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
            : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
        }`}>
          {statusMessage.type === "success" ? <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />}
          <span className="text-sm font-medium">{statusMessage.text}</span>
        </div>
      )}

      {/* TAB 1: LIST CRUD */}
      {adminTab === "list" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Tìm câu hỏi, đáp án, tag..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-indigo-500/50"
              />
            </div>
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all text-xs font-bold rounded-xl text-white cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Thêm thẻ
            </button>
          </div>

          <div className="space-y-3">
            {filteredCards.length > 0 ? (
              filteredCards.map((card) => (
                <div 
                  key={card.id}
                  className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col justify-between space-y-3 hover:border-white/10 transition-colors"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-full">
                        {card.category}
                      </span>
                      <h3 className="text-sm font-bold text-gray-200 line-clamp-2 mt-2 leading-relaxed">
                        {card.question}
                      </h3>
                    </div>
                    
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => handleOpenEdit(card)}
                        className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-indigo-400 transition-colors"
                        title="Sửa"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCard(card.id!)}
                        className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-rose-500 transition-colors"
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-xs text-gray-500 font-semibold">Không tìm thấy thẻ nào.</div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: DATA IMPORT/EXPORT (EMBEDDED IMPORTEXPORT COMPONENT) */}
      {adminTab === "data" && (
        <div className="bg-white/[0.01] border border-white/5 rounded-24 p-5">
          <ImportExport 
            onClose={() => setAdminTab("list")}
            onRefreshCards={loadCards}
          />
        </div>
      )}

      {/* --- Overlay Card Editor Modal --- */}
      {isEditorOpen && (
        <div className="drawer-overlay" onClick={() => setIsEditorOpen(false)}>
          <div className="drawer-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-100 flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-400" />
                {formMode === "create" ? "Thêm Thẻ Mới" : "Chỉnh Sửa Thẻ"}
              </h3>
              <button 
                onClick={() => setIsEditorOpen(false)}
                className="p-1 rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSaveCard} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400">Câu hỏi *</label>
                <textarea
                  required
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Nhập câu hỏi..."
                  rows={2}
                  className="w-full bg-white/5 border border-white/10 focus:border-indigo-500/50 rounded-xl p-3 text-sm text-gray-200 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400">Câu trả lời *</label>
                <textarea
                  required
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Nhập nội dung câu trả lời..."
                  rows={4}
                  className="w-full bg-white/5 border border-white/10 focus:border-indigo-500/50 rounded-xl p-3 text-sm text-gray-200 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400">Code mẫu (không bắt buộc)</label>
                <textarea
                  value={codeSnippet}
                  onChange={(e) => setCodeSnippet(e.target.value)}
                  placeholder="Dán code snippet mẫu..."
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 focus:border-indigo-500/50 rounded-xl p-3 text-xs font-mono text-emerald-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400">Chủ đề (Category)</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="VD: SQL, Database, JS"
                    className="w-full bg-white/5 border border-white/10 focus:border-indigo-500/50 rounded-xl px-3 py-2.5 text-xs text-gray-200 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400">Độ khó (Difficulty)</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as Card["difficulty"])}
                    className="w-full bg-white/5 border border-white/10 focus:border-indigo-500/50 rounded-xl px-3 py-2.5 text-xs text-gray-300 focus:outline-none"
                  >
                    <option value="Junior">Junior</option>
                    <option value="Mid">Mid</option>
                    <option value="Senior">Senior</option>
                    <option value="Tech Lead">Tech Lead</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] transition-all rounded-xl font-semibold text-white shadow-lg shadow-indigo-600/20 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                Lưu Thẻ Học Tập
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
