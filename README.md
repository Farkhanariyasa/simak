# SIMAK. — Private Journal for Two

**Simak** is a minimalist, shared web-based journal designed for two people. It creates a private sanctuary to share thoughts, photos, and feelings, fostering a deeper connection through intentional reflection.

![SIMAK Preview](https://github.com/user-attachments/assets/preview-placeholder.png)

## ✨ Core Features

- **The 8 PM Daily Reveal**: Entries are locked until 8:00 PM every day, creating a shared moment of anticipation and reflection for both partners.
- **Private Pairing**: Securely link your account with your partner using a unique, private invite code.
- **Rich Media Entries**: Express yourself with text, high-quality photo uploads, and meaningful emoji reactions.
- **Premium Dark Mode**: A beautifully crafted dark theme optimized for late-night journaling.
- **Offline Stability**: Built-in persistence ensures your thoughts are saved even when your connection is unstable.
- **Privacy First**: No public feeds, no "likes", no distractions. Just a clean space for your relationship.

## 🛠️ Tech Stack

- **Framework**: [React](https://reactjs.org/) (Vite)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Database & Auth**: [Firebase](https://firebase.google.com/) (Firestore, Auth, Storage)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Animations**: Tailwind-based micro-interactions

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- A Firebase Project

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/simak.git
   cd simak
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment**:
   Create a `.env` file in the root directory (refer to `.env.example`). This project currently expects Firebase configuration to be injected or defined. If using Vite `define`, update your `vite.config.js`:

   ```javascript
   // vite.config.js
   export default defineConfig({
     define: {
       __firebase_config: JSON.stringify({
         apiKey: "YOUR_API_KEY",
         authDomain: "YOUR_AUTH_DOMAIN",
         projectId: "YOUR_PROJECT_ID",
         storageBucket: "YOUR_STORAGE_BUCKET",
         messagingSenderId: "YOUR_SENDER_ID",
         appId: "YOUR_APP_ID"
       }),
       __app_id: '"simak-app"'
     }
   })
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```

## 📱 Project Structure

- `src/App.jsx`: The core application logic and view routing.
- `src/index.css`: Global styles and Tailwind configuration.
- `public/`: Static assets.

## 📖 How It Works

1.  **Join/Login**: Sign in with your Google account.
2.  **Pair Up**: Grab your unique invite code from **Settings** and share it with your partner, or enter their code to connect.
3.  **The Daily Journal**: Write about your day, how you feel, or share a photo. Your entries are private to you until the big reveal.
4.  **The 8 PM Reveal**: Every night at 8:00 PM local time, the journals "unlock". Both you and your partner can now read each other's entries for the day and react with emojis.
5.  **Build Your Timeline**: Look back at your shared history through the calendar and journal feeds.

---

*Dibuat dengan ❤️ untuk SIMAK.*
