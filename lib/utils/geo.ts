/**
 * Calcola la distanza tra due coordinate GPS in metri.
 * Basato sulla formula di Haversine.
 */
export function getDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
): number {
    const R = 6371e3; // Raggio della Terra in metri
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lng2 - lng1) * Math.PI) / 180;

    const a =
        Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
        Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distanza in metri
}

/**
 * Controlla se lo studente è nel raggio dell'aula (650m) 
 * O se sta seguendo la lezione in streaming (convalida automatica).
 */
export function isWithinRange(
    userLat: number,
    userLng: number,
    targetLat: number,
    targetLng: number,
    isStreaming: boolean = false, // Aggiunto parametro per lo streaming
    threshold = 650               // Raggio aggiornato
): boolean {
    // Se lo studente segue in streaming, la posizione è irrilevante
    if (isStreaming) {
        return true;
    }

    // Altrimenti, controlla la distanza fisica
    return getDistance(userLat, userLng, targetLat, targetLng) <= threshold;
}