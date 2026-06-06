"use client";

import React, { useState } from "react";
import PageHeader from "@/components/PageHeader";
import GlassCard from "@/components/GlassCard";
import BottomNav from "@/components/BottomNav";
import { Plus } from "lucide-react";

interface ExpenseItem {
  emoji: string;
  name: string;
  cat: string;
  amount: string;
  each: string;
  by: string;
  date: string;
}

export default function ExpensesPage() {
  // Hardcoded initial data
  const initialExpenses: ExpenseItem[] = [
    { emoji: "🍕", name: "Pizza Night", cat: "Food", amount: "₹450", each: "₹225", by: "Yug", date: "Today" },
    { emoji: "⚡", name: "Electricity Bill", cat: "Utilities", amount: "₹1,200", each: "₹600", by: "Rahul", date: "Yesterday" },
    { emoji: "🛒", name: "Groceries Run", cat: "Groceries", amount: "₹380", each: "₹190", by: "Yug", date: "2 days ago" },
    { emoji: "🌐", name: "WiFi Bill", cat: "Internet", amount: "₹499", each: "₹249", by: "Rahul", date: "3 days ago" },
  ];

  const categories = [
    { key: "All", label: "All" },
    { key: "Food", label: "🍕 Food" },
    { key: "Groceries", label: "🛒 Groceries" },
    { key: "Utilities", label: "⚡ Utilities" },
    { key: "Internet", label: "🌐 Internet" },
    { key: "Transport", label: "🚗 Transport" },
    { key: "Rent", label: "🏠 Rent" },
    { key: "Entertainment", label: "🎬 Entertainment" },
    { key: "Household", label: "🧹 Household" },
  ];

  // States
  const [activeCategory, setActiveCategory] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [expenses, setExpenses] = useState<ExpenseItem[]>(initialExpenses);

  // Form states
  const [expenseName, setExpenseName] = useState("");
  const [amount, setAmount] = useState("");
  const [modalCategory, setModalCategory] = useState("Food");
  const [paidBy, setPaidBy] = useState<"Yug" | "Rahul">("Yug");

  // Handle Form Submission (adds item locally for premium experience)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseName || !amount) return;

    const parsedAmount = parseFloat(amount);
    const splitAmount = (parsedAmount / 2).toFixed(0);

    // Map emoji for category
    const categoryEmojis: Record<string, string> = {
      Food: "🍕",
      Groceries: "🛒",
      Utilities: "⚡",
      Internet: "🌐",
      Transport: "🚗",
      Rent: "🏠",
      Entertainment: "🎬",
      Household: "🧹",
    };

    const newExpense: ExpenseItem = {
      emoji: categoryEmojis[modalCategory] || "💰",
      name: expenseName,
      cat: modalCategory,
      amount: `₹${parsedAmount}`,
      each: `₹${splitAmount}`,
      by: paidBy,
      date: "Just now",
    };

    setExpenses([newExpense, ...expenses]);

    // Reset fields
    setExpenseName("");
    setAmount("");
    setModalCategory("Food");
    setPaidBy("Yug");
    setShowModal(false);
  };

  const filteredExpenses = activeCategory === "All"
    ? expenses
    : expenses.filter(item => item.cat.toLowerCase() === activeCategory.toLowerCase());

  return (
    <main className="flex-1 flex flex-col gap-6 px-6 pt-5 pb-[120px] w-full relative">
      <PageHeader title="Expenses" showBack={false} />

      {/* Two stat pills row */}
      <section className="flex gap-3">
        <div className="flex-1 py-1.5 px-4 rounded-[999px] border border-[#9b7fe8]/30 bg-[#9b7fe8]/15 text-[#9b7fe8] text-[13px] font-semibold text-center select-none">
          You owe ₹240
        </div>
        <div className="flex-1 py-1.5 px-4 rounded-[999px] border border-white/10 bg-white/[0.06] text-white/60 text-[13px] font-semibold text-center select-none">
          Total ₹1,240
        </div>
      </section>

      {/* Category filter */}
      <section className="w-full overflow-hidden">
        <div 
          className="flex gap-2 overflow-x-auto pb-2 scrollbar-none"
          style={{
            msOverflowStyle: "none",
            scrollbarWidth: "none",
          }}
        >
          {categories.map((cat) => {
            const isActive = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`py-1.5 px-4 rounded-[999px] text-[13px] font-medium whitespace-nowrap transition-colors border-0 focus:outline-none ${
                  isActive
                    ? "bg-[#9b7fe8] text-white"
                    : "bg-white/[0.06] border border-white/10 text-white/60"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Expense list */}
      <section className="flex flex-col gap-3">
        {filteredExpenses.length > 0 ? (
          filteredExpenses.map((exp, idx) => (
            <GlassCard key={idx} className="flex items-center gap-3 p-5">
              {/* Left Circle Emoji */}
              <div className="w-[44px] h-[44px] rounded-full bg-[#9b7fe8]/15 flex items-center justify-center text-[20px] flex-shrink-0">
                {exp.emoji}
              </div>

              {/* Middle Info */}
              <div className="flex flex-col min-w-0">
                <span className="text-white font-bold text-[15px] truncate">{exp.name}</span>
                <span className="text-white/50 text-[12px] mt-0.5">{exp.cat}</span>
                <span className="text-white/40 text-[11px] mt-0.5">Paid by {exp.by}</span>
              </div>

              {/* Right Info */}
              <div className="ml-auto text-right flex-shrink-0 flex flex-col justify-center">
                <span className="text-white font-bold text-[15px]">{exp.amount}</span>
                <span className="text-white/50 text-[12px] mt-0.5">{exp.each} each</span>
                <span className="text-white/35 text-[11px] mt-0.5">{exp.date}</span>
              </div>
            </GlassCard>
          ))
        ) : (
          <div className="text-center text-white/40 py-8 text-sm">
            No expenses in this category.
          </div>
        )}
      </section>

      {/* Floating Add Expense Button */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-24 right-6 w-14 h-14 rounded-full bg-[#9b7fe8] text-white flex items-center justify-center shadow-[0_4px_20px_rgba(155,127,232,0.4)] border-0 focus:outline-none z-40 active:scale-95 transition-transform"
        aria-label="Add Expense"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Add Expense Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-[4px]">
          {/* Backdrop Click Dismiss */}
          <div className="absolute inset-0" onClick={() => setShowModal(false)} />
          
          <div className="relative w-full max-w-[430px] bg-[#1a1a2e] rounded-t-[24px] p-6 z-10 flex flex-col gap-4 shadow-[0_-8px_32px_rgba(0,0,0,0.5)]">
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
                  onChange={(e) => setExpenseName(e.target.value)}
                  className="w-full bg-white/[0.06] border border-white/[0.12] rounded-[12px] px-4 py-3 text-white placeholder-white/30 outline-none focus:border-[#9b7fe8]/50 transition-colors text-sm"
                  required
                />
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
                  className="w-full bg-white/[0.06] border border-white/[0.12] rounded-[12px] px-4 py-3 text-white placeholder-white/30 outline-none focus:border-[#9b7fe8]/50 transition-colors text-sm"
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
                        onClick={() => setModalCategory(cat.key)}
                        className={`py-1.5 px-4 rounded-[999px] text-[13px] font-medium whitespace-nowrap transition-colors border-0 focus:outline-none ${
                          isSelected
                            ? "bg-[#9b7fe8] text-white"
                            : "bg-white/[0.06] border border-white/10 text-white/60"
                        }`}
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Paid By Toggle */}
              <div className="flex flex-col gap-1.5">
                <label className="text-white/60 text-xs font-semibold uppercase tracking-wider">
                  Paid By
                </label>
                <div className="flex bg-white/[0.06] p-1 rounded-[12px] border border-white/[0.12]">
                  <button
                    type="button"
                    onClick={() => setPaidBy("Yug")}
                    className={`flex-1 py-2 rounded-[9px] text-sm font-semibold transition-colors border-0 focus:outline-none ${
                      paidBy === "Yug"
                        ? "bg-[#9b7fe8] text-white"
                        : "bg-transparent text-white/60"
                    }`}
                  >
                    Yug
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaidBy("Rahul")}
                    className={`flex-1 py-2 rounded-[9px] text-sm font-semibold transition-colors border-0 focus:outline-none ${
                      paidBy === "Rahul"
                        ? "bg-[#9b7fe8] text-white"
                        : "bg-transparent text-white/60"
                    }`}
                  >
                    Rahul
                  </button>
                </div>
              </div>

              {/* Split calculation display */}
              <div className="text-white/50 text-[13px] font-medium select-none">
                Split equally — ₹{amount ? (parseFloat(amount) / 2).toFixed(0) : "0"} each
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 mt-2">
                <button
                  type="submit"
                  className="w-full bg-[#9b7fe8] text-white font-bold rounded-[12px] py-3.5 text-[15px] border-0 hover:bg-[#886cd4] transition-colors focus:outline-none"
                >
                  Submit
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="text-center text-white/40 text-[13px] hover:text-white/60 transition-colors py-1 bg-transparent border-0 focus:outline-none"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Bottom Nav */}
      <BottomNav active="expenses" />
    </main>
  );
}
