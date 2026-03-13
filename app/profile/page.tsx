"use client";
import React, { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import Navbar from "@/components/layout/Navbar";
import Avatar from "@/components/Avatar";
import Cropper from "react-easy-crop";
import { getCroppedImg } from "@/lib/utils/image";
import { db, auth } from "@/lib/firebase";
import {
  doc,
  updateDoc,
  getDoc,
  increment,
} from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import {
  CheckCircle2,
  Trophy,
  Upload,
  X,
  Save,
  Trash2,
  Github,
  LogOut,
} from "lucide-react";
import { updatePoints } from "@/lib/utils/points";

export default function ProfilePage() {
  const { user, userData, refreshUserData, loading, logout } = useAuth();  const [imageSrc, setImageSrc] = useState<string | null>(null);
  // const [purchasedNotes, setPurchasedNotes] = useState<any[]>([]); SPOSTATO IN MARKET PER UX MIGLIORE
  const [msg, setMsg] = useState<string | null>(null);
  // const [localRatings, setLocalRatings] = useState<Record<string, number>>({}); SPOSTATO IN MARKET PER UX MIGLIORE
  const [enrolledExams, setEnrolledExams] = useState<any[]>([]);
  const [passedExams, setPassedExams] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const onCropComplete = useCallback(
    (_: any, pixels: any) => {
      setCroppedAreaPixels(pixels);
      if (
        imageSrc &&
        pixels &&
        typeof pixels.width === "number" &&
        pixels.width > 0 &&
        typeof pixels.height === "number" &&
        pixels.height > 0
      ) {
        // generate preview asynchronously but do not await (avoid unhandled
        // promise errors). catch and log so errors from cropping don't bubble
        // up to the browser console as generic Event objects.
        getCroppedImg(imageSrc, pixels)
          .then((blob) => {
            const url = URL.createObjectURL(blob);
            setPreviewUrl((old) => {
              if (old) URL.revokeObjectURL(old);
              return url;
            });
          })
          .catch((_err) => {
            // benign error while generating preview; ignore completely.
          });
      }
    },
    [imageSrc],
  );

  const router = useRouter();
  React.useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [user, loading, router, imageSrc, previewUrl]);

  // fetch purchased notes when userData becomes available
  //const loadPurchased = async () => {
  //    React.useEffect(() => {
  //    if (!userData || !userData.purchasedNotes?.length) {
  //      setPurchasedNotes([]);
  //      return;
  //    }
  //    const arr: any[] = [];
  //    for (const id of userData.purchasedNotes) {
  //      const snap = await getDoc(doc(db, "notes", id));
  //      if (snap.exists()) {
  //        arr.push({ id, ...snap.data() });
  //      }
  //    }
  //    setPurchasedNotes(arr);
  //  };
  //  loadPurchased();
  //}, [userData]);

  // fetch enrolled exams when userData becomes available
  React.useEffect(() => {
    const loadExams = async () => {
      if (!userData || !userData.lista_esami_iscritti?.length) {
        setEnrolledExams([]);
        setPassedExams(new Set());
        return;
      }
      const arr: any[] = [];
      const passed = new Set<string>();
      for (const examId of userData.lista_esami_iscritti) {
        const snap = await getDoc(doc(db, "exams", examId));
        if (snap.exists()) {
          const examData = snap.data() as any;
          arr.push({ id: examId, ...examData });
          if (examData.passato === true) {
            passed.add(examId);
          }
        }
      }
      setEnrolledExams(arr);
      setPassedExams(passed);
    };
    loadExams();
  }, [userData]);

  if (loading || !user || !userData) {
    return <div>Loading...</div>;
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    // cleanup previous preview only; imageSrc is a data URL so nothing to revoke
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }

    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setError("Formato non supportato. Usa JPG, PNG o WEBP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Il file supera i 5MB di dimensione.");
      return;
    }

    // read as data URL for reliability (avoids blob URL revocation issues)
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
    };
    reader.onerror = () => {
      setError("Impossibile leggere il file");
    };
    reader.readAsDataURL(file);
  };

  const saveAvatar = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setUploading(true);
    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels);

      // convert blob -> base64 via FileReader promise
      const base64data: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });

      // Salviamo la stringa direttamente nel database (NO STORAGE!)
      await updateDoc(doc(db, "users", user.uid), { photoURL: base64data });
      // Firebase Auth imposes a ~1024‑char limit on photoURL, and our base64 can
      // easily exceed that once inlined. Only update the auth profile when the
      // value is short enough (or else the call throws auth/invalid-profile-attribute).
      if (auth.currentUser) {
        if (base64data.length <= 1024) {
          await updateProfile(auth.currentUser, { photoURL: base64data });
        } else {
          console.warn(
            "avatar string too long for auth.profile, skipping update",
            base64data.length,
          );
        }
      }
      await refreshUserData();

      // clear the selection so UI resets
      setImageSrc(null);
    } catch (err: any) {
      // in past we saw Event objects stringify to {} – special-case them
      if (err instanceof Event) {
        console.error("saveAvatar got Event error", err, { type: err.type });
        setError(
          `Errore durante il caricamento dell'immagine: evento ${err.type}`,
        );
      } else {
        console.error("saveAvatar error", err, { src: imageSrc });
        const msg = err?.message || String(err);
        setError(`Errore durante il salvataggio locale: ${msg}`);
      }
    } finally {
      setUploading(false);
    }
  };

  const resetAvatar = async () => {
    setUploading(true);
    try {
      await updateDoc(doc(db, "users", user.uid), { photoURL: "" });
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { photoURL: "" });
      }
      await refreshUserData();
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  // Check if current date falls within an exam session period
  const isWithinExamSession = (): boolean => {
    const now = new Date();
    const month = now.getMonth(); // 0 = January, 11 = December

    // Sessione autunnale: settembre (8) e ottobre (9)
    if (month === 8 || month === 9) return true;

    // Sessione invernale: gennaio (0) e febbraio (1)
    if (month === 0 || month === 1) return true;

    // Sessione estiva: giugno (5) e luglio (6)
    if (month === 5 || month === 6) return true;

    return false;
  };

  const handleMarkExamPassed = async (exam: any) => {
    if (!user || !userData) return;
    if (passedExams.has(exam.id)) {
      setMsg("✅ Hai già marcato questo esame come superato.");
      return;
    }
    // Check if current date is within an exam session
    if (!isWithinExamSession()) {
      setMsg(
        "🔒 Gli esami possono essere superati solo durante i periodi di sessione: settembre-ottobre (autunnale), gennaio-febbraio (invernale), giugno-luglio (estiva).",
      );
      return;
    }
    try {
      // Mark exam as passed in Firestore
      await updateDoc(doc(db, "exams", exam.id), { passato: true });
      // Award CFU * 2 points to user
      const bonusPoints = (exam.CFU || 0) * 2;
      await updateDoc(doc(db, "users", user.uid), {
        punti_totali: increment(bonusPoints),
      });
      // Add to local passed set
      setPassedExams((old) => new Set([...old, exam.id]));
      await refreshUserData();
      setMsg(
        `🎉 Esame superato! +${bonusPoints} punti bonus (CFU ${exam.CFU} × 2)`,
      );
    } catch (err) {
      console.error("mark exam passed", err);
      setMsg("❌ Errore durante il salvataggio.");
    }
  };

  const handleUnmarkExamPassed = async (exam: any) => {
    if (!user || !userData) return;
    if (!passedExams.has(exam.id)) {
      setMsg("⚠️ Questo esame non è marcato come superato.");
      return;
    }
    try {
      // Mark exam as not passed in Firestore
      await updateDoc(doc(db, "exams", exam.id), { passato: false });
      // Remove CFU * 2 points from user
      const bonusPoints = (exam.CFU || 0) * 2;
      await updateDoc(doc(db, "users", user.uid), {
        punti_totali: increment(-bonusPoints),
      });
      // Remove from local passed set
      setPassedExams((old) => {
        const newSet = new Set(old);
        newSet.delete(exam.id);
        return newSet;
      });
      await refreshUserData();
      setMsg(
        `↩️ Passaggio annullato! -${bonusPoints} punti (CFU ${exam.CFU} × 2)`,
      );
    } catch (err) {
      console.error("unmark exam passed", err);
      setMsg("❌ Errore durante l'annullamento.");
    }
  };

  // const handleRate = async (note: any, stars: number) => {
  //   if (!user || !userData) return;
  //   // guard against duplicate
  //   if (userData.ratingsGiven?.includes(note.id)) {
  //     setMsg("Hai già valutato questo appunto.");
  //     return;
  //   }
  //   try {
  //     // update note aggregates
  //     await updateDoc(doc(db, "notes", note.id), {
  //       ratingSum: increment(stars),
  //       ratingCount: increment(1),
  //     });
  //     // give points to seller
  //     await updateDoc(doc(db, "users", note.venditore_id), {
  //       punti_totali: increment(stars),
  //     });
  //     // mark as rated for current user
  //     await updateDoc(doc(db, "users", user.uid), {
  //       ratingsGiven: arrayUnion(note.id),
  //     });
  //     await refreshUserData();
  //     setMsg(
  //       `Grazie per la valutazione! ${stars} punti assegnati al venditore.`,
  //     );
  //   } catch (err) {
  //     console.error("rate note", err);
  //     setMsg("Errore durante la valutazione.");
  //   }
  // };

  return (
    <div className="md:pl-20 min-h-screen">
      <Navbar />
      <main className="p-4 md:p-8 pb-24 md:pb-8 max-w-2xl mx-auto">
        <h1 className="text-2xl font-black text-white mb-8">Profilo</h1>

        {/* GitHub repository link on small screens */}
        <div className="md:hidden mb-6 text-center">
          <a
            href="https://github.com/melissa-massarenti02/fanta-lezioni"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-blue-400 hover:text-white transition"
          >
            <Github className="w-5 h-5 mr-2" />
            Repository
          </a>
        </div>

        {/* Logout button for mobile */}
        <div className="md:hidden mb-6 text-center">
          <button
            onClick={logout}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition"
          >
            <LogOut className="w-5 h-5" />
            Esci
          </button>
        </div>

        {/* Avatar Card with gradient background */}
        <div className="relative w-full rounded-3xl overflow-hidden mb-8 shadow-2xl">
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-400"></div>

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center pt-12 pb-8 px-6">
            {/* Avatar */}
            <div className="mb-6 ring-4 ring-white/30 rounded-full shadow-xl hover:ring-white/50 transition-all duration-300">
              <Avatar
                src={userData.photoURL || undefined}
                name={userData.nome}
                size={120}
              />
            </div>

            {/* Name */}
            <h2 className="text-3xl font-black text-white mb-8 text-center">
              {userData.nome}
            </h2>

            {/* File input */}
            <input
              ref={inputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              capture="environment"
              onChange={handleFile}
              className="hidden"
            />

            {/* Button Group */}
            <div className="flex gap-3 flex-wrap justify-center w-full">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex items-center gap-2 px-5 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-full font-semibold backdrop-blur-sm transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <Upload className="w-4 h-4" />
                Carica foto
              </button>

              {userData?.photoURL && (
                <button
                  onClick={resetAvatar}
                  disabled={uploading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-red-500/30 hover:bg-red-500/50 text-white rounded-full font-semibold backdrop-blur-sm transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" />
                  {uploading ? "Eliminando..." : "Rimuovi"}
                </button>
              )}
            </div>

            {error && (
              <p className="mt-4 text-red-200 text-sm font-medium bg-red-500/20 px-4 py-2 rounded-full backdrop-blur-sm">
                {error}
              </p>
            )}
          </div>
        </div>

        {imageSrc && (
          <>
            <div className="relative w-full h-64 bg-black/20 mt-4">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <div className="mt-4">
              <label className="block text-sm text-white mb-1">Zoom</label>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div className="flex flex-col md:flex-row gap-4 mt-4 items-center justify-center w-full">
              {previewUrl && (
                <div className="w-24 h-24 rounded-full overflow-hidden ring-2 ring-white/50">
                  <img
                    src={previewUrl || ""}
                    alt="anteprima avatar"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex gap-3 flex-wrap justify-center">
                <button
                  onClick={() => {
                    setImageSrc(null);
                    if (previewUrl) {
                      URL.revokeObjectURL(previewUrl);
                      setPreviewUrl(null);
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-full font-semibold transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  <X className="w-4 h-4" />
                  Annulla
                </button>
                <button
                  onClick={saveAvatar}
                  disabled={uploading}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-semibold transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  {uploading ? "Salvataggio..." : "Salva"}
                </button>
              </div>
            </div>
          </>
        )}

        {/* enrolled exams section */}
        {enrolledExams.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" /> Esami Iscritti
            </h2>
            <div className="grid grid-cols-1 gap-4">
              {enrolledExams.map((exam) => (
                <div
                  key={exam.id}
                  className={`glass rounded-xl p-4 flex flex-col gap-3 ${
                    passedExams.has(exam.id)
                      ? "border border-emerald-500/30"
                      : ""
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-white text-lg">
                        {exam.nome}
                      </h3>
                      <span className="text-xs text-slate-400">
                        {exam.CFU} CFU
                      </span>
                    </div>
                    {passedExams.has(exam.id) ? (
                      <button
                        onClick={() => handleUnmarkExamPassed(exam)}
                        className="flex items-center gap-1.5 bg-emerald-600 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold transition-all duration-200"
                        title="Clicca per annullare il passaggio"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Superato</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleMarkExamPassed(exam)}
                        className="gaming-btn flex items-center gap-1.5 bg-yellow-600 hover:bg-yellow-500 text-white px-3 py-1.5 rounded-lg text-sm font-bold transition-colors"
                      >
                        <Trophy className="w-3.5 h-3.5" /> Superato
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
