"use client";

import React from "react";
import { useRouter } from "next/navigation";

interface BottomNavProps {
  active: 'home' | 'expenses' | 'shopping' | 'chores' | 'notes' | 'profile';
}

export default function BottomNav({ active }: BottomNavProps) {
  const router = useRouter();

  const navItems = [
    {
      id: 'home',
      label: 'Home',
      path: '/',
      renderIcon: () => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12L12 3L21 12V21H15V15H9V21H3V12Z" />
        </svg>
      )
    },
    {
      id: 'expenses',
      label: 'Expenses',
      path: '/expenses',
      renderIcon: () => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
        </svg>
      )
    },
    {
      id: 'shopping',
      label: 'Shopping',
      path: '/shopping',
      renderIcon: () => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
          <line x1="3" y1="6" x2="21" y2="6"/>
          <path d="M16 10a4 4 0 01-8 0"/>
        </svg>
      )
    },
    {
      id: 'chores',
      label: 'Chores',
      path: '/chores',
      renderIcon: () => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 11l3 3L22 4"/>
          <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
        </svg>
      )
    },
    {
      id: 'notes',
      label: 'Notes',
      path: '/notes',
      renderIcon: () => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
      )
    },
    {
      id: 'profile',
      label: 'Profile',
      path: '/profile',
      renderIcon: () => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      )
    }
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
        padding: '12px 20px',
      }}
    >
      <div className="flex items-center gap-[22px]">
        {navItems.map((item) => {
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              onClick={() => router.push(item.path)}
              className="flex flex-col items-center gap-1 transition-colors bg-transparent border-0 p-0 focus:outline-none cursor-pointer"
              style={{
                color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.35)',
              }}
            >
              {item.renderIcon()}
              <span className="text-[10px] font-semibold">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
