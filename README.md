# 🖥️ LocalNodeMesh — OmniAdmin Dashboard

A real-time device administration dashboard built with **React + TypeScript + Firebase**. Monitors connected agents, displays system info, browses remote files, and enables file downloads — all through Firebase Realtime Database.

---

## ✨ Features

- **🔐 Authentication** — Firebase Email/Password login
- **📊 Device Overview** — Live device cards with hostname, OS, IP, RAM, disk, MAC address, uptime
- **💓 Heartbeat Monitor** — Real-time online/offline status with last-seen timestamps
- **📁 Remote File Browser** — Browse indexed files on connected devices with search
- **⬇️ File Download** — Request and download files from agents via chunked streaming
- **🎨 Modern UI** — Dark theme with glassmorphism, animations, and responsive design

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/rdxkeerthi/LocalNodeMesh.git
cd LocalNodeMesh
git checkout beta-0.3.1
npm install
```

### 2. Configure Firebase

Copy the example environment file and fill in your Firebase project credentials:

```bash
cp .env.example .env
```

Edit `.env` with your Firebase config:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your_project-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### 3. Set Up Firebase

See **[FIREBASE_RULES.md](./FIREBASE_RULES.md)** for complete Firebase setup instructions including:
- Realtime Database rules
- Authentication configuration
- Creating admin user

### 4. Run Locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### 5. Deploy to Vercel

```bash
npm run build
```

Or connect your GitHub repo to [Vercel](https://vercel.com) and set these in **Settings → Environment Variables**:

| Variable | Value |
|----------|-------|
| `VITE_FIREBASE_API_KEY` | Your Firebase API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | `your-project.firebaseapp.com` |
| `VITE_FIREBASE_DATABASE_URL` | `https://your-project-default-rtdb.firebaseio.com` |
| `VITE_FIREBASE_PROJECT_ID` | Your project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | `your-project.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Your sender ID |
| `VITE_FIREBASE_APP_ID` | Your app ID |
| `VITE_FIREBASE_MEASUREMENT_ID` | Your measurement ID |

---

## 🏗️ Tech Stack

| Technology | Purpose |
|------------|---------|
| React 19 | UI framework |
| TypeScript | Type safety |
| Vite 7 | Build tool & dev server |
| Firebase RTDB | Real-time data sync |
| Firebase Auth | User authentication |
| Tailwind CSS 4 | Styling |

---

## 📂 Project Structure

```
dashboard/
├── src/
│   ├── components/
│   │   ├── DeviceView.tsx    # Device detail view with system info
│   │   ├── FileBrowser.tsx   # Remote file browser with download
│   │   └── InfoCard.tsx      # Reusable info display card
│   ├── App.tsx               # Main app with auth & device grid
│   ├── firebase-config.ts    # Firebase initialization (uses env vars)
│   ├── index.css             # Global styles
│   └── main.tsx              # Entry point
├── .env.example              # Template for environment variables
├── FIREBASE_RULES.md         # Firebase RTDB rules & setup guide
├── package.json
└── vite.config.ts
```

---

## 🔒 Security Notes

- Firebase credentials are loaded from **environment variables** (not hardcoded)
- The `.env` file is **git-ignored** — never commit secrets
- RTDB rules restrict access to **authenticated users only**
- For production, tighten rules to restrict agent writes to their own paths

---

## 📝 License

MIT
