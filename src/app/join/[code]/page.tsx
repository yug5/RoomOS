"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function JoinRoomPage() {
  const router = useRouter();
  const params = useParams();
  const code = params.code as string;
  const [error, setError] = useState("");

  useEffect(() => {
    if (!code) return;

    const processJoin = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          localStorage.setItem('pendingInviteCode', code);
          router.push('/login');
          return;
        }

        // Check if room exists
        const { data: room, error: roomError } = await supabase
          .from('rooms')
          .select('id')
          .eq('invite_code', code)
          .single();

        if (roomError || !room) {
          setError("Invalid invite link. Please check the code and try again.");
          return;
        }

        // Join room
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ room_id: room.id })
          .eq('id', session.user.id);

        if (profileError) {
          setError("Failed to join room. Please try again.");
          return;
        }

        // Update cookie
        document.cookie = `room_id=${room.id}; path=/; max-age=31536000`;

        router.push('/');
      } catch (err) {
        console.error('Error joining room:', err);
        setError("An unexpected error occurred.");
      }
    };

    processJoin();
  }, [code, router]);

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-6 text-center min-h-screen bg-[#111118]">
      <div className="flex flex-col items-center gap-4 max-w-sm w-full">
        {error ? (
          <>
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 text-[24px]">
              ⚠️
            </div>
            <h2 className="text-white font-bold text-lg">Unable to Join</h2>
            <p className="text-white/50 text-sm leading-relaxed">{error}</p>
            <button
              onClick={() => router.push('/')}
              className="w-full bg-white/12 border border-white/20 text-white font-bold rounded-[12px] py-3.5 text-sm hover:bg-white/18 transition-colors focus:outline-none cursor-pointer mt-4"
            >
              Back to Home
            </button>
          </>
        ) : (
          <>
            <div className="w-8 h-8 border-2 border-white/20 border-t-transparent rounded-full animate-spin" />
            <p className="text-white/60 text-sm mt-2">Joining room...</p>
          </>
        )}
      </div>
    </main>
  );
}
