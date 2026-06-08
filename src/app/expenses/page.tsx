"use client";

import React, { useState, useEffect } from "react";
import PageHeader from "@/components/PageHeader";
import GlassCard from "@/components/GlassCard";
import BottomNav from "@/components/BottomNav";
import { useRoomContext, ExpenseItem } from "@/lib/RoomContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/Toast";
import { Skeleton } from "@/components/Skeleton";
import { PullToRefresh } from "@/components/PullToRefresh";

export default function ExpensesPage() {
  const { showToast } = useToast();
  const {
    profile,
    roomId,
    userId,
    loading,
    initialized,
    expenses,
    members,
    refetchExpenses,
    refetchAll
  } = useRoomContext();

  const categories = [
    { key: "All", label: "All" },
    { key: "Food", label: "Food" },
    { key: "Groceries", label: "Groceries" },
    { key: "Utilities", label: "Utilities" },
    { key: "Internet", label: "Internet" },
    { key: "Transport", label: "Transport" },
    { key: "Rent", label: "Rent" },
    { key: "Entertainment", label: "Entertainment" },
    { key: "Household", label: "Household" },
  ];

  // States
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeMonth, setActiveMonth] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [settleOption, setSettleOption] = useState<"full" | "half" | "custom">("full");
  const [customAmount, setCustomAmount] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [upiCopied, setUpiCopied] = useState(false);

  // Form states
  const [expenseName, setExpenseName] = useState("");
  const [amount, setAmount] = useState("");
  const [modalCategory, setModalCategory] = useState("Food");
  const [paidBy, setPaidBy] = useState<string>("");
  const [splitType, setSplitType] = useState<'equal'|'percent'|'amount'>('equal');
  const [memberSplits, setMemberSplits] = useState<Record<string, number>>({});

  const [expenseDate, setExpenseDate] = useState(() => {
    const now = new Date()
    return now.toISOString().slice(0, 16)
  });
  const [nameSuggestions, setNameSuggestions] = useState<string[]>([]);
  const pastNames = Array.from(new Set(expenses.map((e) => e.name))).slice(0, 15);

  const handleNameChange = (value: string) => {
    setExpenseName(value);
    if (value.length > 1) {
      const matches = pastNames.filter(n => 
        n.toLowerCase().startsWith(value.toLowerCase()) && 
        n.toLowerCase() !== value.toLowerCase()
      )
      setNameSuggestions(matches.slice(0, 4))
    } else {
      setNameSuggestions([])
    }
  };

  useEffect(() => {
    if (userId) {
      setPaidBy(userId);
    }
  }, [userId]);

  useEffect(() => {
    if (showModal) {
      const initialSplits: Record<string, number> = {};
      members.forEach((m) => {
        initialSplits[m.id] = 0;
      });
      setMemberSplits(initialSplits);
      setSplitType("equal");
      
      const now = new Date()
      setExpenseDate(now.toISOString().slice(0, 16))
      setNameSuggestions([])
    }
  }, [showModal, members]);

  const roommates = members.filter((m) => m.id !== userId);

  // Calculate dynamic months list for last 6 months
  const getMonthFilters = () => {
    const months = [];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: `${monthNames[d.getMonth()]} ${d.getFullYear()}`
      });
    }
    
    return [{ key: "All", label: "All Months" }, ...months];
  };

  const matchesMonth = (expenseDateStr: string, filterKey: string) => {
    if (filterKey === "All") return true;
    const date = new Date(expenseDateStr);
    const [year, month] = filterKey.split("-").map(Number);
    return date.getFullYear() === year && date.getMonth() === month;
  };

  // Handle Form Submission (adds item to Supabase)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseName || !amount || !roomId || !userId) return;
    navigator.vibrate?.(10);

    try {
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) return;

      if (splitType === 'percent') {
        const totalPct = Object.values(memberSplits).reduce((s, v) => s + v, 0);
        if (totalPct !== 100) {
          showToast('Percentages must equal 100%', 'error');
          return;
        }
      } else if (splitType === 'amount') {
        const totalAmt = Object.values(memberSplits).reduce((s, v) => s + v, 0);
        if (Math.abs(totalAmt - parsedAmount) > 0.01) {
          showToast('Amounts must equal total expense amount', 'error');
          return;
        }
      }

      const splits = members.map(m => ({
        user_id: m.id,
        amount: splitType === 'equal' 
          ? parsedAmount / members.length
          : splitType === 'percent'
          ? ((memberSplits[m.id] || 0) / 100) * parsedAmount
          : (memberSplits[m.id] || 0)
      }));

      const { error: insertError } = await supabase
        .from('expenses')
        .insert({
          room_id: roomId,
          name: expenseName,
          amount: parsedAmount,
          category: modalCategory,
          paid_by: paidBy,
          is_recurring: isRecurring,
          is_settled: false,
          splits: splits,
          expense_date: new Date(expenseDate).toISOString()
        });

      if (insertError) throw insertError;

      // Insert activity log
      await supabase.from('activity').insert({
        room_id: roomId,
        user_name: profile?.name || 'User',
        action: `added ${expenseName} expense`
      });

      showToast('Expense added');

      // Refetch
      await refetchExpenses();

      // Reset fields
      setExpenseName("");
      setAmount("");
      setModalCategory("Food");
      setPaidBy(userId);
      setIsRecurring(false);
      setShowModal(false);
    } catch (err) {
      console.error('Error adding expense:', err);
      showToast('Failed to save', 'error');
    }
  };

  // Handle marking as settled
  const handleSettleUp = async () => {
    if (!roomId) return;
    navigator.vibrate?.(10);
    try {
      const { error: updateError } = await supabase
        .from('expenses')
        .update({ is_settled: true })
        .eq('room_id', roomId)
        .eq('is_settled', false);

      if (updateError) throw updateError;

      // Insert activity log
      await supabase.from('activity').insert({
        room_id: roomId,
        user_name: profile?.name || 'User',
        action: `settled all expenses`
      });

      showToast('All settled!');

      // Refetch
      await refetchExpenses();
      setShowSettleModal(false);
      setSettleOption("full");
      setCustomAmount("");
    } catch (err) {
      console.error('Error settling expenses:', err);
      showToast('Failed to settle', 'error');
    }
  };

  const handleCopyUpi = () => {
    if (!upiId) return;
    navigator.vibrate?.(10);
    navigator.clipboard.writeText(upiId);
    setUpiCopied(true);
    setTimeout(() => setUpiCopied(false), 2000);
  };

  if (loading && !initialized) {
    return (
      <main className="flex-1 flex flex-col bg-[#111118] min-h-screen" style={{ padding: '20px 20px 120px 20px', maxWidth: 430, margin: '0 auto' }}>
        <PageHeader title="Expenses" showBack={false} />
        <div className="flex gap-3">
          <Skeleton height={38} borderRadius={999} className="flex-1" />
          <Skeleton height={38} borderRadius={999} className="flex-1" />
        </div>
        <div className="flex gap-2 overflow-hidden mt-2">
          <Skeleton height={34} width={60} borderRadius={999} />
          <Skeleton height={34} width={80} borderRadius={999} />
          <Skeleton height={34} width={70} borderRadius={999} />
        </div>
        <div className="flex flex-col gap-3 mt-4">
          <Skeleton height={80} borderRadius={16} />
          <Skeleton height={80} borderRadius={16} />
          <Skeleton height={80} borderRadius={16} />
        </div>
        <BottomNav active="expenses" />
      </main>
    );
  }

  // Total owed = sum of (amount / memberCount) for expenses paid by roommate, not settled
  const totalOwed = expenses
    .filter(e => !e.is_settled && e.paid_by !== userId)
    .reduce((sum, e) => {
      if (e.splits) {
        const myShare = e.splits.find((s) => s.user_id === userId)
        return sum + (myShare?.amount || 0)
      }
      return sum + (e.amount / members.length)
    }, 0);

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  // Filters logic
  const filteredExpenses = expenses.filter(exp => {
    const matchesCategory = activeCategory === "All" || exp.category?.toLowerCase() === activeCategory.toLowerCase();
    const matchesTime = matchesMonth(exp.expense_date || exp.created_at, activeMonth);
    return matchesCategory && matchesTime;
  });

  const groupExpensesByDate = (expensesList: ExpenseItem[]) => {
    const groups: { [key: string]: ExpenseItem[] } = {}
    expensesList.forEach(expense => {
      const date = new Date(expense.expense_date || expense.created_at)
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      
      let label: string
      if (date.toDateString() === today.toDateString()) {
        label = 'Today'
      } else if (date.toDateString() === yesterday.toDateString()) {
        label = 'Yesterday'
      } else {
        label = date.toLocaleDateString('en-IN', { 
          day: 'numeric', 
          month: 'short',
          year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
        })
      }
      if (!groups[label]) groups[label] = []
      groups[label].push(expense)
    })
    return groups
  }

  const groupedExpenses = groupExpensesByDate(filteredExpenses)

  const filteredSum = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const filteredYourShare = filteredExpenses.reduce((sum, e) => {
    if (e.splits) {
      const myShare = e.splits.find((s) => s.user_id === userId);
      return sum + (myShare?.amount || 0);
    }
    return sum + (e.amount / members.length);
  }, 0);

  // Category SVG Icon Builder
  const getCategoryIcon = (category: string) => {
    const strokeColor = "rgba(255, 255, 255, 0.7)";
    switch (category) {
      case "Food":
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v10M18 8H6" />
            <circle cx="12" cy="15" r="3" />
          </svg>
        );
      case "Groceries":
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 01-8 0" />
          </svg>
        );
      case "Utilities":
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        );
      case "Internet":
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.55a11 11 0 0 1 14.08 0" />
            <path d="M1.42 9a16 16 0 0 1 21.16 0" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <line x1="12" y1="20" x2="12.01" y2="20" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        );
      case "Transport":
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="3" width="22" height="13" rx="2" ry="2" />
            <line x1="4" y1="9" x2="20" y2="9" />
            <line x1="4" y1="16" x2="6" y2="20" />
            <line x1="18" y1="16" x2="20" y2="20" />
          </svg>
        );
      case "Rent":
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        );
      case "Entertainment":
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
            <line x1="7" y1="2" x2="7" y2="22" />
            <line x1="17" y1="2" x2="17" y2="22" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <line x1="2" y1="7" x2="7" y2="7" />
            <line x1="2" y1="17" x2="7" y2="17" />
            <line x1="17" y1="17" x2="22" y2="17" />
            <line x1="17" y1="7" x2="22" y2="7" />
          </svg>
        );
      case "Household":
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v20M17 5H9.5" />
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          </svg>
        );
      default:
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
        );
    }
  };



  // UPI configuration
  const roommate = roommates[0];
  const roommateName = roommate?.name || "Roommate";
  const upiId = roommate?.upi_id;

  const payAmount = settleOption === "full"
    ? totalOwed
    : settleOption === "half"
    ? totalOwed / 2
    : parseFloat(customAmount) || 0;

  const upiUrl = upiId
    ? `upi://pay?pa=${upiId}&pn=${encodeURIComponent(roommateName)}&am=${payAmount}&cu=INR&tn=${encodeURIComponent('RoomOS Settlement')}`
    : "";

  return (
    <main className="flex-1 flex flex-col bg-[#111118] min-h-screen relative" style={{ padding: '20px 20px 120px 20px', maxWidth: 430, margin: '0 auto' }}>
      <PullToRefresh onRefresh={() => refetchAll()}>
        <PageHeader title="Expenses" showBack={false} />

        {/* Two stat pills row */}
        <section className="flex gap-3" style={{ marginBottom: 16 }}>
          <button
            onClick={() => { navigator.vibrate?.(10); setShowSettleModal(true); }}
            className="flex-1 py-1.5 px-4 rounded-[999px] text-[13px] font-semibold text-center select-none cursor-pointer focus:outline-none transition-colors"
            style={{
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.07)',
              color: 'rgba(255,255,255,0.80)'
            }}
          >
            You owe ₹{totalOwed.toFixed(0)}
          </button>
          <div className="flex-1 py-1.5 px-4 rounded-[999px] border border-white/10 bg-white/[0.06] text-white/60 text-[13px] font-semibold text-center select-none">
            Total ₹{totalExpenses.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
        </section>

        {/* Filters: Categories & Month & Summary */}
        <section className="w-full overflow-hidden flex flex-col gap-2.5">
          {/* Category filters */}
          <div 
            className="flex gap-2 overflow-x-auto pb-1 scrollbar-none"
            style={{
              msOverflowStyle: "none",
              scrollbarWidth: "none",
              marginBottom: 10
            }}
          >
            {categories.map((cat) => {
              const isActive = activeCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => { navigator.vibrate?.(10); setActiveCategory(cat.key); }}
                  className={`py-1.5 px-4 rounded-[999px] border-0 cursor-pointer text-[13px] font-medium whitespace-nowrap transition-colors focus:outline-none ${
                    isActive
                      ? "bg-white/15 border border-white/30 text-white"
                      : "bg-white/5 border border-white/10 text-white/40"
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Month scroll filters */}
          <div 
            className="flex gap-2 overflow-x-auto pb-1 scrollbar-none"
            style={{
              msOverflowStyle: "none",
              scrollbarWidth: "none",
              marginBottom: 12
            }}
          >
            {getMonthFilters().map((mFilter) => {
              const isActive = activeMonth === mFilter.key;
              return (
                <button
                  key={mFilter.key}
                  onClick={() => { navigator.vibrate?.(10); setActiveMonth(mFilter.key); }}
                  className={`py-1 px-3 rounded-[999px] border-0 cursor-pointer text-[11px] font-bold whitespace-nowrap transition-colors focus:outline-none ${
                    isActive
                      ? "bg-white/15 border border-white/30 text-white"
                      : "bg-white/5 border border-white/10 text-white/40"
                  }`}
                >
                  {mFilter.label}
                </button>
              );
            })}
          </div>

          {/* Summary Row */}
          <div className="text-white/55 text-[12px] font-semibold tracking-wide px-1 py-1.5 select-none bg-white/[0.03] border border-white/[0.08] rounded-[10px] text-center mt-0.5" style={{ marginBottom: 16 }}>
            Filtered Total: <span className="text-white font-bold">₹{filteredSum.toFixed(0)}</span> · Your share: <span className="text-white font-bold">₹{filteredYourShare.toFixed(0)}</span>
          </div>
        </section>

        {/* Expense list */}
        <section className="flex flex-col gap-[4px]">
          {expenses.length === 0 ? (
            <section className="flex flex-col items-center justify-center py-16 text-center select-none animate-fade-in">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="rgba(255, 255, 255, 0.08)" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <span className="text-white font-medium text-[15px] mt-4">No expenses yet</span>
              <span className="text-white/35 text-[13px] mt-1">Add your first shared expense</span>
            </section>
          ) : Object.keys(groupedExpenses).length > 0 ? (
            Object.entries(groupedExpenses).map(([dateLabel, dayExpenses], index) => (
              <div key={dateLabel} style={{ marginBottom: 24 }}>
                {/* Date section header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: 10,
                  marginTop: index > 0 ? 20 : 0
                }}>
                  <span style={{
                    color: 'rgba(255,255,255,0.45)',
                    fontSize: 12,
                    fontWeight: 600,
                    letterSpacing: '0.04em'
                  }}>
                    {dateLabel}
                  </span>
                  <div style={{
                    flex: 1,
                    height: 1,
                    background: 'rgba(255,255,255,0.06)'
                  }} />
                  <span style={{
                    color: 'rgba(255,255,255,0.25)',
                    fontSize: 11
                  }}>
                    ₹{dayExpenses.reduce((s: number, e) => s + e.amount, 0).toLocaleString('en-IN')}
                  </span>
                </div>
                {/* Expenses for this date */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {dayExpenses.map((exp) => {
                    const payerName = exp.profiles?.name || "Unknown";
                    const payerProfile = members.find(m => m.id === exp.paid_by || m.name === payerName);
                    const payerColor = payerProfile?.avatar_color || '#3a3a4a';
                    const expTime = new Date(exp.expense_date || exp.created_at)
                      .toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

                    return (
                      <GlassCard key={exp.id} className="flex items-center gap-3 p-4">
                        {/* Left SVG Icon Wrapper */}
                        <div className="w-[42px] h-[42px] rounded-full bg-white/8 border border-white/12 flex items-center justify-center flex-shrink-0 select-none">
                          {getCategoryIcon(exp.category)}
                        </div>

                        {/* Middle Info */}
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-white font-bold text-[15px] truncate">{exp.name}</span>
                            {exp.is_recurring && (
                              <span className="px-2 py-0.5 text-[9px] font-bold text-white/90 bg-white/10 border border-white/20 rounded-full flex-shrink-0 uppercase tracking-wider select-none">
                                Monthly
                              </span>
                            )}
                          </div>
                          <span className="text-white/50 text-[12px] mt-0.5">{exp.category}</span>
                          <div className="flex items-center gap-1.5 mt-0.5 select-none">
                            <div 
                              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white font-bold"
                              style={{ background: payerColor }}
                            >
                              {payerName[0].toUpperCase()}
                            </div>
                            <span className="text-white/40 text-[11px]">Paid by {payerName}</span>
                          </div>
                        </div>

                        {/* Right Info */}
                        <div className="ml-auto text-right flex-shrink-0 flex flex-col justify-center">
                          <span className="text-white font-bold text-[15px]">₹{exp.amount}</span>
                          {exp.splits ? (() => {
                            const myShare = exp.splits.find((s) => s.user_id === userId)?.amount || 0;
                            return (
                              <span className="text-white/50 text-[12px] mt-0.5">Your share: ₹{myShare.toFixed(0)}</span>
                            );
                          })() : (
                            <span className="text-white/50 text-[12px] mt-0.5">₹{(exp.amount / members.length).toFixed(0)} each</span>
                          )}
                          <span className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.30)' }}>{expTime}</span>
                        </div>
                      </GlassCard>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-white/40 py-16 text-sm">
              No expenses in this category.
            </div>
          )}
        </section>
      </PullToRefresh>

      {/* Floating Add Expense Button */}
      <button
        onClick={() => { navigator.vibrate?.(10); setShowModal(true); }}
        style={{
          position: 'fixed',
          bottom: 'calc(110px + env(safe-area-inset-bottom))',
          right: 20,
          background: 'rgba(255,255,255,0.08)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '50%',
          width: 52,
          height: 52,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          cursor: 'pointer',
          zIndex: 40,
          color: 'white'
        }}
        aria-label="Add Expense"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>

      {/* Add Expense Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-[8px]">
          {/* Backdrop Click Dismiss */}
          <div className="absolute inset-0" onClick={() => { navigator.vibrate?.(10); setShowModal(false); }} />
          
          <div className="relative w-full max-w-[430px] bg-[#111118]/95 rounded-t-[24px] p-6 z-10 flex flex-col gap-4 shadow-[0_-8px_32px_rgba(0,0,0,0.5)] backdrop-blur-[40px] border-t border-white/[0.12]" style={{ paddingBottom: "calc(24px + env(safe-area-inset-bottom) + 80px)", maxHeight: "85vh", overflowY: "auto" }}>
            <h3 className="text-white font-bold text-[18px]">Add New Expense</h3>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Expense Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-white/60 text-xs font-semibold uppercase tracking-wider">
                  Expense Name
                </label>
                <input
                  type="text"
                  placeholder="Pizza Night, Electricity..."
                  value={expenseName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full bg-white/[0.06] border border-white/[0.10] rounded-[12px] px-4 py-3.5 text-white placeholder-white/25 outline-none focus:border-white/30 transition-colors text-[16px]"
                  required
                />
                {/* Suggestions */}
                {nameSuggestions.length > 0 && (
                  <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: 6,
                    marginTop: 6 
                  }}>
                    {nameSuggestions.map(name => (
                      <button
                        key={name}
                        onClick={() => {
                          setExpenseName(name)
                          setNameSuggestions([])
                          navigator.vibrate?.(8)
                        }}
                        style={{
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.12)',
                          borderRadius: 999,
                          padding: '4px 12px',
                          color: 'rgba(255,255,255,0.65)',
                          fontSize: 13,
                          cursor: 'pointer'
                        }}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Amount */}
              <div className="flex flex-col gap-1.5">
                <label className="text-white/60 text-xs font-semibold uppercase tracking-wider">
                  Amount ₹
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-white/[0.06] border border-white/[0.10] rounded-[12px] px-4 py-3.5 text-white placeholder-white/25 outline-none focus:border-white/30 transition-colors text-[16px]"
                  required
                />
              </div>

              {/* Category selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-white/60 text-xs font-semibold uppercase tracking-wider">
                  Category
                </label>
                <div 
                  className="flex gap-2 overflow-x-auto pb-1 scrollbar-none"
                  style={{
                    msOverflowStyle: "none",
                    scrollbarWidth: "none",
                  }}
                >
                  {categories.slice(1).map((cat) => {
                    const isSelected = modalCategory === cat.key;
                    return (
                      <button
                        type="button"
                        key={cat.key}
                        onClick={() => { navigator.vibrate?.(10); setModalCategory(cat.key); }}
                        className={`py-1.5 px-4 rounded-[999px] border-0 cursor-pointer text-[13px] font-medium whitespace-nowrap transition-colors focus:outline-none ${
                          isSelected
                            ? "bg-white/15 border border-white/30 text-white"
                            : "bg-white/5 border border-white/10 text-white/40"
                        }`}
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Paid By selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-white/60 text-xs font-semibold uppercase tracking-wider">Paid By</label>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {members.map((m) => {
                    const isSelected = paidBy === m.id;
                    const isSelf = m.id === userId;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => { navigator.vibrate?.(5); setPaidBy(m.id); }}
                        className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-all whitespace-nowrap cursor-pointer border-0 ${
                          isSelected
                            ? 'bg-white/15 border border-white/30 text-white shadow-sm'
                            : 'bg-white/[0.05] border border-white/5 text-white/50 hover:bg-white/[0.08]'
                        }`}
                      >
                        {m.name} {isSelf && "(You)"}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Date & Time Field */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ 
                  color: 'rgba(255,255,255,0.45)', 
                  fontSize: 11, 
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em'
                }}>
                  Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    borderRadius: 12,
                    padding: '12px 16px',
                    color: 'rgba(255,255,255,0.90)',
                    fontSize: 16,
                    width: '100%',
                    outline: 'none',
                    colorScheme: 'dark'
                  }}
                />
              </div>

              {/* Split Selector pill tabs */}
              <div className="flex flex-col gap-1.5">
                <label className="text-white/60 text-xs font-semibold uppercase tracking-wider">Split Mode</label>
                <div className="flex bg-white/[0.06] p-1 rounded-[12px] border border-white/[0.12]">
                  <button
                    type="button"
                    onClick={() => { navigator.vibrate?.(5); setSplitType('equal'); }}
                    className={`flex-1 py-2 rounded-[999px] text-sm font-semibold transition-colors border-0 focus:outline-none cursor-pointer ${
                      splitType === 'equal'
                        ? 'bg-white/15 border border-white/30 text-white'
                        : 'bg-transparent text-white/40'
                    }`}
                  >
                    Equal
                  </button>
                  <button
                    type="button"
                    onClick={() => { navigator.vibrate?.(5); setSplitType('percent'); }}
                    className={`flex-1 py-2 rounded-[999px] text-sm font-semibold transition-colors border-0 focus:outline-none cursor-pointer ${
                      splitType === 'percent'
                        ? 'bg-white/15 border border-white/30 text-white'
                        : 'bg-transparent text-white/40'
                    }`}
                  >
                    Percent %
                  </button>
                  <button
                    type="button"
                    onClick={() => { navigator.vibrate?.(5); setSplitType('amount'); }}
                    className={`flex-1 py-2 rounded-[999px] text-sm font-semibold transition-colors border-0 focus:outline-none cursor-pointer ${
                      splitType === 'amount'
                        ? 'bg-white/15 border border-white/30 text-white'
                        : 'bg-transparent text-white/40'
                    }`}
                  >
                    Custom ₹
                  </button>
                </div>
              </div>

              {/* Custom Splits inputs */}
              {splitType === 'equal' && (
                <div className="text-white/50 text-[13px] italic px-1">
                  Split equally — ₹{(parseFloat(amount) ? (parseFloat(amount) / members.length).toFixed(0) : "0")} each.
                </div>
              )}

              {splitType === 'percent' && (
                <div className="flex flex-col gap-2">
                  {members.map((m) => (
                    <div key={m.id} className="flex items-center justify-between gap-4">
                      <span className="text-white text-sm truncate">{m.name} {m.id === userId && "(You)"}</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          value={memberSplits[m.id] || ""}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setMemberSplits(prev => ({ ...prev, [m.id]: val }));
                          }}
                          placeholder="0"
                          className="w-20 bg-white/[0.06] border border-white/[0.10] rounded-[8px] px-3 py-1.5 text-white placeholder-white/20 text-center outline-none focus:border-white/30 text-sm"
                        />
                        <span className="text-white/60 text-sm">%</span>
                      </div>
                    </div>
                  ))}
                  <div className="text-white/40 text-[11px] text-right">
                    Total: {Object.values(memberSplits).reduce((s, v) => s + v, 0)}% / 100%
                  </div>
                </div>
              )}

              {splitType === 'amount' && (
                <div className="flex flex-col gap-2">
                  {members.map((m) => (
                    <div key={m.id} className="flex items-center justify-between gap-4">
                      <span className="text-white text-sm truncate">{m.name} {m.id === userId && "(You)"}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-white/65 text-sm">₹</span>
                        <input
                          type="number"
                          value={memberSplits[m.id] || ""}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setMemberSplits(prev => ({ ...prev, [m.id]: val }));
                          }}
                          placeholder="0.00"
                          className="w-24 bg-white/[0.06] border border-white/[0.10] rounded-[8px] px-3 py-1.5 text-white placeholder-white/20 text-center outline-none focus:border-white/30 text-sm"
                        />
                      </div>
                    </div>
                  ))}
                  <div className="text-white/40 text-[11px] text-right">
                    Total: ₹{Object.values(memberSplits).reduce((s, v) => s + v, 0).toFixed(0)} / ₹{amount || "0"}
                  </div>
                </div>
              )}

              {/* Recurring Switch */}
              <div className="flex items-center justify-between py-2 border-t border-b border-white/[0.05]">
                <span className="text-white text-sm">Recurring Monthly Expense</span>
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex flex-col gap-2 mt-2">
                <button
                  type="submit"
                  className="w-full bg-white/12 text-white font-bold rounded-[12px] py-3.5 text-[15px] border border-white/20 hover:bg-white/18 transition-colors focus:outline-none cursor-pointer"
                >
                  Submit
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="text-center text-white/40 text-[13px] hover:text-white/60 transition-colors py-1 bg-transparent border-0 focus:outline-none cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settle Up Modal */}
      {showSettleModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-[8px]">
          <div className="absolute inset-0" onClick={() => setShowSettleModal(false)} />
          
          <div className="relative w-full max-w-[430px] bg-[#111118]/95 rounded-t-[24px] p-6 z-10 flex flex-col gap-4 shadow-[0_-8px_32px_rgba(0,0,0,0.5)] backdrop-blur-[40px] border-t border-white/[0.12]" style={{ paddingBottom: "calc(24px + env(safe-area-inset-bottom) + 80px)", maxHeight: "85vh", overflowY: "auto" }}>
            <h3 className="text-white font-bold text-[18px]">Settle Up</h3>

            {totalOwed <= 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <h4 className="text-white font-bold text-[16px]">You are all settled up!</h4>
                <button
                  type="button"
                  onClick={() => setShowSettleModal(false)}
                  className="mt-4 w-full bg-white/12 text-white font-bold rounded-[12px] py-3.5 text-[15px] border border-white/20 hover:bg-white/18 transition-colors focus:outline-none cursor-pointer"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {/* Settle option selector */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-white/60 text-xs font-semibold uppercase tracking-wider">
                    Settlement Amount
                  </label>
                  <div className="flex bg-white/[0.06] p-1 rounded-[12px] border border-white/[0.12]">
                    <button
                      type="button"
                      onClick={() => setSettleOption("full")}
                      className={`flex-1 py-2 rounded-[999px] text-[13px] font-semibold transition-colors border-0 focus:outline-none cursor-pointer ${
                        settleOption === "full"
                          ? "bg-white/15 border border-white/30 text-white"
                          : "bg-transparent text-white/40"
                      }`}
                    >
                      Full (₹{totalOwed.toFixed(0)})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettleOption("half")}
                      className={`flex-1 py-2 rounded-[999px] text-[13px] font-semibold transition-colors border-0 focus:outline-none cursor-pointer ${
                        settleOption === "half"
                          ? "bg-white/15 border border-white/30 text-white"
                          : "bg-transparent text-white/40"
                      }`}
                    >
                      Half (₹{(totalOwed / 2).toFixed(0)})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettleOption("custom")}
                      className={`flex-1 py-2 rounded-[999px] text-[13px] font-semibold transition-colors border-0 focus:outline-none cursor-pointer ${
                        settleOption === "custom"
                          ? "bg-white/15 border border-white/30 text-white"
                          : "bg-transparent text-white/40"
                      }`}
                    >
                      Custom
                    </button>
                  </div>
                </div>

                {/* Custom Amount Input */}
                {settleOption === "custom" && (
                  <div className="flex flex-col gap-1.5 animate-fade-in">
                    <label className="text-white/60 text-xs font-semibold uppercase tracking-wider">
                      Custom Amount ₹
                    </label>
                    <input
                      type="number"
                      placeholder="Enter amount"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      className="w-full bg-white/[0.06] border border-white/[0.10] rounded-[12px] px-4 py-3.5 text-white placeholder-white/25 outline-none focus:border-white/30 transition-colors text-[16px]"
                      required
                    />
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col gap-2 mt-2">
                  {upiId ? (
                    <>
                      <button
                        onClick={() => window.open(upiUrl, "_blank")}
                        className="w-full bg-white/12 text-white font-bold rounded-[12px] py-3.5 text-[15px] border border-white/20 hover:bg-white/18 transition-colors focus:outline-none cursor-pointer text-center block"
                      >
                        Pay via UPI (₹{payAmount.toFixed(0)})
                      </button>

                      <button
                        type="button"
                        onClick={handleCopyUpi}
                        className="w-full bg-white/5 border border-white/10 text-white/70 font-semibold rounded-[12px] py-2.5 text-[13px] hover:bg-white/10 transition-colors focus:outline-none cursor-pointer text-center"
                      >
                        {upiCopied ? "Copied! ✓" : "Copy UPI ID"}
                      </button>

                      <div className="text-white/40 text-[11px] text-center px-4 mt-1">
                        On iPhone, copy UPI ID and pay manually in your UPI app
                      </div>
                    </>
                  ) : (
                    <div className="bg-white/[0.06] border border-white/10 rounded-[12px] p-4 text-center text-white/50 text-[13px]">
                      Your roommate has not set their UPI ID yet. They can set it in their Profile settings.
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleSettleUp}
                    className="w-full bg-white/[0.06] border border-white/10 text-white font-semibold rounded-[12px] py-3.5 text-[15px] hover:bg-white/[0.12] transition-colors focus:outline-none cursor-pointer mt-1"
                  >
                    Mark as Settled
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowSettleModal(false)}
                    className="text-center text-white/40 text-[13px] hover:text-white/60 transition-colors py-1 bg-transparent border-0 focus:outline-none cursor-pointer mt-1"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Bottom Nav */}
      <BottomNav active="expenses" />
    </main>
  );
}
