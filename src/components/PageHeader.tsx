"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

interface PageHeaderProps {
  title: string;
  showBack?: boolean;
}

export default function PageHeader({ title, showBack = false }: PageHeaderProps) {
  const router = useRouter();

  return (
    <header className="relative w-full flex items-center justify-center py-2 mb-6">
      {showBack && (
        <button
          onClick={() => router.back()}
          className="absolute left-0 p-1 text-white/60 hover:text-white transition-colors bg-transparent border-0 focus:outline-none"
          aria-label="Go Back"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}
      <h1 className="text-white font-bold text-[20px] leading-tight select-none">
        {title}
      </h1>
    </header>
  );
}
