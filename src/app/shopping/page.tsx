"use client";

import React, { useState } from "react";
import PageHeader from "@/components/PageHeader";
import GlassCard from "@/components/GlassCard";
import BottomNav from "@/components/BottomNav";
import { Check, Trash2 } from "lucide-react";

interface ShoppingItem {
  id: number;
  name: string;
  done: boolean;
}

export default function ShoppingPage() {
  // Hardcoded default items in state
  const [items, setItems] = useState<ShoppingItem[]>([
    { id: 1, name: "Milk", done: false },
    { id: 2, name: "Bread", done: false },
    { id: 3, name: "Shampoo", done: true },
    { id: 4, name: "Detergent", done: false },
  ]);

  const [inputVal, setInputVal] = useState("");

  // Toggle checklist item
  const toggleItem = (id: number) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, done: !item.done } : item
      )
    );
  };

  // Remove checklist item
  const removeItem = (id: number) => {
    setItems(items.filter((item) => item.id !== id));
  };

  // Add checklist item
  const addItem = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputVal.trim()) return;

    const newItem: ShoppingItem = {
      id: Date.now(),
      name: inputVal.trim(),
      done: false,
    };

    setItems([...items, newItem]);
    setInputVal("");
  };

  const pendingItems = items.filter((item) => !item.done);
  const completedItems = items.filter((item) => item.done);

  return (
    <main className="flex-1 flex flex-col gap-6 px-6 pt-5 pb-[120px] w-full relative">
      <PageHeader title="Shopping List" showBack={false} />

      {/* Add Item Form Row */}
      <form onSubmit={addItem} className="flex gap-2.5">
        <input
          type="text"
          placeholder="Add shopping item..."
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          className="flex-1 bg-white/[0.06] border border-white/[0.12] rounded-[12px] px-4 py-3 text-white placeholder-white/30 outline-none focus:border-[#9b7fe8]/50 transition-colors text-sm"
        />
        <button
          type="submit"
          className="bg-[#9b7fe8] text-white font-bold rounded-[12px] px-5 py-3 border-0 hover:bg-[#886cd4] transition-colors focus:outline-none text-sm whitespace-nowrap"
        >
          Add
        </button>
      </form>

      {/* Active items list */}
      <section className="flex flex-col gap-3">
        {pendingItems.length > 0 ? (
          pendingItems.map((item) => (
            <GlassCard key={item.id} className="flex items-center gap-3 p-4">
              {/* Checkbox circle */}
              <button
                type="button"
                onClick={() => toggleItem(item.id)}
                className="w-[22px] h-[22px] rounded-full border-2 border-white/20 flex items-center justify-center bg-transparent transition-colors focus:outline-none cursor-pointer"
              >
                {/* Unchecked space */}
              </button>

              {/* Item Name */}
              <span className="text-white text-[15px] font-medium select-none">
                {item.name}
              </span>

              {/* Trash/delete button */}
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                className="ml-auto text-white/30 hover:text-white/60 transition-colors p-1 bg-transparent border-0 focus:outline-none cursor-pointer"
                aria-label={`Delete ${item.name}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </GlassCard>
          ))
        ) : (
          <div className="text-center text-white/40 py-6 text-sm">
            No active shopping items.
          </div>
        )}
      </section>

      {/* Completed items section */}
      {completedItems.length > 0 && (
        <section className="flex flex-col gap-3 mt-2">
          <h2 className="text-white/40 text-[11px] font-semibold tracking-wider uppercase mb-1">
            COMPLETED
          </h2>
          <div className="flex flex-col gap-3 opacity-60">
            {completedItems.map((item) => (
              <GlassCard key={item.id} className="flex items-center gap-3 p-4">
                {/* Checked checkbox circle */}
                <button
                  type="button"
                  onClick={() => toggleItem(item.id)}
                  className="w-[22px] h-[22px] rounded-full bg-[#9b7fe8] border-2 border-[#9b7fe8] flex items-center justify-center transition-colors focus:outline-none cursor-pointer text-white"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </button>

                {/* Strikethrough Item Name */}
                <span className="text-white/50 text-[15px] font-medium line-through select-none">
                  {item.name}
                </span>

                {/* Trash/delete button */}
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="ml-auto text-white/30 hover:text-white/60 transition-colors p-1 bg-transparent border-0 focus:outline-none cursor-pointer"
                  aria-label={`Delete ${item.name}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </GlassCard>
            ))}
          </div>
        </section>
      )}

      {/* Floating Bottom Nav */}
      <BottomNav active="shopping" />
    </main>
  );
}
