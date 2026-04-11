import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  signInWithCustomToken
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  onSnapshot,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  enableMultiTabIndexedDbPersistence
} from 'firebase/firestore';
import {
  Book,
  PenTool,
  Settings,
  LogOut,
  Image as ImageIcon,
  Trash2,
  Edit2,
  Heart,
  Smile,
  Frown,
  Lock,
  UserPlus,
  Users, // MEMPERBAIKI ERROR: Import Users ditambahkan di sini
  Copy,
  CheckCircle2,
  Menu,
  X,
  Calendar
} from 'lucide-react';

// --- Konfigurasi Sistem ---
const apiKey = ""; // Diinjeksi oleh environment
const getFirebaseConfig = () => {
  try {
    if (typeof __firebase_config === 'object') return __firebase_config;
    return JSON.parse(__firebase_config);
  } catch (e) {
    console.error("Gagal memparsing konfigurasi Firebase", e);
    return {};
  }
};
const appId = typeof __app_id !== 'undefined' ? __app_id : 'simak-default-app';

const config = getFirebaseConfig();
const isConfigValid = config && config.apiKey && config.projectId;

const DEFAULT_AVATAR = (id) => `https://api.dicebear.com/9.x/notionists-neutral/svg?seed=${id || 'simak'}`;
const NEUTRAL_AVATARS = [
  'https://api.dicebear.com/9.x/notionists-neutral/svg?seed=Kingston&backgroundColor=b6e3f4',
  'https://api.dicebear.com/9.x/notionists-neutral/svg?seed=Willow&backgroundColor=c0aede',
  'https://api.dicebear.com/9.x/notionists-neutral/svg?seed=River&backgroundColor=d1d4f9',
  'https://api.dicebear.com/9.x/notionists-neutral/svg?seed=Sage&backgroundColor=ffd5dc',
  'https://api.dicebear.com/9.x/notionists-neutral/svg?seed=Taylor&backgroundColor=ffdfbf',
  'https://api.dicebear.com/9.x/notionists-neutral/svg?seed=Jordan&backgroundColor=d1d4f9',
  'https://api.dicebear.com/9.x/notionists-neutral/svg?seed=Alex&backgroundColor=c0aede',
  'https://api.dicebear.com/9.x/notionists-neutral/svg?seed=Charlie&backgroundColor=ffd5dc'
];
const THUMBS_AVATARS = [
  'https://api.dicebear.com/9.x/thumbs/svg?seed=Destiny&backgroundColor=b6e3f4',
  'https://api.dicebear.com/9.x/thumbs/svg?seed=Princess&backgroundColor=c0aede',
  'https://api.dicebear.com/9.x/thumbs/svg?seed=Abby&backgroundColor=d1d4f9',
  'https://api.dicebear.com/9.x/thumbs/svg?seed=Precious&backgroundColor=ffd5dc',
  'https://api.dicebear.com/9.x/thumbs/svg?seed=Mimi&backgroundColor=ffdfbf',
  'https://api.dicebear.com/9.x/thumbs/svg?seed=Sasha&backgroundColor=d1d4f9',
  'https://api.dicebear.com/9.x/thumbs/svg?seed=Zoe&backgroundColor=c0aede',
  'https://api.dicebear.com/9.x/thumbs/svg?seed=Bella&backgroundColor=ffd5dc'
];
const ADVENTURER_AVATARS = [
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Jude&backgroundColor=b6e3f4',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Mia&backgroundColor=c0aede',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Finn&backgroundColor=d1d4f9',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Lucy&backgroundColor=ffd5dc',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Leo&backgroundColor=ffdfbf',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Lily&backgroundColor=d1d4f9',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Max&backgroundColor=c0aede',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Ruby&backgroundColor=ffd5dc'
];
const EMOJI_OPTIONS = ['❤️', '🥰', '✨', '🙌', '🔥', '😄', '😮', '😢', '😭', '😔', '🤯', '😴', '👍', '🙏', '🎉', '😡']

let app, auth, db;

if (isConfigValid) {
  try {
    app = initializeApp(config);
    auth = getAuth(app);
    db = getFirestore(app);

    // Aktifkan Offline Persistence agar aplikasi lebih stabil saat internet tidak stabil
    if (typeof window !== 'undefined') {
      enableMultiTabIndexedDbPersistence(db).catch((err) => {
        if (err.code === 'failed-precondition') {
          console.warn("Persistence gagal: Terbuka di banyak tab.");
        } else if (err.code === 'unimplemented') {
          console.warn("Persistence gagal: Browser tidak mendukung.");
        }
      });
    }
  } catch (e) {
    console.error("Firebase initialization failed:", e);
  }
}

// Path ketat berdasarkan aturan Firebase
const getPublicPath = (col) => `artifacts/${appId}/public/data/${col}`;

// --- Fungsi Bantuan ---
const getTodayString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const isAfter8PM = () => {
  return new Date().getHours() >= 20;
};

const generateId = () => Math.random().toString(36).substring(2, 15);

// --- Komponen Utama Aplikasi ---
export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('simak_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('simak_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('simak_theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  const [profile, setProfile] = useState(null);
  const [partner, setPartner] = useState(null);
  const [room, setRoom] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [dailyRatings, setDailyRatings] = useState([]);

  const [currentView, setCurrentView] = useState('journal');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);



  // Status Koneksi
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Saat kembali online, paksa refresh token atau state jika perlu
      console.log("Aplikasi kembali online");
    };
    const handleOffline = () => {
      setIsOnline(false);
      console.log("Aplikasi sedang offline");
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 1. Inisialisasi Autentikasi
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        }
      } catch (error) {
        console.error("Error inisialisasi Auth:", error);
      }
    };

    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setProfile(null);
        setRoom(null);
        setPartner(null);
        setSubmissions([]);
        setDailyRatings([]);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Pengambilan Data (Profil, Ruangan, Entri Jurnal)
  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }

    // Set profil awal dari data auth agar UI tidak kosong sambil menunggu Firestore
    const initialProfile = {
      id: user.uid,
      displayName: user.displayName || "Aku",
      photoURL: user.photoURL || DEFAULT_AVATAR(user.uid),
      roomId: null,
      inviteCode: null
    };

    // HANYA buat initialProfile jika belum ada state
    if (!profile) {
      setProfile(initialProfile);
    }

    // Mendengarkan profil pengguna saat ini
    const profileUnsub = onSnapshot(
      doc(db, getPublicPath('users'), user.uid),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          // Mencegah flickering jika data sama
          setProfile(prev => {
            if (JSON.stringify(prev) === JSON.stringify({ id: docSnap.id, ...data })) return prev;
            return { id: docSnap.id, ...data };
          });
        } else {
          // Buat profil di Firestore jika benar-benar tidak ada
          // Guna merge: true agar tidak menimpa jika ada penulisan bersamaan
          const newProfile = {
            id: user.uid,
            displayName: user.displayName || "Aku",
            photoURL: user.photoURL || DEFAULT_AVATAR(user.uid),
            // Jangan paksa roomId: null di sini jika dokumen baru dibuat
            // Biarkan default jika memang baru
          };

          setDoc(doc(db, getPublicPath('users'), user.uid), newProfile, { merge: true })
            .catch(e => console.error("Gagal menyimpan profil", e));

          setProfile(prev => ({ ...newProfile, ...prev }));
        }
      },
      (err) => {
        console.error("Error mendengarkan profil", err);
        // Jangan timpa profile yang sudah ada dengan initialProfile saat error transient
      }
    );

    return () => profileUnsub();
  }, [user?.uid]); // Gunakan user.uid sebagai dependensi agar lebih presisi

  // 2.5 Pemulihan Koneksi Otomatis
  // Jika profile sudah ada tapi roomId null, coba cari di koleksi rooms
  // Ini menangani kasus di mana roomId di doc user sempat terhapus/null secara tidak sengaja
  useEffect(() => {
    if (!user || (profile && profile.roomId)) return;

    const recoverConnection = async () => {
      try {
        console.log("Mengecek pemulihan koneksi untuk:", user.uid);
        const q = query(
          collection(db, getPublicPath('rooms')),
          where("userIds", "array-contains", user.uid)
        );
        const roomSnap = await getDocs(q);

        if (!roomSnap.empty) {
          // Ambil room terbaru (dengan asumsi user hanya punya satu room aktif)
          const rooms = roomSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          // Urutkan berdasarkan createdAt jika ada (deskending)
          rooms.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

          const targetRoomId = rooms[0].id;
          console.log("Koneksi ditemukan! Memulihkan ke ruangan:", targetRoomId);

          await updateDoc(doc(db, getPublicPath('users'), user.uid), {
            roomId: targetRoomId
          });
        }
      } catch (e) {
        console.error("Gagal memulihkan koneksi:", e);
      }
    };

    // Beri jeda sedikit untuk memastikan onSnapshot profil sudah selesai mencoba
    const timer = setTimeout(recoverConnection, 2000);
    return () => clearTimeout(timer);
  }, [user, profile?.roomId]);

  useEffect(() => {
    if (!profile?.roomId) {
      setRoom(null);
      setPartner(null);
      setSubmissions([]);
      setDailyRatings([]);
      return;
    }

    let partnerUnsub = null;

    // Mendengarkan Ruangan
    const roomUnsub = onSnapshot(
      doc(db, getPublicPath('rooms'), profile.roomId),
      (roomSnap) => {
        if (roomSnap.exists()) {
          const roomData = { id: roomSnap.id, ...roomSnap.data() };
          setRoom(roomData);

          // Cari ID pasangan
          const partnerId = roomData.userIds.find(id => id !== profile.id);
          
          if (partnerUnsub) partnerUnsub();
          
          if (partnerId) {
            // Ambil profil pasangan dengan listener yang solid
            partnerUnsub = onSnapshot(
              doc(db, getPublicPath('users'), partnerId),
              (pSnap) => {
                if (pSnap.exists()) setPartner({ id: pSnap.id, ...pSnap.data() });
              },
              (err) => console.error("Error mendengarkan partner", err)
            );
          } else {
            setPartner(null);
          }
        }
      },
      (err) => {
        console.error("Error mendengarkan ruangan", err);
      }
    );

    // Mendengarkan entri jurnal (submissions) khusus untuk ruangan ini
    const q = query(
      collection(db, getPublicPath('submissions')),
      where("roomId", "==", profile.roomId),
      orderBy("createdAt", "asc")
    );

    const subsUnsub = onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snap) => {
        const roomSubs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setSubmissions(roomSubs);
      },
      (err) => {
        console.error("Error mendengarkan entri jurnal", err);
        if (err.code === 'failed-precondition') {
          onSnapshot(
            query(collection(db, getPublicPath('submissions')), where("roomId", "==", profile.roomId)),
            (s) => setSubmissions(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.createdAt - b.createdAt))
          );
        }
      }
    );

    // Mendengarkan rating harian untuk seluruh ruangan
    const ratingsQ = query(
      collection(db, getPublicPath('daily_ratings')),
      where("roomId", "==", profile.roomId)
    );

    const ratingsUnsub = onSnapshot(
      ratingsQ,
      (snap) => {
        const roomRatings = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setDailyRatings(roomRatings);
      },
      (err) => console.error("Error mendengarkan rating harian", err)
    );

    return () => {
      roomUnsub();
      subsUnsub();
      ratingsUnsub();
      if (partnerUnsub) partnerUnsub();
    };
  }, [profile?.roomId, profile?.id]);

  // --- Aksi ---
  const handleLoginGoogle = async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (error) {
      console.error("Login Google gagal", error);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };



  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 bg-indigo-200 rounded-full mb-4"></div>
          <div className="text-slate-500 font-medium">Memuat SIMAK...</div>
        </div>
      </div>
    );
  }

  if (!isConfigValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-center">
        <div className="max-w-md bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Konfigurasi Firebase Hilang</h2>
          <p className="text-slate-600 mb-6">Aplikasi tidak dapat terhubung ke database. Harap periksa apakah konfigurasi Firebase sudah disiapkan di environment.</p>
          <div className="text-xs text-left bg-slate-50 p-4 rounded-xl border border-slate-100 font-mono text-slate-500 overflow-auto max-h-40">
            {`// Harap definisikan:\n__firebase_config = '{"apiKey": "...", ...}'`}
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLoginGoogle={handleLoginGoogle} />;
  }

  return (
    <div className={`flex h-screen w-full bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-sans overflow-hidden selection:bg-indigo-100 transition-colors duration-300`}>

      {/* Overlay Menu Mobile */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-slate-800/20 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="w-64 h-full bg-white shadow-xl p-6 flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-8">
              <span className="text-xl font-semibold text-indigo-900 tracking-tight">SIMAK.</span>
              <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-500 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <NavLinks currentView={currentView} setCurrentView={(v) => { setCurrentView(v); setIsMobileMenuOpen(false); }} />

            <div className="mt-auto pt-6 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={toggleDarkMode}
                className="flex items-center space-x-3 text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors w-full p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 mb-2"
              >
                {isDarkMode ? <Smile className="w-5 h-5" /> : <Frown className="w-5 h-5" />}
                <span className="font-medium text-sm">{isDarkMode ? 'Mode Terang' : 'Mode Gelap'}</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-3 text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors w-full p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium text-sm">Keluar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar Kiri (Desktop) */}
      <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 hidden md:flex flex-col p-6 z-10 transition-colors duration-300">
        <div className="flex items-center mb-10">
          <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center mr-3 shadow-sm shadow-indigo-200">
            <span className="text-white font-bold text-lg">S</span>
          </div>
          <span className="text-xl font-semibold text-slate-800 dark:text-slate-100 tracking-tight transition-colors">SIMAK.</span>
        </div>
        <NavLinks currentView={currentView} setCurrentView={setCurrentView} />

        <div className="mt-auto pt-6 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={toggleDarkMode}
            className="flex items-center space-x-3 text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors w-full p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 mb-2"
          >
            {isDarkMode ? <Smile className="w-5 h-5" /> : <Frown className="w-5 h-5" />}
            <span className="font-medium text-sm">{isDarkMode ? 'Mode Terang' : 'Mode Gelap'}</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors w-full p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium text-sm">Keluar</span>
          </button>
        </div>
      </aside>

      {/* Area Konten Utama */}
      <main className="flex-1 flex flex-col relative bg-[#f8fafc] dark:bg-[#0f172a] overflow-hidden transition-colors duration-300">
        {/* Header Mobile */}
        <div className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 transition-colors">
          <div className="flex items-center">
            <div className="w-6 h-6 bg-indigo-600 rounded-md flex items-center justify-center mr-2 shadow-sm">
              <span className="text-white font-bold text-xs">S</span>
            </div>
            <span className="font-semibold text-slate-800 dark:text-slate-100">SIMAK.</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(true)} className="text-slate-600 dark:text-slate-400">
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {/* Banner Status Koneksi */}
        {!isOnline && (
          <div className="bg-amber-500 text-white text-[10px] font-bold uppercase tracking-widest py-1.5 px-4 text-center animate-in slide-in-from-top duration-300 z-30">
            Kamu sedang offline. Beberapa fitur mungkin terbatas.
          </div>
        )}


        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-10 custom-scrollbar">
          <div className="max-w-4xl xl:max-w-5xl mx-auto w-full pb-24 md:pb-0">
            {!profile?.roomId && currentView !== 'settings' ? (
              <NotPairedView
                onGoToSettings={() => setCurrentView('settings')}
              />
            ) : (
              <>
                {currentView === 'journal' && <JournalView profile={profile} partner={partner} submissions={submissions} dailyRatings={dailyRatings} />}
                {currentView === 'write' && <WriteView profile={profile} partner={partner} submissions={submissions} dailyRatings={dailyRatings} />}
                {currentView === 'settings' && <SettingsView profile={profile} partner={partner} />}
              </>
            )}
          </div>
        </div>
      </main>

      {/* Sidebar Kanan (Desktop) */}
      <aside className="w-80 bg-white dark:bg-slate-900 border-l border-slate-100 dark:border-slate-800 hidden lg:flex flex-col p-6 z-10 overflow-y-auto custom-scrollbar transition-colors duration-300">
        <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-6">Koneksi</h3>

        <div className="space-y-6">
          {/* Profil Singkat Saya */}
          <div className="flex items-center space-x-4 bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 transition-colors">
            <img
              src={profile?.photoURL || DEFAULT_AVATAR(profile?.id)}
              alt="Saya"
              className="w-12 h-12 rounded-full border-2 border-white dark:border-slate-700 shadow-sm object-cover"
            />
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100 line-clamp-1">{profile?.displayName || user?.displayName || "Aku"}</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">Aku</p>
            </div>
          </div>

          <div className="flex justify-center">
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800"></div>
          </div>

          {/* Profil Singkat Pasangan */}
          {partner ? (
            <div className="flex items-center space-x-4 bg-indigo-50/50 dark:bg-indigo-900/20 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 transition-colors">
              <img src={partner.photoURL || DEFAULT_AVATAR(partner.id)} alt="Pasangan" className="w-12 h-12 rounded-full border-2 border-white dark:border-slate-700 shadow-sm" />
              <div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{partner.displayName}</p>
                <p className="text-xs text-indigo-500 dark:text-indigo-400 font-medium">Kamu</p>
              </div>
            </div>

          ) : (
            <div className="flex items-center space-x-4 bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 transition-colors">
              <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Belum terhubung</p>
                <button onClick={() => setCurrentView('settings')} className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline">Hubungkan sekarang</button>
              </div>
            </div>
          )}
        </div>

        {partner && (
          <div className="mt-8">
            <h3 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-4">Status Hari Ini</h3>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm text-center transition-colors">
              {isAfter8PM() ? (
                <>
                  <Lock className="w-5 h-5 text-indigo-500 dark:text-indigo-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Jurnal Terungkap</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Entri hari ini telah dikunci dan dapat dibaca bersama.</p>
                </>
              ) : (
                <>
                  <Book className="w-5 h-5 text-amber-500 dark:text-amber-400 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Sedang Menulis</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">Terungkap otomatis pukul 20:00.</p>
                </>
              )}
            </div>
          </div>
        )}
      </aside>

      {/* Navigasi Bawah Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 pb-safe z-40 transition-colors">
        <div className="flex justify-around items-center p-3">
          <MobileNavItem icon={<Book />} label="Jurnal" isActive={currentView === 'journal'} onClick={() => setCurrentView('journal')} />
          <MobileNavItem icon={<PenTool />} label="Tulis" isActive={currentView === 'write'} onClick={() => setCurrentView('write')} />
          <MobileNavItem icon={<Settings />} label="Pengaturan" isActive={currentView === 'settings'} onClick={() => setCurrentView('settings')} />
        </div>
      </nav>

    </div>
  );
}

// --- Komponen Navigasi ---
const NavLinks = ({ currentView, setCurrentView }) => (
  <nav className="flex flex-col space-y-2">
    <NavItem icon={<Book />} label="Jurnal" isActive={currentView === 'journal'} onClick={() => setCurrentView('journal')} />
    <NavItem icon={<PenTool />} label="Tulis" isActive={currentView === 'write'} onClick={() => setCurrentView('write')} />
    <NavItem icon={<Settings />} label="Pengaturan" isActive={currentView === 'settings'} onClick={() => setCurrentView('settings')} />
  </nav>
);

const NavItem = ({ icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 w-full ${isActive
      ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-semibold'
      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300 font-medium'
      }`}
  >
    {React.cloneElement(icon, { className: `w-5 h-5 ${isActive ? 'text-indigo-600' : ''}` })}
    <span>{label}</span>
  </button>
);

const MobileNavItem = ({ icon, label, isActive, onClick }) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center w-full py-1 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}>
    {React.cloneElement(icon, { className: 'w-6 h-6 mb-1' })}
    <span className="text-[12px] font-semibold">{label}</span>
  </button>
);

// --- Sub-View ---

const NotPairedView = ({ onGoToSettings }) => (
  <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
    <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-6 transition-colors">
      <Users className="w-10 h-10 text-indigo-400 dark:text-indigo-500" />
    </div>
    <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-3 tracking-tight">Selamat datang di Simak</h2>
    <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md font-medium">Simak adalah ruang pribadi untuk kita berdua. Hubungkan akun untuk mulai berbagi momen harian.</p>
    <button
      onClick={onGoToSettings}
      className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white px-8 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20 w-full max-w-xs active:scale-95"
    >
      Mulai Terhubung
    </button>

  </div>
);

// --- 1. Tampilan Jurnal ---
const JournalView = ({ profile, partner, submissions, dailyRatings }) => {
  const [activeTab, setActiveTab] = useState('jurnalku'); // State untuk tab
  const [selectedDate, setSelectedDate] = useState(getTodayString()); // State untuk filter tanggal

  // Mengelompokkan entri berdasarkan tanggal
  const groupedSubs = useMemo(() => {
    const groups = {};
    submissions.forEach(sub => {
      if (!groups[sub.date]) groups[sub.date] = [];
      groups[sub.date].push(sub);
    });
    return groups;
  }, [submissions]);

  const subsForSelectedDate = groupedSubs[selectedDate] || [];

  return (
    <div className="w-full pb-10">

      {/* Filter Tanggal */}
      <div className="flex justify-center mb-8">
        <div className="relative inline-flex items-center">
          <Calendar className="absolute left-3 w-4 h-4 text-slate-500 dark:text-slate-400 pointer-events-none" />
          <input
            type="date"
            value={selectedDate}
            max={getTodayString()}
            onChange={(e) => {
              if (e.target.value) setSelectedDate(e.target.value);
            }}
            className="pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 shadow-sm outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 transition-all cursor-pointer"
          />
        </div>
      </div>

      {/* Switcher Tab */}
      <div className="flex p-1 bg-slate-200/50 dark:bg-slate-800/50 rounded-2xl w-full max-w-sm mx-auto mb-10 relative border border-white/50 dark:border-slate-700/50 backdrop-blur-sm transition-colors">
        <button
          onClick={() => setActiveTab('jurnalku')}
          className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ${activeTab === 'jurnalku' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
        >
          Jurnalku
        </button>
        <button
          onClick={() => setActiveTab('jurnalmu')}
          className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ${activeTab === 'jurnalmu' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
        >
          Jurnalmu
        </button>
      </div>

      <DailySection
        date={selectedDate}
        subs={subsForSelectedDate}
        profile={profile}
        partner={partner}
        activeTab={activeTab}
        dailyRatings={dailyRatings}
      />
    </div>
  );
};

const DailySection = ({ date, subs, profile, partner, activeTab, dailyRatings }) => {
  const isToday = date === getTodayString();
  const revealed = !isToday || isAfter8PM();

  const mySubs = subs.filter(s => s.userId === profile.id);
  const partnerSubs = subs.filter(s => s.userId === partner?.id);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col space-y-10">
        {activeTab === 'jurnalmu' && (
          partner ? (
            <UserJournalFeed user={partner} subs={partnerSubs} isMe={false} isHidden={!revealed} date={date} dailyRatings={dailyRatings} />
          ) : (
            <div className="bg-slate-50 dark:bg-slate-800 rounded-[32px] p-8 border border-slate-200 dark:border-slate-700 text-center transition-colors">
              <UserPlus className="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto mb-3" />
              <p className="text-slate-600 dark:text-slate-300">Kamu belum terhubung denganku.</p>
            </div>
          )
        )}

        {activeTab === 'jurnalku' && (
          <UserJournalFeed user={profile} subs={mySubs} isMe={true} isHidden={false} date={date} dailyRatings={dailyRatings} />
        )}
      </div>
    </div>
  );
};

const UserJournalFeed = ({ user, subs, isMe, isHidden, date, dailyRatings }) => {
  const [showRatingPicker, setShowRatingPicker] = useState(false);
  const ratingDoc = dailyRatings.find(r => r.userId === user?.id && r.date === date);
  const userRating = ratingDoc?.rating;


  const handleReactRating = async (emoji) => {
    const auth = getAuth();
    if (!auth.currentUser || !ratingDoc) return;
    const currentUserId = auth.currentUser.uid;
    const currentReactions = ratingDoc.reactions || {};

    const newReactions = { ...currentReactions };
    const userReactions = Array.isArray(newReactions[currentUserId]) ? [...newReactions[currentUserId]] :
      (typeof newReactions[currentUserId] === 'string' ? [newReactions[currentUserId]] : []);

    if (userReactions.includes(emoji)) {
      newReactions[currentUserId] = userReactions.filter(e => e !== emoji);
    } else {
      // Sesuai request: "cuma 1 emot kali ya biar ga penuh", kita batasi 1 emot per user
      newReactions[currentUserId] = [emoji];
    }

    try {
      const db = getFirestore();
      await updateDoc(doc(db, getPublicPath('daily_ratings'), ratingDoc.id), {
        reactions: newReactions
      });
    } catch (e) {
      console.error("Gagal memberikan reaksi pada rating", e);
    }
  };


  if (isHidden) {
    return (
      <div className="bg-slate-100/50 dark:bg-slate-800/50 rounded-[32px] p-8 border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center min-h-[200px] text-center transition-colors">
        <Lock className="w-8 h-8 mb-4 text-slate-500 dark:text-slate-400" />
        <p className="text-slate-600 dark:text-slate-200 font-medium text-lg">Jurnal {user?.displayName} terkunci</p>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Akan terungkap pada pukul 20:00</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-[32px] p-6 md:p-10 shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
      <div className="flex items-center space-x-4 mb-10 border-b border-slate-100 dark:border-slate-700 pb-6">
        <img src={user?.photoURL || DEFAULT_AVATAR(user?.id)} alt={user?.displayName} className="w-14 h-14 rounded-full shadow-sm" />
        <div>
          <h4 className="text-xl font-bold text-slate-800 dark:text-slate-100">{user?.displayName}</h4>
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mt-1">{isMe ? 'Jurnalku' : 'Jurnalmu'}</p>
        </div>
        {userRating && (
          <div className="ml-auto flex items-center space-x-3">
            {/* Reaksi Rating */}
            <div className="flex flex-wrap gap-1 order-1">
              {ratingDoc.reactions && Object.keys(ratingDoc.reactions).length > 0 && (
                <div className="flex -space-x-1">
                  {Object.values(ratingDoc.reactions).flat().map((emoji, idx) => (
                    <span key={idx} className="inline-flex items-center justify-center w-7 h-7 text-[12px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full shadow-sm select-none animate-in zoom-in duration-300">
                      {emoji}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Tombol Reaksi Rating */}
            <div className="relative order-2">
              <button
                onClick={() => setShowRatingPicker(!showRatingPicker)}
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200 ${showRatingPicker ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-indigo-500 hover:bg-slate-50 dark:hover:bg-indigo-900/30'}`}
                title="Bereaksi pada rating"
              >
                <Smile className="w-5 h-5" />
              </button>

              {showRatingPicker && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowRatingPicker(false)}></div>
                  <div className="flex flex-wrap gap-1 bg-white dark:bg-slate-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 absolute top-10 right-0 z-20 shadow-xl w-[180px] animate-in zoom-in duration-200 origin-top-right">
                    {EMOJI_OPTIONS.slice(0, 8).map(emoji => ( // Ambil 8 saja biar simpel
                      <button
                        key={emoji}
                        onClick={() => {
                          handleReactRating(emoji);
                          setShowRatingPicker(false);
                        }}
                        className="w-8 h-8 flex items-center justify-center text-base rounded-full hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Badge Rating */}
            <div className="flex flex-col items-center justify-center bg-indigo-50 dark:bg-indigo-900/40 px-5 py-2.5 rounded-2xl border border-indigo-100 dark:border-indigo-800 transition-colors order-3">
              <span className="text-[10px] uppercase font-bold text-indigo-500 dark:text-indigo-400 tracking-widest mb-0.5">Rating</span>
              <div className="flex items-baseline">
                <span className="text-2xl font-black text-indigo-700 dark:text-indigo-300 leading-none">{userRating}</span>
                <span className="text-xs font-bold text-indigo-400 dark:text-indigo-500 ml-1">/10</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="pl-2 md:pl-4">
        {subs.length === 0 ? (
          <div className="text-slate-500 text-sm italic py-4">
            Tidak ada cerita yang ditulis.
          </div>
        ) : (
          <div className="space-y-0">
            {subs.map((sub, idx) => (
              <FeedItem key={sub.id} sub={sub} user={user} isMe={isMe} isLast={idx === subs.length - 1} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const FeedItem = ({ sub, user, isMe, isLast }) => {
  const [showPicker, setShowPicker] = useState(false);
  const timeString = new Date(sub.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  const handleReact = async (emoji) => {
    const auth = getAuth();
    if (!auth.currentUser) return;
    const currentUserId = auth.currentUser.uid;
    const currentReactions = sub.reactions || {};

    const newReactions = { ...currentReactions };
    const userReactions = Array.isArray(newReactions[currentUserId]) ? [...newReactions[currentUserId]] :
      (typeof newReactions[currentUserId] === 'string' ? [newReactions[currentUserId]] : []);

    if (userReactions.includes(emoji)) {
      newReactions[currentUserId] = userReactions.filter(e => e !== emoji);
    } else {
      newReactions[currentUserId] = [...userReactions, emoji];
    }

    try {
      const db = getFirestore();
      await updateDoc(doc(db, getPublicPath('submissions'), sub.id), {
        reactions: newReactions
      });
    } catch (e) {
      console.error("Gagal memberikan reaksi", e);
    }
  };

  const auth = getAuth();
  const myReactions = sub.reactions?.[auth?.currentUser?.uid] || [];
  const myReactionsArray = Array.isArray(myReactions) ? myReactions : (typeof myReactions === 'string' ? [myReactions] : []);

  return (
    <div className={`relative flex flex-col ${isLast ? '' : 'mb-10'} group`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-tight">{timeString}</span>
      </div>

      {/* Konten Timeline */}
      <div>

        <div className="bg-[#f8fafc] dark:bg-slate-900/50 rounded-3xl p-5 md:p-6 border border-slate-100 dark:border-slate-800 transition-colors">
          {sub.imageUrl && (
            <div className="mb-4 rounded-2xl overflow-hidden bg-slate-200 dark:bg-slate-800 border border-slate-100 dark:border-slate-800">
              <img src={sub.imageUrl} alt="Momen" className="w-full object-cover max-h-96" loading="lazy" />
            </div>
          )}
          <p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap text-[15px] md:text-base leading-relaxed">{sub.content}</p>

          {/* Interaksi Reaksi */}
          <div className="mt-5 flex items-center space-x-3 relative">
            <div className="relative">
              <button
                onClick={() => setShowPicker(!showPicker)}
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200 ${showPicker ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 scale-110' : 'text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30'}`}
                title="Berikan reaksi"
              >
                <Smile className="w-5 h-5" />
              </button>

              {showPicker && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowPicker(false)}
                  ></div>
                  <div className="flex flex-wrap gap-1 bg-white dark:bg-slate-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 absolute -top-32 left-0 z-20 shadow-xl w-[200px] animate-in zoom-in duration-200 origin-bottom-left">
                    {EMOJI_OPTIONS.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => {
                          handleReact(emoji);
                          setShowPicker(false);
                        }}
                        className={`w-8 h-8 flex items-center justify-center text-base rounded-full hover:bg-slate-50 dark:hover:bg-slate-700 transition-all ${myReactionsArray.includes(emoji) ? 'bg-indigo-50 dark:bg-indigo-900 ring-2 ring-indigo-200 dark:ring-indigo-800' : ''}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {sub.reactions && Object.keys(sub.reactions).length > 0 && (
              <div className="flex flex-wrap gap-1.5 border-l border-slate-100 dark:border-slate-700 pl-3">
                {Object.values(sub.reactions).flat().map((emoji, idx) => (
                  <span key={idx} className="inline-flex items-center justify-center w-8 h-8 text-[14px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full shadow-sm select-none animate-in zoom-in duration-300">
                    {emoji}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


// --- 2. Tampilan Tulis ---
const WriteView = ({ profile, submissions, dailyRatings }) => {
  const [content, setContent] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const isLocked = isAfter8PM();
  const today = getTodayString();
  const myTodaySubs = submissions.filter(s => s.userId === profile.id && s.date === today);
  const myRating = dailyRatings.find(r => r.userId === profile.id && r.date === today)?.rating;

  const handleSaveRating = async (val) => {
    try {
      const ratingId = `${profile.id}_${today}`;
      await setDoc(doc(db, getPublicPath('daily_ratings'), ratingId), {
        userId: profile.id,
        date: today,
        rating: val,
        roomId: profile.roomId,
        createdAt: Date.now()
      }, { merge: true });
    } catch (e) {
      console.error("Gagal menyimpan rating harian", e);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Kompresi di sisi klien agar muat di dokumen Firestore (di bawah 1MB)
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 600;
        let { width, height } = img;

        if (width > height && width > MAX_DIM) {
          height *= MAX_DIM / width;
          width = MAX_DIM;
        } else if (height > MAX_DIM) {
          width *= MAX_DIM / height;
          height = MAX_DIM;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        setImagePreview(dataUrl);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handlePost = async () => {
    if (!content.trim() && !imagePreview) return;
    setIsSubmitting(true);

    try {
      const newSub = {
        id: generateId(),
        roomId: profile.roomId,
        userId: profile.id,
        content: content.trim(),
        imageUrl: imagePreview || null,
        createdAt: Date.now(),
        date: getTodayString(),
        reactions: {}
      };

      await setDoc(doc(db, getPublicPath('submissions'), newSub.id), newSub);

      setContent("");
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error("Gagal memposting:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-300 pb-10">



      {/* Area Menulis */}
      <div className="bg-white dark:bg-slate-800 rounded-[24px] shadow-sm border border-slate-100 dark:border-slate-700 p-6 transition-colors duration-300">
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-6 tracking-tight">Apa cerita hari ini?</h2>



        {isLocked ? (
          <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl p-6 text-center transition-colors">
            <Lock className="w-8 h-8 text-indigo-500 dark:text-indigo-400 mx-auto mb-3" />
            <h3 className="text-indigo-900 dark:text-indigo-100 font-bold">Hari ini telah terkunci.</h3>
            <p className="text-indigo-700 dark:text-indigo-300 font-medium text-sm mt-1">Jurnal kita berdua sudah bisa dibaca. Sampai jumpa besok!</p>
          </div>
        ) : (
          <>
            <textarea
              className="w-full min-h-[300px] bg-slate-50 dark:bg-slate-900/50 border-none rounded-xl p-6 text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 outline-none resize-y leading-relaxed text-lg transition-colors"
              placeholder="Catat momen atau perasaan yang ingin dibagikan..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />

            {/* Rating Hari Ini */}
            <div className="mt-6 mb-2">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 ml-1">Rating Hari Ini</p>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <button
                    key={num}
                    onClick={() => handleSaveRating(num)}
                    className={`w-9 h-9 md:w-10 md:h-10 rounded-full font-bold text-xs md:text-sm border-2 transition-all flex items-center justify-center ${
                      myRating === num
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-md scale-105'
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-indigo-200 dark:hover:border-indigo-800'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {imagePreview && (
              <div className="relative mt-4 inline-block">
                <img src={imagePreview} alt="Pratinjau" className="h-32 rounded-lg object-cover border border-slate-200" />
                <button
                  onClick={() => setImagePreview(null)}
                  className="absolute -top-2 -right-2 bg-white text-slate-600 rounded-full p-1 shadow-md hover:text-red-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-50 dark:border-slate-700/50 transition-colors">
              <div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleImageSelect}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center space-x-2 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  <ImageIcon className="w-5 h-5" />
                  <span className="text-sm font-medium">Tambah Foto</span>
                </button>
              </div>

              <button
                onClick={handlePost}
                disabled={isSubmitting || (!content.trim() && !imagePreview)}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-500 dark:disabled:text-slate-600 text-white px-6 py-2 rounded-xl font-medium transition-all shadow-sm active:scale-95 shadow-indigo-200/50 dark:shadow-none"
              >
                {isSubmitting ? 'Menyimpan...' : 'Tambahkan'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Draft Hari Ini */}
      <div>
        <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 ml-2">Ceritaku Hari Ini</h3>
        {myTodaySubs.length === 0 ? (
          <div className="bg-transparent border-2 border-dashed border-slate-200 rounded-[24px] p-8 text-center text-slate-500 text-sm">
            Aku belum menulis apa pun hari ini.
          </div>
        ) : (
          <div className="space-y-4">
            {myTodaySubs.map(sub => (
              <DraftCard key={sub.id} sub={sub} isLocked={isLocked} />
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

// Komponen Kartu untuk Halaman Tulis (Mendukung Edit & Hapus)
const DraftCard = ({ sub, isLocked }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(sub.content);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const timeString = new Date(sub.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  const handleUpdate = async () => {
    if (!editContent.trim()) return;
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, getPublicPath('submissions'), sub.id), {
        content: editContent
      });
      setIsEditing(false);
    } catch (e) {
      console.error("Gagal memperbarui", e);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteDoc(doc(db, getPublicPath('submissions'), sub.id));
    } catch (e) {
      console.error("Gagal menghapus", e);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-[20px] p-5 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col mb-4 transition-colors">
      <div className="flex items-center justify-between mb-3 border-b border-slate-50 dark:border-slate-700 pb-2">
        <span className="text-xs font-semibold text-slate-500">{timeString}</span>
        {!isLocked && !isEditing && (
          <div className="flex items-center space-x-3">
            <button onClick={() => setIsEditing(true)} className="text-slate-400 hover:text-indigo-500 transition-colors">
              <Edit2 className="w-4 h-4" />
            </button>
            {confirmDelete ? (
              <div className="flex items-center space-x-2 bg-red-50 dark:bg-red-900/30 px-3 py-1 rounded-lg border border-red-100 dark:border-red-800/50 transition-colors">
                <button onClick={handleDelete} className="text-xs font-bold text-red-600 dark:text-red-400 hover:underline">Hapus</button>
                <button onClick={() => setConfirmDelete(false)} className="text-xs text-slate-500 dark:text-slate-400 font-medium hover:underline">Batal</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} className="text-slate-400 hover:text-red-500 transition-colors p-1">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="mt-1">
          <textarea
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            className="w-full min-h-[200px] bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 outline-none resize-y leading-relaxed transition-colors"
          />
          <div className="flex justify-end space-x-2 mt-3">
            <button onClick={() => setIsEditing(false)} className="text-xs text-slate-600 dark:text-slate-400 px-4 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 font-medium transition-colors">Batal</button>
            <button
              onClick={handleUpdate}
              disabled={isUpdating || !editContent.trim()}
              className="text-xs text-white bg-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium disabled:bg-slate-300"
            >
              {isUpdating ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </div>
      ) : (
        <>
          {sub.imageUrl && <img src={sub.imageUrl} alt="entri" className="rounded-lg max-h-48 object-cover mb-4 border border-slate-100 dark:border-slate-700" />}
          <p className="text-slate-700 dark:text-slate-200 text-[15px] whitespace-pre-wrap leading-relaxed">{sub.content}</p>
        </>
      )}
    </div>
  );
};


// --- 3. Tampilan Pengaturan / Penghubungan ---
const SettingsView = ({ profile, partner }) => {
  const [joinCode, setJoinCode] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmUnpair, setConfirmUnpair] = useState(false);

  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(profile?.displayName || "");
  const [isSavingName, setIsSavingName] = useState(false);

  // Avatar selection state
  const [avatarStyle, setAvatarStyle] = useState('notionists'); // 'notionists', 'thumbs', or 'adventurer'
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);

  useEffect(() => {
    if (profile?.displayName && !isEditingName) {
      setNewName(profile.displayName);
    }
  }, [profile?.displayName, isEditingName]);

  const handleUpdateName = async () => {
    if (!newName.trim()) return;
    setIsSavingName(true);
    try {
      await updateDoc(doc(db, getPublicPath('users'), profile.id), {
        displayName: newName.trim()
      });
      setIsEditingName(false);
    } catch (e) {
      console.error("Gagal update nama", e);
    } finally {
      setIsSavingName(false);
    }
  };

  const handleUpdateAvatar = async (avatarUrl) => {
    setIsSavingAvatar(true);
    try {
      await updateDoc(doc(db, getPublicPath('users'), profile.id), {
        photoURL: avatarUrl
      });
    } catch (e) {
      console.error("Gagal update avatar", e);
    } finally {
      setIsSavingAvatar(false);
    }
  };

  const handleGenerateCode = async () => {
    setIsGenerating(true);
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    try {
      // Menggunakan setDoc + merge agar membuat dokumen jika belum ada
      await setDoc(doc(db, getPublicPath('users'), profile.id), { inviteCode: code }, { merge: true });
    } catch (e) {
      console.error("Gagal membuat kode:", e);
    }
    setIsGenerating(false);
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    setIsJoining(true);
    setJoinError("");

    try {
      // Cari pengguna yang memiliki inviteCode tersebut
      const q = query(
        collection(db, getPublicPath('users')),
        where("inviteCode", "==", joinCode.toUpperCase())
      );
      const usersSnap = await getDocs(q);

      if (usersSnap.empty) {
        setJoinError("Kode tidak valid atau pengguna tidak ditemukan.");
        setIsJoining(false);
        return;
      }

      const foundPartnerDoc = usersSnap.docs[0];
      const foundPartner = { id: foundPartnerDoc.id, ...foundPartnerDoc.data() };

      if (foundPartner.id === profile.id) {
        setJoinError("Ini adalah kode Anda sendiri. Bagikan kode ini ke pasangan Anda.");
        setIsJoining(false);
        return;
      }

      // Buat Ruangan
      const newRoomId = `room_${Date.now()}_${generateId()}`;
      await setDoc(doc(db, getPublicPath('rooms'), newRoomId), {
        id: newRoomId,
        userIds: [profile.id, foundPartner.id],
        createdAt: Date.now()
      });

      // Perbarui Kedua Pengguna
      await setDoc(doc(db, getPublicPath('users'), profile.id), { roomId: newRoomId, inviteCode: null }, { merge: true });
      await setDoc(doc(db, getPublicPath('users'), foundPartner.id), { roomId: newRoomId, inviteCode: null }, { merge: true });

    } catch (e) {
      console.error("Gagal bergabung:", e);
      setJoinError("Gagal menghubungkan. Silakan coba lagi.");
    } finally {
      setIsJoining(false);
    }
  };

  const handleUnpair = async () => {
    try {
      await setDoc(doc(db, getPublicPath('users'), profile.id), { roomId: null }, { merge: true });
      if (partner) {
        await setDoc(doc(db, getPublicPath('users'), partner.id), { roomId: null }, { merge: true });
      }
      setConfirmUnpair(false);
    } catch (e) {
      console.error(e);
    }
  };

  const copyToClipboard = () => {
    if (profile?.inviteCode) {
      const textArea = document.createElement("textarea");
      textArea.value = profile.inviteCode;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Gagal menyalin', err);
      }
      document.body.removeChild(textArea);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-8 animate-in fade-in duration-300">

      {/* Bagian Profil */}
      <div className="bg-white dark:bg-slate-800 rounded-[24px] shadow-sm border border-slate-100 dark:border-slate-700 p-8 transition-colors duration-300">
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-8 tracking-tight">Profil</h2>
        <div className="flex items-center space-x-6">
          <img
            src={profile?.photoURL || DEFAULT_AVATAR(profile?.id)}
            alt="Avatar"
            className="w-20 h-20 rounded-full border-4 border-slate-50 dark:border-slate-700 object-cover shadow-sm transition-colors"
          />
          <div className="flex-1">
            {isEditingName ? (
              <div className="flex flex-col space-y-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 outline-none text-slate-800 dark:text-white w-full max-w-xs transition-colors"
                  placeholder="Nama tampilan"
                  autoFocus
                />
                <div className="flex space-x-2">
                  <button
                    onClick={handleUpdateName}
                    disabled={isSavingName || !newName.trim()}
                    className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    {isSavingName ? 'Menyimpan...' : 'Simpan'}
                  </button>
                  <button
                    onClick={() => { setIsEditingName(false); setNewName(profile?.displayName || ""); }}
                    className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                  >
                    Batal
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">{profile?.displayName || "Tanpa Nama"}</h3>
                <button
                  onClick={() => setIsEditingName(true)}
                  className="text-slate-400 hover:text-indigo-500 transition-colors p-1"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">ID: {profile?.id?.substring(0, 8)}...</p>
          </div>
        </div>

        {/* Pilihan Avatar */}
        <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-700">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-6">Pilih Avatar Simak</h3>
          
          <div className="flex flex-wrap gap-2 mb-6">
            <button 
              onClick={() => setAvatarStyle('notionists')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${avatarStyle === 'notionists' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}
            >
              Notionists
            </button>
            <button 
              onClick={() => setAvatarStyle('thumbs')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${avatarStyle === 'thumbs' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}
            >
              Thumbs
            </button>
            <button 
              onClick={() => setAvatarStyle('adventurer')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${avatarStyle === 'adventurer' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}
            >
              Adventurer
            </button>
          </div>

          <div className="grid grid-cols-4 gap-4">
            {(avatarStyle === 'notionists' ? NEUTRAL_AVATARS : (avatarStyle === 'thumbs' ? THUMBS_AVATARS : ADVENTURER_AVATARS)).map((url, idx) => (
              <button
                key={idx}
                onClick={() => handleUpdateAvatar(url)}
                disabled={isSavingAvatar}
                className={`relative group rounded-2xl overflow-hidden border-2 transition-all p-1 ${profile?.photoURL === url ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/40' : 'border-transparent hover:border-slate-200 dark:hover:border-slate-600'}`}
              >
                <img src={url} alt={`Avatar ${idx}`} className="w-full aspect-square rounded-xl object-cover" />
                {profile?.photoURL === url && (
                  <div className="absolute top-1 right-1 bg-indigo-600 text-white rounded-full p-0.5 shadow-sm">
                    <CheckCircle2 className="w-3 h-3" />
                  </div>
                )}
                {isSavingAvatar && profile?.photoURL === url && (
                  <div className="absolute inset-0 bg-white/50 dark:bg-black/50 flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-4 leading-relaxed font-medium">
            * Pilih gaya dan avatar di atas untuk mengganti foto profil Google kamu. Perubahan akan terlihat di seluruh aplikasi.
          </p>
        </div>
      </div>

      {/* Bagian Penghubungan */}
      <div className="bg-white dark:bg-slate-800 rounded-[24px] shadow-sm border border-slate-100 dark:border-slate-700 p-8 transition-colors duration-300">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center tracking-tight">
          <Users className="w-5 h-5 mr-2 text-indigo-500 dark:text-indigo-400" /> Koneksi Kita
        </h2>

        {profile?.roomId ? (
          partner ? (
            <div className="bg-indigo-50/50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl p-6 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold text-indigo-900 dark:text-indigo-200">Terhubung dengan</span>
                <span className="px-2 py-1 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 text-xs font-bold rounded-md">Terhubung</span>
              </div>
              <div className="flex items-center space-x-4 mb-6">
                <img src={partner.photoURL || DEFAULT_AVATAR(partner.id)} alt="Pasangan" className="w-14 h-14 rounded-full border-2 border-white dark:border-slate-700 shadow-sm" />
                <div>
                  <p className="font-bold text-slate-800 dark:text-white text-lg leading-tight">{partner.displayName}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">Ruangan bersama aktif</p>
                </div>
              </div>
              {confirmUnpair ? (
                <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-xl flex items-center justify-between border border-red-100 dark:border-red-900/50">
                  <span className="text-xs text-red-600 dark:text-red-400 font-bold">Yakin putuskan hubungan?</span>
                  <div className="space-x-3">
                    <button onClick={handleUnpair} className="text-xs font-bold text-red-700 dark:text-red-400 hover:underline">Ya, Putuskan</button>
                    <button onClick={() => setConfirmUnpair(false)} className="text-xs text-slate-600 dark:text-slate-400 font-bold hover:underline">Batal</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmUnpair(true)}
                  className="text-sm text-red-500 dark:text-red-400 font-bold hover:text-red-600 dark:hover:text-red-300 transition-colors"
                >
                  Putuskan Hubungan
                </button>
              )}
            </div>
          ) : (
            <div className="bg-indigo-50/50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl p-6 transition-colors">
              <p className="text-sm font-bold text-indigo-900 dark:text-indigo-200">Menyiapkan ruangan...</p>
            </div>
          )
        ) : (
          <div className="space-y-8">

            {/* Buat Kode */}
            <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-700 rounded-2xl p-6 transition-colors">
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">Undang Kamu</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 font-medium">Buat kode untuk kubagikan denganmu.</p>

              {profile?.inviteCode ? (
                <div className="flex items-center space-x-3">
                  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-6 py-3 text-2xl font-mono font-bold tracking-widest text-indigo-600 dark:text-indigo-400 flex-1 text-center shadow-sm transition-colors">
                    {profile.inviteCode}
                  </div>
                  <button
                    onClick={copyToClipboard}
                    className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 transition-colors shadow-sm"
                  >
                    {copied ? <CheckCircle2 className="w-6 h-6 text-green-500" /> : <Copy className="w-6 h-6" />}
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleGenerateCode}
                  disabled={isGenerating}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-indigo-200 dark:hover:border-indigo-800 font-bold py-3 px-4 rounded-xl transition-all shadow-sm active:scale-[0.98]"
                >
                  {isGenerating ? 'Membuat...' : 'Buat Kode Undangan'}
                </button>
              )}
            </div>

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
              <span className="flex-shrink-0 mx-4 text-slate-400 dark:text-slate-500 text-[10px] uppercase font-bold tracking-widest">Atau</span>
              <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
            </div>

            {/* Masukkan Kode */}
            <div>
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3">Punya kode darimu?</h3>
              <div className="flex space-x-3">
                <input
                  type="text"
                  placeholder="6 DIGIT"
                  className="flex-1 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-mono text-center uppercase focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 outline-none text-slate-800 dark:text-white transition-colors"
                  maxLength={6}
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value)}
                />
                <button
                  onClick={handleJoin}
                  disabled={isJoining || joinCode.length < 6}
                  className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white px-8 rounded-xl font-bold transition-all shadow-md active:scale-95"
                >
                  Gabung
                </button>
              </div>
              {joinError && <p className="text-red-500 text-xs mt-2 ml-1 font-medium">{joinError}</p>}
            </div>



          </div>
        )}
      </div>

    </div>
  );
};

// --- Layar Login ---
const LoginScreen = ({ onLoginGoogle }) => (
  <div className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-500">
    {/* Decorative Elements */}
    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-100 dark:bg-indigo-900/20 rounded-full blur-[120px] opacity-60 animate-pulse"></div>
    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-100 dark:bg-purple-900/20 rounded-full blur-[120px] opacity-60 animate-pulse" style={{ animationDelay: '2s' }}></div>

    <div className="z-10 w-full max-w-md px-6">
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[40px] shadow-[0_20px_50px_rgba(79,70,229,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] p-10 md:p-12 text-center border border-white/50 dark:border-slate-800 transition-all duration-500 relative overflow-hidden">
        {/* Shine Overlay */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-400 dark:via-indigo-500 to-transparent opacity-30"></div>

        <div className="relative mb-10">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-indigo-700 dark:from-indigo-500 dark:to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-[0_10px_20px_rgba(79,70,229,0.3)] dark:shadow-none rotate-3 hover:rotate-0 transition-transform duration-500">
            <span className="text-white font-bold text-4xl">s</span>
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-3 tracking-tighter">SIMAK<span className="text-indigo-600 dark:text-indigo-500">.</span></h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm">Simak hidupmu dari jauh</p>
        </div>

        <div className="space-y-6">
          <button
            onClick={onLoginGoogle}
            className="group w-full flex items-center justify-center space-x-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-4 rounded-2xl hover:bg-slate-800 dark:hover:bg-slate-100 transition-all duration-300 shadow-lg shadow-slate-200 dark:shadow-none hover:-translate-y-0.5 active:scale-[0.98]"
          >
            <div className="bg-white dark:bg-slate-100 p-1 rounded-lg">
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            </div>
            <span>Masuk dengan Google</span>
          </button>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-12 text-center text-slate-500 dark:text-slate-400 text-xs font-bold tracking-widest uppercase">
        &copy; {new Date().getFullYear()} Simak &bull; Ruang Berdua
      </div>
    </div>
  </div>
);