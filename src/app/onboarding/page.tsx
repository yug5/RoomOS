"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import GlassCard from "@/components/GlassCard";
import { supabase } from "@/lib/supabase";

export default function OnboardingPage() {
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      console.log('Session on onboarding:', session)
      if (!session) {
        router.push('/login')
      }
    }
    checkSession()
  }, [router])

  const [step, setStep] = useState<1 | "2a" | "2b">(1);
  const [option, setOption] = useState<"create" | "join" | null>(null);
  const [roomName, setRoomName] = useState("");
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [inviteCode] = useState(() => Math.random().toString(36).substring(2, 8).toUpperCase());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleContinue = () => {
    if (option === "create") {
      setStep("2a");
    } else if (option === "join") {
      setStep("2b");
    }
  };

  const handleCreateRoom = async () => {
    try {
      setError('')
      
      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        setError('Please sign in again')
        router.push('/login')
        return
      }

      const userId = session.user.id

      // Create room
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .insert({ name: roomName, invite_code: inviteCode })
        .select()
        .single()

      if (roomError) {
        setError(roomError.message)
        return
      }

      // Update profile with room_id
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({ 
          id: userId, 
          name: session.user.user_metadata?.name || 'User',
          room_id: room.id 
        })

      if (profileError) {
        setError(profileError.message)
        return
      }

      // Set room_id cookie for the auth middleware
      document.cookie = `room_id=${room.id}; path=/; max-age=31536000`

      router.push('/')
      
    } catch (err) {
      setError('Something went wrong')
      console.error(err)
    }
  }

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCodeInput.trim()) return;
    setLoading(true);
    setError("");

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error("No authenticated user found");
      }
      const userId = session.user.id

      // 1. Find room
      const { data: room, error: roomError } = await supabase
        .from("rooms")
        .select("*")
        .eq("invite_code", inviteCodeInput.trim().toUpperCase())
        .single();
      
      if (roomError || !room) {
        throw new Error("Invalid invite code");
      }

      // 2. Update profile with room_id
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ room_id: room.id })
        .eq("id", userId);
      
      if (profileError) throw profileError;

      // Set room_id cookie
      document.cookie = `room_id=${room.id}; path=/; max-age=31536000`;
      router.push("/");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "Failed to join room. Check code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 flex flex-col justify-center px-6 py-12 w-full min-h-screen relative z-10">
      <div className="flex flex-col gap-8">
        
        {step === 1 && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1.5">
              <h1 className="text-[24px] font-bold text-white select-none">
                Welcome to RoomOS 👋
              </h1>
              <p className="text-[14px] text-white/50 font-medium">
                Set up your digital home
              </p>
            </div>

            <div className="flex flex-col gap-4">
              {/* Option 1: Create */}
              <button
                type="button"
                onClick={() => setOption("create")}
                className="w-full text-left bg-transparent p-0 border-0 focus:outline-none cursor-pointer"
              >
                <GlassCard 
                  className="transition-all duration-200"
                  style={{
                    border: option === "create" ? "1px solid #9b7fe8" : "1px solid rgba(255,255,255,0.10)",
                    background: option === "create" ? "rgba(155, 127, 232, 0.08)" : "rgba(255, 255, 255, 0.06)"
                  }}
                >
                  <h3 className="text-white font-bold text-[17px]">🏠 Create a Room</h3>
                  <p className="text-white/50 text-[13px] mt-1.5 font-medium">
                    Start fresh with your roommate
                  </p>
                </GlassCard>
              </button>

              {/* Option 2: Join */}
              <button
                type="button"
                onClick={() => setOption("join")}
                className="w-full text-left bg-transparent p-0 border-0 focus:outline-none cursor-pointer"
              >
                <GlassCard 
                  className="transition-all duration-200"
                  style={{
                    border: option === "join" ? "1px solid #9b7fe8" : "1px solid rgba(255,255,255,0.10)",
                    background: option === "join" ? "rgba(155, 127, 232, 0.08)" : "rgba(255, 255, 255, 0.06)"
                  }}
                >
                  <h3 className="text-white font-bold text-[17px]">🔗 Join a Room</h3>
                  <p className="text-white/50 text-[13px] mt-1.5 font-medium">
                    Enter an invite code
                  </p>
                </GlassCard>
              </button>
            </div>

            <button
              type="button"
              disabled={!option}
              onClick={handleContinue}
              className={`w-full font-bold rounded-[12px] py-3.5 text-base border-0 focus:outline-none transition-colors ${
                option 
                  ? "bg-[#9b7fe8] text-white hover:bg-[#886cd4]" 
                  : "bg-white/10 text-white/40 cursor-not-allowed"
              }`}
            >
              Continue
            </button>
          </div>
        )}

        {step === "2a" && (
          <form onSubmit={(e) => { e.preventDefault(); handleCreateRoom(); }} className="flex flex-col gap-6">
            <div className="flex flex-col gap-1.5">
              <h1 className="text-[24px] font-bold text-white">
                Name your home
              </h1>
            </div>

            <div className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="The Chaos Kingdom 👑"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="w-full bg-white/[0.06] border border-white/[0.12] rounded-[12px] px-4 py-3 text-white placeholder-white/30 outline-none focus:border-[#9b7fe8]/50 transition-colors text-sm"
                required
              />

              <div className="flex flex-col gap-2">
                <span className="text-white/50 text-[11px] font-semibold uppercase tracking-wider">
                  Invite Code
                </span>
                <div className="inline-flex items-center px-4 py-2.5 rounded-[12px] border border-white/12 bg-white/[0.06] backdrop-blur-md w-fit font-mono font-bold text-sm text-[#9b7fe8] tracking-widest select-all">
                  {inviteCode}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#9b7fe8] text-white font-bold rounded-[12px] py-3.5 text-base border-0 hover:bg-[#886cd4] transition-colors focus:outline-none disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create Room"}
              </button>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-center text-white/40 text-[13px] hover:text-white/60 transition-colors py-1 bg-transparent border-0 focus:outline-none"
              >
                Back
              </button>
            </div>
          </form>
        )}

        {step === "2b" && (
          <form onSubmit={handleJoinRoom} className="flex flex-col gap-6">
            <div className="flex flex-col gap-1.5">
              <h1 className="text-[24px] font-bold text-white">
                Enter invite code
              </h1>
            </div>

            <input
              type="text"
              placeholder="A1B2C3"
              value={inviteCodeInput}
              onChange={(e) => setInviteCodeInput(e.target.value)}
              className="w-full bg-white/[0.06] border border-white/[0.12] rounded-[12px] px-4 py-3 text-white placeholder-white/30 outline-none focus:border-[#9b7fe8]/50 transition-colors text-sm font-mono tracking-widest uppercase"
              required
            />

            <div className="flex flex-col gap-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#9b7fe8] text-white font-bold rounded-[12px] py-3.5 text-base border-0 hover:bg-[#886cd4] transition-colors focus:outline-none disabled:opacity-50"
              >
                {loading ? "Joining..." : "Join Room"}
              </button>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-center text-white/40 text-[13px] hover:text-white/60 transition-colors py-1 bg-transparent border-0 focus:outline-none"
              >
                Back
              </button>
            </div>
          </form>
        )}

        {error && (
          <div className="text-center text-[13px] font-semibold text-[rgba(255,100,100,0.9)] break-words select-none">
            {error}
          </div>
        )}

      </div>
    </main>
  );
}
