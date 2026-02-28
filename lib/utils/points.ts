import { db } from "../firebase";
import {
    doc,
    updateDoc,
    increment,
    collection,
    addDoc,
    serverTimestamp,
    getDoc
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
};

/**
 * Updates user points and logs the action in Firestore.
 */
export async function updatePoints(
    userId: string,
    type: ActionType | "puntualita" | "esame_30" | "ritardo" | "salto" | "distrazione",
    examId?: string
) {
    const userRef = doc(db, "users", userId);
    const logRef = collection(db, "logs");

    let pointsToAdd = 0;

    switch (type) {
        case "lezione": pointsToAdd = POINTS.lezione; break;
        case "puntualita": pointsToAdd = POINTS.puntualita; break;
        case "esame": pointsToAdd = POINTS.esame; break;
        case "esame_30": pointsToAdd = POINTS.esame_30; break;
        case "ritardo": pointsToAdd = POINTS.ritardo; break;
        case "salto": pointsToAdd = POINTS.salto; break;
        case "distrazione": pointsToAdd = POINTS.distrazione; break;
        case "studio": pointsToAdd = POINTS.studio; break;
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

    // Update User Total Points
    await updateDoc(userRef, {
        punti_totali: increment(pointsToAdd),
    });

    // Log the action
    await addDoc(logRef, {
        userId,
        tipo_azione: type,
        punti_assegnati: pointsToAdd,
        examId: examId || null,
        timestamp: serverTimestamp(),
    });

    return pointsToAdd;
}
