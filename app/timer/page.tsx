"use client";
import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import { updatePoints } from "@/lib/utils/points";
import {
  Play,
  Pause,
  RotateCcw,
  Brain,
  Coffee,
  AlertTriangle,
} from "lucide-react";

const MODES = [
  { label: "Focus", duration: 25 * 60, color: "blue", icon: Brain },
  { label: "Pausa", duration: 5 * 60, color: "emerald", icon: Coffee },
  { label: "Focus Lungo", duration: 50 * 60, color: "violet", icon: Brain },
];

export default function TimerPage() {
  const { user, userData, loading, refreshUserData } = useAuth();
  const router = useRouter();
  const [modeIdx, setModeIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(MODES[0].duration);
  const [running, setRunning] = useState(false);
  const [failed, setFailed] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  // Detect tab switch / visibility change → malus
  useEffect(() => {
    if (!running) return;
    const handleVisibility = async () => {
      if (document.hidden) {
        setRunning(false);
        setFailed(true);
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (user) {
          await updatePoints(user.uid, "distrazione");
          await refreshUserData();
          setMsg("😵 Sei uscito dall'app! -1 punto");
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [running, user, refreshUserData]);

  // Countdown
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(async () => {
        setTimeLeft((t) => {
          if (t <= 1) {
            clearInterval(intervalRef.current!);
            setRunning(false);
            setCompleted(true);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  // Award on completion
  useEffect(() => {
    if (completed && user) {
      (async () => {
        const mode = MODES[modeIdx];
        let pointsToAdd = 0;
        let message = "";

        if (modeIdx === 1) {
          // Pausa: 1 punto indistintamente
          pointsToAdd = 1;
          message = "☕ Pausa completata! +1 punto";
        } else {
          // Focus e Focus Lungo: 1 punto per minuto
          const minutes = mode.duration / 60;
          pointsToAdd = minutes;
          message = `🎉 Sessione completata! +${minutes} punti (1 minuto)`;
        }

        const pts = await updatePoints(
          user.uid,
          "studio",
          undefined,
          undefined,
          pointsToAdd,
        );
        await refreshUserData();
        setMsg(message);
      })();
    }
  }, [completed, user, refreshUserData, modeIdx]);

  const handleMode = (idx: number) => {
    setModeIdx(idx);
    setTimeLeft(MODES[idx].duration);
    setRunning(false);
    setFailed(false);
    setCompleted(false);
    setMsg(null);
  };

  const reset = () => {
    setTimeLeft(MODES[modeIdx].duration);
    setRunning(false);
    setFailed(false);
    setCompleted(false);
    setMsg(null);
  };

  const mins = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const secs = String(timeLeft % 60).padStart(2, "0");
  const progress = 1 - timeLeft / MODES[modeIdx].duration;
  const circumference = 2 * Math.PI * 110; // r=110
  const mode = MODES[modeIdx];
  const colorMap: Record<string, string> = {
    blue: "#3b82f6",
    emerald: "#10b981",
    violet: "#8b5cf6",
  };
  const accent = colorMap[mode.color];

  if (loading || !userData)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="md:pl-20 min-h-screen">
      <Navbar />
      <main className="p-4 md:p-8 pb-24 md:pb-8 max-w-lg mx-auto flex flex-col items-center gap-6">
        <h1 className="text-2xl font-black text-white mt-2">
          Timer Pomodoro 🍅
        </h1>

        {/* Mode selector */}
        <div className="flex gap-2 glass rounded-2xl p-1.5 w-full">
          {MODES.map((m, i) => (
            <button
              key={m.label}
              onClick={() => handleMode(i)}
              className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all duration-200 ${
                i === modeIdx
                  ? "bg-white/10 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Timer Circle */}
        <div className="relative w-64 h-64 flex items-center justify-center">
          <svg
            className="absolute inset-0 w-full h-full -rotate-90"
            viewBox="0 0 240 240"
          >
            <circle
              cx="120"
              cy="120"
              r="110"
              fill="none"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="8"
            />
            <circle
              cx="120"
              cy="120"
              r="110"
              fill="none"
              stroke={accent}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
              style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s" }}
            />
          </svg>
          <div className="flex flex-col items-center gap-1 z-10">
            <span className="text-5xl font-black text-white tabular-nums">
              {mins}:{secs}
            </span>
            <span className="text-slate-400 text-sm">{mode.label}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          <button
            onClick={reset}
            className="w-12 h-12 glass rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
          <button
            disabled={failed || completed}
            onClick={() => setRunning((r) => !r)}
            className="w-20 h-20 rounded-full flex items-center justify-center font-bold text-white transition-all duration-300 shadow-lg gaming-btn"
            style={{
              backgroundColor: accent,
              boxShadow: `0 0 24px ${accent}60`,
            }}
          >
            {running ? (
              <Pause className="w-7 h-7" />
            ) : (
              <Play className="w-7 h-7 ml-1" />
            )}
          </button>
          <div className="w-12 h-12" />
        </div>

        {/* Status messages */}
        {msg && (
          <div className="w-full glass rounded-xl px-4 py-3 text-center text-sm font-medium text-white">
            {msg}
          </div>
        )}

        {/* Warning */}
        {running && (
          <div className="w-full flex items-start gap-3 bg-yellow-400/10 border border-yellow-400/20 rounded-xl p-4">
            <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <p className="text-yellow-200 text-xs">
              <strong>Attenzione!</strong> Se esci dall'app o cambi scheda
              durante il timer, perderai 1 punto per distrazione.
            </p>
          </div>
        )}

        {/* Rules */}
        <div className="w-full glass rounded-2xl p-4 grid grid-cols-2 gap-3">
          {[
            {
              label: "Sessione completata",
              value: "+1",
              color: "text-emerald-400",
            },
            {
              label:
                "Se non fermi il timer o non finisci la sessione correttamente la sessione andrà persa.",
              value: "0",
              color: "text-slate-400",
            },
            {
              label: "Distrazione/Tab switch",
              value: "-1",
              color: "text-red-400",
            },
            { label: "Focus (25 min)", value: "🍅", color: "text-orange-400" },
            {
              label: "Focus Lungo (50 min)",
              value: "🍅🍅",
              color: "text-orange-400",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="bg-white/5 rounded-xl p-3 flex justify-between items-center"
            >
              <span className="text-xs text-slate-400">{item.label}</span>
              <span className={`text-sm font-bold ${item.color}`}>
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
