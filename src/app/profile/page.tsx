"use client";

import React, { useState, useEffect } from "react";
import PageHeader from "@/components/PageHeader";
import GlassCard from "@/components/GlassCard";
import BottomNav from "@/components/BottomNav";
import { useRoomContext } from "@/lib/RoomContext";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const router = useRouter();
  const {
    profile,
    room,
    userId,
    loading,
    refetchProfile
  } = useRoomContext();

  const [name, setName] = useState("");
  const [upiId, setUpiId] = useState("");
  const [copied, setCopied] = useState(false);
  const [showMoodModal, setShowMoodModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setUpiId(profile.upi_id || "");
    }
  }, [profile]);

  const handleCopyCode = () => {
    if (!room?.invite_code) return;
    navigator.clipboard.writeText(room.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    setSaveMessage("");
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ name: name.trim(), upi_id: upiId.trim() })
        .eq('id', userId);

      if (error) throw error;
      await refetchProfile();
      setSaveMessage("Settings saved successfully! ✨");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (err) {
      console.error('Error saving profile:', err);
      setSaveMessage("Failed to save settings ❌");
    } finally {
      setSaving(false);
    }
  };

  const handleMoodSelect = async (mood: string) => {
    if (!userId) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ mood_status: mood })
        .eq('id', userId);
      if (error) throw error;
      await refetchProfile();
      setShowMoodModal(false);
    } catch (err) {
      console.error('Error setting mood:', err);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="w-8 h-8 border-2 border-[#9b7fe8] border-t-transparent rounded-full animate-spin mx-auto mt-20" />
    );
  }

  return (
    <main className="flex-1 flex flex-col gap-6 px-6 pt-5 pb-[120px] w-full relative">
      <PageHeader title="Profile & Settings" showBack={false} />

      {/* Profile Header */}
      <section className="flex flex-col items-center gap-3 mt-2 text-center animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-[#9b7fe8] flex items-center justify-center text-white font-bold text-3xl shadow-[0_4px_20px_rgba(155,127,232,0.3)] select-none">
          {(profile?.name || 'U')[0].toUpperCase()}
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="text-white font-bold text-xl">{profile?.name}</h2>
          <span className="text-white/50 text-sm">{room?.name || "My Room"} 👑</span>
        </div>
        <button
          onClick={handleCopyCode}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[999px] border border-white/12 bg-white/[0.06] backdrop-blur-md cursor-pointer hover:bg-white/[0.12] transition-colors focus:outline-none mt-1"
        >
          <span className="text-[12px] text-white/70 font-semibold uppercase tracking-wider">
            Invite Code: {room?.invite_code || "N/A"}
          </span>
          <span className="text-[10px] text-[#9b7fe8] font-bold">
            {copied ? "Copied! ✓" : "Copy 📋"}
          </span>
        </button>
      </section>

      {/* Settings Card */}
      <section className="flex flex-col gap-3">
        <GlassCard className="p-5 flex flex-col gap-4">
          <h3 className="text-white/40 text-[11px] font-semibold tracking-wider uppercase">
            SETTINGS
          </h3>
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            {/* Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-white/60 text-xs font-semibold uppercase tracking-wider">
                Your Name
              </label>
              <input
                type="text"
                placeholder="Enter name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white/[0.06] border border-white/[0.12] rounded-[12px] px-4 py-3 text-white placeholder-white/30 outline-none focus:border-[#9b7fe8]/50 transition-colors text-sm"
                required
              />
            </div>

            {/* UPI ID */}
            <div className="flex flex-col gap-1.5">
              <label className="text-white/60 text-xs font-semibold uppercase tracking-wider">
                UPI ID (for splitting expenses)
              </label>
              <input
                type="text"
                placeholder="name@upi, paytm..."
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="w-full bg-white/[0.06] border border-white/[0.12] rounded-[12px] px-4 py-3 text-white placeholder-white/30 outline-none focus:border-[#9b7fe8]/50 transition-colors text-sm"
              />
            </div>

            {/* Mood selector row */}
            <div className="flex items-center justify-between py-2.5 border-t border-white/6">
              <span className="text-white/60 text-xs font-semibold uppercase tracking-wider">Mood Status</span>
              <button
                type="button"
                onClick={() => setShowMoodModal(true)}
                className="inline-flex items-center px-3.5 py-1.5 rounded-[999px] border border-white/12 bg-white/[0.06] cursor-pointer hover:bg-white/[0.12] transition-colors focus:outline-none"
              >
                <span className="text-xs text-white font-medium">
                  {profile?.mood_status || "Available 👋"}
                </span>
              </button>
            </div>

            {/* Submit */}
            <div className="flex flex-col gap-2">
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-[#9b7fe8] text-white font-bold rounded-[12px] py-3.5 text-[15px] border-0 hover:bg-[#886cd4] transition-colors focus:outline-none cursor-pointer mt-2 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Settings"}
              </button>
              {saveMessage && (
                <p className="text-center text-[13px] text-[#9b7fe8] font-medium animate-fade-in">
                  {saveMessage}
                </p>
              )}
            </div>
          </form>
        </GlassCard>
      </section>

      {/* Danger Zone */}
      <section className="flex flex-col gap-3">
        <GlassCard className="p-5 border border-red-500/20 bg-red-500/5 flex flex-col gap-4">
          <h3 className="text-red-400 font-bold text-[11px] uppercase tracking-wider">
            Danger Zone
          </h3>
          <p className="text-white/50 text-xs">
            Once you sign out, you will need to log back in to access RoomOS.
          </p>
          <button
            onClick={handleSignOut}
            className="w-full bg-red-500/20 border border-red-500/30 hover:bg-red-500/30 text-red-200 font-bold rounded-[12px] py-3.5 text-[15px] transition-colors focus:outline-none cursor-pointer text-center"
          >
            Sign Out
          </button>
        </GlassCard>
      </section>

      {/* Mood Status Bottom Sheet Modal */}
      {showMoodModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-[4px]">
          <div className="absolute inset-0" onClick={() => setShowMoodModal(false)} />
          <div className="relative w-full max-w-[430px] bg-[#1a1a2e] rounded-t-[24px] p-6 z-10 flex flex-col gap-4 shadow-[0_-8px_32px_rgba(0,0,0,0.5)]">
            <h3 className="text-white font-bold text-[18px]">Set your mood</h3>
            <div className="grid grid-cols-3 gap-2.5">
              {["Studying 📚", "Sleeping 😴", "Up for food 🍕", 
                "Gaming 🎮", "Working 💻", "Available 👋",
                "Do not disturb 🔕", "Out 🚶", "Chilling 😎"].map((mood) => {
                const isSelected = profile?.mood_status === mood;
                return (
                  <button
                    key={mood}
                    type="button"
                    onClick={() => handleMoodSelect(mood)}
                    className="p-0 border-0 bg-transparent text-left cursor-pointer"
                  >
                    <GlassCard
                      className="p-[10px] text-center text-white text-[13px] font-medium transition-colors"
                      style={{
                        border: isSelected ? "1px solid #9b7fe8" : "1px solid rgba(255,255,255,0.10)",
                        background: isSelected ? "rgba(155, 127, 232, 0.08)" : "rgba(255,255,255,0.06)"
                      }}
                    >
                      {mood}
                    </GlassCard>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setShowMoodModal(false)}
              className="text-center text-white/40 text-[13px] hover:text-white/60 transition-colors py-1 bg-transparent border-0 focus:outline-none cursor-pointer mt-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Floating Bottom Nav */}
      <BottomNav active="profile" />
    </main>
  );
}
