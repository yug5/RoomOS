"use client";

import React, { useState } from "react";
import PageHeader from "@/components/PageHeader";
import GlassCard from "@/components/GlassCard";
import BottomNav from "@/components/BottomNav";
import { useRoomContext, ShoppingItem } from "@/lib/RoomContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/Toast";
import { Skeleton } from "@/components/Skeleton";
import { PullToRefresh } from "@/components/PullToRefresh";

export default function ShoppingPage() {
  const { showToast } = useToast();
  const { profile, roomId, userId, loading, initialized, shoppingItems: items, refetchShopping, refetchActivity, refetchAll, setShoppingItems } = useRoomContext();
  const [inputVal, setInputVal] = useState("");

  // Swipe to delete states
  const [swipedId, setSwipedId] = useState<string | number | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  // Toggle checklist item
  const toggleItem = async (item: ShoppingItem) => {
    // Optimistic update
    setShoppingItems(prev => prev.map(i => 
      i.id === item.id ? {...i, done: !i.done} : i
    ))
    navigator.vibrate?.(10) // haptic
    
    try {
      const { error } = await supabase
        .from('shopping_items')
        .update({ done: !item.done })
        .eq('id', item.id)
      
      if (error) throw error;
      
      if (!item.done) {
        showToast('Completed item')
      }
      await refetchShopping();
    } catch (err) {
      // Revert on failure
      setShoppingItems(prev => prev.map(i =>
        i.id === item.id ? {...i, done: item.done} : i
      ))
      showToast('Failed to update', 'error')
      console.error(err);
    }
  };

  // Remove checklist item
  const removeItem = async (item: ShoppingItem) => {
    navigator.vibrate?.(10)
    try {
      const { error } = await supabase
        .from('shopping_items')
        .delete()
        .eq('id', item.id);
      
      if (error) throw error;
      showToast('Removed')
      setSwipedId(null);
      await refetchShopping();
    } catch (err) {
      console.error('Error removing item:', err);
      showToast('Failed to remove', 'error')
    }
  };

  // Add checklist item
  const addItem = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputVal.trim() || !roomId || !userId) return;

    const newItemName = inputVal.trim();
    setInputVal("");
    navigator.vibrate?.(10)

    try {
      const { error: insertError } = await supabase
        .from('shopping_items')
        .insert({ 
          room_id: roomId, 
          name: newItemName, 
          done: false,
          created_by: userId
        });

      if (insertError) throw insertError;

      // Log activity
      await supabase.from('activity').insert({
        room_id: roomId,
        user_name: profile?.name || 'User',
        action: `added ${newItemName} to shopping list`
      });

      showToast('Added to list')

      await Promise.all([
        refetchShopping(),
        refetchActivity()
      ]);
    } catch (err) {
      console.error('Error adding item:', err);
      showToast('Failed to add', 'error')
    }
  };

  if (loading && !initialized) {
    return (
      <main className="flex-1 flex flex-col bg-[#111118] min-h-screen" style={{ padding: '20px 20px 120px 20px', maxWidth: 430, margin: '0 auto' }}>
        <PageHeader title="Shopping List" showBack={false} />
        <div className="flex gap-2.5">
          <Skeleton height={50} borderRadius={12} className="flex-1" />
          <Skeleton height={50} width={70} borderRadius={12} />
        </div>
        <div className="flex flex-col gap-3 mt-4">
          <Skeleton height={56} borderRadius={16} />
          <Skeleton height={56} borderRadius={16} />
          <Skeleton height={56} borderRadius={16} />
        </div>
        <BottomNav active="shopping" />
      </main>
    );
  }

  const pendingItems = items.filter((item) => !item.done);
  const completedItems = items.filter((item) => item.done);

  return (
    <main className="flex-1 flex flex-col bg-[#111118] min-h-screen relative" style={{ padding: '20px 20px 120px 20px', maxWidth: 430, margin: '0 auto' }}>
      <PullToRefresh onRefresh={refetchAll}>
        <PageHeader title="Shopping List" showBack={false} />

        {/* Add Item Form Row */}
        <form onSubmit={addItem} className="flex gap-2.5" style={{ marginBottom: 16 }}>
          <input
            type="text"
            placeholder="Add shopping item..."
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            className="flex-1 bg-white/[0.06] border border-white/[0.10] rounded-[12px] px-4 py-3 text-white placeholder-white/25 outline-none focus:border-white/35 transition-colors text-[16px]"
          />
          <button
            type="submit"
            className="bg-white/12 border border-white/20 hover:bg-white/18 text-white px-5 rounded-[12px] font-bold text-sm cursor-pointer transition-colors focus:outline-none"
          >
            Add
          </button>
        </form>

        {items.length === 0 ? (
          <section className="flex flex-col items-center justify-center py-20 text-center select-none animate-fade-in">
            {/* Outline shopping bag SVG */}
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 01-8 0" />
            </svg>
            <span className="text-white font-medium text-[15px] mt-4">Your list is empty</span>
            <span className="text-white/35 text-[13px] mt-1">Add items you need to buy</span>
          </section>
        ) : (
          <div className="flex flex-col gap-[20px] mt-[16px]">
            {/* Pending Section */}
            {pendingItems.length > 0 && (
              <section className="flex flex-col gap-[10px]" style={{ marginBottom: 20 }}>
                <h2 className="text-white/40 text-[11px] font-semibold tracking-wider uppercase pl-1 select-none">
                  Pending ({pendingItems.length})
                </h2>
                <div className="flex flex-col gap-[10px]">
                  {pendingItems.map((item) => {
                    const isSwiped = swipedId === item.id;
                    return (
                      <div
                        key={item.id}
                        className="relative w-full overflow-hidden rounded-[16px]"
                      >
                        {/* Delete button behind card */}
                        <div className="absolute right-0 top-0 bottom-0 w-[80px] bg-red-500/20 border border-red-500/30 flex items-center justify-center rounded-[16px]">
                          <button
                            onClick={() => removeItem(item)}
                            className="w-full h-full text-red-200 font-bold text-xs flex items-center justify-center cursor-pointer border-0 bg-transparent focus:outline-none"
                          >
                            Delete
                          </button>
                        </div>

                        {/* Foreground Card */}
                        <div
                          className="transition-transform duration-200 ease-out"
                          style={{ transform: isSwiped ? 'translateX(-80px)' : 'translateX(0px)' }}
                          onTouchStart={(e) => {
                            setTouchStartX(e.touches[0].clientX);
                            if (swipedId && swipedId !== item.id) {
                              setSwipedId(null);
                            }
                          }}
                          onTouchMove={(e) => {
                            if (touchStartX === null) return;
                            const diffX = touchStartX - e.touches[0].clientX;
                            if (diffX > 50) {
                              setSwipedId(item.id);
                            } else if (diffX < -50) {
                              setSwipedId(null);
                            }
                          }}
                          onTouchEnd={() => setTouchStartX(null)}
                        >
                          <GlassCard className="flex items-center gap-[12px] py-[14px] px-[16px]">
                            {/* Empty checkbox circle */}
                            <button
                              type="button"
                              onClick={() => toggleItem(item)}
                              className="w-[22px] h-[22px] rounded-full border border-white/20 bg-white/5 flex items-center justify-center transition-colors focus:outline-none cursor-pointer flex-shrink-0"
                            />

                            {/* Item name */}
                            <span className="text-white text-[15px] font-semibold select-none truncate pr-2">
                              {item.name}
                            </span>
                          </GlassCard>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Completed Section */}
            {completedItems.length > 0 && (
              <section className="flex flex-col gap-[10px]">
                <h2 className="text-white/40 text-[11px] font-semibold tracking-wider uppercase pl-1 select-none">
                  Completed ({completedItems.length})
                </h2>
                <div className="flex flex-col gap-[10px]">
                  {completedItems.map((item) => {
                    const isSwiped = swipedId === item.id;
                    return (
                      <div
                        key={item.id}
                        className="relative w-full overflow-hidden rounded-[16px]"
                      >
                        {/* Delete button behind card */}
                        <div className="absolute right-0 top-0 bottom-0 w-[80px] bg-red-500/20 border border-red-500/30 flex items-center justify-center rounded-[16px]">
                          <button
                            onClick={() => removeItem(item)}
                            className="w-full h-full text-red-200 font-bold text-xs flex items-center justify-center cursor-pointer border-0 bg-transparent focus:outline-none"
                          >
                            Delete
                          </button>
                        </div>

                        {/* Foreground Card */}
                        <div
                          className="transition-transform duration-200 ease-out"
                          style={{ transform: isSwiped ? 'translateX(-80px)' : 'translateX(0px)' }}
                          onTouchStart={(e) => {
                            setTouchStartX(e.touches[0].clientX);
                            if (swipedId && swipedId !== item.id) {
                              setSwipedId(null);
                            }
                          }}
                          onTouchMove={(e) => {
                            if (touchStartX === null) return;
                            const diffX = touchStartX - e.touches[0].clientX;
                            if (diffX > 50) {
                              setSwipedId(item.id);
                            } else if (diffX < -50) {
                              setSwipedId(null);
                            }
                          }}
                          onTouchEnd={() => setTouchStartX(null)}
                        >
                          <GlassCard className="flex items-center gap-[12px] py-[14px] px-[16px]">
                            {/* Checked checkbox circle */}
                            <button
                              type="button"
                              onClick={() => toggleItem(item)}
                              className="w-[22px] h-[22px] rounded-full bg-white border border-white flex items-center justify-center transition-colors focus:outline-none cursor-pointer flex-shrink-0"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#111118" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            </button>

                            {/* Strikethrough Item Name */}
                            <span className="text-white/50 text-[15px] font-medium line-through select-none truncate pr-2">
                              {item.name}
                            </span>
                          </GlassCard>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        )}
      </PullToRefresh>

      {/* Floating Bottom Nav */}
      <BottomNav active="shopping" />
    </main>
  );
}
