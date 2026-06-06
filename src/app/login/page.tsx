"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, signUp, getProfile } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const data = await signIn(email, password);
      if (data.user) {
        // Set user cookie to mark user as logged in
        document.cookie = `room_os_user_id=${data.user.id}; path=/; max-age=31536000`;

        try {
          const profile = await getProfile(data.user.id);
          if (profile && profile.room_id) {
            document.cookie = `room_id=${profile.room_id}; path=/; max-age=31536000`;
            router.push("/");
          } else {
            document.cookie = "room_id=; path=/; max-age=0";
            router.push("/onboarding");
          }
        } catch {
          // If profile or room_id doesn't exist, redirect to onboarding
          document.cookie = "room_id=; path=/; max-age=0";
          router.push("/onboarding");
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "Invalid email or password");
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const data = await signUp(email, password, name);
      if (data.user) {
        document.cookie = `room_os_user_id=${data.user.id}; path=/; max-age=31536000`;
        document.cookie = "room_id=; path=/; max-age=0";
        router.push("/onboarding");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "Failed to create account");
    }
  };

  return (
    <main className="flex-1 flex flex-col justify-center px-6 py-12 w-full min-h-screen relative z-10">
      <div className="flex flex-col gap-8">
        {/* Top Header */}
        <div className="flex flex-col items-center gap-1.5 text-center">
          <h1 className="text-[32px] font-bold text-white tracking-tight select-none">
            RoomOS
          </h1>
          <span className="text-[14px] text-white/50 font-medium">
            Your digital home 🏡
          </span>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-white/[0.06] p-1 rounded-[12px] border border-white/[0.12] w-full">
          <button
            type="button"
            onClick={() => setActiveTab('signin')}
            className={`flex-1 py-2 rounded-[9px] text-sm font-semibold transition-colors border-0 focus:outline-none ${activeTab === 'signin'
                ? "bg-[#9b7fe8] text-white"
                : "bg-transparent text-white/60"
              }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('signup')}
            className={`flex-1 py-2 rounded-[9px] text-sm font-semibold transition-colors border-0 focus:outline-none ${activeTab === 'signup'
                ? "bg-[#9b7fe8] text-white"
                : "bg-transparent text-white/60"
              }`}
          >
            Sign Up
          </button>
        </div>

        {/* Forms */}
        {activeTab === 'signin' && (
          <form onSubmit={handleSignIn} className="flex flex-col gap-4">
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/[0.06] border border-white/[0.12] rounded-[12px] px-4 py-3 text-white placeholder-white/30 outline-none focus:border-[#9b7fe8]/50 transition-colors text-sm"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/[0.06] border border-white/[0.12] rounded-[12px] px-4 py-3 text-white placeholder-white/30 outline-none focus:border-[#9b7fe8]/50 transition-colors text-sm"
              required
            />
            <button
              type="submit"
              className="w-full bg-[#9b7fe8] text-white font-bold rounded-[12px] py-3.5 text-base border-0 hover:bg-[#886cd4] transition-colors focus:outline-none"
            >
              Sign In
            </button>
          </form>
        )}

        {activeTab === 'signup' && (
          <form onSubmit={handleSignUp} className="flex flex-col gap-4">
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white/[0.06] border border-white/[0.12] rounded-[12px] px-4 py-3 text-white placeholder-white/30 outline-none focus:border-[#9b7fe8]/50 transition-colors text-sm"
              required
            />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/[0.06] border border-white/[0.12] rounded-[12px] px-4 py-3 text-white placeholder-white/30 outline-none focus:border-[#9b7fe8]/50 transition-colors text-sm"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/[0.06] border border-white/[0.12] rounded-[12px] px-4 py-3 text-white placeholder-white/30 outline-none focus:border-[#9b7fe8]/50 transition-colors text-sm"
              required
            />
            <button
              type="submit"
              className="w-full bg-[#9b7fe8] text-white font-bold rounded-[12px] py-3.5 text-base border-0 hover:bg-[#886cd4] transition-colors focus:outline-none"
            >
              Create Account
            </button>
          </form>
        )}

        {/* Error message */}
        {error && (
          <div className="text-center text-[13px] font-semibold text-[rgba(255,100,100,0.9)] break-words select-none">
            {error}
          </div>
        )}
      </div>
    </main>
  );
}
