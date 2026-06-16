"use client";

import dynamic from "next/dynamic";

// Disable SSR for Admin to safely access IndexedDB on the client side
const AdminContent = dynamic(() => import("../../components/AdminContent"), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-screen items-center justify-center bg-[#0B0D19] text-gray-400">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
        <span className="text-sm font-medium">Đang mở trang quản trị...</span>
      </div>
    </div>
  ),
});

export default function AdminPage() {
  return <AdminContent />;
}
