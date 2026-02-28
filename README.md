# 🎮 FantaLezioni

> **Il fantasy game della tua carriera universitaria.**
> Guadagna punti frequentando lezioni, superando esami e studiando. Scala la classifica con i tuoi amici e compra/vendi appunti nel mercato.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-orange?logo=firebase)](https://firebase.google.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38bdf8?logo=tailwindcss)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## ✨ Funzionalità

| Feature | Descrizione |
|---|---|
| 🗺️ **Check-in GPS** | Verifica la presenza a lezione entro 150m dall'aula (Haversine formula) |
| ⚔️ **Esame Boss** | Scegli un esame: se lo superi, raddoppia tutti i punti accumulati per quell'esame |
| 🍅 **Timer Pomodoro** | 25/50 minuti di focus. Uscire dall'app = **-1 punto** per distrazione |
| 🏆 **Classifica** | Leaderboard con podio per il tuo gruppo di amici |
| 📚 **Mercato Appunti** | Pubblica e acquista link ad appunti spendendo punti (trasferimento peer-to-peer) |
| 🔐 **Auth Google** | Login rapido con Google tramite Firebase Authentication |

---

## 📊 Sistema di Punteggio

### ✅ Bonus
| Azione | Punti |
|---|---|
| Lezione frequentata (GPS ✓) | +3 |
| Puntualità (check-in 5min prima) | +2 |
| Esame superato | +5 |
| Esame con 30/30L | +10 |
| Sessione Pomodoro completata | +1 |
| **Boss Exam attivo** | **×2 su lezioni/studio** |

### ❌ Malus
| Azione | Punti |
|---|---|
| Ritardo (check-in dopo inizio) | -2 |
| Lezione saltata | -3 |
| Distrazione (tab switch durante timer) | -1 |

---

## 🚀 Installazione

### Prerequisiti
- Node.js >= 18
- npm >= 9
- Account [Firebase](https://firebase.google.com)

### 1. Clona il repository

```bash
git clone https://github.com/TUO-USERNAME/fanta-lezioni.git
cd fanta-lezioni
```

### 2. Installa le dipendenze

```bash
npm install
```

### 3. Configura Firebase

1. Vai su [Firebase Console](https://console.firebase.google.com/) e crea un nuovo progetto.
2. Abilita **Authentication** → **Google** come metodo di sign-in.
3. Abilita **Firestore Database** in modalità test.
4. Vai su **Impostazioni progetto** → **App Web** e copia le credenziali.
5. Crea il file `.env.local` nella root del progetto:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 4. Struttura Firestore

Crea manualmente le collezioni (o lascia che si creino al primo utilizzo):

**`users`**
```json
{
  "nome": "Mario Rossi",
  "email": "mario@example.com",
  "punti_totali": 0,
  "esame_boss_id": null,
  "lista_esami_iscritti": [],
  "photoURL": "https://..."
}
```

**`exams`** (da popolare manualmente come admin)
```json
{
  "nome": "Programmazione di Sistema",
  "CFU": 6,
  "orario_lezione": "09:00",
  "coordinate_aula": { "lat": 45.0628, "lng": 7.6620 }
}
```

**`logs`** (auto-generati dall'app)
```json
{
  "userId": "uid",
  "tipo_azione": "lezione",
  "punti_assegnati": 3,
  "timestamp": "..."
}
```

**`notes`** (auto-generati dall'app)
```json
{
  "titolo": "Riassunto Analisi I",
  "materia": "Analisi Matematica",
  "link": "https://drive.google.com/...",
  "prezzo": 5,
  "venditore_id": "uid",
  "venditore_nome": "Mario Rossi"
}
```

### 5. Avvia in locale

```bash
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000)

---

## 🔐 Regole Firestore (Security Rules)

Incolla queste regole su Firebase Console → Firestore → Regole:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
    match /exams/{examId} {
      allow read: if request.auth != null;
      allow write: if false; // solo admin
    }
    match /notes/{noteId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
    }
    match /logs/{logId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
    }
  }
}
```

---

## 🌐 Deploy su Vercel

### Opzione 1: Deploy automatico (raccomandato)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. Importa il repository da GitHub su Vercel.
2. Aggiungi le variabili d'ambiente (le stesse di `.env.local`) nelle impostazioni del progetto.
3. Clicca **Deploy**.

### Opzione 2: CLI Vercel

```bash
npm install -g vercel
vercel --prod
```

### Opzione 3: GitHub Pages (build statica)
```bash
npm run build
npm run export
```
> ⚠️ Nota: le funzionalità server-side richiedono Vercel o un host Node.js.

---

## 📂 Struttura del Progetto

```
fanta-lezioni/
├── app/
│   ├── dashboard/page.tsx    # Dashboard (check-in, boss exam, stats)
│   ├── timer/page.tsx        # Pomodoro timer
│   ├── leaderboard/page.tsx  # Classifica
│   ├── market/page.tsx       # Mercato appunti
│   ├── login/page.tsx        # Autenticazione Google
│   ├── layout.tsx
│   └── globals.css
├── components/
│   └── layout/Navbar.tsx     # Navigazione
├── lib/
│   ├── firebase.ts           # Configurazione Firebase
│   ├── AuthContext.tsx       # Context autenticazione
│   └── utils/
│       ├── geo.ts            # Calcolo distanza GPS (Haversine)
│       └── points.ts         # Logica punti e bonus/malus
├── public/
│   └── manifest.json         # PWA manifest
├── .env.local                # Variabili d'ambiente (non committare!)
└── README.md
```

---

## 🔧 Aggiungere Esami (Admin)

Per aggiungere esami vai su **Firebase Console → Firestore → exams** e crea documenti manualmente con la struttura indicata sopra. Le coordinate dell'aula le trovi su Google Maps.

---

## 🤝 Contribuire

Pull request benvenute! Apri prima una issue per discutere le modifiche principali.

---

## 📄 Licenza

Distributed under the **MIT License**. See [LICENSE](LICENSE) for more information.
