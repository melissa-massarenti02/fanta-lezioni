"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import { db } from "@/lib/firebase";
import {
    collection, query, getDocs, addDoc, serverTimestamp,
    doc, updateDoc, increment
} from "firebase/firestore";
import { BookMarked, Plus, ShoppingCart, ExternalLink, X, Zap } from "lucide-react";

interface Note {
    id: string;
    titolo: string;
    materia: string;
    descrizione: string;
    link: string;
    prezzo: number;
    venditore_id: string;
    venditore_nome: string;
    timestamp: { seconds: number } | null;
}

export default function MarketPage() {
    const { user, userData, loading, refreshUserData } = useAuth();
    const router = useRouter();
    const [notes, setNotes] = useState<Note[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);
    const [form, setForm] = useState({ titolo: "", materia: "", descrizione: "", link: "", prezzo: 5 });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!loading && !user) router.push("/login");
    }, [user, loading, router]);

    const fetchNotes = useCallback(async () => {
        const q = query(collection(db, "notes"));
        const snap = await getDocs(q);
        setNotes(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Note)));
    }, []);

    useEffect(() => { fetchNotes(); }, [fetchNotes]);

    const handleBuy = async (note: Note) => {
        if (!user || !userData) return;
        if (userData.punti_totali < note.prezzo) {
            setMsg("❌ Punti insufficienti!");
            return;
        }
        if (note.venditore_id === user.uid) {
            setMsg("⚠️ Non puoi comprare i tuoi stessi appunti!");
            return;
        }
        // Transfer points
        await updateDoc(doc(db, "users", user.uid), { punti_totali: increment(-note.prezzo) });
        await updateDoc(doc(db, "users", note.venditore_id), { punti_totali: increment(note.prezzo) });
        await refreshUserData();
        setMsg(`✅ Acquisto completato! -${note.prezzo} punti → Apri il link!`);
        window.open(note.link, "_blank");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !userData) return;
        setSubmitting(true);
        await addDoc(collection(db, "notes"), {
            ...form,
            venditore_id: user.uid,
            venditore_nome: userData.nome,
            timestamp: serverTimestamp(),
        });
        setForm({ titolo: "", materia: "", descrizione: "", link: "", prezzo: 5 });
        setShowForm(false);
        setSubmitting(false);
        setMsg("✅ Appunti pubblicati!");
        await fetchNotes();
    };

    if (loading || !userData) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="md:pl-20 min-h-screen">
            <Navbar />
            <main className="p-4 md:p-8 pb-24 md:pb-8 max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6 mt-2">
                    <h1 className="text-2xl font-black text-white flex items-center gap-2">
                        <BookMarked className="w-6 h-6 text-emerald-400" /> Mercato Appunti
                    </h1>
                    <div className="flex items-center gap-3">
                        <div className="glass px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                            <Zap className="w-4 h-4 text-yellow-400" />
                            <span className="font-bold text-white text-sm">{userData.punti_totali} pts</span>
                        </div>
                        <button
                            onClick={() => setShowForm(true)}
                            className="gaming-btn flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold text-sm transition-colors"
                        >
                            <Plus className="w-4 h-4" /> Pubblica
                        </button>
                    </div>
                </div>

                {/* Message */}
                {msg && (
                    <div className="mb-4 glass px-4 py-3 rounded-xl text-sm text-center font-medium text-white">
                        {msg}
                        <button onClick={() => setMsg(null)} className="ml-3 text-slate-400 hover:text-white">✕</button>
                    </div>
                )}

                {/* Notes Grid */}
                {notes.length === 0 ? (
                    <div className="glass rounded-2xl p-12 text-center text-slate-400">
                        <BookMarked className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="font-medium">Nessun appunto disponibile.</p>
                        <p className="text-sm mt-1">Sii il primo a pubblicare!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {notes.map((note) => (
                            <div key={note.id} className="glass rounded-2xl p-5 flex flex-col gap-3 hover:border-emerald-500/30 border border-transparent transition-all">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <h3 className="font-bold text-white">{note.titolo}</h3>
                                        <span className="text-xs text-emerald-400 font-medium">{note.materia}</span>
                                    </div>
                                    <div className="flex items-center gap-1 bg-yellow-400/10 px-2 py-1 rounded-lg flex-shrink-0">
                                        <Zap className="w-3.5 h-3.5 text-yellow-400" />
                                        <span className="text-yellow-400 font-black text-sm">{note.prezzo}</span>
                                    </div>
                                </div>
                                <p className="text-sm text-slate-400 line-clamp-2">{note.descrizione}</p>
                                <div className="flex items-center justify-between mt-auto pt-2 border-t border-white/5">
                                    <span className="text-xs text-slate-500">da {note.venditore_nome}</span>
                                    <div className="flex gap-2">
                                        <a
                                            href={note.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                        </a>
                                        {note.venditore_id !== user?.uid && (
                                            <button
                                                onClick={() => handleBuy(note)}
                                                className="gaming-btn flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-sm font-bold transition-colors"
                                            >
                                                <ShoppingCart className="w-3.5 h-3.5" /> Compra
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Publish Modal */}
                {showForm && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="glass rounded-2xl p-6 w-full max-w-md">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="font-black text-white text-lg">Pubblica Appunti</h2>
                                <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                                {[
                                    { key: "titolo", label: "Titolo", placeholder: "Es. Riassunto Analisi I" },
                                    { key: "materia", label: "Materia", placeholder: "Es. Analisi Matematica" },
                                    { key: "link", label: "Link (Drive, Notion...)", placeholder: "https://drive.google.com/..." },
                                ].map(({ key, label, placeholder }) => (
                                    <div key={key}>
                                        <label className="text-xs text-slate-400 mb-1 block">{label}</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder={placeholder}
                                            value={form[key as keyof typeof form] as string}
                                            onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/50 placeholder-slate-600"
                                        />
                                    </div>
                                ))}
                                <div>
                                    <label className="text-xs text-slate-400 mb-1 block">Descrizione</label>
                                    <textarea
                                        rows={2}
                                        placeholder="Breve descrizione degli appunti..."
                                        value={form.descrizione}
                                        onChange={(e) => setForm({ ...form, descrizione: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/50 placeholder-slate-600 resize-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400 mb-1 block">Prezzo (punti): {form.prezzo}</label>
                                    <input
                                        type="range" min={1} max={20} step={1}
                                        value={form.prezzo}
                                        onChange={(e) => setForm({ ...form, prezzo: Number(e.target.value) })}
                                        className="w-full accent-blue-500"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="gaming-btn bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold transition-colors mt-2 disabled:opacity-50"
                                >
                                    {submitting ? "Pubblicazione..." : "Pubblica 📚"}
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
