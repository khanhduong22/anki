"use client";

import React, { useState } from "react";
import { db, Card } from "../db/schema";
import { Download, Upload, Plus, FileText, CheckCircle2, AlertCircle, X } from "lucide-react";

interface ImportExportProps {
  onClose: () => void;
  onRefreshCards: () => void;
}

export default function ImportExport({ onClose, onRefreshCards }: ImportExportProps) {
  const [activeTab, setActiveTab] = useState<"backup" | "bulk">("backup");
  const [bulkText, setBulkText] = useState("");
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Export database to a JSON file
  const handleExport = async () => {
    try {
      const cards = await db.cards.toArray();
      const settings = await db.settings.toArray();
      
      const backupData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        cards,
        settings,
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `devswipe_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      showStatus("success", `Đã xuất ${cards.length} thẻ thành công!`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      showStatus("error", "Lỗi khi xuất dữ liệu: " + message);
    }
  };

  // Import database from JSON file
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (!data.cards || !Array.isArray(data.cards)) {
          throw new Error("File backup không đúng định dạng.");
        }

        // Confirmation warning implicitly satisfied by single-user local tool
        // Let's merge or overwrite. We will clear and import to restore exactly the state.
        await db.cards.clear();
        await db.settings.clear();

        // Add cards back (recreating index dates correctly)
        const formattedCards = data.cards.map((c: Card) => ({
          ...c,
          nextReview: new Date(c.nextReview),
        }));
        await db.cards.bulkAdd(formattedCards);

        if (data.settings && Array.isArray(data.settings)) {
          await db.settings.bulkAdd(data.settings);
        }

        showStatus("success", `Đã phục hồi thành công ${formattedCards.length} thẻ!`);
        onRefreshCards();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        showStatus("error", "Lỗi khi nhập file: " + message);
      }
    };
    reader.readAsText(file);
  };

  // Parse and bulk import cards from custom formatted text or JSON
  const handleBulkImport = async () => {
    if (!bulkText.trim()) {
      showStatus("error", "Vui lòng nhập nội dung!");
      return;
    }

    try {
      let cardsToAdd: Omit<Card, "id">[] = [];

      // Check if input is JSON format
      if (bulkText.trim().startsWith("[")) {
        const parsed = JSON.parse(bulkText);
        if (!Array.isArray(parsed)) throw new Error("JSON phải là một danh sách các card");
        
        cardsToAdd = parsed.map((item: Partial<Card>) => ({
          question: item.question || "Câu hỏi trống?",
          answer: item.answer || "Câu trả lời trống?",
          codeSnippet: item.codeSnippet || "",
          category: item.category || "General",
          difficulty: item.difficulty || "Mid",
          repetitions: 0,
          interval: 0,
          easeFactor: 2.5,
          nextReview: new Date(),
          bookmarked: 0,
          isCustom: 1,
        }));
      } else {
        // Parse custom separator format: Question || Answer || Code || Category || Difficulty
        const lines = bulkText.split("\n");
        for (const line of lines) {
          if (!line.trim()) continue;
          const parts = line.split("||").map((p) => p.trim());
          if (parts.length < 2) continue; // Must have at least Question and Answer

          cardsToAdd.push({
            question: parts[0],
            answer: parts[1],
            codeSnippet: parts[2] || "",
            category: parts[3] || "General",
            difficulty: (parts[4] as Card["difficulty"]) || "Mid",
            repetitions: 0,
            interval: 0,
            easeFactor: 2.5,
            nextReview: new Date(),
            bookmarked: 0,
            isCustom: 1,
          });
        }
      }

      if (cardsToAdd.length === 0) {
        throw new Error("Không tìm thấy dòng hợp lệ nào để import. Định dạng: Câu hỏi || Câu trả lời || Code(tùy chọn) || Chủ đề || Độ khó");
      }

      await db.cards.bulkAdd(cardsToAdd as Card[]);
      showStatus("success", `Đã thêm ${cardsToAdd.length} thẻ mới thành công!`);
      setBulkText("");
      onRefreshCards();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      showStatus("error", "Lỗi nhập thẻ: " + message);
    }
  };

  const showStatus = (type: "success" | "error", text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
            <FileText className="text-indigo-400 w-6 h-6" />
            Quản lý Dữ liệu
          </h2>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Tab Headers */}
        <div className="flex border-b border-white/10 mb-6">
          <button
            onClick={() => setActiveTab("backup")}
            className={`flex-1 pb-3 text-sm font-semibold transition-colors ${
              activeTab === "backup" 
                ? "border-b-2 border-indigo-500 text-indigo-400" 
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Sao lưu & Phục hồi
          </button>
          <button
            onClick={() => setActiveTab("bulk")}
            className={`flex-1 pb-3 text-sm font-semibold transition-colors ${
              activeTab === "bulk" 
                ? "border-b-2 border-indigo-500 text-indigo-400" 
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Nhập thẻ hàng loạt
          </button>
        </div>

        {/* Status Notification */}
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

        {/* Tab 1: Backup & Restore */}
        {activeTab === "backup" && (
          <div className="space-y-6">
            <p className="text-xs text-gray-400 leading-relaxed">
              * Dữ liệu học của bạn (gồm thẻ và tiến độ ôn tập) được lưu trữ hoàn toàn ở trình duyệt cục bộ. Để tránh mất dữ liệu khi xóa cache trình duyệt, vui lòng thường xuyên sao lưu bằng cách tải file backup về máy.
            </p>

            <button
              onClick={handleExport}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] transition-all rounded-xl font-semibold text-white shadow-lg shadow-indigo-600/20 cursor-pointer"
            >
              <Download className="w-5 h-5" />
              Tải file Sao Lưu (.json)
            </button>

            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <span className="relative px-3 bg-[#111422] text-xs text-gray-500 uppercase tracking-wider">Hoặc phục hồi</span>
            </div>

            <label className="w-full flex flex-col items-center justify-center border-2 border-dashed border-white/10 hover:border-indigo-500/50 rounded-xl p-6 cursor-pointer hover:bg-white/5 transition-all">
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <span className="text-sm font-semibold text-gray-200">Chọn file Backup JSON</span>
              <span className="text-xs text-gray-500 mt-1">Hệ thống sẽ ghi đè dữ liệu hiện tại</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportFile}
                className="hidden"
              />
            </label>
          </div>
        )}

        {/* Tab 2: Bulk Import */}
        {activeTab === "bulk" && (
          <div className="space-y-4">
            <p className="text-xs text-gray-400 leading-relaxed">
              Bạn có thể dán định dạng JSON Array hoặc các dòng text đơn giản phân tách bằng ký tự <code className="bg-white/10 px-1 py-0.5 rounded text-indigo-400">||</code>:
            </p>
            <div className="bg-white/5 p-3 rounded-lg text-[10px] font-mono text-gray-400 space-y-1">
              <div>Định dạng: <span className="text-gray-300">Câu hỏi || Trả lời || Code (không bắt buộc) || Chủ đề || Độ khó</span></div>
              <div className="text-indigo-400">Ví dụ:</div>
              <div>WHERE vs HAVING || WHERE chạy trước group, HAVING chạy sau || select * from t || SQL || Junior</div>
            </div>

            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder="Nhập dữ liệu ở đây..."
              rows={8}
              className="w-full bg-white/5 border border-white/10 focus:border-indigo-500/50 rounded-xl p-3 text-sm font-mono text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/20"
            />

            <button
              onClick={handleBulkImport}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] transition-all rounded-xl font-semibold text-white cursor-pointer"
            >
              <Plus className="w-5 h-5" />
              Thêm Thẻ Vào Bộ Nhớ
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
