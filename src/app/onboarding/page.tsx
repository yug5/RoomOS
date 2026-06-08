"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const inputClass =
  "w-full bg-white/[0.06] border border-white/10 rounded-[14px] px-4 py-[14px] text-white text-[16px] placeholder:text-white/25 outline-none focus:border-white/25 transition-colors";

const submitClass =
  "w-full bg-white/10 border border-white/[0.18] rounded-[14px] py-[14px] text-white font-semibold text-[15px] focus:outline-none disabled:opacity-50";

function HouseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 12L12 3L21 12V21H15V15H9V21H3V12Z"
        stroke="currentColor"
        strokeWidth={1.5}
        fill="none"
      />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"
        stroke="currentColor"
        strokeWidth={1.5}
        fill="none"
      />
      <path
        d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"
        stroke="currentColor"
        strokeWidth={1.5}
        fill="none"
      />
    </svg>
  );
}

export default function OnboardingPage() {

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        window.location.replace('/login')
        return
      }
      const { data: prof } = await supabase
        .from('profiles')
        .select('room_id')
        .eq('id', session.user.id)
        .single()
      if (prof?.room_id) {
        window.location.replace('/')
      }
    }
    check()
  }, [])

  const [step, setStep] = useState<1 | "2a" | "2b">(1);
  const [option, setOption] = useState<"create" | "join" | null>(null);
  const [roomName, setRoomName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [inviteCode, setInviteCode] = useState(() => Math.random().toString(36).substring(2, 8).toUpperCase());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const generateInviteCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase()
  }

  const handleContinue = () => {
    if (option === "create") {
      setStep("2a");
    } else if (option === "join") {
      setStep("2b");
    }
  };

  const handleCreateRoom = async () => {
    if (!roomName.trim()) return
    setLoading(true)
    setError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.replace('/login'); return }

      // Try up to 5 times with different codes
      let room = null
      let attempts = 0
      let lastCode = inviteCode
      while (!room && attempts < 5) {
        const code = attempts === 0 ? lastCode : generateInviteCode()
        lastCode = code
        const { data, error: roomError } = await supabase
          .from('rooms')
          .insert({ name: roomName.trim(), invite_code: code })
          .select()
          .single()

        if (!roomError) {
          room = data
          setInviteCode(code)
        } else if (roomError.code === '23505') {
          // Duplicate key — try again with new code
          attempts++
          continue
        } else {
          setError(roomError.message)
          setLoading(false)
          return
        }
      }

      if (!room) {
        setError('Failed to create room, please try again')
        setLoading(false)
        return
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          room_id: room.id,
          name: session.user.user_metadata?.full_name ||
                session.user.user_metadata?.name ||
                session.user.email?.split('@')[0] || 'User'
        })
        .eq('id', session.user.id)

      if (profileError) {
        setError(profileError.message)
        setLoading(false)
        return
      }

      window.location.replace('/')

    } catch {
      setError('Something went wrong')
      setLoading(false)
    }
  }

  const handleJoinRoom = async () => {
    if (!joinCode.trim()) return
    setLoading(true)
    setError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        window.location.replace('/login')
        return
      }

      // Find room by invite code
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('id')
        .eq('invite_code', joinCode.trim().toUpperCase())
        .single()

      if (roomError || !room) {
        setError('Invalid invite code. Please check and try again.')
        setLoading(false)
        return
      }

      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          room_id: room.id,
          name: session.user.user_metadata?.name ||
                session.user.email?.split('@')[0] || 'User'
        })
        .eq('id', session.user.id)

      if (profileError) {
        setError(profileError.message)
        setLoading(false)
        return
      }

      window.location.replace('/')

    } catch (err) {
      console.error(err)
      setError('Something went wrong')
      setLoading(false)
    }
  }

  const optionCardClass = (selected: boolean) =>
    `w-full flex items-center gap-4 rounded-[18px] p-5 cursor-pointer text-left border transition-colors focus:outline-none ${
      selected
        ? "bg-white/10 border-white/30"
        : "bg-white/[0.07] border-white/10"
    }`;

  return (
    <main className="flex-1 flex flex-col justify-center px-6 py-12 w-full min-h-screen relative z-10">
      <div className="flex flex-col gap-8">
        
        {step === 1 && (
          <div className="flex flex-col">
            <div className="flex flex-col items-center gap-1.5 text-center">
              <h1 className="text-[26px] font-bold text-white select-none">
                Welcome to RoomOS
              </h1>
              <p className="text-[14px] text-white/40 font-medium">
                Set up your shared home
              </p>
            </div>

            <div className="flex flex-col gap-3 mt-8">
              <button
                type="button"
                onClick={() => setOption("create")}
                className={optionCardClass(option === "create")}
              >
                <div className="flex-shrink-0 w-11 h-11 rounded-full bg-white/[0.08] border border-white/[0.12] flex items-center justify-center text-white">
                  <HouseIcon />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-white font-bold text-[16px]">Create a Room</span>
                  <span className="text-white/40 text-[13px] mt-0.5">
                    Start fresh with your roommate
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setOption("join")}
                className={optionCardClass(option === "join")}
              >
                <div className="flex-shrink-0 w-11 h-11 rounded-full bg-white/[0.08] border border-white/[0.12] flex items-center justify-center text-white">
                  <LinkIcon />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-white font-bold text-[16px]">Join a Room</span>
                  <span className="text-white/40 text-[13px] mt-0.5">
                    Enter an invite code
                  </span>
                </div>
              </button>
            </div>

            <button
              type="button"
              disabled={!option}
              onClick={handleContinue}
              className={`${submitClass} mt-8 ${!option ? "opacity-35 pointer-events-none" : ""}`}
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
                placeholder="The Chaos Kingdom"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className={inputClass}
                required
              />

              <div
                className="inline-flex items-center justify-between gap-4 px-4 py-2 rounded-full border border-white/10 bg-white/[0.06] w-fit"
              >
                <span className="text-white/40 text-[11px] font-semibold uppercase tracking-wider">
                  Invite Code
                </span>
                <span className="text-white font-bold text-[14px] tracking-[2px] select-all">
                  {inviteCode}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="submit"
                disabled={loading}
                className={submitClass}
              >
                {loading ? "Creating..." : "Create Room"}
              </button>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-center text-white/30 text-[13px] py-1 bg-transparent border-0 focus:outline-none"
              >
                Back
              </button>
            </div>
          </form>
        )}

        {step === "2b" && (
          <form onSubmit={(e) => { e.preventDefault(); handleJoinRoom(); }} className="flex flex-col gap-6">
            <div className="flex flex-col gap-1.5">
              <h1 className="text-[24px] font-bold text-white">
                Enter invite code
              </h1>
            </div>

            <input
              type="text"
              placeholder="A1B2C3"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className={`${inputClass} tracking-[3px] uppercase`}
              required
            />

            <div className="flex flex-col gap-3">
              <button
                type="submit"
                disabled={loading}
                className={submitClass}
              >
                {loading ? "Joining..." : "Join Room"}
              </button>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-center text-white/30 text-[13px] py-1 bg-transparent border-0 focus:outline-none"
              >
                Back
              </button>
            </div>
          </form>
        )}

        {error && (
          <div className="text-center text-[13px] font-semibold text-[rgba(255,100,100,0.85)] break-words select-none">
            {error}
          </div>
        )}

      </div>
    </main>
  );
}
