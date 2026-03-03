"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { isWithinRange } from "@/lib/utils/geo";
import { updatePoints } from "@/lib/utils/points";
import {
  MapPin,
  Star,
  Swords,
  CheckCircle,
  XCircle,
  ChevronDown,
  TrendingUp,
  Calendar,
  Zap,
  Video, // Aggiunto Video
} from "lucide-react";

// Interfaccia aggiornata con il calendario (mappa di array)
interface Exam {
  id: string;
  nome: string;
  CFU: number;
  coordinate_aula: { lat: number; lng: number };
  calendario?: { [key: number]: string[] }; // Es: { 2: ["09:00", "11:30"] }
}

export default function DashboardPage() {
  const { user, userData, loading, refreshUserData } = useAuth();
  const router = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [gpsStatus, setGpsStatus] = useState<
    "idle" | "checking" | "near" | "far" | "error"
  >("idle");
  const [checkedIn, setCheckedIn] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false); // Nuovo stato per streaming
  const [bossExam, setBossExam] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (userData) setBossExam(userData.esame_boss_id);
  }, [userData]);

  const fetchExams = useCallback(async () => {
    const q = query(collection(db, "exams"));
    const snap = await getDocs(q);
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Exam);
    setExams(data);
  }, []);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  // Permette il check-in da 10 minuti prima a 10 minuti dopo l'inizio
  const isWithinTimeWindow = (startTime: string) => {
    const now = new Date();
    const [h, m] = startTime.split(":").map(Number);

    const start = new Date();
    start.setHours(h, m, 0);

    // Definisce l'intervallo: 10 minuti PRIMA e 10 minuti DOPO
    const windowStart = new Date(start.getTime() - 10 * 60 * 1000);
    const windowEnd = new Date(start.getTime() + 10 * 60 * 1000);

    return now >= windowStart && now <= windowEnd;
  };

  // Funzione centralizzata per l'aggiornamento punti e blocco duplicati
  const finalizeCheckIn = async (attendanceRef: any, currentExamId: string) => {
    if (user) {
      await setDoc(attendanceRef, {
        uid: user.uid,
        timestamp: new Date(),
        metodo: isStreaming ? "streaming" : "gps",
      });

      // Passiamo l'id dell'esame trovato, non quello del boss
      const pts = await updatePoints(
        user.uid,
        "lezione",
        currentExamId, // <--- Importante per il calcolo raddoppio
      );

      setMsg(`✅ Check-in completato! +${pts} punti`);
      await refreshUserData();
      setCheckedIn(true);
      setGpsStatus("near");
    }
  };

  // Sostituisci handleCheckIn con questa versione "Multi-Esame"
  const handleCheckIn = async () => {
    setGpsStatus("checking");

    const dayOfWeek = new Date().getDay();
    let activeSession: { exam: Exam; time: string } | null = null;

    // 1. Cerchiamo la lezione tra TUTTI gli esami in cui l'utente è iscritto
    for (const examId of userData?.lista_esami_iscritti || []) {
      const exam = exams.find((e) => e.id === examId);
      if (!exam) continue;
      const sessioniOggi = exam?.calendario?.[dayOfWeek];

      if (Array.isArray(sessioniOggi)) {
        const timeFound = sessioniOggi.find((ora) => isWithinTimeWindow(ora));
        if (timeFound) {
          activeSession = { exam, time: timeFound };
          break; // Trovata la lezione attiva, usciamo dal loop
        }
      }
    }

    // 2. Errore se non ci sono lezioni attive in questo momento
    if (!activeSession) {
      setMsg("❌ Nessuna delle tue lezioni è attiva o fuori tempo massimo");
      setGpsStatus("idle");
      return;
    }

    // 3. Prepariamo il check-in per l'esame individuato
    const todayStr = new Date().toISOString().split("T")[0];
    const sessionID = activeSession.time.replace(":", "");
    const attendanceRef = doc(
      db,
      "exams",
      activeSession.exam.id, // ID dell'esame della lezione reale
      "presenze",
      `${user?.uid}_${todayStr}_${sessionID}`,
    );

    const snap = await getDoc(attendanceRef);
    if (snap.exists()) {
      setMsg("⚠️ Hai già convalidato questa sessione!");
      setCheckedIn(true);
      setGpsStatus("near");
      return;
    }

    // 4. Logica Geofencing o Streaming
    if (isStreaming) {
      await finalizeCheckIn(attendanceRef, activeSession.exam.id);
    } else {
      if (!navigator.geolocation) {
        setGpsStatus("error");
        setMsg("❌ GPS non supportato");
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          // Usiamo le coordinate dell'esame trovato, non del boss
          const targetLat = activeSession!.exam.coordinate_aula?.lat || 45.0628;
          const targetLng = activeSession!.exam.coordinate_aula?.lng || 7.662;

          const within = isWithinRange(
            latitude,
            longitude,
            targetLat,
            targetLng,
            false,
            650,
          );

          if (within) {
            await finalizeCheckIn(attendanceRef, activeSession!.exam.id);
          } else {
            setGpsStatus("far");
            setMsg("❌ Sei troppo lontano dall'aula (>650m)");
          }
        },
        () => setGpsStatus("error"),
      );
    }
  };

  const handleBossSelect = async (examId: string) => {
    if (!user) return;
    setBossExam(examId);
    await updateDoc(doc(db, "users", user.uid), { esame_boss_id: examId });
    await refreshUserData();
    setMsg("🎯 Esame Boss aggiornato!");
  };

  // funzione per iscriversi agli esami del semestre
  const toggleEnrollment = async (examId: string) => {
    if (!user || !userData) return;

    const currentList = userData.lista_esami_iscritti || [];
    const isEnrolled = currentList.includes(examId);

    const updatedList = isEnrolled
      ? currentList.filter((id: string) => id !== examId)
      : [...currentList, examId];

    try {
      await updateDoc(doc(db, "users", user.uid), {
        lista_esami_iscritti: updatedList,
      });
      setMsg(
        isEnrolled ? "❌ Esame rimosso dal piano" : "✅ Iscrizione effettuata!",
      );
      await refreshUserData();
    } catch (error) {
      setMsg("❌ Errore durante l'aggiornamento");
    }
  };

  if (loading || !userData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const bossExamName = exams.find((e) => e.id === bossExam)?.nome ?? "Nessuno";

  return (
    <div className="md:pl-20 min-h-screen">
      <Navbar />
      <main className="p-4 md:p-8 pb-24 md:pb-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="mt-2 text-sm text-gray-400">
              Tieni d&apos;occhio i tuoi progressi
            </p>
            <h1 className="text-2xl font-black text-white">
              {userData.nome} 👋
            </h1>
          </div>
          <div className="glass px-4 py-2 rounded-xl flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="font-black text-lg text-white">
              {userData.punti_totali}
            </span>
            <span className="text-slate-400 text-sm">pts</span>
          </div>
        </div>

        {/* Message Toast */}
        {msg && (
          <div className="mb-6 glass px-4 py-3 rounded-xl text-sm text-center font-medium text-white animate-bounce">
            {msg}
            <button
              onClick={() => setMsg(null)}
              className="ml-3 text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            {
              label: "Punti Totali",
              value: userData.punti_totali,
              icon: Star,
              color: "text-yellow-400",
              bg: "bg-yellow-400/10",
            },
            {
              label: "Esami Iscritti",
              // Aggiunto ?. per sicurezza
              value: userData.lista_esami_iscritti?.length || 0,
              icon: Calendar,
              color: "text-blue-400",
              bg: "bg-blue-400/10",
            },
            {
              label: "Livello",
              value: Math.floor(userData.punti_totali / 20) + 1,
              icon: TrendingUp,
              color: "text-emerald-400",
              bg: "bg-emerald-400/10",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="glass rounded-2xl p-4 flex flex-col items-center gap-2"
            >
              <div
                className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center`}
              >
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div className="text-2xl font-black text-white">{stat.value}</div>
              <div className="text-xs text-slate-400 text-center">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* NUOVA SEZIONE: Il Tuo Piano Studi */}
        <div className="glass rounded-2xl p-6 mb-8 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-400" />
              Gestione Esami
            </h2>
            <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-1 rounded-md uppercase font-bold">
              {userData.lista_esami_iscritti?.length || 0} Iscritti
            </span>
          </div>

          <div className="grid gap-3 max-h-52 overflow-y-auto pr-2 custom-scrollbar">
            {exams.map((exam) => {
              const isEnrolled = userData.lista_esami_iscritti?.includes(
                exam.id,
              );
              return (
                <div
                  key={exam.id}
                  className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-white">
                      {exam.nome}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {exam.CFU} CFU
                    </span>
                  </div>
                  <button
                    onClick={() => toggleEnrollment(exam.id)}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                      isEnrolled
                        ? "bg-red-500/10 text-red-400 border border-red-500/20"
                        : "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
                    }`}
                  >
                    {isEnrolled ? "Rimuovi" : "Iscriviti"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Check-in Card */}
        <div className="glass rounded-2xl p-6 mb-6">
          <h2 className="font-bold text-white mb-1 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-400" />
            Check-in Lezione
          </h2>
          <p className="text-slate-400 text-sm mb-4">
            Verifica la tua presenza tramite GPS (650m) o Streaming.
          </p>

          {/* Toggle Streaming */}
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl mb-6 border border-white/10">
            <div className="flex items-center gap-3">
              <Video
                className={isStreaming ? "text-purple-400" : "text-slate-500"}
              />
              <div>
                <p className="text-sm font-bold text-white">
                  Seguo in Streaming
                </p>
                <p className="text-xs text-slate-500">Bypassa raggio GPS</p>
              </div>
            </div>
            <button
              onClick={() => setIsStreaming(!isStreaming)}
              className={`w-12 h-6 rounded-full transition-all relative ${isStreaming ? "bg-purple-600" : "bg-slate-700"}`}
            >
              <div
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isStreaming ? "left-7" : "left-1"}`}
              />
            </button>
          </div>

          <button
            onClick={handleCheckIn}
            disabled={checkedIn || gpsStatus === "checking"}
            className={`gaming-btn w-full py-3 rounded-xl font-bold transition-all duration-300 ${
              checkedIn
                ? "bg-emerald-600/30 text-emerald-400 cursor-not-allowed"
                : gpsStatus === "far"
                  ? "bg-red-600/30 text-red-400"
                  : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/30"
            }`}
          >
            {gpsStatus === "checking" ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                Verifica...
              </span>
            ) : checkedIn ? (
              <span className="flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4" /> Check-in Confermato!
              </span>
            ) : gpsStatus === "far" ? (
              <span className="flex items-center justify-center gap-2">
                <XCircle className="w-4 h-4" /> Troppo Lontano
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                {isStreaming ? (
                  <Video className="w-4 h-4" />
                ) : (
                  <MapPin className="w-4 h-4" />
                )}
                {isStreaming ? "Convalida Streaming" : "Fai Check-in"}
              </span>
            )}
          </button>
        </div>

        {/* Boss Exam */}
        <div className="glass rounded-2xl p-6">
          <h2 className="font-bold text-white mb-1 flex items-center gap-2">
            <Swords className="w-5 h-5 text-pink-400" />
            Esame Boss
          </h2>
          <p className="text-slate-400 text-sm mb-4">
            Scegli l'esame su cui vuoi raddoppiare i punti delle lezioni.
          </p>
          <div className="bg-pink-500/10 border border-pink-500/30 rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
            <span className="text-sm text-pink-300 font-medium">
              Boss attivo:
            </span>
            <span className="text-sm text-white font-bold truncate ml-2">
              {bossExamName}
            </span>
          </div>
          {exams.length > 0 ? (
            <div className="relative">
              <select
                onChange={(e) => handleBossSelect(e.target.value)}
                value={bossExam ?? ""}
                className="w-full appearance-none glass border border-white/10 rounded-xl px-4 py-3 text-white text-sm bg-transparent focus:outline-none focus:border-pink-500/50 cursor-pointer"
              >
                <option value="" className="bg-slate-800">
                  Seleziona un esame...
                </option>
                {exams.map((e) => (
                  <option key={e.id} value={e.id} className="bg-slate-800">
                    {e.nome} ({e.CFU} CFU)
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          ) : (
            <p className="text-slate-500 text-sm text-center py-4">
              Nessun esame disponibile. Chiedi all'admin di aggiungerne.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
