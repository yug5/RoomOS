"use client";

import React, { useState } from "react";
import PageHeader from "@/components/PageHeader";
import GlassCard from "@/components/GlassCard";
import BottomNav from "@/components/BottomNav";
import { Check, Trash2 } from "lucide-react";
import { useRoomContext } from "@/lib/RoomContext";
import { supabase } from "@/lib/supabase";

interface ShoppingItem {
  id: string | number;
  name: string;
  done: boolean;
}

export default function ShoppingPage() {
  const { profile, roomId, loading, shoppingItems: items, refetchShopping } = useRoomContext();
  const [inputVal, setInputVal] = useState("");

  // Toggle checklist item
  const toggleItem = async (item: ShoppingItem) => {
    try {
      const { error } = await supabase
        .from('shopping_items')
        .update({ done: !item.done })
        .eq('id', item.id);
      
      if (error) throw error;
      // Fetch will be triggered by realtime subscription, but refetching locally for safety
      refetchShopping();
    } catch (err) {
      console.error('Error toggling item:', err);
    }
  };

  // Remove checklist item
  const removeItem = async (item: ShoppingItem) => {
    try {
      const { error } = await supabase
        .from('shopping_items')
        .delete()
        .eq('id', item.id);
      
      if (error) throw error;
      refetchShopping();
    } catch (err) {
      console.error('Error removing item:', err);
    }
  };

  // Add checklist item
  const addItem = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputVal.trim() || !roomId) return;

    const newItemName = inputVal.trim();
    setInputVal("");

    try {
      const { error: insertError } = await supabase
        .from('shopping_items')
        .insert({ room_id: roomId, name: newItemName, done: false });

      if (insertError) throw insertError;

      // Log activity
      await supabase.from('activity').insert({
        room_id: roomId,
        user_name: profile?.name || 'User',
        action: `added ${newItemName} to shopping list 🛒`
      });

      refetchShopping();
    } catch (err) {
      console.error('Error adding item:', err);
    }
  };

  if (loading) {
    return (
      <div className="w-8 h-8 border-2 border-[#9b7fe8] border-t-transparent rounded-full animate-spin mx-auto mt-20" />
    );
  }

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
          className="bg-[#9b7fe8] text-white font-bold rounded-[12px] px-5 py-3 border-0 hover:bg-[#886cd4] transition-colors focus:outline-none text-sm whitespace-nowrap cursor-pointer"
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
                onClick={() => toggleItem(item)}
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
                onClick={() => removeItem(item)}
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
                  onClick={() => toggleItem(item)}
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
                  onClick={() => removeItem(item)}
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
