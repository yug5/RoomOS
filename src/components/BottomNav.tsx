"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Home, DollarSign, ShoppingCart, CheckSquare, FileText } from "lucide-react";

interface BottomNavProps {
  active: 'home' | 'expenses' | 'shopping' | 'chores' | 'notes';
}

export default function BottomNav({ active }: BottomNavProps) {
  const router = useRouter();

  const navItems = [
    { id: 'home', label: 'Home', path: '/', icon: Home },
    { id: 'expenses', label: 'Expenses', path: '/expenses', icon: DollarSign },
    { id: 'shopping', label: 'Shopping', path: '/shopping', icon: ShoppingCart },
    { id: 'chores', label: 'Chores', path: '/chores', icon: CheckSquare },
    { id: 'notes', label: 'Notes', path: '/notes', icon: FileText },
  ] as const;

  return (
    <nav
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-max rounded-full select-none"
      style={{
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        background: 'rgba(255, 255, 255, 0.08)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        padding: '12px 28px',
      }}
    >
      <div className="flex items-center gap-[32px]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              onClick={() => router.push(item.path)}
              className="flex flex-col items-center gap-1 transition-colors bg-transparent border-0 p-0 focus:outline-none"
              style={{
                color: isActive ? '#9b7fe8' : 'rgba(255, 255, 255, 0.4)',
              }}
            >
              <Icon className="w-5 h-5 stroke-[2.2]" />
              <span className="text-[10px] font-semibold">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
