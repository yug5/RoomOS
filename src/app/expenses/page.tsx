"use client";

import React, { useState, useEffect, useRef } from "react";
import BottomNav from "@/components/BottomNav";
import { useRoomContext, ExpenseItem } from "@/lib/RoomContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/Toast";
import { Skeleton } from "@/components/Skeleton";
import { PullToRefresh } from "@/components/PullToRefresh";

// Simple inline date formatter to avoid using date-fns
const formatDate = (dateStr?: string | Date) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[date.getMonth()]} ${date.getDate()}`;
};

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
    refetchActivity,
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
  const [activeTab, setActiveTab] = useState<"unsettled" | "settled">("unsettled");
  const [showModal, setShowModal] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [settleOption, setSettleOption] = useState<"full" | "half" | "custom">("full");
  const [customAmount, setCustomAmount] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [upiCopied, setUpiCopied] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | number | null>(null);

  // Swipe & Hover states
  const [swipedId, setSwipedId] = useState<string | number | null>(null);
  const [hoveredId, setHoveredId] = useState<string | number | null>(null);
  const [isTouch, setIsTouch] = useState(false);
  const touchStartX = useRef<number | null>(null);

  // Local expenses for optimistic updates
  const [localExpenses, setLocalExpenses] = useState<ExpenseItem[]>([]);

  // Form states
  const [expenseName, setExpenseName] = useState("");
  const [amount, setAmount] = useState("");
  const [modalCategory, setModalCategory] = useState("Food");
  const [paidBy, setPaidBy] = useState<string>("");
  const [splitType, setSplitType] = useState<'equal' | 'percent' | 'amount'>('equal');
  const [memberSplits, setMemberSplits] = useState<Record<string, number>>({});
  const [expenseDate, setExpenseDate] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 16);
  });
  const [nameSuggestions, setNameSuggestions] = useState<string[]>([]);

  const pastNames = Array.from(new Set(expenses.map((e) => e.name))).slice(0, 15);

  // Detect Touch Support
  useEffect(() => {
    setIsTouch(('ontouchstart' in window) || (navigator.maxTouchPoints > 0));
  }, []);

  // Update local expenses from context
  useEffect(() => {
    setLocalExpenses(expenses);
  }, [expenses]);

  // Set default payer
  useEffect(() => {
    if (userId) {
      setPaidBy(userId);
    }
  }, [userId]);

  // Reset splits form on modal state
  useEffect(() => {
    if (showModal && !editingExpenseId) {
      const initialSplits: Record<string, number> = {};
      members.forEach((m) => {
        initialSplits[m.id] = 0;
      });
      setMemberSplits(initialSplits);
      setSplitType("equal");
      const now = new Date();
      setExpenseDate(now.toISOString().slice(0, 16));
      setNameSuggestions([]);
    }
  }, [showModal, members, editingExpenseId]);

  const roommates = members.filter((m) => m.id !== userId);

  const handleNameChange = (value: string) => {
    setExpenseName(value);
    if (value.length > 1) {
      const matches = pastNames.filter(n =>
        n.toLowerCase().startsWith(value.toLowerCase()) &&
        n.toLowerCase() !== value.toLowerCase()
      );
      setNameSuggestions(matches.slice(0, 4));
    } else {
      setNameSuggestions([]);
    }
  };

  // Touch Swipe handlers
  const handleTouchStart = (e: React.TouchEvent, expenseId: string | number) => {
    touchStartX.current = e.touches[0].clientX;
    if (swipedId && swipedId !== expenseId) {
      setSwipedId(null);
    }
  };

  const handleTouchMove = (e: React.TouchEvent, expenseId: string | number) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.touches[0].clientX;
    const threshold = activeTab === 'settled' ? 30 : 60;
    if (diff > threshold) {
      setSwipedId(expenseId);
    } else if (diff < -20) {
      setSwipedId(null);
    }
  };

  const handleTouchEnd = () => {
    touchStartX.current = null;
  };

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

  // Split Type Switcher
  const handleSplitTypeChange = (newType: 'equal' | 'percent' | 'amount') => {
    setSplitType(newType);
    const parsedAmount = parseFloat(amount) || 0;
    if (parsedAmount <= 0) return;

    if (newType === 'percent') {
      const newSplits: Record<string, number> = {};
      members.forEach(m => {
        const currentAmt = memberSplits[m.id] || (parsedAmount / members.length);
        newSplits[m.id] = parseFloat(((currentAmt / parsedAmount) * 100).toFixed(1));
      });
      setMemberSplits(newSplits);
    } else if (newType === 'amount') {
      const newSplits: Record<string, number> = {};
      members.forEach(m => {
        if (splitType === 'percent') {
          const pct = memberSplits[m.id] || (100 / members.length);
          newSplits[m.id] = parseFloat(((pct / 100) * parsedAmount).toFixed(1));
        } else {
          newSplits[m.id] = parseFloat((parsedAmount / members.length).toFixed(1));
        }
      });
      setMemberSplits(newSplits);
    }
  };

  // Submit Handler (Add / Edit)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseName || !amount || !roomId || !userId) return;
    navigator.vibrate?.(10);

    try {
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) return;

      if (splitType === 'percent') {
        const totalPct = Object.values(memberSplits).reduce((s, v) => s + v, 0);
        if (Math.abs(totalPct - 100) > 0.5) {
          showToast('Percentages must equal 100%', 'error');
          return;
        }
      } else if (splitType === 'amount') {
        const totalAmt = Object.values(memberSplits).reduce((s, v) => s + v, 0);
        if (Math.abs(totalAmt - parsedAmount) > 1.0) {
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

      const payload = {
        room_id: roomId,
        name: expenseName,
        amount: parsedAmount,
        category: modalCategory,
        paid_by: paidBy,
        is_recurring: isRecurring,
        splits: splits,
        expense_date: new Date(expenseDate).toISOString()
      };

      if (editingExpenseId) {
        // Optimistic local update
        setLocalExpenses(prev => prev.map(exp => 
          exp.id === editingExpenseId ? { ...exp, ...payload, splits, profiles: members.find(m => m.id === paidBy) ? { name: members.find(m => m.id === paidBy)!.name } : exp.profiles } : exp
        ));

        const { error: updateError } = await supabase
          .from('expenses')
          .update(payload)
          .eq('id', editingExpenseId);

        if (updateError) throw updateError;

        await supabase.from('activity').insert({
          room_id: roomId,
          user_name: profile?.name || 'User',
          action: `updated expense "${expenseName}"`
        });

        showToast('Updated');
      } else {
        const { error: insertError } = await supabase
          .from('expenses')
          .insert({
            ...payload,
            is_settled: false
          });

        if (insertError) throw insertError;

        await supabase.from('activity').insert({
          room_id: roomId,
          user_name: profile?.name || 'User',
          action: `added expense "${expenseName}"`
        });

        showToast('Expense added');
      }

      // Reset
      setExpenseName("");
      setAmount("");
      setModalCategory("Food");
      setPaidBy(userId);
      setIsRecurring(false);
      setShowModal(false);
      setEditingExpenseId(null);

      await refetchExpenses();
      await refetchActivity();
    } catch (err) {
      console.error('Error saving expense:', err);
      showToast('Failed to save', 'error');
      await refetchExpenses();
    }
  };

  // Settle single expense
  const settleExpense = async (expenseId: string | number) => {
    navigator.vibrate?.(10);
    const expense = localExpenses.find(e => e.id === expenseId);
    if (!expense) return;

    const myShare = expense.splits?.find((s) => s.user_id === userId);
    const amountOwed = myShare?.amount || (expense.amount / members.length);

    // Optimistic Update
    setLocalExpenses(prev => prev.map(e =>
      e.id === expenseId ? { ...e, is_settled: true } : e
    ));

    try {
      const { error } = await supabase.from('expenses')
        .update({ is_settled: true })
        .eq('id', expenseId);

      if (error) throw error;

      const payeeName = members.find(m => m.id === expense.paid_by)?.name || 'roommate';
      await supabase.from('activity').insert({
        room_id: roomId,
        user_name: profile?.name || 'User',
        action: `settled ₹${amountOwed.toFixed(0)} with ${payeeName}`
      });

      showToast('Settled!');
      setSwipedId(null);
      setHoveredId(null);
      await refetchExpenses();
      await refetchActivity();
    } catch (err) {
      console.error('Error settling expense:', err);
      showToast('Failed to settle', 'error');
      // Revert
      await refetchExpenses();
    }
  };

  // Delete single expense
  const deleteExpense = async (expenseId: string | number) => {
    navigator.vibrate?.(10);
    const expense = localExpenses.find(e => e.id === expenseId);
    if (!expense) return;

    // Optimistic Update
    setLocalExpenses(prev => prev.filter(e => e.id !== expenseId));

    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId);

      if (error) throw error;

      await supabase.from('activity').insert({
        room_id: roomId,
        user_name: profile?.name || 'User',
        action: `deleted expense "${expense.name}"`
      });

      showToast('Deleted');
      setSwipedId(null);
      setHoveredId(null);
      await refetchExpenses();
      await refetchActivity();
    } catch (err) {
      console.error('Error deleting expense:', err);
      showToast('Failed to delete', 'error');
      // Revert
      await refetchExpenses();
    }
  };

  // Mark single expense as unsettled
  const handleMarkUnsettled = async (expenseId: string | number) => {
    navigator.vibrate?.(10);

    // Optimistic Update
    setLocalExpenses(prev => prev.map(e =>
      e.id === expenseId ? { ...e, is_settled: false } : e
    ));

    try {
      const { error } = await supabase.from('expenses')
        .update({ is_settled: false })
        .eq('id', expenseId);

      if (error) throw error;

      await supabase.from('activity').insert({
        room_id: roomId,
        user_name: profile?.name || 'User',
        action: `marked expense as unsettled`
      });

      showToast('Marked as unsettled');
      setSwipedId(null);
      setHoveredId(null);
      await refetchExpenses();
      await refetchActivity();
    } catch {
      showToast('Failed to mark unsettled', 'error');
      await refetchExpenses();
    }
  };

  // Open Edit Modal
  const openEditModal = (expense: ExpenseItem) => {
    navigator.vibrate?.(10);
    setEditingExpenseId(expense.id);
    setExpenseName(expense.name);
    setAmount(expense.amount.toString());
    setModalCategory(expense.category);
    setPaidBy(expense.paid_by);
    setIsRecurring(expense.is_recurring);
    setExpenseDate(new Date(expense.expense_date || expense.created_at).toISOString().slice(0, 16));

    const initialSplits: Record<string, number> = {};
    if (expense.splits) {
      expense.splits.forEach(s => {
        initialSplits[s.user_id] = s.amount;
      });

      const amounts = Object.values(initialSplits);
      const isAllEqual = amounts.length === members.length && amounts.every((v, _, arr) => Math.abs(v - arr[0]) < 0.01);

      if (isAllEqual) {
        setSplitType('equal');
      } else {
        setSplitType('amount');
        setMemberSplits(initialSplits);
      }
    } else {
      setSplitType('equal');
      members.forEach(m => {
        initialSplits[m.id] = 0;
      });
      setMemberSplits(initialSplits);
    }

    setSwipedId(null);
    setHoveredId(null);
    setShowModal(true);
  };

  const openAddModal = () => {
    navigator.vibrate?.(10);
    setEditingExpenseId(null);
    setExpenseName("");
    setAmount("");
    setModalCategory("Food");
    setPaidBy(userId || "");
    setIsRecurring(false);
    
    const now = new Date();
    setExpenseDate(now.toISOString().slice(0, 16));
    
    const initialSplits: Record<string, number> = {};
    members.forEach((m) => {
      initialSplits[m.id] = 0;
    });
    setMemberSplits(initialSplits);
    setSplitType("equal");
    
    setSwipedId(null);
    setHoveredId(null);
    setShowModal(true);
  };

  // Settle all via UPI
  const handleSettleUpAll = async () => {
    if (!roomId) return;
    navigator.vibrate?.(10);
    try {
      const { error: updateError } = await supabase
        .from('expenses')
        .update({ is_settled: true })
        .eq('room_id', roomId)
        .eq('is_settled', false);

      if (updateError) throw updateError;

      await supabase.from('activity').insert({
        room_id: roomId,
        user_name: profile?.name || 'User',
        action: `settled all expenses`
      });

      showToast('All settled!');
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

  // Total Owed calculations (overall unsettled paid by roommates)
  const totalOwed = localExpenses
    .filter(e => !e.is_settled && e.paid_by !== userId)
    .reduce((sum, e) => {
      if (e.splits) {
        const myShare = e.splits.find((s) => s.user_id === userId);
        return sum + (myShare?.amount || 0);
      }
      return sum + (e.amount / members.length);
    }, 0);

  // Filters logic
  const filteredExpenses = localExpenses.filter(exp => {
    const matchesTab = activeTab === "unsettled" ? !exp.is_settled : exp.is_settled;
    const matchesCategory = activeCategory === "All" || exp.category?.toLowerCase() === activeCategory.toLowerCase();
    const matchesTime = matchesMonth(exp.expense_date || exp.created_at, activeMonth);
    return matchesTab && matchesCategory && matchesTime;
  });

  const filteredByCategoryAndMonth = localExpenses.filter(exp => {
    const matchesCategory = activeCategory === "All" || exp.category?.toLowerCase() === activeCategory.toLowerCase();
    const matchesTime = matchesMonth(exp.expense_date || exp.created_at, activeMonth);
    return matchesCategory && matchesTime;
  });

  const monthTotal = filteredByCategoryAndMonth.reduce((sum, e) => sum + e.amount, 0);
  const yourShare = filteredByCategoryAndMonth
    .filter(e => !e.is_settled && e.paid_by !== userId)
    .reduce((sum, e) => {
      if (e.splits) {
        const myShare = e.splits.find((s) => s.user_id === userId);
        return sum + (myShare?.amount || 0);
      }
      return sum + (e.amount / members.length);
    }, 0);

  const groupedExpenses = groupExpensesByDate(filteredExpenses);

  function groupExpensesByDate(expensesList: ExpenseItem[]) {
    const groups: { [key: string]: ExpenseItem[] } = {};
    expensesList.forEach(expense => {
      const date = new Date(expense.expense_date || expense.created_at);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      let label: string;
      if (date.toDateString() === today.toDateString()) {
        label = 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        label = 'Yesterday';
      } else {
        label = date.toLocaleDateString('en-IN', { 
          day: 'numeric', 
          month: 'short',
          year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
        });
      }
      if (!groups[label]) groups[label] = [];
      groups[label].push(expense);
    });
    return groups;
  }



  // UPI configurations
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

  // Loader state
  if (loading && !initialized) {
    return (
      <main className="flex-1 flex flex-col bg-[#111118] min-h-screen" style={{ padding: '20px 20px 120px 20px', maxWidth: 430, margin: '0 auto' }}>
        <header className="flex justify-between items-center w-full mb-6">
          <Skeleton height={28} width={150} />
        </header>
        <Skeleton height={13} width={260} style={{ marginTop: 20 }} />
        <div style={{ marginTop: 20 }}>
          {[0, 1, 2, 3].map(i => (
            <Skeleton key={i} height={80} style={{ marginBottom: 10, borderRadius: 18 }} />
          ))}
        </div>
        <BottomNav active="expenses" />
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col bg-[#111118] min-h-screen relative" style={{ padding: '20px 20px 120px 20px', maxWidth: 430, margin: '0 auto' }}>
      <PullToRefresh onRefresh={() => refetchAll()}>
        {/* Custom Header */}
        <header className="flex justify-between items-center w-full mb-6 select-none">
          <h1 className="text-white font-bold text-[28px] leading-tight">
            Expenses
          </h1>
          <button 
            onClick={() => {
              navigator.vibrate?.(10);
              showToast('Filters configuration coming soon!');
            }}
            className="p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-white/70 transition-all focus:outline-none cursor-pointer"
            aria-label="Settings"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </header>

        {/* Filter and Sort Area */}
        <section className="w-full overflow-hidden flex flex-col gap-2">
          {/* Category Filter */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none mb-1" style={{ msOverflowStyle: "none", scrollbarWidth: "none" }}>
            {categories.map((cat) => {
              const isActive = activeCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => { navigator.vibrate?.(10); setActiveCategory(cat.key); }}
                  className={`py-1.5 px-4 rounded-[999px] border-0 cursor-pointer text-[13px] font-medium whitespace-nowrap transition-all focus:outline-none ${
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

          {/* Month Filter */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none mb-2" style={{ msOverflowStyle: "none", scrollbarWidth: "none" }}>
            {getMonthFilters().map((mFilter) => {
              const isActive = activeMonth === mFilter.key;
              return (
                <button
                  key={mFilter.key}
                  onClick={() => { navigator.vibrate?.(10); setActiveMonth(mFilter.key); }}
                  className={`py-1 px-3 rounded-[999px] border-0 cursor-pointer text-[11px] font-bold whitespace-nowrap transition-all focus:outline-none ${
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

          {/* Totals & Share Details */}
          <div className="flex flex-col gap-1 mb-4 px-1 select-none">
            <span className="text-white/50 text-[12px] font-semibold uppercase tracking-wider">Filtered Total</span>
            <div className="text-white font-bold text-[22px] leading-tight">₹{monthTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
            <div 
              onClick={() => {
                if (totalOwed > 0) {
                  navigator.vibrate?.(10);
                  setShowSettleModal(true);
                }
              }}
              className={`text-[13px] font-medium transition-colors mt-0.5 ${totalOwed > 0 ? "text-white/55 hover:text-white/80 cursor-pointer" : "text-white/45"}`}
            >
              You owe <span className="font-semibold text-white/80">₹{yourShare.toFixed(0)}</span>
              {totalOwed > 0 && <span className="text-[10px] text-white/30 ml-2 font-normal">(Tap to settle via UPI)</span>}
            </div>
          </div>

          {/* Divider */}
          <div className="w-full h-[1px] bg-white/[0.06] mb-4" />
        </section>

        {/* Tab Switcher */}
        <section className="flex w-full mb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={() => { navigator.vibrate?.(10); setActiveTab("unsettled"); }}
            className={`flex-1 pb-2.5 text-center text-[15px] font-semibold transition-all border-0 bg-transparent focus:outline-none cursor-pointer ${
              activeTab === "unsettled"
                ? "text-white border-b-2 border-white"
                : "text-white/35 hover:text-white/50"
            }`}
          >
            Unsettled
          </button>
          <button
            onClick={() => { navigator.vibrate?.(10); setActiveTab("settled"); }}
            className={`flex-1 pb-2.5 text-center text-[15px] font-semibold transition-all border-0 bg-transparent focus:outline-none cursor-pointer ${
              activeTab === "settled"
                ? "text-white border-b-2 border-white"
                : "text-white/35 hover:text-white/50"
            }`}
          >
            Settled
          </button>
        </section>

        {/* Expense Cards List */}
        <section className="flex flex-col gap-1.5">
          {filteredExpenses.length === 0 ? (
            <section className="flex flex-col items-center justify-center py-16 text-center select-none animate-fade-in">
              <div className="w-[64px] h-[64px] rounded-full bg-white/[0.02] border border-white/[0.05] flex items-center justify-center mb-4">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255, 255, 255, 0.08)" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
              {activeTab === "unsettled" ? (
                <>
                  <span className="text-white font-medium text-[15px]">No unsettled expenses</span>
                  <span className="text-white/35 text-[13px] mt-1">All settled! 🎉</span>
                </>
              ) : (
                <>
                  <span className="text-white font-medium text-[15px]">No settled expenses</span>
                  <span className="text-white/35 text-[13px] mt-1">Expenses will show here when settled</span>
                </>
              )}
            </section>
          ) : (
            Object.entries(groupedExpenses).map(([dateLabel, dayExpenses], dayIdx) => (
              <div key={dateLabel} style={{ marginBottom: 12 }}>
                {/* Date Group Header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: 10,
                  marginTop: dayIdx > 0 ? 12 : 0,
                  userSelect: 'none'
                }}>
                  <span style={{
                    color: 'rgba(255,255,255,0.45)',
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.04em'
                  }}>
                    {dateLabel}
                  </span>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                  <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>
                    ₹{dayExpenses.reduce((s: number, e) => s + e.amount, 0).toLocaleString('en-IN')}
                  </span>
                </div>

                {/* Day Expenses */}
                <div className="flex flex-col gap-2.5">
                  {dayExpenses.map((exp) => {
                    const isSettled = exp.is_settled;
                    const isSwiped = swipedId === exp.id || (!isTouch && hoveredId === exp.id);
                    const translateAmt = activeTab === 'settled' ? '-70px' : '-210px';
                    const payerName = exp.profiles?.name || "Unknown";
                    const payerProfile = members.find(m => m.id === exp.paid_by || m.name === payerName);
                    const payerColor = payerProfile?.avatar_color || '#3a3a4a';
                    
                    const myShare = exp.splits 
                      ? (exp.splits.find(s => s.user_id === userId)?.amount ?? 0)
                      : (exp.amount / members.length);
                    
                    const isEqualSplit = !exp.splits || exp.splits.length === 0 || exp.splits.every((s, _, arr) => Math.abs(s.amount - arr[0].amount) < 0.01);

                    return (
                      <div
                        key={exp.id}
                        className="relative w-full overflow-hidden"
                        style={{
                          borderRadius: 18,
                          background: activeTab === 'settled' ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.07)',
                          border: activeTab === 'settled' ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(255,255,255,0.10)'
                        }}
                        onMouseEnter={() => { if (!isTouch) setHoveredId(exp.id); }}
                        onMouseLeave={() => { if (!isTouch) setHoveredId(null); }}
                      >
                        {/* Swipe Action Buttons (Underlay) */}
                        <div 
                          style={{ 
                            position: 'absolute', 
                            right: 0, 
                            top: 0, 
                            bottom: 0, 
                            display: 'flex', 
                            flexDirection: 'row-reverse',
                            width: translateAmt.replace('-', ''),
                            zIndex: 5,
                            visibility: isSwiped ? 'visible' : 'hidden'
                          }}
                        >
                          {activeTab === 'unsettled' ? (
                            <>
                              {/* DELETE - far right */}
                              <button
                                onClick={() => deleteExpense(exp.id)}
                                className="flex items-center justify-center border-0 cursor-pointer focus:outline-none transition-colors"
                                style={{
                                  width: 70,
                                  backgroundColor: 'rgba(255,80,80,0.15)',
                                  borderLeft: '1px solid rgba(255,80,80,0.20)',
                                  color: 'rgba(255,80,80,0.8)'
                                }}
                                title="Delete"
                              >
                                <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" fill="none">
                                  <path d="M3 6h18M8 6v12a2 2 0 002 2h4a2 2 0 002-2V6m-3-3h-3" />
                                </svg>
                              </button>

                              {/* EDIT - orange/amber */}
                              <button
                                onClick={() => openEditModal(exp)}
                                className="flex items-center justify-center border-0 cursor-pointer focus:outline-none transition-colors"
                                style={{
                                  width: 70,
                                  backgroundColor: 'rgba(255,150,50,0.15)',
                                  borderLeft: '1px solid rgba(255,150,50,0.20)',
                                  color: 'rgba(255,150,50,0.8)'
                                }}
                                title="Edit"
                              >
                                <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" fill="none">
                                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                              </button>

                              {/* SETTLE - green */}
                              <button
                                onClick={() => settleExpense(exp.id)}
                                className="flex items-center justify-center border-0 cursor-pointer focus:outline-none transition-colors"
                                style={{
                                  width: 70,
                                  backgroundColor: 'rgba(100,200,100,0.15)',
                                  borderLeft: '1px solid rgba(100,200,100,0.20)',
                                  color: 'rgba(100,200,100,0.8)'
                                }}
                                title="Mark Settled"
                              >
                                <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" fill="none">
                                  <path d="M20 6L9 17l-5-5" />
                                </svg>
                              </button>
                            </>
                          ) : (
                            /* UNSETTLED - gray, which reverses the settle */
                            <button
                              onClick={() => handleMarkUnsettled(exp.id)}
                              className="flex items-center justify-center border-0 cursor-pointer focus:outline-none transition-colors"
                              style={{
                                width: 70,
                                backgroundColor: 'rgba(255,255,255,0.08)',
                                borderLeft: '1px solid rgba(255,255,255,0.15)',
                                color: 'rgba(255,255,255,0.6)'
                              }}
                              title="Mark Unsettled"
                            >
                              <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" fill="none">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M8 12h8M12 8v8" />
                              </svg>
                            </button>
                          )}
                        </div>

                        {/* Foreground Card Content */}
                        <div
                          className="transition-transform duration-200 ease-out"
                          style={{ 
                            transform: isSwiped ? `translateX(${translateAmt})` : 'translateX(0px)',
                            position: 'relative',
                            zIndex: 10,
                            background: '#151522', // Solid background blocks underlay buttons
                            padding: '14px',
                            borderRadius: 18,
                            opacity: isSettled ? 0.50 : 1,
                            boxShadow: '0 2px 20px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.08)'
                          }}
                          onTouchStart={(e) => handleTouchStart(e, exp.id)}
                          onTouchMove={(e) => handleTouchMove(e, exp.id)}
                          onTouchEnd={handleTouchEnd}
                        >
                          <div className="flex flex-col">
                            {/* Row 1 (header) */}
                            <div className="flex justify-between items-center">
                              <span className={`text-[15px] font-medium truncate pr-2 ${isSettled ? "text-white/50" : "text-white"}`}>
                                {exp.name}
                              </span>
                              <span className={`text-[16px] font-bold flex-shrink-0 ${isSettled ? "text-white/50" : "text-white"}`}>
                                ₹{exp.amount.toLocaleString('en-IN')}
                              </span>
                            </div>

                            {/* Row 2 (details) */}
                            <div className="flex justify-between items-center mt-2">
                              <div className="flex items-center gap-1.5 min-w-0 select-none">
                                <div 
                                  className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] text-white font-bold flex-shrink-0"
                                  style={{ background: payerColor, opacity: isSettled ? 0.5 : 1 }}
                                >
                                  {payerName[0]?.toUpperCase() ?? "U"}
                                </div>
                                <span className={`text-[12px] truncate ${isSettled ? "text-white/30" : "text-white/50"}`}>
                                  Paid by {payerName}
                                </span>
                              </div>
                              <span className={`text-[11px] font-medium ${isSettled ? "text-white/25" : "text-white/40"}`}>
                                {exp.category}
                              </span>
                              <span className={`text-[11px] flex-shrink-0 ${isSettled ? "text-white/20" : "text-white/30"}`}>
                                {formatDate(exp.expense_date || exp.created_at)}
                              </span>
                            </div>

                            {/* Row 3 (your share) */}
                            <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/[0.04]">
                              <span className={`text-[12px] ${isSettled ? "text-white/30" : "text-white/50"}`}>
                                Your share: ₹{myShare.toFixed(0)}
                              </span>
                              {exp.paid_by === userId ? (
                                <span className="text-[12px] font-semibold" style={{ color: isSettled ? 'rgba(255,255,255,0.40)' : 'rgba(255,255,255,0.70)' }}>
                                  You paid
                                </span>
                              ) : !isEqualSplit ? (
                                <span className="text-[12px] font-semibold" style={{ color: isSettled ? 'rgba(255,255,255,0.30)' : 'rgba(255,255,255,0.60)' }}>
                                  You owe ₹{myShare.toFixed(0)}
                                </span>
                              ) : (
                                <span className="text-[12px]" style={{ color: isSettled ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.50)' }}>
                                  Split equally: ₹{(exp.amount / members.length).toFixed(0)}
                                </span>
                              )}
                            </div>

                            {/* Row 4 (settled badge) */}
                            {isSettled && (
                              <div className="flex justify-end mt-2">
                                <span 
                                  className="select-none font-semibold"
                                  style={{ 
                                    backgroundColor: 'rgba(100,200,100,0.12)', 
                                    border: '1px solid rgba(100,200,100,0.18)', 
                                    color: 'rgba(100,200,100,0.7)',
                                    borderRadius: '999px',
                                    padding: '2px 8px',
                                    fontSize: '11px'
                                  }}
                                >
                                  ✓ Settled
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </section>
      </PullToRefresh>

      {/* Floating Add Expense Button */}
      <button
        onClick={openAddModal}
        style={{
          position: 'fixed',
          bottom: 'calc(90px + env(safe-area-inset-bottom))',
          right: 20,
          background: 'rgba(255,255,255,0.10)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.18)',
          borderRadius: '50%',
          width: 48,
          height: 48,
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
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>

      {/* Add / Edit Expense Modal Bottom Sheet */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-[8px]">
          {/* Backdrop Click Dismiss */}
          <div className="absolute inset-0" onClick={() => { navigator.vibrate?.(10); setShowModal(false); setEditingExpenseId(null); }} />
          
          <div className="relative w-full max-w-[430px] bg-[#111118]/95 rounded-t-[24px] p-6 z-10 flex flex-col gap-4 shadow-[0_-8px_32px_rgba(0,0,0,0.5)] backdrop-blur-[40px] border-t border-white/[0.12]" style={{ paddingBottom: "calc(24px + env(safe-area-inset-bottom) + 80px)", maxHeight: "85vh", overflowY: "auto" }}>
            <h3 className="text-white font-bold text-[18px] select-none">
              {editingExpenseId ? "Edit Expense" : "Add New Expense"}
            </h3>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Expense Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-white/60 text-xs font-semibold uppercase tracking-wider select-none">
                  Expense Name
                </label>
                <input
                  type="text"
                  placeholder="Pizza Night, Electricity..."
                  value={expenseName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full bg-white/[0.06] border border-white/[0.10] rounded-[12px] px-4 py-3.5 text-white placeholder-white/25 outline-none focus:border-white/35 transition-colors text-[16px]"
                  required
                />
                {/* Suggestions */}
                {nameSuggestions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {nameSuggestions.map(name => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => {
                          setExpenseName(name);
                          setNameSuggestions([]);
                          navigator.vibrate?.(8);
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
                <label className="text-white/60 text-xs font-semibold uppercase tracking-wider select-none">
                  Amount ₹
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-white/[0.06] border border-white/[0.10] rounded-[12px] px-4 py-3.5 text-white placeholder-white/25 outline-none focus:border-white/35 transition-colors text-[16px]"
                  required
                />
              </div>

              {/* Category picker */}
              <div className="flex flex-col gap-1.5">
                <label className="text-white/60 text-xs font-semibold uppercase tracking-wider select-none">
                  Category
                </label>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none" style={{ msOverflowStyle: "none", scrollbarWidth: "none" }}>
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

              {/* Paid By picker */}
              <div className="flex flex-col gap-1.5">
                <label className="text-white/60 text-xs font-semibold uppercase tracking-wider select-none">
                  Paid By
                </label>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none" style={{ msOverflowStyle: "none", scrollbarWidth: "none" }}>
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

              {/* Date Field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-white/60 text-xs font-semibold uppercase tracking-wider select-none">
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

              {/* Split Mode Selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-white/60 text-xs font-semibold uppercase tracking-wider select-none">
                  Split Mode
                </label>
                <div className="flex bg-white/[0.06] p-1 rounded-[12px] border border-white/[0.12]">
                  <button
                    type="button"
                    onClick={() => { navigator.vibrate?.(5); handleSplitTypeChange('equal'); }}
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
                    onClick={() => { navigator.vibrate?.(5); handleSplitTypeChange('percent'); }}
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
                    onClick={() => { navigator.vibrate?.(5); handleSplitTypeChange('amount'); }}
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

              {/* Splits Details Input Area */}
              {splitType === 'equal' && (
                <div className="text-white/50 text-[13px] italic px-1 select-none">
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
                          value={memberSplits[m.id] ?? ""}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setMemberSplits(prev => ({ ...prev, [m.id]: isNaN(val) ? 0 : val }));
                          }}
                          placeholder="0"
                          className="w-20 bg-white/[0.06] border border-white/[0.10] rounded-[8px] px-3 py-1.5 text-white placeholder-white/20 text-center outline-none focus:border-white/30 text-[16px]"
                        />
                        <span className="text-white/60 text-sm">%</span>
                      </div>
                    </div>
                  ))}
                  <div className="text-white/40 text-[11px] text-right select-none">
                    Total: {Object.values(memberSplits).reduce((s, v) => s + v, 0).toFixed(1)}% / 100%
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
                          value={memberSplits[m.id] ?? ""}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setMemberSplits(prev => ({ ...prev, [m.id]: isNaN(val) ? 0 : val }));
                          }}
                          placeholder="0.00"
                          className="w-24 bg-white/[0.06] border border-white/[0.10] rounded-[8px] px-3 py-1.5 text-white placeholder-white/20 text-center outline-none focus:border-white/30 text-[16px]"
                        />
                      </div>
                    </div>
                  ))}
                  <div className="text-white/40 text-[11px] text-right select-none">
                    Total: ₹{Object.values(memberSplits).reduce((s, v) => s + v, 0).toFixed(0)} / ₹{amount || "0"}
                  </div>
                </div>
              )}

              {/* Recurring switch */}
              <div className="flex items-center justify-between py-2 border-t border-b border-white/[0.05]">
                <span className="text-white text-sm select-none">Recurring Monthly Expense</span>
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 mt-2">
                <button
                  type="submit"
                  className="w-full bg-white/12 text-white font-bold rounded-[12px] py-3.5 text-[15px] border border-white/20 hover:bg-white/18 transition-colors focus:outline-none cursor-pointer"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => { navigator.vibrate?.(10); setShowModal(false); setEditingExpenseId(null); }}
                  className="text-center text-white/40 text-[13px] hover:text-white/60 transition-colors py-1 bg-transparent border-0 focus:outline-none cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settle Up Bottom Sheet (UPI) */}
      {showSettleModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-[8px]">
          <div className="absolute inset-0" onClick={() => { navigator.vibrate?.(10); setShowSettleModal(false); }} />
          
          <div className="relative w-full max-w-[430px] bg-[#111118]/95 rounded-t-[24px] p-6 z-10 flex flex-col gap-4 shadow-[0_-8px_32px_rgba(0,0,0,0.5)] backdrop-blur-[40px] border-t border-white/[0.12]" style={{ paddingBottom: "calc(24px + env(safe-area-inset-bottom) + 80px)", maxHeight: "85vh", overflowY: "auto" }}>
            <h3 className="text-white font-bold text-[18px]">Settle Up</h3>

            {totalOwed <= 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center select-none">
                <h4 className="text-white font-bold text-[16px]">You are all settled up!</h4>
                <button
                  type="button"
                  onClick={() => { navigator.vibrate?.(10); setShowSettleModal(false); }}
                  className="mt-4 w-full bg-white/12 text-white font-bold rounded-[12px] py-3.5 text-[15px] border border-white/20 hover:bg-white/18 transition-colors focus:outline-none cursor-pointer"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {/* Options */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-white/60 text-xs font-semibold uppercase tracking-wider select-none">
                    Settlement Amount
                  </label>
                  <div className="flex bg-white/[0.06] p-1 rounded-[12px] border border-white/[0.12]">
                    <button
                      type="button"
                      onClick={() => { navigator.vibrate?.(5); setSettleOption("full"); }}
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
                      onClick={() => { navigator.vibrate?.(5); setSettleOption("half"); }}
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
                      onClick={() => { navigator.vibrate?.(5); setSettleOption("custom"); }}
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

                {/* Custom Input */}
                {settleOption === "custom" && (
                  <div className="flex flex-col gap-1.5 animate-fade-in">
                    <label className="text-white/60 text-xs font-semibold uppercase tracking-wider select-none">
                      Custom Amount ₹
                    </label>
                    <input
                      type="number"
                      placeholder="Enter amount"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      className="w-full bg-white/[0.06] border border-white/[0.10] rounded-[12px] px-4 py-3.5 text-white placeholder-white/25 outline-none focus:border-white/35 transition-colors text-[16px]"
                      required
                    />
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col gap-2 mt-2">
                  {upiId ? (
                    <>
                      <button
                        onClick={() => { navigator.vibrate?.(10); window.open(upiUrl, "_blank"); }}
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

                      <div className="text-white/40 text-[11px] text-center px-4 mt-1 select-none">
                        On iOS, copy the UPI ID and pay manually inside your UPI application.
                      </div>
                    </>
                  ) : (
                    <div className="bg-white/[0.06] border border-white/10 rounded-[12px] p-4 text-center text-white/50 text-[13px] select-none">
                      Your roommate has not set their UPI ID yet. They can set it in their Profile settings.
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleSettleUpAll}
                    className="w-full bg-white/[0.06] border border-white/10 text-white font-semibold rounded-[12px] py-3.5 text-[15px] hover:bg-white/[0.12] transition-colors focus:outline-none cursor-pointer mt-1"
                  >
                    Mark All as Settled
                  </button>

                  <button
                    type="button"
                    onClick={() => { navigator.vibrate?.(10); setShowSettleModal(false); }}
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

      {/* Navigation */}
      <BottomNav active="expenses" />
    </main>
  );
}
