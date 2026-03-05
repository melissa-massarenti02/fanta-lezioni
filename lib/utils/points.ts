import { db } from "../firebase";
import {
  doc,
  updateDoc,
  increment,
  collection,
  addDoc,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";

export type ActionType = "lezione" | "esame" | "studio" | "buona_condotta";

interface PointConfig {
  lezione: number;
  puntualita: number;
  esame: number;
  esame_30: number;
  ritardo: number;
  salto: number;
  distrazione: number;
  studio: number;
  buona_condotta: number;
  early_bonus: number; // points awarded for early arrival
}

const POINTS: PointConfig = {
  lezione: 3,
  puntualita: 2,
  esame: 5,
  esame_30: 10,
  ritardo: -2,
  salto: -3,
  distrazione: -1,
  studio: 1,
  buona_condotta: 30, // bonus per comportamento
  early_bonus: 5, // bonus for arriving before scheduled start
};

/**
 * Updates user points and logs the action in Firestore.
 * @param minutesStudied Optional: for studio type, multiply by minutes studied (default 1)
 */
export async function updatePoints(
  userId: string,
  type:
    | ActionType
    | "puntualita"
    | "esame_30"
    | "ritardo"
    | "salto"
    | "distrazione",
  examId?: string,
  /**
   * Optional scheduled start timestamp. If provided and the current time is
   * before this value, the user earns an additional early-arrival bonus.
   */
  startTime?: Date,
  minutesStudied?: number,
) {
  const userRef = doc(db, "users", userId);
  const logRef = collection(db, "logs");

  // we fetch the user once up front so we can inspect their current total
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) {
    throw new Error(`User ${userId} not found`);
  }
  const userData = userSnap.data() as any;
  const currentPoints: number = userData.punti_totali || 0;

  let pointsToAdd = 0;

  switch (type) {
    case "lezione":
      pointsToAdd = POINTS.lezione;
      break;
    case "puntualita":
      pointsToAdd = POINTS.puntualita;
      break;
    case "esame":
      pointsToAdd = POINTS.esame;
      break;
    case "esame_30":
      pointsToAdd = POINTS.esame_30;
      break;
    case "ritardo":
      pointsToAdd = POINTS.ritardo;
      break;
    case "salto":
      pointsToAdd = POINTS.salto;
      break;
    case "distrazione":
      pointsToAdd = POINTS.distrazione;
      break;
    case "studio":
      const rawValue = minutesStudied || 1; //
      let sanitized: number;

      // Conversione sicura universale
      if (rawValue > 100000) { 
        sanitized = Math.floor(rawValue / 60000); // ms -> min
      } else if (rawValue > 120) { 
        sanitized = Math.floor(rawValue / 60); // sec -> min
      } else {
        sanitized = rawValue; // già min
      }

      // Limite di sicurezza e calcolo finale
      const finalMinutes = Math.min(sanitized, 180); //
      pointsToAdd = POINTS.studio * finalMinutes; //
      break;
    case "buona_condotta":
      pointsToAdd = POINTS.buona_condotta;
      break;
  }

  // Handle exam passed bonus: if exam was passed, award CFU * 2
  if (examId && type === "esame") {
    try {
      const examRef = doc(db, "exams", examId);
      const examSnap = await getDoc(examRef);
      if (examSnap.exists()) {
        const examData = examSnap.data() as any;
        if (examData.passato === true && examData.CFU) {
          // USA += per sommare il bonus ai punti base (5 + bonus)
          pointsToAdd += examData.CFU * 2;
        }
      }
    } catch (err) {
      console.error("Error checking exam passed status", err);
    }
  }

  // Early arrival bonus: if a startTime was provided and now is before it
  if (startTime && Date.now() < startTime.getTime()) {
    pointsToAdd += POINTS.early_bonus;
  }

  // Update User Total Points only if it won't drive the total below zero
  if (currentPoints + pointsToAdd >= 0) {
    // Limite massimo di sicurezza per singola operazione
    pointsToAdd = Math.min(pointsToAdd, 200);
    await updateDoc(userRef, {
      punti_totali: increment(pointsToAdd),
    });
  } else {
    // abort and inform caller that the operation would result in a negative score
    throw new Error(
      `Cannot apply ${pointsToAdd} points to user ${userId}; resulting total would be negative (${currentPoints} + ${pointsToAdd})`,
    );
  }

  // Log the action (include startTime if provided for auditing)
  await addDoc(logRef, {
    userId,
    tipo_azione: type,
    punti_assegnati: pointsToAdd,
    examId: examId || null,
    startTime: startTime ? startTime.toISOString() : null,
    minutesStudied: minutesStudied || null,
    timestamp: serverTimestamp(),
  });

  return pointsToAdd;
}
