"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { Trophy, Medal, Star } from "lucide-react";
import Image from "next/image";

interface LeaderboardEntry {
    id: string;
    nome: string;
    punti_totali: number;
    photoURL?: string;
}

const trophyColors = ["text-yellow-400", "text-slate-300", "text-amber-600"];
const trophyIcons = [Trophy, Trophy, Trophy];

export default function LeaderboardPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [fetching, setFetching] = useState(true);

    useEffect(() => {
        if (!loading && !user) router.push("/login");
    }, [user, loading, router]);

    const fetchLeaderboard = useCallback(async () => {
        const q = query(collection(db, "users"), orderBy("punti_totali", "desc"));
        const snap = await getDocs(q);
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as LeaderboardEntry));
        setEntries(data);
        setFetching(false);
    }, []);

    useEffect(() => {
        fetchLeaderboard();
    }, [fetchLeaderboard]);

    if (loading || fetching) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    const top3 = entries.slice(0, 3);
    const rest = entries.slice(3);
    const leader = top3[0];

    return (
        <div className="md:pl-20 min-h-screen">
            <Navbar />
            <main className="p-4 md:p-8 pb-24 md:pb-8 max-w-2xl mx-auto">
                <h1 className="text-2xl font-black text-white mt-2 mb-6 flex items-center gap-2">
                    <Trophy className="w-6 h-6 text-yellow-400" /> Classifica
                </h1>

                {/* Podium */}
                {top3.length > 0 && (
                    <div className="flex items-end justify-center gap-4 mb-8">
                        {/* 2nd */}
                        {top3[1] && (
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-14 h-14 rounded-full bg-slate-400/20 flex items-center justify-center text-xl font-black text-slate-300 overflow-hidden border-2 border-slate-400">
                                    {top3[1].photoURL ? (
                                        <Image src={top3[1].photoURL} alt="avatar" width={56} height={56} className="rounded-full" />
                                    ) : (
                                        top3[1].nome.charAt(0)
                                    )}
                                </div>
                                <Medal className="w-5 h-5 text-slate-300" />
                                <span className="text-xs text-slate-300 font-bold truncate max-w-16 text-center">{top3[1].nome.split(" ")[0]}</span>
                                <div className="bg-slate-400/20 rounded-t-xl w-20 h-20 flex items-end justify-center pb-2">
                                    <span className="text-slate-300 font-black">{top3[1].punti_totali}</span>
                                </div>
                            </div>
                        )}
                        {/* 1st */}
                        {leader && (
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-16 h-16 rounded-full bg-yellow-400/20 flex items-center justify-center text-2xl font-black text-yellow-400 overflow-hidden border-2 border-yellow-400">
                                    {leader.photoURL ? (
                                        <Image src={leader.photoURL} alt="avatar" width={64} height={64} className="rounded-full" />
                                    ) : (
                                        leader.nome.charAt(0)
                                    )}
                                </div>
                                <Trophy className="w-6 h-6 text-yellow-400" />
                                <span className="text-xs text-yellow-300 font-bold truncate max-w-20 text-center">{leader.nome.split(" ")[0]}</span>
                                <div className="bg-yellow-400/20 rounded-t-xl w-24 h-28 flex items-end justify-center pb-2">
                                    <span className="text-yellow-400 font-black text-lg">{leader.punti_totali}</span>
                                </div>
                            </div>
                        )}
                        {/* 3rd */}
                        {top3[2] && (
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-14 h-14 rounded-full bg-amber-600/20 flex items-center justify-center text-xl font-black text-amber-600 overflow-hidden border-2 border-amber-600">
                                    {top3[2].photoURL ? (
                                        <Image src={top3[2].photoURL} alt="avatar" width={56} height={56} className="rounded-full" />
                                    ) : (
                                        top3[2].nome.charAt(0)
                                    )}
                                </div>
                                <Medal className="w-5 h-5 text-amber-600" />
                                <span className="text-xs text-amber-600 font-bold truncate max-w-16 text-center">{top3[2].nome.split(" ")[0]}</span>
                                <div className="bg-amber-600/20 rounded-t-xl w-20 h-14 flex items-end justify-center pb-2">
                                    <span className="text-amber-600 font-black">{top3[2].punti_totali}</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Full table */}
                <div className="glass rounded-2xl overflow-hidden">
                    {entries.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">
                            <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p>Nessun giocatore ancora. Sii il primo!</p>
                        </div>
                    ) : (
                        entries.map((entry, i) => {
                            const isMe = entry.id === user?.uid;
                            const isTop = i < 3;
                            const prev = entries[i - 1];
                            const distacco = prev ? entry.punti_totali - prev.punti_totali : 0;
                            return (
                                <div
                                    key={entry.id}
                                    className={`flex items-center gap-4 px-4 py-4 border-b border-white/5 last:border-0 transition-colors ${isMe ? "bg-blue-600/10" : "hover:bg-white/5"
                                        }`}
                                >
                                    <div className={`w-8 text-center font-black text-sm ${i === 0 ? "text-yellow-400" : i === 1 ? "text-slate-300" : i === 2 ? "text-amber-600" : "text-slate-500"
                                        }`}>
                                        #{i + 1}
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center overflow-hidden border border-white/10 flex-shrink-0">
                                        {entry.photoURL ? (
                                            <Image src={entry.photoURL} alt="avatar" width={40} height={40} className="rounded-full" />
                                        ) : (
                                            <span className="font-bold text-white">{entry.nome.charAt(0)}</span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`font-bold truncate ${isMe ? "text-blue-300" : "text-white"}`}>
                                            {entry.nome} {isMe && "(tu)"}
                                        </p>
                                        {i > 0 && (
                                            <p className="text-xs text-red-400">{distacco} pts dal precedente</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        {isTop && <Star className={`w-4 h-4 ${trophyColors[i]}`} />}
                                        <span className={`font-black text-lg ${isMe ? "text-blue-300" : "text-white"}`}>
                                            {entry.punti_totali}
                                        </span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </main>
        </div>
    );
}
