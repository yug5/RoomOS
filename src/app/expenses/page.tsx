"use client";

import React, { useState, useEffect } from "react";
import PageHeader from "@/components/PageHeader";
import GlassCard from "@/components/GlassCard";
import BottomNav from "@/components/BottomNav";
import { Plus } from "lucide-react";
import { useRoomContext } from "@/lib/RoomContext";
import { supabase } from "@/lib/supabase";

export default function ExpensesPage() {
  const {
    profile,
    roomId,
    userId,
    loading,
    expenses,
    members,
    refetchExpenses
  } = useRoomContext();

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
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [settleOption, setSettleOption] = useState<"full" | "half" | "custom">("full");
  const [customAmount, setCustomAmount] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);

  // Form states
  const [expenseName, setExpenseName] = useState("");
  const [amount, setAmount] = useState("");
  const [modalCategory, setModalCategory] = useState("Food");
  const [paidBy, setPaidBy] = useState<string>("");

  useEffect(() => {
    if (userId) {
      setPaidBy(userId);
    }
  }, [userId]);

  const roommates = members.filter((m) => m.id !== userId);
  const memberCount = members.length || 2;

  // Handle Form Submission (adds item to Supabase)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseName || !amount || !roomId || !userId) return;

    try {
      const parsedAmount = parseFloat(amount);

      const { error: insertError } = await supabase
        .from('expenses')
        .insert({
          room_id: roomId,
          name: expenseName,
          amount: parsedAmount,
          category: modalCategory,
          paid_by: paidBy,
          is_recurring: isRecurring,
          is_settled: false
        });

      if (insertError) throw insertError;

      // Insert activity log
      await supabase.from('activity').insert({
        room_id: roomId,
        user_name: profile?.name || 'User',
        action: `added ${expenseName} expense 💰`
      });

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
    }
  };

  // Handle marking as settled
  const handleSettleUp = async () => {
    if (!roomId) return;
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
        action: `settled all expenses 🤝`
      });

      // Refetch
      await refetchExpenses();
      setShowSettleModal(false);
      setSettleOption("full");
      setCustomAmount("");
    } catch (err) {
      console.error('Error settling expenses:', err);
    }
  };

  if (loading) {
    return (
      <div className="w-8 h-8 border-2 border-[#9b7fe8] border-t-transparent rounded-full animate-spin mx-auto mt-20" />
    );
  }

  // Total owed = sum of (amount / memberCount) for expenses paid by roommate, not settled
  const totalOwed = expenses
    .filter((exp) => exp.paid_by !== userId && !exp.is_settled)
    .reduce((sum, exp) => sum + exp.amount / memberCount, 0);

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  const filteredExpenses = activeCategory === "All"
    ? expenses
    : expenses.filter(item => item.category?.toLowerCase() === activeCategory.toLowerCase());

  // Category Emoji Map
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

  const formatTime = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} mins ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
    return `${Math.floor(hrs / 24)} days ago`;
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
    ? `upi://pay?pa=${upiId}&pn=${roommateName}&am=${payAmount}&cu=INR&tn=RoomOS+Settlement`
    : "";

  return (
    <main className="flex-1 flex flex-col gap-6 px-6 pt-5 pb-[120px] w-full relative">
      <PageHeader title="Expenses" showBack={false} />

      {/* Two stat pills row */}
      <section className="flex gap-3">
        <button
          onClick={() => setShowSettleModal(true)}
          className="flex-1 py-1.5 px-4 rounded-[999px] border border-[#9b7fe8]/30 bg-[#9b7fe8]/15 text-[#9b7fe8] text-[13px] font-semibold text-center select-none animate-fade-in cursor-pointer focus:outline-none hover:bg-[#9b7fe8]/25 transition-colors"
        >
          You owe ₹{totalOwed.toFixed(0)}
        </button>
        <div className="flex-1 py-1.5 px-4 rounded-[999px] border border-white/10 bg-white/[0.06] text-white/60 text-[13px] font-semibold text-center select-none">
          Total ₹{totalExpenses.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
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
          filteredExpenses.map((exp) => {
            const payerName = exp.profiles?.name || "Unknown";

            return (
              <GlassCard key={exp.id} className="flex items-center gap-3 p-5">
                {/* Left Circle Emoji */}
                <div className="w-[44px] h-[44px] rounded-full bg-[#9b7fe8]/15 flex items-center justify-center text-[20px] flex-shrink-0">
                  {categoryEmojis[exp.category] || "💰"}
                </div>

                {/* Middle Info */}
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-white font-bold text-[15px] truncate">{exp.name}</span>
                    {exp.is_recurring && (
                      <span className="px-2 py-0.5 text-[9px] font-bold text-[#9b7fe8] bg-[#9b7fe8]/15 border border-[#9b7fe8]/30 rounded-full flex-shrink-0 uppercase tracking-wider">
                        🔁 Monthly
                      </span>
                    )}
                  </div>
                  <span className="text-white/50 text-[12px] mt-0.5">{exp.category}</span>
                  <span className="text-white/40 text-[11px] mt-0.5">Paid by {payerName}</span>
                </div>

                {/* Right Info */}
                <div className="ml-auto text-right flex-shrink-0 flex flex-col justify-center">
                  <span className="text-white font-bold text-[15px]">₹{exp.amount}</span>
                  <span className="text-white/50 text-[12px] mt-0.5">₹{(exp.amount / memberCount).toFixed(0)} each</span>
                  <span className="text-white/35 text-[11px] mt-0.5">{formatTime(exp.created_at)}</span>
                </div>
              </GlassCard>
            );
          })
        ) : (
          <div className="text-center text-white/40 py-8 text-sm">
            No expenses in this category.
          </div>
        )}
      </section>

      {/* Floating Add Expense Button */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-28 right-6 w-14 h-14 rounded-full bg-[#9b7fe8] text-white flex items-center justify-center shadow-[0_4px_20px_rgba(155,127,232,0.4)] border-0 focus:outline-none z-40 active:scale-95 transition-transform cursor-pointer"
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
                        className={`py-1.5 px-4 rounded-[999px] text-[13px] font-medium whitespace-nowrap transition-colors border-0 focus:outline-none cursor-pointer ${
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
                    onClick={() => setPaidBy(userId || "")}
                    className={`flex-1 py-2 rounded-[999px] text-sm font-semibold transition-colors border-0 focus:outline-none cursor-pointer ${
                      paidBy === userId
                        ? "bg-[#9b7fe8] text-white"
                        : "bg-transparent text-white/60"
                    }`}
                  >
                    {profile?.name || "You"}
                  </button>
                  <button
                    type="button"
                    disabled={roommates.length === 0}
                    onClick={() => {
                      if (roommates.length > 0) {
                        setPaidBy(roommates[0].id);
                      }
                    }}
                    className={`flex-1 py-2 rounded-[999px] text-sm font-semibold transition-colors border-0 focus:outline-none cursor-pointer ${
                      paidBy !== userId
                        ? "bg-[#9b7fe8] text-white"
                        : "bg-transparent text-white/60 disabled:opacity-40"
                    }`}
                  >
                    {roommates[0]?.name || "Roommate"}
                  </button>
                </div>
              </div>

              {/* Recurring Toggle */}
              <div className="flex items-center justify-between bg-white/[0.06] p-3.5 rounded-[12px] border border-white/[0.12]">
                <div className="flex flex-col">
                  <span className="text-white text-sm font-semibold">Make recurring (monthly)</span>
                  <span className="text-white/40 text-[11px] mt-0.5">Will repeat this charge every month</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRecurring(!isRecurring)}
                  className={`w-11 h-6 rounded-full transition-colors relative border-0 focus:outline-none cursor-pointer p-0 ${
                    isRecurring ? "bg-[#9b7fe8]" : "bg-white/[0.12]"
                  }`}
                >
                  <span
                    className={`absolute top-[4px] w-4 h-4 rounded-full bg-white transition-all ${
                      isRecurring ? "left-[24px]" : "left-[4px]"
                    }`}
                  />
                </button>
              </div>

              {/* Split calculation display */}
              <div className="text-white/50 text-[13px] font-medium select-none">
                Split equally — ₹{amount ? (parseFloat(amount) / memberCount).toFixed(0) : "0"} each
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 mt-2">
                <button
                  type="submit"
                  className="w-full bg-[#9b7fe8] text-white font-bold rounded-[12px] py-3.5 text-[15px] border-0 hover:bg-[#886cd4] transition-colors focus:outline-none cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-[4px]">
          {/* Backdrop Click Dismiss */}
          <div className="absolute inset-0" onClick={() => setShowSettleModal(false)} />

          <div className="relative w-full max-w-[430px] bg-[#1a1a2e] rounded-t-[24px] p-6 z-10 flex flex-col gap-4 shadow-[0_-8px_32px_rgba(0,0,0,0.5)]">
            <h3 className="text-white font-bold text-[18px]">Settle Up</h3>

            {totalOwed === 0 ? (
              <div className="flex flex-col items-center gap-4 py-6 text-center">
                <div className="w-16 h-16 rounded-full bg-[#9b7fe8]/15 flex items-center justify-center text-[28px]">
                  🎉
                </div>
                <div className="flex flex-col gap-1">
                  <h4 className="text-white font-bold text-[16px]">You are all settled up!</h4>
                  <p className="text-white/40 text-[13px]">No pending balance to pay to {roommateName}.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSettleModal(false)}
                  className="w-full bg-[#9b7fe8] text-white font-bold rounded-[12px] py-3.5 text-[15px] border-0 hover:bg-[#886cd4] transition-colors focus:outline-none cursor-pointer mt-4"
                >
                  Awesome
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
                      className={`flex-1 py-2 rounded-[999px] text-xs font-semibold transition-colors border-0 focus:outline-none cursor-pointer ${
                        settleOption === "full"
                          ? "bg-[#9b7fe8] text-white"
                          : "bg-transparent text-white/60"
                      }`}
                    >
                      Full (₹{totalOwed.toFixed(0)})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettleOption("half")}
                      className={`flex-1 py-2 rounded-[999px] text-xs font-semibold transition-colors border-0 focus:outline-none cursor-pointer ${
                        settleOption === "half"
                          ? "bg-[#9b7fe8] text-white"
                          : "bg-transparent text-white/60"
                      }`}
                    >
                      Half (₹{(totalOwed / 2).toFixed(0)})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettleOption("custom")}
                      className={`flex-1 py-2 rounded-[999px] text-xs font-semibold transition-colors border-0 focus:outline-none cursor-pointer ${
                        settleOption === "custom"
                          ? "bg-[#9b7fe8] text-white"
                          : "bg-transparent text-white/60"
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
                      className="w-full bg-white/[0.06] border border-white/[0.12] rounded-[12px] px-4 py-3 text-white placeholder-white/30 outline-none focus:border-[#9b7fe8]/50 transition-colors text-sm"
                      required
                    />
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col gap-2 mt-2">
                  {upiId ? (
                    <a
                      href={upiUrl}
                      className="w-full bg-[#9b7fe8] text-white font-bold rounded-[12px] py-3.5 text-[15px] border-0 hover:bg-[#886cd4] transition-colors focus:outline-none cursor-pointer text-center block no-underline"
                    >
                      Pay via UPI (₹{payAmount.toFixed(0)})
                    </a>
                  ) : (
                    <div className="bg-white/[0.06] border border-white/10 rounded-[12px] p-4 text-center text-white/50 text-[13px]">
                      Your roommate has not set their UPI ID yet. They can set it in their Profile settings.
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleSettleUp}
                    className="w-full bg-white/[0.06] border border-white/10 text-white font-semibold rounded-[12px] py-3.5 text-[15px] hover:bg-white/[0.12] transition-colors focus:outline-none cursor-pointer"
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
