import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { RoomProvider } from "@/lib/RoomContext";

const geist = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "RoomOS",
  description: "Track your shared home balance, shopping items, chores, and reminders on the RoomOS App.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#9b7fe8" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="RoomOS" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="bg-[#0d0d14] min-h-screen text-white">
        <div className="mx-auto min-h-screen max-w-[430px] w-full flex flex-col relative z-10">
          <div className="pointer-events-none fixed inset-0 z-0">
            <div style={{
              position: 'absolute',
              top: '-120px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '320px',
              height: '320px',
              background: 'radial-gradient(circle, rgba(155,127,232,0.12) 0%, transparent 70%)',
              borderRadius: '50%',
            }} />
          </div>
          <RoomProvider>
            {children}
          </RoomProvider>
        </div>
      </body>
    </html>
  );
}

