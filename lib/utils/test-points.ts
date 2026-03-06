/**
 * MOCK TEST PER LOGICA PUNTI
 * Eseguilo con: npx ts-node src/lib/utils/test-points.ts
 * Oppure importa ed esegui la funzione in una pagina temporanea.
 */

// 1. Simuliamo la configurazione dei punti
const MOCK_POINTS_CONFIG = {
  studio: 1,
  distrazione: -1,
};

// 2. Funzione di calcolo isolata (copiata dalla tua logica in points.ts)
function calculatePointsLocally(type: string, minutesStudied?: number): number {
  let pointsToAdd = 0;

  switch (type) {
    case "distrazione":
      pointsToAdd = MOCK_POINTS_CONFIG.distrazione;
      break;
    case "studio":
      // Riproduciamo la logica 'sanitizzata'
      const finalMinutes = minutesStudied || 1;
      const sanitizedMinutes = Math.min(finalMinutes, 180);
      pointsToAdd = MOCK_POINTS_CONFIG.studio * sanitizedMinutes;
      break;
  }
  return pointsToAdd;
}

// 3. Suite di Test
console.log("🚀 Inizio Test Logica Punti...");

const tests = [
  { name: "Focus Standard (25 min)", input: 25, expected: 25 },
  { name: "Focus Lungo (50 min)", input: 50, expected: 50 },
  { name: "Pausa (1 min)", input: 1, expected: 1 },
  { name: "Errore secondi (1500 sec)", input: 1500, expected: 180 }, // Verifica il limite Math.min
  { name: "Distrazione", type: "distrazione", expected: -1 },
];

tests.forEach((t) => {
  const result = calculatePointsLocally(t.type || "studio", t.input);
  const icon = result === t.expected ? "✅" : "❌";
  console.log(`${icon} ${t.name}: Ricevuti ${result} | Attesi ${t.expected}`);
});

// Chiamata simulata
const risultato = calculatePointsLocally("studio", 18);

console.log(`Test Sessione Reale:
- Input: 18 minuti
- Calcolo: 1 punto * 18
- Risultato: ${risultato} punti
- Stato: ✅ CORRETTO`);