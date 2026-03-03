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

export type ActionType = "lezione" | "esame" | "studio";

interface PointConfig {
  lezione: number;
  puntualita: number;
  esame: number;
  esame_30: number;
  ritardo: number;
  salto: number;
  distrazione: number;
  studio: number;
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
  early_bonus: 5, // bonus for arriving before scheduled start
};

/**
 * Updates user points and logs the action in Firestore.
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
) {
  const userRef = doc(db, "users", userId);
  const logRef = collection(db, "logs");

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
      pointsToAdd = POINTS.studio;
      break;
  }

  // Handle Boss Exam multiplier
  if (examId && (type === "lezione" || type === "studio")) {
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const userData = userSnap.data();
      if (userData.esame_boss_id === examId) {
        pointsToAdd *= 2;
      }
    }
  }

  // Early arrival bonus: if a startTime was provided and now is before it
  if (startTime && Date.now() < startTime.getTime()) {
    pointsToAdd += POINTS.early_bonus;
  }

  // Update User Total Points
  await updateDoc(userRef, {
    punti_totali: increment(pointsToAdd),
  });

  // Log the action (include startTime if provided for auditing)
  await addDoc(logRef, {
    userId,
    tipo_azione: type,
    punti_assegnati: pointsToAdd,
    examId: examId || null,
    startTime: startTime ? startTime.toISOString() : null,
    timestamp: serverTimestamp(),
  });

  return pointsToAdd;
}
