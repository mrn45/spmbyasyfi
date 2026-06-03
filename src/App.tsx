import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  GraduationCap,
  Sparkles,
  ClipboardList,
  Building2,
  Target,
  Trophy,
  Activity,
  Image as ImageIcon,
  User,
  MapPin,
  Users,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  FileText,
  FileCheck,
  Send,
  Sliders,
  LogOut,
  LogIn,
  FolderOpen,
  Info,
  Calendar,
  Lock,
  Download,
  AlertCircle,
  RefreshCw,
  Check,
  Smartphone,
  BookOpen,
  ChevronRight,
  ShieldCheck,
  HelpCircle,
  UsersRound,
  EyeOff,
  Trash2,
  Filter
} from "lucide-react";

import { Pendaftar, PendaftarFiles, WebContent, WaSettings } from "./types";
import { initialWebContent, initialPendaftarList, initialWaSettings } from "./data";
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  deleteDoc, 
  writeBatch,
  getDocFromServer
} from "firebase/firestore";
import { db, storage, auth, handleFirestoreError, OperationType } from "./firebase";
import { ref as storageRef, uploadString, getDownloadURL } from "firebase/storage";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import AnalyticsCharts from "./components/AnalyticsCharts";

export default function App() {
  // --- CORE STATE MANAGEMENT ---
  const [pendaftarList, setPendaftarList] = useState<Pendaftar[]>([]);
  const [webContent, setWebContent] = useState<WebContent>(initialWebContent);
  const [waSettings, setWaSettings] = useState<WaSettings>(initialWaSettings);

  // Validate Connection on Boot
  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, "test", "connection"));
      } catch (error) {
        if (error instanceof Error && error.message.includes("the client is offline")) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();
  }, []);

  // Sync Pendaftar from Firestore in Real-time
  useEffect(() => {
    const pendaftarColRef = collection(db, "pendaftar");
    const unsubscribe = onSnapshot(pendaftarColRef, (snapshot) => {
      if (snapshot.empty) {
        setPendaftarList([]);
      } else {
        const list: Pendaftar[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as Pendaftar);
        });
        // Sort newest first based on createdAt or fallback to registered registration sequence
        list.sort((a, b) => {
          const check = b.createdAt.localeCompare(a.createdAt);
          if (check !== 0) return check;
          return b.noDaftar.localeCompare(a.noDaftar);
        });
        setPendaftarList(list);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "pendaftar");
    });

    return () => unsubscribe();
  }, []);

  // Sync WebContent from Firestore in Real-time
  useEffect(() => {
    const webContentDocRef = doc(db, "web_content", "config");
    const unsubscribe = onSnapshot(webContentDocRef, (snap) => {
      if (!snap.exists()) {
        setDoc(webContentDocRef, initialWebContent)
          .then(() => console.log("Firestore WebContent initialized."))
          .catch(err => console.error("Error initializing WebContent in Firestore:", err));
      } else {
        setWebContent(snap.data() as WebContent);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "web_content/config");
    });

    return () => unsubscribe();
  }, []);

  // Sync WaSettings from Firestore in Real-time
  useEffect(() => {
    const waSettingsDocRef = doc(db, "wa_settings", "config");
    const unsubscribe = onSnapshot(waSettingsDocRef, (snap) => {
      if (!snap.exists()) {
        setDoc(waSettingsDocRef, initialWaSettings)
          .then(() => console.log("Firestore WaSettings initialized."))
          .catch(err => console.error("Error initializing WaSettings in Firestore:", err));
      } else {
        setWaSettings(snap.data() as WaSettings);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "wa_settings/config");
    });

    return () => unsubscribe();
  }, []);


  // Navigation and Admin state
  const [currentView, setCurrentView] = useState<"landing" | "admin">("landing");
  const [storageMethod, setStorageMethod] = useState<"base64" | "gdrive">(() => {
    const saved = localStorage.getItem("ppdb_storage_method");
    if (saved === "base64" || saved === "gdrive") {
      return saved as "base64" | "gdrive";
    }
    return "gdrive";
  });
  const [googleUser, setGoogleUser] = useState<{ email: string; displayName: string | null } | null>(null);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);

  // Getter for backwards compatibility
  const useFirebaseStorage = false;
  const [activeAdminTab, setActiveAdminTab] = useState<"data" | "konten" | "broadcast" | "settings">("data");
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem("ppdb_admin_session") === "active";
  });

  // Modals & UI States
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [isConfirmDeleteAllOpen, setIsConfirmDeleteAllOpen] = useState<boolean>(false);
  const [currentDetailStudent, setCurrentDetailStudent] = useState<Pendaftar | null>(null);
  const [detailSubTab, setDetailSubTab] = useState<"pribadi" | "ortu" | "sekolah" | "berkas">("pribadi");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [jenjangFilter, setJenjangFilter] = useState<string>("All");
  
  // Custom Alert state
  const [customAlert, setCustomAlert] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  // Form Step Tracker
  const [formStep, setFormStep] = useState<number>(1);

  // Receipt Slip state for newly submitted user
  const [submittedReceipt, setSubmittedReceipt] = useState<Pendaftar | null>(null);

  // WA broadcast text
  const [broadcastMessage, setBroadcastMessage] = useState<string>("");
  const [isSendingBroadcast, setIsSendingBroadcast] = useState<boolean>(false);
  const [broadcastTarget, setBroadcastTarget] = useState<"all" | "filtered">("all");

  // Form State
  const [formData, setFormData] = useState({
    nisn: "",
    nik: "",
    nama: "",
    tempatLahir: "",
    tglLahir: "",
    jk: "",
    agama: "",
    alamat: "",
    rtrw: "",
    dusun: "",
    desa: "",
    kecamatan: "",
    kodepos: "",
    namaAyah: "",
    namaIbu: "",
    nikOrtu: "",
    pekerjaan: "",
    penghasilan: "",
    noWA: "",
    asalSekolah: "",
    tahunLulus: "2026",
    npsn: "",
    jenjang: ""
  });

  // Admin login credential inputs
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  // Content modification editors
  const [editProfil, setEditProfil] = useState(webContent.profil);
  const [editVisiMisi, setEditVisiMisi] = useState(webContent.visimisi);
  const [editHeroTitle, setEditHeroTitle] = useState(webContent.hero_title || "Penerimaan Peserta Didik Baru Terpadu");
  const [editHeroSubtitle, setEditHeroSubtitle] = useState(webContent.hero_subtitle || "Selamat Datang di Portal Penerimaan Mahasiswa/Santri Baru (SPMB) Yayasan Yasyfi Tahun Ajaran 2026/2027. Daftarkan putra-putri terbaik Anda secara mandiri dengan praktis, aman, dan transparan.");
  const [editSiswaCount, setEditSiswaCount] = useState(webContent.siswa_count || "147");
  const [editGuruCount, setEditGuruCount] = useState(webContent.guru_count || "40");
  const [editKeunggulan, setEditKeunggulan] = useState(webContent.keunggulan);
  const [editEkskul, setEditEkskul] = useState(webContent.ekskul);
  const [editPrestasi, setEditPrestasi] = useState(webContent.prestasi);
  const [editGaleri, setEditGaleri] = useState(webContent.galeri);

  // API Configuration Inputs
  const [apiEndpoint, setApiEndpoint] = useState(waSettings.endpoint);
  const [apiToken, setApiToken] = useState(waSettings.token);
  const [adminWa, setAdminWa] = useState(waSettings.admin_wa || "");

  // Sync editor fields when webContent loads or changes
  useEffect(() => {
    if (webContent) {
      setEditProfil(webContent.profil);
      setEditVisiMisi(webContent.visimisi);
      setEditHeroTitle(webContent.hero_title || "Penerimaan Peserta Didik Baru Terpadu");
      setEditHeroSubtitle(webContent.hero_subtitle || "Selamat Datang di Portal Penerimaan Mahasiswa/Santri Baru (SPMB) Yayasan Yasyfi Tahun Ajaran 2026/2027. Daftarkan putra-putri terbaik Anda secara mandiri dengan praktis, aman, dan transparan.");
      setEditSiswaCount(webContent.siswa_count || "147");
      setEditGuruCount(webContent.guru_count || "40");
      setEditKeunggulan(webContent.keunggulan);
      setEditEkskul(webContent.ekskul);
      setEditPrestasi(webContent.prestasi);
      setEditGaleri(webContent.galeri);
    }
  }, [webContent]);

  // Sync WA fields when waSettings loads or changes
  useEffect(() => {
    if (waSettings) {
      setApiEndpoint(waSettings.endpoint);
      setApiToken(waSettings.token);
      setAdminWa(waSettings.admin_wa || "");
    }
  }, [waSettings]);

  // File Upload State (for Base64 tracking)
  const [uploadedFiles, setUploadedFiles] = useState<{
    kk: { name: string; mimeType: string; data: string } | null;
    akta: { name: string; mimeType: string; data: string } | null;
    skl: { name: string; mimeType: string; data: string } | null;
    foto: { name: string; mimeType: string; data: string } | null;
  }>({
    kk: null,
    akta: null,
    skl: null,
    foto: null
  });

  const [fileProgress, setFileProgress] = useState<{
    kk?: "uploading" | "done" | "error";
    akta?: "uploading" | "done" | "error";
    skl?: "uploading" | "done" | "error";
    foto?: "uploading" | "done" | "error";
  }>({});

  // Helper trigger custom temporary notification
  const triggerAlert = (type: "success" | "error" | "info", message: string) => {
    setCustomAlert({ type, message });
    setTimeout(() => {
      setCustomAlert(null);
    }, 4500);
  };

  // Google Drive Handlers
  const handleGoogleDriveSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope("https://www.googleapis.com/auth/drive.file");
      provider.addScope("https://www.googleapis.com/auth/drive");
      
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential && credential.accessToken) {
        setGoogleUser({
          email: result.user.email || "",
          displayName: result.user.displayName || "Google User"
        });
        setGoogleAccessToken(credential.accessToken);
        triggerAlert("success", `Akun Google ${result.user.email} berhasil dihubungkan.`);
      } else {
        triggerAlert("error", "Gagal mendapatkan token akses Google Drive.");
      }
    } catch (err) {
      console.error("Gagal menghubungkan Google Drive:", err);
      triggerAlert("error", "Gagal menghubungkan Google Drive. Mohon periksa pemblokir pop-up Anda.");
    }
  };

  const getOrCreateGdriveFolder = async (token: string): Promise<string> => {
    try {
      const searchRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='SPMB YASYFI Berkas Pendaftaran' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id)`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      if (!searchRes.ok) throw new Error("Gagal mencari folder di Google Drive.");
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        return searchData.files[0].id;
      }
      
      const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: "SPMB YASYFI Berkas Pendaftaran",
          mimeType: "application/vnd.google-apps.folder"
        })
      });
      if (!createRes.ok) throw new Error("Gagal membuat folder di Google Drive.");
      const createData = await createRes.json();
      if (createData.id) {
        return createData.id;
      }
      throw new Error("Folder ID tidak diterima.");
    } catch (err) {
      console.error("Gagal membuat folder Google Drive:", err);
      throw err;
    }
  };

  const uploadToGoogleDrive = async (
    token: string,
    folderId: string,
    filename: string,
    mimeType: string,
    base64Data: string
  ): Promise<string> => {
    const metadata = {
      name: filename,
      parents: [folderId]
    };
    
    const boundary = "gdrive_upload_boundary";
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;
    
    const multipartRequestBody = 
      delimiter +
      "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
      JSON.stringify(metadata) +
      delimiter +
      `Content-Type: ${mimeType}\r\n` +
      "Content-Transfer-Encoding: base64\r\n\r\n" +
      base64Data +
      closeDelimiter;
      
    const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`
      },
      body: multipartRequestBody
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Google Drive Upload HTTP Error ${res.status}: ${errorText}`);
    }
    
    const fileJson = await res.json();
    const fileId = fileJson.id;
    if (!fileId) throw new Error("Gagal memperoleh ID file dari Google Drive.");
    
    // Update metadata to allow reading by anyone with the link
    try {
      await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          role: "reader",
          type: "anyone"
        })
      });
    } catch (permErr) {
      console.warn("Gagal mengatur permisi file Google Drive:", permErr);
    }
    
    // Get the webViewLink
    const metaRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=webViewLink`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!metaRes.ok) return `https://drive.google.com/file/d/${fileId}/view`;
    const metaJson = await metaRes.json();
    return metaJson.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;
  };

  // Helper to compress images for Firestore storage optimization
  const compressImageFile = (file: File, maxWidth = 800, maxHeight = 800, quality = 0.5): Promise<{ data: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          // Scale down dimensions if needed
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Gagal mematangkan rendering konteks 2D Canvas"));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Force to image/jpeg with chosen quality to highly compress the base64 output
          try {
            const dataUrl = canvas.toDataURL("image/jpeg", quality);
            const base64Data = dataUrl.split(",")[1];
            resolve({ data: base64Data, mimeType: "image/jpeg" });
          } catch (err) {
            reject(err);
          }
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  // Convert File Input to Base64 or upload to Firebase Storage with on-the-fly Image Compression
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, fileKey: keyof PendaftarFiles) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileProgress(prev => ({ ...prev, [fileKey]: "uploading" }));

    try {
      let finalName = file.name;
      let finalMimeType = file.type;
      let finalBase64 = "";

      if (file.type.startsWith("image/")) {
        // Image file: Compress on-the-fly to a lightweight jpeg (typically 20KB - 80KB)
        const compressed = await compressImageFile(file, 800, 800, 0.5);
        finalName = file.name.substring(0, file.name.lastIndexOf('.')) + ".jpg";
        finalMimeType = compressed.mimeType;
        finalBase64 = compressed.data;
      } else {
        // Non-image file (PDF etc.): Check size <= 200KB
        if (file.size > 200 * 1024) {
          setFileProgress(prev => ({ ...prev, [fileKey]: "error" }));
          triggerAlert("error", `Berkas non-gambar ${file.name} melebihi 200KB! Silakan kompres PDF Anda atau gunakan foto/gambar.`);
          e.target.value = "";
          return;
        }

        const base64Data: string = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => {
            const base64 = reader.result ? (reader.result as string).split(",")[1] : "";
            resolve(base64);
          };
          reader.onerror = (err) => reject(err);
        });
        finalBase64 = base64Data;
      }

      // If Google Drive storage is selected
      if (storageMethod === "gdrive") {
        if (!googleAccessToken) {
          setFileProgress(prev => ({ ...prev, [fileKey]: "error" }));
          triggerAlert("error", "Simpan gagal: Silakan hubungkan Akun Google Drive Anda terlebih dahulu pada tombol di bawah.");
          e.target.value = "";
          return;
        }
        try {
          const folderId = await getOrCreateGdriveFolder(googleAccessToken);
          // Customize filename for Google Drive so it lists applicant name clearly: e.g. KK_Ahmad_Sofiudin.jpg
          const applicantName = formData.nama ? formData.nama.replace(/\s+/g, "_") : "Siswa";
          const driveFilename = `${fileKey.toUpperCase()}_${applicantName}_${finalName}`;
          
          const viewUrl = await uploadToGoogleDrive(googleAccessToken, folderId, driveFilename, finalMimeType, finalBase64);
          
          setUploadedFiles(prev => ({
            ...prev,
            [fileKey]: {
              name: finalName,
              mimeType: finalMimeType,
              data: viewUrl
            }
          }));
          setFileProgress(prev => ({ ...prev, [fileKey]: "done" }));
          triggerAlert("success", `Berkas ${file.name} berhasil disimpan di Google Drive Anda!`);
          return;
        } catch (gdriveErr) {
          console.error("Gagal unggah ke Google Drive:", gdriveErr);
          setFileProgress(prev => ({ ...prev, [fileKey]: "error" }));
          triggerAlert("error", "Gagal mengunggah berkas ke Google Drive. Silakan hubungkan kembali akun Anda.");
          e.target.value = "";
          return;
        }
      }

      // If Firebase Storage is enabled, try uploading cloud-native
      if (useFirebaseStorage) {
        try {
          const randomId = Math.random().toString(36).substring(2, 8);
          // Standard path structure for applicants' attachments
          const cloudPath = `pendaftar/${fileKey}_${Date.now()}_${randomId}_${finalName}`;
          const sRef = storageRef(storage, cloudPath);

          // Upload using base64 string directly to avoid blob conversion issues, setting contentType correctly
          await uploadString(sRef, finalBase64, "base64", { contentType: finalMimeType });
          const downloadUrl = await getDownloadURL(sRef);

          setUploadedFiles(prev => ({
            ...prev,
            [fileKey]: {
              name: finalName,
              mimeType: finalMimeType,
              data: downloadUrl // Directly store public cloud link
            }
          }));
          setFileProgress(prev => ({ ...prev, [fileKey]: "done" }));
          triggerAlert("success", `Berkas ${file.name} berhasil disimpan di Firebase Cloud Storage!`);
          return;
        } catch (storageErr) {
          console.warn("Gagal unggah ke Firebase Storage (Storage belum aktif/Rules tertutup). Fallback ke Base64 aktif otomatis:", storageErr);
        }
      }

      // Default Fallback mode: store Base64 directly
      setUploadedFiles(prev => ({
        ...prev,
        [fileKey]: {
          name: finalName,
          mimeType: finalMimeType,
          data: finalBase64
        }
      }));
      setFileProgress(prev => ({ ...prev, [fileKey]: "done" }));
      triggerAlert("success", `Berkas ${file.name} berhasil dimuat (Modus Fallback Base64).`);

    } catch (err) {
      console.error("Gagal memproses unggahan berkas:", err);
      setFileProgress(prev => ({ ...prev, [fileKey]: "error" }));
      triggerAlert("error", `Gagal memproses format file ${file.name}.`);
    }
  };

  // Submit PPDB Form
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Cek file sudah dikomentari agar opsional
    // const isSklRequired = formData.jenjang !== "MADIN";
    // if (!uploadedFiles.kk || !uploadedFiles.akta || (isSklRequired && !uploadedFiles.skl)) {
    //   triggerAlert("error", "Harap unggah seluruh berkas digital wajib!");
    //   return;
    // }

    // Generate unique Registration Number
    const regYear = new Date().getFullYear().toString().substring(2);
    let lastNum = 0;
    pendaftarList.forEach((item) => {
      const parts = item.noDaftar.split("-");
      if (parts.length === 2) {
        const numPart = parseInt(parts[1].substring(2));
        if (!isNaN(numPart) && numPart > lastNum) {
          lastNum = numPart;
        }
      }
    });
    const nextNumStr = String(lastNum + 1).padStart(3, "0");
    const generatedNoDaftar = `SPMB-${regYear}${nextNumStr}`;

    const newPendaftar: Pendaftar = {
      noDaftar: generatedNoDaftar,
      nisn: formData.nisn,
      nik: formData.nik,
      nama: formData.nama.toUpperCase(),
      tempatLahir: formData.tempatLahir,
      tglLahir: formData.tglLahir,
      jk: formData.jk,
      agama: formData.agama,
      alamat: `${formData.alamat}, RT/RW ${formData.rtrw}, Dusun ${formData.dusun}, Desa ${formData.desa}, Kec. ${formData.kecamatan}, Kode Pos ${formData.kodepos}`,
      rtrw: formData.rtrw,
      dusun: formData.dusun,
      desa: formData.desa,
      kecamatan: formData.kecamatan,
      kodepos: formData.kodepos,
      namaAyah: formData.namaAyah,
      namaIbu: formData.namaIbu,
      nikOrtu: formData.nikOrtu,
      pekerjaan: formData.pekerjaan,
      penghasilan: formData.penghasilan,
      noWA: formData.noWA,
      asalSekolah: formData.asalSekolah,
      tahunLulus: formData.tahunLulus,
      npsn: formData.npsn,
      jenjang: formData.jenjang,
      status: "Baru",
      files: { ...uploadedFiles },
      createdAt: new Date().toISOString()
    };

    // Save directly to Firestore Cloud Database
    setDoc(doc(db, "pendaftar", generatedNoDaftar), newPendaftar)
      .then(() => {
        setSubmittedReceipt(newPendaftar);
      })
      .catch((err) => handleFirestoreError(err, OperationType.WRITE, `pendaftar/${generatedNoDaftar}`));

    // Dynamic Whatsapp message payload to Parent and Admin
    if (waSettings.endpoint && waSettings.token) {
      const targetParent = newPendaftar.noWA.replace(/\D/g, "").replace(/^0/, "62");
      const parentMsg = `Yth. Orang Tua/Wali dari ${newPendaftar.nama},

Terima kasih telah mendaftar di Portal Penerimaan Peserta Didik Baru (PPDB/SPMB) Yayasan Assyafiiyah Lenteng Barat.

Pendaftaran putra-putri Anda telah kami terima dengan sukses.
No. Registrasi/Pendaftaran: *${generatedNoDaftar}*
Jenjang: *${newPendaftar.jenjang}*

Silakan pantau status verifikasi berkas pendaftaran Anda secara berkala melalui sistem portal kami.

Terima kasih.
--
Panitia SPMB Yayasan Assyafiiyah Lenteng Barat`;

      // Helper function to send notification with gateway content-type compatibility (tries UrlEncoded, falls back to JSON)
      const sendWaMessage = async (target: string, msg: string, label: string) => {
        try {
          // Attempt standard application/x-www-form-urlencoded parameter binding (preferred by Fonnte, starsender, etc)
          const formParams = new URLSearchParams();
          formParams.append("target", target);
          formParams.append("message", msg);

          const res = await fetch(waSettings.endpoint, {
            method: "POST",
            headers: {
              "Authorization": waSettings.token,
              "Content-Type": "application/x-www-form-urlencoded"
            },
            body: formParams
          });

          if (res.ok) {
            console.log(`[WA Gateway] Notifikasi otomatis (${label}) terkirim via Form URL-Encoded.`);
            return true;
          }

          // Fallback to application/json format if gateway expects JSON-only
          const jsonRes = await fetch(waSettings.endpoint, {
            method: "POST",
            headers: {
              "Authorization": waSettings.token,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              target: target,
              message: msg
            })
          });

          if (jsonRes.ok) {
            console.log(`[WA Gateway] Notifikasi otomatis (${label}) terkirim via JSON Fallback.`);
            return true;
          } else {
            console.warn(`[WA Gateway] Gagal mengirim (${label}). Status urlencoded: ${res.status}, Status json: ${jsonRes.status}`);
            return false;
          }
        } catch (error) {
          console.error(`[WA Gateway] Error HTTP fetch (${label}):`, error);
          return false;
        }
      };

      // Notify Parent
      sendWaMessage(targetParent, parentMsg, "Pendaftar");

      // Notify Admin
      if (waSettings.admin_wa) {
        const namaWali = newPendaftar.namaAyah || newPendaftar.namaIbu || "-";
        const totalCount = pendaftarList.length + 1;
        const adminMsg = `Notifikasi SPMB Baru 🎯
Nama Calon Siswa : ${newPendaftar.nama}
Jenjang Pilihan : ${newPendaftar.jenjang}
Nama Wali : ${namaWali}
Alamat : ${newPendaftar.alamat}
Sekolah Asal : ${newPendaftar.asalSekolah}
Jumlah Total Siswa Terdaftar : ${totalCount}`;

        const targetWa = waSettings.admin_wa.replace(/\D/g, "").replace(/^0/, "62");
        sendWaMessage(targetWa, adminMsg, "Admin");
      }
    }

    // Success Notification & Reset Form
    triggerAlert("success", `Pendaftaran berhasil dikirim! No. Pendaftaran Anda: ${generatedNoDaftar}`);
    
    // Reset Form values
    setFormData({
      nisn: "",
      nik: "",
      nama: "",
      tempatLahir: "",
      tglLahir: "",
      jk: "",
      agama: "",
      alamat: "",
      rtrw: "",
      dusun: "",
      desa: "",
      kecamatan: "",
      kodepos: "",
      namaAyah: "",
      namaIbu: "",
      nikOrtu: "",
      pekerjaan: "",
      penghasilan: "",
      noWA: "",
      asalSekolah: "",
      tahunLulus: "2026",
      npsn: "",
      jenjang: ""
    });

    setUploadedFiles({ kk: null, akta: null, skl: null, foto: null });
    setFileProgress({});
    setFormStep(1); // Back to step 1
  };

  // Login handler
  const processLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminUsername === "admin" && adminPassword === "51001n") {
      setIsAdminLoggedIn(true);
      localStorage.setItem("ppdb_admin_session", "active");
      setIsLoginModalOpen(false);
      setCurrentView("admin");
      triggerAlert("success", "Masuk dari Admin berhasil!");
      setAdminUsername("");
      setAdminPassword("");
    } else {
      triggerAlert("error", "Username atau Password salah!");
    }
  };

  // Logout handler
  const processLogout = () => {
    setIsAdminLoggedIn(false);
    localStorage.removeItem("ppdb_admin_session");
    setCurrentView("landing");
    triggerAlert("info", "Sesi Administrator diakhiri.");
  };

  // Change student status
  const handleUpdateStatus = (noDaftar: string, newStatus: "Baru" | "Terverifikasi" | "Ditolak") => {
    const student = pendaftarList.find(s => s.noDaftar === noDaftar);

    if (student) {
      setDoc(doc(db, "pendaftar", noDaftar), { ...student, status: newStatus })
        .catch(err => handleFirestoreError(err, OperationType.UPDATE, `pendaftar/${noDaftar}`));

      if (waSettings.endpoint && waSettings.token) {
        const msgStatusText = newStatus === "Terverifikasi" 
          ? "TERVERIFIKASI & DITERIMA ✓\n\nSelamat! Berkas pendaftaran putra-putri Anda telah diverifikasi oleh panitia SPMB Yayasan Yasyfi. Silakan pantau portal untuk informasi langkah selanjutnya."
          : newStatus === "Ditolak"
          ? "DITOLAK ✗\n\nMohon maaf, berkas pendaftaran Anda ditolak atau belum memenuhi persyaratan panitia. Silakan hubungi admin panitia Yayasan Yasyfi untuk informasi kelengkapan berkas lebih lanjut."
          : "BARU / DALAM ANTRIAN\n\nBerkas pendaftaran Anda saat ini berstatus baru dan sedang dalam antrean peninjauan oleh panitia.";

        const messageText = `Yth. Orang Tua/Wali dari ${student.nama},

Pemberitahuan dari Portal Penerimaan Peserta Didik Baru (PPDB/SPMB) Yayasan Yasyfi.
Status pendaftaran putra-putri Anda dengan No. Registrasi: *${student.noDaftar}* telah diperbarui menjadi:

Status: *${newStatus.toUpperCase()}*

Keterangan:
${msgStatusText}

Terima kasih atas perhatian Anda.
--
Panitia SPMB Yayasan Yasyfi`;

        const targetWa = student.noWA.replace(/\D/g, "").replace(/^0/, "62");
        fetch(waSettings.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": waSettings.token
          },
          body: JSON.stringify({
            target: targetWa,
            message: messageText
          })
        })
        .then(res => {
          if (res.ok) {
            triggerAlert("success", `Status siswa ${noDaftar} diubah menjadi ${newStatus} & notifikasi WA otomatis dikirim ke pendaftar!`);
          } else {
            triggerAlert("success", `Status siswa ${noDaftar} diperbarui. Gagal mengirim WA (Status API Gateway tidak sukses).`);
          }
        })
        .catch(err => {
          console.error("Gagal mengirim notifikasi status via WA:", err);
          triggerAlert("success", `Status siswa ${noDaftar} diperbarui. Gagal menghubungi gateway WA.`);
        });
      } else {
        triggerAlert("success", `Status siswa ${noDaftar} berhasil diubah menjadi ${newStatus}. (Konfigurasi WA Gateway belum lengkap untuk notifikasi otomatis).`);
      }
    } else {
      triggerAlert("error", `Siswa dengan nomor ${noDaftar} tidak ditemukan.`);
    }
  };

  // Delete student registration
  const handleDeleteStudent = (noDaftar: string) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus data calon siswa dengan No. Registrasi ${noDaftar}?`)) {
      deleteDoc(doc(db, "pendaftar", noDaftar))
        .then(() => {
          // Close detail view if it's the deleted student
          if (currentDetailStudent?.noDaftar === noDaftar) {
            setCurrentDetailStudent(null);
          }
          triggerAlert("success", `Data pendaftar ${noDaftar} berhasil dihapus.`);
        })
        .catch((err: any) => {
          console.error("Gagal menghapus data calon siswa:", err);
          triggerAlert("error", `Gagal menghapus data calon siswa: ${err ? err.message || err : "Akses Ditolak"}`);
          try {
            handleFirestoreError(err, OperationType.DELETE, `pendaftar/${noDaftar}`);
          } catch (e) {
            // Silently caught to prevent unhandled promise rejection crash
          }
        });
    }
  };

  // Delete all student registrations (clear all dummy and existing data)
  const handleDeleteAllStudents = () => {
    if (pendaftarList.length === 0) {
      triggerAlert("info", "Database kosong. Tidak ada data pendaftar yang perlu dihapus.");
      return;
    }
    setIsConfirmDeleteAllOpen(true);
  };

  const executeDeleteAllStudents = () => {
    setIsConfirmDeleteAllOpen(false);
    const batch = writeBatch(db);
    pendaftarList.forEach((student) => {
      batch.delete(doc(db, "pendaftar", student.noDaftar));
    });

    batch.commit()
      .then(() => {
        setCurrentDetailStudent(null);
        triggerAlert("success", "Semua data calon siswa berhasil dibersihkan dari database (Fresh database).");
      })
      .catch((err: any) => {
        console.error("Gagal membersihkan database:", err);
        triggerAlert("error", `Gagal membersihkan database: ${err ? err.message || err : "Akses Ditolak"}`);
      });
  };

  // Helper to open or download uploaded/simulated files safely
  const handleViewFile = (fileObj: { name: string; mimeType: string; data: string }) => {
    // If the file data is stored as a direct link (e.g. Firebase Cloud Storage or Google Drive URL), open it in a new secure tab.
    if (fileObj.data && (fileObj.data.startsWith("http://") || fileObj.data.startsWith("https://"))) {
      try {
        const link = document.createElement("a");
        link.href = fileObj.data;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        const sourceName = fileObj.data.includes("drive.google.com") ? "Google Drive" : "Firebase Cloud Storage";
        triggerAlert("success", `Dokumen "${fileObj.name}" berhasil dibuka dari ${sourceName}.`);
        return;
      } catch (err) {
        console.error("Gagal membuka file cloud:", err);
        triggerAlert("error", "Gagal membuka berkas cloud.");
        return;
      }
    }

    let dataUri = "";
    if (!fileObj.data || fileObj.data === "placeholder_base64_data") {
      if (fileObj.mimeType.startsWith("image/")) {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
          <rect width="100%" height="100%" fill="#f8fafc"/>
          <rect x="20" y="20" width="560" height="360" rx="12" fill="none" stroke="#cbd5e1" stroke-width="2" stroke-dasharray="8 6"/>
          <text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="800" fill="#1e293b">PRATINJAU DOKUMEN PPDB</text>
          <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="600" fill="#3b82f6">${fileObj.name}</text>
          <text x="50%" y="65%" dominant-baseline="middle" text-anchor="middle" font-family="monospace" font-size="12" fill="#64748b">Format: ${fileObj.mimeType}</text>
          <text x="50%" y="75%" dominant-baseline="middle" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" fill="#94a3b8">Untuk mencoba dokumen nyata, silakan isi formulir pendaftaran baru & unggah berkas Anda.</text>
        </svg>`;
        dataUri = `data:image/svg+xml;base64,${btoa(svg)}`;
      } else {
        const txt = `PRATINJAU DOKUMEN PPDB YAYASAN ASSYAFIIYAH\r\n=========================================\r\nNama File: ${fileObj.name}\r\nTipe Berkas: ${fileObj.mimeType}\r\n\r\nBerkas tidak ditemukan atau belum terunggah dengan sempurna. Silakan periksa kembali sinkronisasi dengan penyimpanan Anda.`;
        dataUri = `data:text/plain;base64,${btoa(txt)}`;
      }
    } else {
      if (fileObj.data.startsWith("data:")) {
        dataUri = fileObj.data;
      } else {
        dataUri = `data:${fileObj.mimeType};base64,${fileObj.data}`;
      }
    }

    try {
      const link = document.createElement("a");
      link.href = dataUri;
      link.download = fileObj.name;
      // Also try opening in a new tab if it's fine-grained, otherwise download works perfectly
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      triggerAlert("success", `Dokumen "${fileObj.name}" berhasil diunduh / dibuka.`);
    } catch (e) {
      console.error(e);
      triggerAlert("error", "Gagal mengunduh berkas.");
    }
  };

  // Export active registrations to CSV
  const exportApplicantsToCSV = () => {
    if (filteredApplicants.length === 0) {
      triggerAlert("error", "Tidak ada data untuk diekspor.");
      return;
    }

    // Define CSV header
    const headers = [
      "No_Registrasi", "NIK", "NISN", "Nama_Lengkap", "Tempat_Lahir", "Tanggal_Lahir", 
      "Jenis_Kelamin", "Agama", "No_WA", "Alamat", "Asal_Sekolah", "Tahun_Lulus", 
      "Nama_Ayah", "Pekerjaan_Ayah", "Nama_Ibu", "Pekerjaan_Ibu", "Jenjang_Pilihan", "Status"
    ];

    const escapeCSV = (val: string | undefined | null) => {
      if (!val) return '""';
      let clean = val.toString().replace(/"/g, '""');
      return `"${clean}"`;
    };

    const rows = filteredApplicants.map(st => [
      escapeCSV(st.noDaftar),
      escapeCSV(st.nik),
      escapeCSV(st.nisn),
      escapeCSV(st.nama),
      escapeCSV(st.tempatLahir),
      escapeCSV(st.tglLahir),
      escapeCSV(st.jk),
      escapeCSV(st.agama),
      escapeCSV(st.noWA),
      escapeCSV(st.alamat),
      escapeCSV(st.asalSekolah),
      escapeCSV(st.tahunLulus),
      escapeCSV(st.namaAyah),
      escapeCSV(st.pekerjaanAyah),
      escapeCSV(st.namaIbu),
      escapeCSV(st.pekerjaanIbu),
      escapeCSV(st.jenjang),
      escapeCSV(st.status)
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const dateStr = new Date().toISOString().substring(0, 10);
    link.setAttribute("download", `Data_Siswa_Terdaftar_Yayasan_Assyafiiyah_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerAlert("success", "Pengeksporan file CSV berhasil diunduh.");
  };

  // Save modified public contents
  const saveModifiedContents = () => {
    const updatedContent: WebContent = {
      profil: editProfil,
      visimisi: editVisiMisi,
      hero_title: editHeroTitle,
      hero_subtitle: editHeroSubtitle,
      siswa_count: editSiswaCount,
      guru_count: editGuruCount,
      keunggulan: editKeunggulan,
      ekskul: editEkskul,
      prestasi: editPrestasi,
      galeri: editGaleri
    };

    setDoc(doc(db, "web_content", "config"), updatedContent)
      .then(() => {
        triggerAlert("success", "Kemajuan Konten Halaman Utama SPMB YASYFI berhasil diperbarui!");
      })
      .catch((err) => handleFirestoreError(err, OperationType.WRITE, "web_content/config"));
  };

  // Reset edited forms to defaults
  const resetEditorsToDefaults = () => {
    setEditProfil(initialWebContent.profil);
    setEditVisiMisi(initialWebContent.visimisi);
    setEditHeroTitle(initialWebContent.hero_title || "Penerimaan Peserta Didik Baru Terpadu");
    setEditHeroSubtitle(initialWebContent.hero_subtitle || "Selamat Datang di Portal Penerimaan Mahasiswa/Santri Baru (SPMB) Yayasan Yasyfi Tahun Ajaran 2026/2027. Daftarkan putra-putri terbaik Anda secara mandiri dengan praktis, aman, dan transparan.");
    setEditSiswaCount(initialWebContent.siswa_count || "147");
    setEditGuruCount(initialWebContent.guru_count || "40");
    setEditKeunggulan(initialWebContent.keunggulan);
    setEditEkskul(initialWebContent.ekskul);
    setEditPrestasi(initialWebContent.prestasi);
    setEditGaleri(initialWebContent.galeri);
    triggerAlert("info", "Form telah di-reset ke nilai bawaan. Harapan simpan perubahan jika setuju.");
  };

  // Save WA Settings
  const saveWaSettings = () => {
    const updatedWaSettings: WaSettings = {
      endpoint: apiEndpoint,
      token: apiToken,
      admin_wa: adminWa
    };

    setDoc(doc(db, "wa_settings", "config"), updatedWaSettings)
      .then(() => {
        triggerAlert("success", "Konfigurasi WhatsApp Gateway berhasil disimpan.");
      })
      .catch((err) => handleFirestoreError(err, OperationType.WRITE, "wa_settings/config"));
  };

  // Send WhatsApp notification to Admin
  const sendWaToAdmin = (student: Pendaftar) => {
    if (!waSettings.admin_wa) return;
    const adminNum = waSettings.admin_wa.replace(/\D/g, "");
    let dialNum = adminNum;
    if (dialNum.startsWith("0")) {
      dialNum = "62" + dialNum.substring(1);
    }
    const namaWali = student.namaAyah || student.namaIbu || "-";
    const totalCount = pendaftarList.length;
    
    const msg = `Nama Siswa : ${student.nama}
Nama wali : ${namaWali}
Alamat : ${student.alamat}
Sekolah Asal : ${student.asalSekolah}
jumlah siswa yang mendaftar (sesuai jumlah siswa yang menyelesaikan pendaftaran di portal SMPB): ${totalCount}`;

    window.open(`https://wa.me/${dialNum}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  // Send WhatsApp Broadcast
  const handleSendBroadcast = async () => {
    if (!broadcastMessage.trim()) {
      triggerAlert("error", "Isi pesan broadcast tidak boleh kosong!");
      return;
    }

    const targetList = broadcastTarget === "filtered" ? filteredApplicants : pendaftarList;

    if (targetList.length === 0) {
      triggerAlert("error", "Tidak ada data pendaftar yang terpilih sebagai penerima.");
      return;
    }

    setIsSendingBroadcast(true);

    if (waSettings.endpoint && waSettings.token) {
      let successCount = 0;
      let failCount = 0;

      // Send requests in batches or concurrently
      const promises = targetList.map(async (student) => {
        try {
          const targetWa = student.noWA.replace(/\D/g, "").replace(/^0/, "62");
          const res = await fetch(waSettings.endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": waSettings.token
            },
            body: JSON.stringify({
              target: targetWa,
              message: broadcastMessage
            })
          });
          if (res.ok) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (err) {
          console.error(`Gagal mengirim broadcast ke ${student.nama} (${student.noWA}):`, err);
          failCount++;
        }
      });

      await Promise.all(promises);
      setIsSendingBroadcast(false);

      if (failCount === 0) {
        triggerAlert("success", `Siaran berhasil dikirim via Gateway ke seluruh ${successCount} pendaftar.`);
        setBroadcastMessage("");
      } else {
        triggerAlert("info", `Siaran selesai diproses: ${successCount} berhasil terkirim, ${failCount} gagal (periksa kecocokan API & koneksi).`);
        setBroadcastMessage("");
      }
    } else {
      // Simulate dispatch
      setTimeout(() => {
        setIsSendingBroadcast(false);
        triggerAlert("error", `Pesan siaran belum dapat dikirimkan. Harap konfigurasikan API Gateway WhatsApp pada menu Sinkronisasi Terpadu.`);
        setBroadcastMessage("");
      }, 1500);
    }
  };

  // Filter & Search applicants list
  const filteredApplicants = pendaftarList.filter(student => {
    const matchSearch = 
      student.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.nisn.includes(searchQuery) ||
      student.noDaftar.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.asalSekolah.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchStatus = statusFilter === "All" || student.status === statusFilter;
    const matchJenjang = jenjangFilter === "All" || student.jenjang === jenjangFilter;

    return matchSearch && matchStatus && matchJenjang;
  });

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-800 font-sans selection:bg-emerald-600 selection:text-white">
      
      {/* GLOBAL TOAST DYNAMIC HEADER */}
      <AnimatePresence>
        {customAlert && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-5 left-1/2 -tranzinc-x-1/2 z-[150000] max-w-md w-[90%]"
            id="toast-notification"
          >
            <div className={`flex items-center gap-3 p-4 rounded-2xl shadow-[0_12px_40px_rgb(0,0,0,0.08)] border ${
              customAlert.type === "success" 
                ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                : customAlert.type === "error" 
                ? "bg-rose-50 border-rose-200 text-rose-800" 
                : "bg-emerald-50 border-emerald-200 text-emerald-800"
            }`}>
              {customAlert.type === "success" && <CheckCircle className="h-6 w-6 stroke-[2.5]" />}
              {customAlert.type === "error" && <AlertCircle className="h-6 w-6 stroke-[2.5]" />}
              {customAlert.type === "info" && <Info className="h-6 w-6 stroke-[2.5]" />}
              <div className="flex-1 text-sm font-medium">{customAlert.message}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER NAVBAR */}
      <nav id="navbar-main" className="sticky top-0 z-50 bg-white/70 backdrop-blur-md border-b border-zinc-100 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo/Icon */}
            <div 
              id="nav-logo" 
              className="flex items-center gap-3.5 cursor-pointer group"
              onClick={() => setCurrentView("landing")}
            >
              <div className="bg-gradient-to-br from-emerald-600 via-emerald-600 to-teal-700 text-white p-2.5 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.05)] shadow-emerald-500/15 group-hover:scale-[1.03] active:scale-[0.97] transition duration-200">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div className="space-y-0.5">
                <h1 className="text-xl font-bold font-display tracking-tight text-zinc-900 group-hover:text-emerald-600 transition duration-200">
                  SPMB <span className="text-emerald-600 font-extrabold">YASYFI</span>
                </h1>
                <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold font-mono">
                  SISTEM PENERIMAAN MURID BARU TA 2026/2027
                </p>
              </div>
            </div>

            {/* Nav controls */}
            <div className="flex items-center gap-3">
              <button
                id="btn-nav-home"
                onClick={() => setCurrentView("landing")}
                className={`px-4.5 py-2.5 text-xs font-bold rounded-2xl transition duration-200 ${
                  currentView === "landing"
                    ? "bg-emerald-50/80 text-emerald-700 border border-emerald-100/50"
                    : "text-zinc-600 hover:bg-zinc-100/80"
                }`}
              >
                Halaman Depan
              </button>

              {isAdminLoggedIn ? (
                <div className="flex items-center gap-2">
                  <button
                    id="btn-nav-admin"
                    onClick={() => setCurrentView("admin")}
                    className={`px-4.5 py-2.5 text-xs font-bold rounded-2xl transition duration-200 ${
                      currentView === "admin"
                        ? "bg-zinc-900 text-white shadow-[0_4px_20px_rgb(0,0,0,0.05)] shadow-zinc-950/20"
                        : "bg-zinc-100 text-zinc-850 hover:bg-zinc-200/80"
                    }`}
                  >
                    Dashboard Admin
                  </button>
                  <button
                    id="btn-nav-logout"
                    onClick={processLogout}
                    className="p-2.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-2xl transition"
                    title="Keluar Admin"
                  >
                    <LogOut className="h-4.5 w-4.5" />
                  </button>
                </div>
              ) : (
                <button
                  id="btn-nav-login"
                  onClick={() => setIsLoginModalOpen(true)}
                  className="bg-zinc-900 hover:bg-zinc-850 text-white px-4 py-2.5 text-xs font-bold rounded-2xl transition flex items-center gap-2 shadow-sm"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  <span>Akses Admin</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* COVER BG FOR DECORATION */}
      <div className="relative overflow-hidden w-full h-[5px] bg-gradient-to-r from-emerald-600 via-teal-600 to-teal-700"></div>

      {/* ===================== VIEW: PUBLIC LANDING & FORM ===================== */}
      <AnimatePresence mode="wait">
        {currentView === "landing" && (
          <motion.div
            key="landing-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="w-full pb-24"
          >
            {/* HERO SECTION */}
            <div id="hero-section" className="relative overflow-hidden bg-zinc-900 text-white pt-24 pb-36">
              {/* Radial background gradient */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-emerald-950/20 via-zinc-950 to-zinc-950 pointer-events-none"></div>
              
              {/* Technical subtle grid lines */}
              <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>
              
              {/* Absolutes/Glows */}
              <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full filter blur-3xl pointer-events-none"></div>
              <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-teal-500/10 rounded-full filter blur-3xl pointer-events-none"></div>
              
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                  <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
                    <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-1.5 rounded-full text-xs font-bold font-mono uppercase tracking-wider">
                      <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                      SPMB YASYFI Portal Integrasi
                    </div>
                    <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold font-display leading-[1.1] text-white tracking-tight">
                      {webContent.hero_title || "Penerimaan Peserta Didik Baru Terpadu"}
                    </h2>
                    <p className="text-sm sm:text-base lg:text-lg text-zinc-300 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                      {webContent.hero_subtitle || "Selamat Datang di Portal Penerimaan Mahasiswa/Santri Baru (SPMB) Yayasan Yasyfi Tahun Ajaran 2026/2027. Daftarkan putra-putri terbaik Anda secara mandiri dengan praktis, aman, dan transparan."}
                    </p>
                    <div className="pt-4 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                      <a
                        href="#form-section-card"
                        className="w-full sm:w-auto text-center bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 text-white font-bold px-8 py-4 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300 transform hover:-translate-y-1 hover:shadow-[0_12px_40px_rgb(0,0,0,0.2)]"
                        id="btn-hero-register"
                      >
                        Mulai Registrasi Mandiri <ChevronRight className="inline h-4 w-4 ml-1 align-middle stroke-[2.5]" />
                      </a>
                      <a
                        href="#profile-grid-section"
                        className="w-full sm:w-auto text-center border border-white/10 hover:bg-white/10 text-white font-bold px-8 py-4 rounded-3xl transition duration-200"
                        id="btn-hero-info"
                      >
                        Informasi Lembaga
                      </a>
                    </div>
                  </div>

                  {/* Elegant Glassmorphic floating cards */}
                  <div className="lg:col-span-5 grid grid-cols-2 gap-4">
                    <div className="bg-white/[0.02] backdrop-blur-md border border-white/[0.06] p-6 rounded-[2rem] hover:bg-white/[0.04] hover:border-white/[0.12] transition duration-300 shadow-[0_12px_40px_rgb(0,0,0,0.08)] flex flex-col justify-between h-40">
                      <div className="h-10 w-10 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.15)] mb-4">
                        <Users className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-3xl font-extrabold font-display text-white tracking-tight">{webContent.siswa_count || "147"}</h4>
                        <p className="text-[10px] text-zinc-400 mt-1 uppercase font-bold tracking-wider font-mono">Siswa Terdaftar</p>
                      </div>
                    </div>
                    
                    <div className="bg-white/[0.02] backdrop-blur-md border border-white/[0.06] p-6 rounded-[2rem] hover:bg-white/[0.04] hover:border-white/[0.12] transition duration-300 shadow-[0_12px_40px_rgb(0,0,0,0.08)] flex flex-col justify-between h-40">
                      <div className="h-10 w-10 bg-teal-500/10 text-teal-400 rounded-2xl flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.15)] mb-4">
                        <GraduationCap className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-3xl font-extrabold font-display text-white tracking-tight">{webContent.guru_count || "40"}</h4>
                        <p className="text-[10px] text-zinc-400 mt-1 uppercase font-bold tracking-wider font-mono">Tenaga Pendidik</p>
                      </div>
                    </div>

                    <div className="bg-white/[0.02] backdrop-blur-md border border-white/[0.06] p-6 rounded-[2rem] hover:bg-white/[0.04] hover:border-white/[0.12] transition duration-300 col-span-2 flex items-center gap-4 shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
                      <div className="h-12 w-12 bg-amber-500/10 rounded-3xl flex items-center justify-center text-amber-400 shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                        <Activity className="h-5.5 w-5.5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-zinc-100 uppercase tracking-wide font-mono">Proses Seleksi Real-time</h4>
                        <p className="text-zinc-400 text-[11px] mt-0.5 leading-relaxed">Pendaftaran cepat, terarah, dan notifikasi langsung dikirim ke WhatsApp admin.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Angle separator */}
              <div className="absolute bottom-0 left-0 right-0 h-16 bg-zinc-50" style={{ clipPath: "polygon(0 100%, 100% 100%, 100% 0)" }}></div>
            </div>

            {/* MAIN SECTIONS: CORE DYNAMIC CONTENT */}
            <div id="profile-grid-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-20 space-y-20">
              
              {/* Profil & Visi Misi */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Profile Card */}
                <div id="card-profil-sekolah" className="bg-white p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.06)] shadow-zinc-150/50 border border-zinc-100/80 hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] hover:-tranzinc-y-1 transition duration-300">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-3xl border border-emerald-100/50">
                      <Building2 className="h-5.5 w-5.5" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold tracking-tight text-zinc-900 font-display">Profil Lembaga</h3>
                      <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Yayasan Assyafiiyah</p>
                    </div>
                  </div>
                  <p className="text-zinc-650 leading-relaxed whitespace-pre-line text-justify text-xs sm:text-sm">
                    {webContent.profil}
                  </p>
                </div>

                {/* Visi Misi Card */}
                <div id="card-visi-misi" className="bg-white p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.06)] shadow-zinc-150/50 border border-zinc-100/80 hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] hover:-tranzinc-y-1 transition duration-300">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-3xl border border-emerald-100/50">
                      <Target className="h-5.5 w-5.5" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold tracking-tight text-zinc-900 font-display">Visi & Misi</h3>
                      <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Amanah & Kompeten</p>
                    </div>
                  </div>

                  <div className="text-zinc-655 leading-relaxed text-xs sm:text-sm border-l-4 border-emerald-500 pl-4 bg-emerald-50/20 py-4 px-3 rounded-r-2xl h-[230px] overflow-y-auto scrollbar-thin">
                    <p className="whitespace-pre-line leading-relaxed pb-2">{webContent.visimisi}</p>
                  </div>
                </div>
              </div>

              {/* Keunggulan & Prestasi */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Keunggulan */}
                <div id="card-keunggulan" className="lg:col-span-5 bg-white p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.06)] shadow-zinc-150/50 border border-zinc-100/85 space-y-6">
                  <h3 className="text-xl font-bold tracking-tight text-zinc-900 font-display border-b border-zinc-100 pb-4 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-amber-500" /> Keunggulan Utama
                  </h3>
                  <ul className="space-y-4">
                    {webContent.keunggulan.split("\n").filter(item => item.trim() !== "").map((item, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-zinc-750 hover:text-zinc-950 transition duration-150">
                        <div className="mt-1 bg-emerald-100 text-emerald-800 p-1 rounded-full shrink-0">
                          <Check className="h-2.5 w-2.5 stroke-[3.5]" />
                        </div>
                        <span className="text-xs sm:text-sm font-semibold">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Prestasi */}
                <div id="card-prestasi" className="lg:col-span-7 bg-white p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.06)] shadow-zinc-150/50 border border-zinc-100/85 space-y-6">
                  <h3 className="text-xl font-bold tracking-tight text-zinc-900 font-display border-b border-zinc-100 pb-4 flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-amber-500" /> Prestasi Terkini
                  </h3>
                  <ul className="space-y-3">
                    {webContent.prestasi.split("\n").filter(item => item.trim() !== "").map((item, idx) => (
                      <li key={idx} className="flex items-start gap-4 p-3 hover:bg-zinc-50/60 rounded-2xl border border-transparent hover:border-zinc-100/60 transition duration-200">
                        <div className="bg-amber-100 text-amber-800 p-2.5 rounded-2xl shrink-0 flex items-center justify-center">
                          <Trophy className="h-4 w-4" />
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-zinc-850 font-bold text-xs sm:text-sm uppercase tracking-tight">{item}</p>
                          <p className="text-[10px] text-zinc-400 font-mono font-semibold">Kategori Penghargaan Kelembagaan</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Ekstrakurikuler Tags */}
              <div id="ekskul-section" className="text-center space-y-6">
                <div className="space-y-1">
                  <h3 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-zinc-900">Program Ekstrakurikuler</h3>
                  <p className="text-xs sm:text-sm text-zinc-500 max-w-xl mx-auto">Wadah optimal pengembangan minat, bakat kreatif, bela diri, kepanduan, dan seni islami siswa.</p>
                </div>
                <div className="flex flex-wrap justify-center gap-2.5 max-w-4xl mx-auto font-sans">
                  {webContent.ekskul.split("\n").filter(item => item.trim() !== "").map((item, idx) => (
                    <div 
                      key={idx}
                      className="bg-white border border-zinc-200/80 px-4.5 py-2.5 rounded-3xl hover:border-emerald-400 hover:shadow-[0_4px_20px_rgb(0,0,0,0.05)] transition duration-200 flex items-center gap-2 text-zinc-700 text-xs font-bold font-sans"
                    >
                      <Activity className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Galeri Kegiatan */}
              <div id="galeri-section" className="space-y-6">
                <div className="text-center space-y-1 font-sans">
                  <h3 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-zinc-900">Momen & Dokumentasi Kegiatan</h3>
                  <p className="text-xs sm:text-sm text-zinc-500 max-w-xl mx-auto">Galeri kegiatan harian santri, proses pembelajaran interaktif, dan ketersediaan fasilitas penunjang.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                  {webContent.galeri.split("\n").filter(url => url.trim() !== "").map((url, idx) => (
                    <div 
                      key={idx}
                      className="group relative overflow-hidden rounded-[2rem] aspect-square shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-zinc-200/60 bg-zinc-100"
                    >
                      <img 
                        src={url.trim()} 
                        alt={`Galeri ${idx + 1}`} 
                        className="w-full h-full object-cover transition duration-500 group-hover:scale-105"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1577896851231-70ef18881754?w=500&q=80`;
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/85 to-transparent opacity-0 group-hover:opacity-100 transition duration-300 flex items-end p-5">
                        <p className="text-white text-xs font-bold flex items-center gap-2">
                          <ImageIcon className="h-4 w-4" /> Dokumentasi Kegiatan {idx + 1}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* FORMULIR PENDAFTARAN WITH TABS WORKFLOW */}
              <div id="form-section-card" className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-zinc-200/85 overflow-hidden max-w-4xl mx-auto scroll-mt-24">
                {/* Form header Banner */}
                <div className="bg-[#0a0a0a] text-white p-8 sm:p-10 border-b border-white/5 relative overflow-hidden">
                  {/* Subtle modern textures */}
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.15),_transparent_50%)]"></div>
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDIiLz4KPC9zdmc+')] opacity-20"></div>
                  <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/20 rounded-full filter blur-[64px] pointer-events-none"></div>
                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
      <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono tracking-wider px-3 py-1 rounded-full font-bold uppercase">
        Pengisian Formulir Pendaftaran
      </span>
                      <h3 className="text-2xl font-bold font-display tracking-tight text-white mt-2">
                        Formulir Registrasi Mandiri Siswa
                      </h3>
                      <p className="text-zinc-400 text-xs mt-1">
                        Isilah seluruh isian di bawah ini berdasarkan dokumen otentik seperti Akta Kelahiran dan KK.
                      </p>
                    </div>
                    {/* Step indicator */}
                    <div className="flex items-center gap-1.5 bg-white/5 backdrop-blur-xl p-1.5 rounded-full border border-white/10 self-start md:self-auto uppercase text-[10px] font-mono tracking-wider font-semibold shadow-inner">
                      <span className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300 ${formStep === 1 ? "bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]" : "text-zinc-500 hover:text-zinc-300"}`}>1</span>
                      <span className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300 ${formStep === 2 ? "bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]" : "text-zinc-500 hover:text-zinc-300"}`}>2</span>
                      <span className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300 ${formStep === 3 ? "bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]" : "text-zinc-500 hover:text-zinc-300"}`}>3</span>
                      <span className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300 ${formStep === 4 ? "bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]" : "text-zinc-500 hover:text-zinc-300"}`}>4</span>
                    </div>
                  </div>
                </div>

                {/* FORM CONTROLLER */}
                <form id="ppdb-enrollment-form" onSubmit={handleFormSubmit} className="p-8 overflow-hidden">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={formStep}
                      initial={{ opacity: 0, x: 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -24 }}
                      transition={{ duration: 0.28, ease: "easeInOut" }}
                      className="space-y-8"
                    >
                      {/* STEP 1: DATA PRIBADI */}
                      {formStep === 1 && (
                    <div className="space-y-6">
                      <div className="border-b border-zinc-100 pb-3">
                        <h4 className="text-lg font-bold text-zinc-800 flex items-center gap-2">
                          <User className="h-5 w-5 text-emerald-600" /> Langkah 1: Data Diri Calon Siswa
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2 shadow-[0_2px_15px_rgb(0,0,0,0.02)] border border-emerald-100/60 p-4 rounded-2xl bg-emerald-50/10 backdrop-blur-sm mb-2">
                          <label className="block text-xs font-extrabold text-emerald-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white text-[11px] font-mono">1</span>
                            Jenjang Pendidikan yang Dituju <span className="text-rose-500">*</span>
                          </label>
                          <select 
                            required
                            value={formData.jenjang}
                            onChange={(e) => setFormData({ ...formData, jenjang: e.target.value })}
                            className="w-full text-sm font-semibold border border-zinc-300 rounded-2xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white"
                            id="select-jenjang"
                          >
                            <option value="">-- Pilih Jenjang Pendidikan --</option>
                            <option value="MADIN">1. MADIN (Madrasah Diniyah)</option>
                            <option value="PAUD">2. PAUD (Pendidikan Anak Usia Dini)</option>
                            <option value="SMPI">3. SMPI (Sekolah Menengah Pertama Islam)</option>
                            <option value="SMAI">4. SMAI (Sekolah Menengah Atas Islam)</option>
                          </select>
                          <p className="text-[10px] text-zinc-500 mt-1.5">
                            *Khusus jenjang <span className="font-bold text-emerald-600">MADIN</span>, pengisian <span className="font-semibold text-zinc-700">NISN</span> dan <span className="font-semibold text-zinc-700">NPSN</span> sekolah bersifat <span className="font-bold text-emerald-600 uppercase">Tidak Wajib / Opsional</span>.
                          </p>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-zinc-700 uppercase tracking-tight mb-1">
                            Nomor Induk Siswa Nasional (NISN) {formData.jenjang !== "MADIN" && <span className="text-rose-500">*</span>}
                          </label>
                          <input 
                            type="text" 
                            maxLength={10}
                            required={formData.jenjang !== "MADIN"}
                            placeholder={formData.jenjang === "MADIN" ? "Opsional (Tidak Wajib)" : "NISN wajib 10 digit"}
                            value={formData.nisn}
                            onChange={(e) => setFormData({ ...formData, nisn: e.target.value })}
                            inputMode="numeric"
                            className="w-full text-zinc-900 text-sm border border-zinc-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-all duration-200 hover:border-zinc-300"
                            id="input-nisn"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-zinc-700 uppercase tracking-tight mb-1">
                            NIK Calon Siswa <span className="text-rose-500">*</span>
                          </label>
                          <input 
                            type="text" 
                            maxLength={16}
                            required
                            placeholder="Sesuai Kartu Keluarga (16 digit)"
                            value={formData.nik}
                            onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
                            inputMode="numeric"
                            className="w-full text-zinc-900 text-sm border border-zinc-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-all duration-200 hover:border-zinc-300"
                            id="input-nik"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-xs font-bold text-zinc-700 uppercase tracking-tight mb-1">
                            Nama Lengkap Calon Siswa <span className="text-rose-500">*</span>
                          </label>
                          <input 
                            type="text" 
                            required
                            placeholder="Tuliskan Sesuai Akta Kelahiran"
                            value={formData.nama}
                            onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                            className="w-full text-zinc-900 text-sm border border-zinc-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-all duration-200 hover:border-zinc-300 uppercase"
                            id="input-nama"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-zinc-700 uppercase tracking-tight mb-1">
                            Tempat Lahir <span className="text-rose-500">*</span>
                          </label>
                          <input 
                            type="text" 
                            required
                            placeholder="Kota / Kabupaten"
                            value={formData.tempatLahir}
                            onChange={(e) => setFormData({ ...formData, tempatLahir: e.target.value })}
                            className="w-full text-sm border border-zinc-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-all duration-200 hover:border-zinc-300"
                            id="input-tempat-lahir"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-zinc-700 uppercase tracking-tight mb-1">
                            Tanggal Lahir <span className="text-rose-500">*</span>
                          </label>
                          <input 
                            type="date" 
                            required
                            value={formData.tglLahir}
                            onChange={(e) => setFormData({ ...formData, tglLahir: e.target.value })}
                            className="w-full text-sm border border-zinc-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-all duration-200 hover:border-zinc-300"
                            id="input-tanggal-lahir"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-zinc-700 uppercase tracking-tight mb-1">
                            Jenis Kelamin <span className="text-rose-500">*</span>
                          </label>
                          <select 
                            required
                            value={formData.jk}
                            onChange={(e) => setFormData({ ...formData, jk: e.target.value })}
                            className="w-full text-sm border border-zinc-300 rounded-2xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-zinc-50/50"
                            id="select-jk"
                          >
                            <option value="">-- Pilih Jenis Kelamin --</option>
                            <option value="Laki-laki">Laki-laki</option>
                            <option value="Perempuan">Perempuan</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-zinc-700 uppercase tracking-tight mb-1">
                            Agama <span className="text-rose-500">*</span>
                          </label>
                          <select 
                            required
                            value={formData.agama}
                            onChange={(e) => setFormData({ ...formData, agama: e.target.value })}
                            className="w-full text-sm border border-zinc-300 rounded-2xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-zinc-50/50"
                            id="select-agama"
                          >
                            <option value="">-- Pilih Agama --</option>
                            <option value="Islam">Islam</option>
                            <option value="Kristen">Kristen</option>
                            <option value="Katolik">Katolik</option>
                            <option value="Hindu">Hindu</option>
                            <option value="Buddha">Buddha</option>
                            <option value="Konghucu">Konghucu</option>
                          </select>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-xs font-bold text-zinc-700 uppercase tracking-tight mb-1">
                            Alamat Rumah Lengkap <span className="text-rose-500">*</span>
                          </label>
                          <input 
                            type="text" 
                            required
                            placeholder="Jl. Nama Jalan / Blok Perumahan / No. Rumah"
                            value={formData.alamat}
                            onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                            className="w-full text-sm border border-zinc-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-all duration-200 hover:border-zinc-300"
                            id="input-alamat"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-zinc-700 uppercase tracking-tight mb-1">
                              RT / RW <span className="text-rose-500">*</span>
                            </label>
                            <input 
                              type="text" 
                              required
                              placeholder="001/002"
                              value={formData.rtrw}
                              onChange={(e) => setFormData({ ...formData, rtrw: e.target.value })}
                              className="w-full text-sm border border-zinc-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-all duration-200 hover:border-zinc-300 bg-white text-center bg-zinc-50/50"
                              id="input-rtrw"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-zinc-700 uppercase tracking-tight mb-1">
                              Dusun/Kampung <span className="text-rose-500">*</span>
                            </label>
                            <input 
                              type="text" 
                              required
                              placeholder="Nama Dusun"
                              value={formData.dusun}
                              onChange={(e) => setFormData({ ...formData, dusun: e.target.value })}
                              className="w-full text-sm border border-zinc-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-all duration-200 hover:border-zinc-300"
                              id="input-dusun"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3 sm:col-span-2">
                          <div className="col-span-1">
                            <label className="block text-xs font-bold text-zinc-700 uppercase tracking-tight mb-1">
                              Kelurahan/Desa <span className="text-rose-500">*</span>
                            </label>
                            <input 
                              type="text" 
                              required
                              placeholder="Kelurahan"
                              value={formData.desa}
                              onChange={(e) => setFormData({ ...formData, desa: e.target.value })}
                              className="w-full text-sm border border-zinc-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-all duration-200 hover:border-zinc-300"
                              id="input-desa"
                            />
                          </div>
                          <div className="col-span-1">
                            <label className="block text-xs font-bold text-zinc-700 uppercase tracking-tight mb-1">
                              Kecamatan <span className="text-rose-500">*</span>
                            </label>
                            <input 
                              type="text" 
                              required
                              placeholder="Kecamatan"
                              value={formData.kecamatan}
                              onChange={(e) => setFormData({ ...formData, kecamatan: e.target.value })}
                              className="w-full text-sm border border-zinc-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-all duration-200 hover:border-zinc-300"
                              id="input-kecamatan"
                            />
                          </div>
                          <div className="col-span-1">
                            <label className="block text-xs font-bold text-zinc-700 uppercase tracking-tight mb-1">
                              Kode Pos <span className="text-rose-500">*</span>
                            </label>
                            <input 
                              type="text" 
                              required
                              maxLength={5}
                              placeholder="5 Digit"
                              value={formData.kodepos}
                              onChange={(e) => setFormData({ ...formData, kodepos: e.target.value })}
                              inputMode="numeric"
                              className="w-full text-zinc-900 text-sm border border-zinc-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-all duration-200 hover:border-zinc-300"
                              id="input-kodepos"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            const isMadin = formData.jenjang === "MADIN";
                            const isNisnValid = isMadin || formData.nisn.trim() !== "";
                            if (!isNisnValid || !formData.nik || !formData.nama || !formData.tempatLahir || !formData.tglLahir || !formData.jk || !formData.agama || !formData.alamat || !formData.rtrw || !formData.desa || !formData.kecamatan || !formData.jenjang) {
                              triggerAlert("error", "Harap isi semua form bertanda bintang (*)");
                              return;
                            }
                            setFormStep(2);
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-2xl transition duration-250 inline-flex items-center gap-2"
                        >
                          Lanjut: Orang Tua <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP 2: DATA ORANG TUA / WALI */}
                  {formStep === 2 && (
                    <div className="space-y-6">
                      <div className="border-b border-zinc-100 pb-3">
                        <h4 className="text-lg font-bold text-zinc-800 flex items-center gap-2">
                          <Users className="h-5 w-5 text-emerald-600" /> Langkah 2: Orang Tua / Wali Calon Siswa
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-zinc-700 uppercase tracking-tight mb-1">
                            Nama Ayah / Wali <span className="text-rose-500">*</span>
                          </label>
                          <input 
                            type="text" 
                            required
                            placeholder="Nama Ayah Kandung atau Wali"
                            value={formData.namaAyah}
                            onChange={(e) => setFormData({ ...formData, namaAyah: e.target.value })}
                            className="w-full text-sm border border-zinc-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-all duration-200 hover:border-zinc-300"
                            id="input-nama-ayah"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-zinc-700 uppercase tracking-tight mb-1">
                            Nama Ibu Kandung <span className="text-rose-500">*</span>
                          </label>
                          <input 
                            type="text" 
                            required
                            placeholder="Nama Ibu Kandung Resmi"
                            value={formData.namaIbu}
                            onChange={(e) => setFormData({ ...formData, namaIbu: e.target.value })}
                            className="w-full text-sm border border-zinc-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-all duration-200 hover:border-zinc-300"
                            id="input-nama-ibu"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-xs font-bold text-zinc-700 uppercase tracking-tight mb-1">
                            NIK Orang Tua / Wali <span className="text-rose-500">*</span>
                          </label>
                          <input 
                            type="text" 
                            maxLength={16}
                            required
                            placeholder="NIK Ayah/Wali (16 digit)"
                            value={formData.nikOrtu}
                            onChange={(e) => setFormData({ ...formData, nikOrtu: e.target.value })}
                            inputMode="numeric"
                            className="w-full text-zinc-900 text-sm border border-zinc-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-all duration-200 hover:border-zinc-300"
                            id="input-nik-ortu"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-zinc-700 uppercase tracking-tight mb-1">
                            Pekerjaan Utama <span className="text-rose-500">*</span>
                          </label>
                          <input 
                            type="text" 
                            required
                            placeholder="Jenis Pekerjaan Utama"
                            value={formData.pekerjaan}
                            onChange={(e) => setFormData({ ...formData, pekerjaan: e.target.value })}
                            className="w-full text-sm border border-zinc-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-all duration-200 hover:border-zinc-300"
                            id="input-pekerjaan"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-zinc-700 uppercase tracking-tight mb-1">
                            Rentang Penghasilan Bulanan <span className="text-rose-500">*</span>
                          </label>
                          <select 
                            required
                            value={formData.penghasilan}
                            onChange={(e) => setFormData({ ...formData, penghasilan: e.target.value })}
                            className="w-full text-sm border border-zinc-300 rounded-2xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-zinc-50/50"
                            id="select-penghasilan"
                          >
                            <option value="">-- Pilih Rentang --</option>
                            <option value="< 1 Juta">&lt; 1 Juta</option>
                            <option value="1 Juta - 3 Juta">1 Juta - 3 Juta</option>
                            <option value="3 Juta - 5 Juta">3 Juta - 5 Juta</option>
                            <option value="> 5 Juta">&gt; 5 Juta</option>
                          </select>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-xs font-bold text-zinc-700 uppercase tracking-tight mb-1">
                            Nomor WhatsApp Aktif <span className="text-rose-500">*</span>
                          </label>
                          <div className="p-2 mb-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center gap-2">
                            <Smartphone className="h-4 w-4 stroke-[2.5] text-emerald-600" />
                            <span>Panitia akan mengabari info status kelulusan otomatis ke nomor ini.</span>
                          </div>
                          <input 
                            type="text" 
                            required
                            placeholder="08xxxxxxxxxx"
                            value={formData.noWA}
                            onChange={(e) => setFormData({ ...formData, noWA: e.target.value })}
                            inputMode="numeric"
                            className="w-full text-zinc-900 text-sm border border-zinc-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-all duration-200 hover:border-zinc-300 font-mono"
                            id="input-nowa"
                          />
                        </div>
                      </div>

                      <div className="pt-4 flex justify-between">
                        <button
                          type="button"
                          onClick={() => setFormStep(1)}
                          className="border border-zinc-300 hover:bg-zinc-50 text-zinc-700 font-bold px-6 py-3 rounded-2xl transition inline-flex items-center gap-2"
                        >
                          Sebelumnya
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!formData.namaAyah || !formData.namaIbu || !formData.nikOrtu || !formData.pekerjaan || !formData.penghasilan || !formData.noWA) {
                              triggerAlert("error", "Harap isi semua form bertanda bintang (*)");
                              return;
                            }
                            setFormStep(3);
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-2xl transition duration-250 inline-flex items-center gap-2"
                        >
                          Lanjut: Asal Sekolah <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP 3: DATA ASAL SEKOLAH */}
                  {formStep === 3 && (
                    <div className="space-y-6">
                      <div className="border-b border-zinc-100 pb-3">
                        <h4 className="text-lg font-bold text-zinc-800 flex items-center gap-2">
                          <Building2 className="h-5 w-5 text-emerald-600" /> Langkah 3: Riwayat Asal Sekolah
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-bold text-zinc-700 uppercase tracking-tight mb-1">
                            Nama Sekolah Asal <span className="text-rose-500">*</span>
                          </label>
                          <input 
                            type="text" 
                            required
                            placeholder="Contoh: SMP Negeri 3 Kota Baru"
                            value={formData.asalSekolah}
                            onChange={(e) => setFormData({ ...formData, asalSekolah: e.target.value })}
                            className="w-full text-sm border border-zinc-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-all duration-200 hover:border-zinc-300"
                            id="input-asal-sekolah"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-zinc-700 uppercase tracking-tight mb-1">
                            Tahun Lulus <span className="text-rose-500">*</span>
                          </label>
                          <input 
                            type="number" 
                            required
                            min={2020}
                            max={2030}
                            placeholder="2026"
                            value={formData.tahunLulus}
                            onChange={(e) => setFormData({ ...formData, tahunLulus: e.target.value })}
                            className="w-full text-sm border border-zinc-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-all duration-200 hover:border-zinc-300"
                            id="input-tahun-lulus"
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label className="block text-xs font-bold text-zinc-700 uppercase tracking-tight mb-1">
                            NPSN Sekolah Asal {formData.jenjang !== "MADIN" && <span className="text-rose-500">*</span>}
                          </label>
                          <input 
                            type="text" 
                            maxLength={8}
                            required={formData.jenjang !== "MADIN"}
                            placeholder={formData.jenjang === "MADIN" ? "Opsional (Tidak Wajib)" : "8 Digit NPSN Sekolah Asal"}
                            value={formData.npsn}
                            onChange={(e) => setFormData({ ...formData, npsn: e.target.value })}
                            inputMode="numeric"
                            className="w-full text-zinc-900 text-sm border border-zinc-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-all duration-200 hover:border-zinc-300"
                            id="input-npsn"
                          />
                        </div>
                      </div>

                      <div className="pt-4 flex justify-between">
                        <button
                          type="button"
                          onClick={() => setFormStep(2)}
                          className="border border-zinc-300 hover:bg-zinc-50 text-zinc-700 font-bold px-6 py-3 rounded-2xl transition inline-flex items-center gap-2"
                        >
                          Sebelumnya
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const isMadin = formData.jenjang === "MADIN";
                            const isNpsnValid = isMadin || formData.npsn.trim() !== "";
                            if (!formData.asalSekolah || !formData.tahunLulus || !isNpsnValid) {
                              triggerAlert("error", "Harap isi semua informasi asal sekolah!");
                              return;
                            }
                            setFormStep(4);
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-2xl transition duration-250 inline-flex items-center gap-2"
                        >
                          Lanjut: Unggah Berkas <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP 4: MANDATORY DIGITAL ATTACHMENTS */}
                  {formStep === 4 && (
                    <div className="space-y-6">
                      <div className="border-b border-zinc-100 pb-3">
                        <h4 className="text-lg font-bold text-zinc-800 flex items-center gap-2">
                          <FolderOpen className="h-5 w-5 text-emerald-600" /> Langkah 4: E-Arsip & Pemberkasan Digital Opsional
                        </h4>
                      </div>

                      <div className="p-4 bg-emerald-50/60 border border-emerald-200/50 text-emerald-900 rounded-3xl text-xs space-y-2">
                        <div className="flex items-center gap-1.5 font-bold">
                          <Info className="h-4 w-4 text-emerald-600 shrink-0 stroke-[2.5]" />
                          <span>Ketentuan Pemberkasan Digital</span>
                        </div>
                        <p className="text-zinc-650 leading-relaxed">
                          Format berkas didukung: <strong className="font-semibold text-zinc-800">JPG, PNG, PDF</strong>. Gambar foto dokumen (JPG/PNG) akan dikompresi secara otomatis dengan batas maksimal 10MB. Dokumen PDF dibatasi maksimal <strong className="font-semibold text-zinc-800">200 KB</strong> demi kestabilan sinkronisasi data.
                        </p>
                      </div>

                      {storageMethod === "gdrive" ? (
                        <div className="p-4 bg-emerald-50/60 border border-emerald-200/50 text-emerald-950 rounded-3xl text-xs space-y-2.5">
                          <div className="flex items-center gap-1.5 font-extrabold text-emerald-800">
                            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 stroke-[2.5]" />
                            <span>Integrasi Google Drive Aktif</span>
                          </div>
                          <p className="text-emerald-950 leading-relaxed">
                            Pemberkasan digital pendaftaran Anda diatur untuk disimpan langsung ke folder Google Drive Anda secara aman dan dibagikan secara otomatis ke Panitia. Silakan hubungkan akun Google Anda di bawah terlebih dahulu agar sistem dapat mengunggah berkas-berkas Anda.
                          </p>
                          {googleUser ? (
                            <div className="flex items-center justify-between bg-white border border-emerald-200/50 p-3 rounded-2xl shadow-xs">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="bg-emerald-100 text-emerald-800 h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs uppercase shrink-0">
                                  {googleUser.displayName ? googleUser.displayName.charAt(0) : "G"}
                                </div>
                                <div className="text-left min-w-0">
                                  <p className="font-bold text-zinc-850 text-[11px] leading-tight truncate">{googleUser.displayName || "Pengguna Google"}</p>
                                  <p className="text-zinc-500 text-[10px] leading-tight truncate">{googleUser.email}</p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setGoogleUser(null);
                                  setGoogleAccessToken(null);
                                  triggerAlert("info", "Token Akses Google Drive dilepas.");
                                }}
                                className="text-[10px] text-rose-600 hover:text-rose-700 hover:underline font-bold shrink-0 ml-3"
                              >
                                Putuskan Hubungan
                              </button>
                            </div>
                          ) : (
                            <div className="pt-1.5">
                              <button 
                                type="button" 
                                onClick={handleGoogleDriveSignIn}
                                className="gsi-material-button w-full sm:w-auto shadow-xs inline-flex items-center justify-center"
                              >
                                <div className="gsi-material-button-state"></div>
                                <div className="gsi-material-button-content-wrapper flex items-center justify-center">
                                  <div className="gsi-material-button-icon">
                                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block', width: '18px', height: '18px' }}>
                                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                                      <path fill="none" d="M0 0h48v48H0z"></path>
                                    </svg>
                                  </div>
                                  <span className="gsi-material-button-contents font-bold text-zinc-755 ml-2">Hubungkan Akun Google Drive</span>
                                </div>
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-4 bg-amber-50/60 border border-amber-200/50 text-amber-900 rounded-3xl text-xs space-y-1.5">
                          <div className="flex items-center gap-1.5 font-extrabold text-amber-800">
                            <Sparkles className="h-4 w-4 text-amber-600 shrink-0 animate-pulse" />
                            <span>Integrasi Google Drive Direkomendasikan</span>
                          </div>
                          <p className="text-amber-850 leading-relaxed">
                            Secara standar, berkas pendaftaran Anda akan disimpan langsung di database. Untuk kemudahan, kestabilan, dan akses berkas yang andal, Panitia mendukung penuh penyimpanan otomatis langsung ke <strong className="font-bold text-zinc-800">Google Drive Anda</strong>. Administrator dapat mengaktifkan mode integrasi ini dalam menu Dashboard Admin Settings.
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* KK */}
                        <div className="border border-dashed border-zinc-300 p-5 rounded-3xl bg-zinc-50 hover:bg-zinc-100 transition duration-200">
                          <label className="block text-sm font-bold text-zinc-800 mb-2">1. Kartu Keluarga (KK) <span className="text-xs text-zinc-400 font-normal">(Opsional)</span></label>
                          <input 
                            type="file" 
                            accept=".jpg,.jpeg,.png,.pdf"
                            onChange={(e) => handleFileChange(e, "kk")}
                            className="bg-transparent text-xs w-full text-zinc-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-2xl file:border-0 file:text-[11px] file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 file:cursor-pointer"
                          />
                          {fileProgress.kk === "uploading" && <p className="text-xs text-emerald-600 animate-pulse mt-1.5 font-medium">Sedang memproses berkas...</p>}
                          {fileProgress.kk === "done" && <p className="text-xs text-emerald-600 font-bold mt-1.5 flex items-center gap-1">✓ Berkas Siap ({uploadedFiles.kk?.name})</p>}
                        </div>

                        {/* AKTA */}
                        <div className="border border-dashed border-zinc-300 p-5 rounded-3xl bg-zinc-50 hover:bg-zinc-100 transition duration-200">
                          <label className="block text-sm font-bold text-zinc-800 mb-2">2. Akta Kelahiran <span className="text-xs text-zinc-400 font-normal">(Opsional)</span></label>
                          <input 
                            type="file" 
                            accept=".jpg,.jpeg,.png,.pdf"
                            onChange={(e) => handleFileChange(e, "akta")}
                            className="bg-transparent text-xs w-full text-zinc-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-2xl file:border-0 file:text-[11px] file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 file:cursor-pointer"
                          />
                          {fileProgress.akta === "uploading" && <p className="text-xs text-emerald-600 animate-pulse mt-1.5 font-medium">Sedang memproses berkas...</p>}
                          {fileProgress.akta === "done" && <p className="text-xs text-emerald-600 font-bold mt-1.5 flex items-center gap-1">✓ Berkas Siap ({uploadedFiles.akta?.name})</p>}
                        </div>

                        {/* SKL */}
                        {formData.jenjang !== "MADIN" && (
                          <div className="border border-dashed border-zinc-300 p-5 rounded-3xl bg-zinc-50 hover:bg-zinc-100 transition duration-200">
                            <label className="block text-sm font-bold text-zinc-800 mb-2">3. Surat Keterangan Lulus / Ijazah <span className="text-xs text-zinc-400 font-normal">(Opsional)</span></label>
                            <input 
                              type="file" 
                              accept=".jpg,.jpeg,.png,.pdf"
                              onChange={(e) => handleFileChange(e, "skl")}
                              className="bg-transparent text-xs w-full text-zinc-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-2xl file:border-0 file:text-[11px] file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 file:cursor-pointer"
                            />
                            {fileProgress.skl === "uploading" && <p className="text-xs text-emerald-600 animate-pulse mt-1.5 font-medium">Sedang memproses berkas...</p>}
                            {fileProgress.skl === "done" && <p className="text-xs text-emerald-600 font-bold mt-1.5 flex items-center gap-1">✓ Berkas Siap ({uploadedFiles.skl?.name})</p>}
                          </div>
                        )}

                        {/* foto */}
                        <div className="border border-dashed border-zinc-300 p-5 rounded-3xl bg-zinc-50 hover:bg-zinc-100 transition duration-200">
                          <label className="block text-sm font-bold text-zinc-800 mb-2">4. Pas Foto Formal (3x4) <span className="text-xs text-zinc-400 font-normal">(Opsional)</span></label>
                          <input 
                            type="file" 
                            accept=".jpg,.jpeg,.png"
                            onChange={(e) => handleFileChange(e, "foto")}
                            className="bg-transparent text-xs w-full text-zinc-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-2xl file:border-0 file:text-[11px] file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 file:cursor-pointer"
                          />
                          {fileProgress.foto === "uploading" && <p className="text-xs text-emerald-600 animate-pulse mt-1.5 font-medium">Sedang memproses berkas...</p>}
                          {fileProgress.foto === "done" && <p className="text-xs text-emerald-600 font-bold mt-1.5 flex items-center gap-1">✓ Berkas Siap ({uploadedFiles.foto?.name})</p>}
                        </div>
                      </div>

                      {/* SUBMIT DECK CONTROLS */}
                      <div className="pt-8 border-t border-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <button
                          type="button"
                          onClick={() => setFormStep(3)}
                          className="w-full sm:w-auto border border-zinc-300 hover:bg-zinc-50 text-zinc-700 font-bold px-6 py-3.5 rounded-3xl transition inline-flex items-center justify-center gap-2 text-sm"
                        >
                          Sebelumnya
                        </button>
                        <button
                          type="submit"
                          id="btn-registrasi-final"
                          className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-8 py-3.5 rounded-3xl shadow-lg shadow-emerald-500/25 transition flex items-center justify-center gap-2 text-sm"
                        >
                          <Send className="h-4 w-4" /> Kumpulkan Pendaftaran SPMB YASYFI
                        </button>
                      </div>
                    </div>
                  )}
                    </motion.div>
                  </AnimatePresence>
                </form>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===================== VIEW: ADMIN DASHBOARD CONTROL ===================== */}
      <AnimatePresence mode="wait">
        {currentView === "admin" && isAdminLoggedIn && (
          <motion.div
            key="admin-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12"
          >
            {/* Admin Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8 bg-white p-6 rounded-[2rem] border border-zinc-200/80 shadow-[0_4px_20px_rgb(0,0,0,0.05)]">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-zinc-900 text-white rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.05)]">
                  <Sliders className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-zinc-950 font-display">Dashboard Administrator</h2>
                  <p className="text-xs text-zinc-500 mt-1">Kelola pendaftaran siswa baru, broadcast, wa settings, dan konten web.</p>
                </div>
              </div>
              <button
                id="btn-logout-panel"
                onClick={processLogout}
                className="bg-rose-50 text-rose-700 hover:bg-rose-100 px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 self-start md:self-auto"
              >
                <LogOut className="h-4 w-4" /> Selesai & Keluar
              </button>
            </div>

            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.05, ease: "easeOut" }}
                className="bg-white p-5 rounded-3xl border border-zinc-200/80 shadow-sm flex items-center gap-4"
              >
                <div className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl shrink-0">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-400">Total Masuk</span>
                  <p className="text-2xl font-bold font-display text-zinc-950">{pendaftarList.length}</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
                className="bg-white p-5 rounded-3xl border border-zinc-200/80 shadow-sm flex items-center gap-4"
              >
                <div className="p-3 bg-amber-50 text-amber-700 rounded-2xl shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-400">Status Baru</span>
                  <p className="text-2xl font-bold font-display text-zinc-950">
                    {pendaftarList.filter(s => s.status === "Baru").length}
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.15, ease: "easeOut" }}
                className="bg-white p-5 rounded-3xl border border-zinc-200/80 shadow-sm flex items-center gap-4"
              >
                <div className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl shrink-0">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-400">Terverifikasi</span>
                  <p className="text-2xl font-bold font-display text-zinc-950">
                    {pendaftarList.filter(s => s.status === "Terverifikasi").length}
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
                className="bg-white p-5 rounded-3xl border border-zinc-200/80 shadow-sm flex items-center gap-4"
              >
                <div className="p-3 bg-rose-50 text-rose-700 rounded-2xl shrink-0">
                  <XCircle className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-400">Ditolak</span>
                  <p className="text-2xl font-bold font-display text-zinc-950">
                    {pendaftarList.filter(s => s.status === "Ditolak").length}
                  </p>
                </div>
              </motion.div>
            </div>

            {/* Visual Analytics Charts Section */}
            <div className="mb-8">
              <AnalyticsCharts applicants={pendaftarList} />
            </div>

            {/* Tab Controls */}
            <div className="flex border-b border-zinc-200 mb-8 overflow-x-auto scrollbar-none gap-2">
              <button
                id="tab-btn-data"
                onClick={() => setActiveAdminTab("data")}
                className={`py-3.5 px-5 font-semibold text-sm transition-all border-b-2 shrink-0 ${
                  activeAdminTab === "data"
                    ? "border-emerald-600 text-emerald-600"
                    : "border-transparent text-zinc-500 hover:text-zinc-800 hover:border-zinc-300"
                }`}
              >
                Berkas Calon Siswa ({pendaftarList.length})
              </button>
              <button
                id="tab-btn-konten"
                onClick={() => setActiveAdminTab("konten")}
                className={`py-3.5 px-5 font-semibold text-sm transition-all border-b-2 shrink-0 ${
                  activeAdminTab === "konten"
                    ? "border-emerald-600 text-emerald-600"
                    : "border-transparent text-zinc-500 hover:text-zinc-800 hover:border-zinc-300"
                }`}
              >
                Kelola Situs Depan
              </button>
              <button
                id="tab-btn-broadcast"
                onClick={() => setActiveAdminTab("broadcast")}
                className={`py-3.5 px-5 font-semibold text-sm transition-all border-b-2 shrink-0 ${
                  activeAdminTab === "broadcast"
                    ? "border-emerald-600 text-emerald-600"
                    : "border-transparent text-zinc-500 hover:text-zinc-800 hover:border-zinc-300"
                }`}
              >
                Broadcast WhatsApp
              </button>
              <button
                id="tab-btn-settings"
                onClick={() => setActiveAdminTab("settings")}
                className={`py-3.5 px-5 font-semibold text-sm transition-all border-b-2 shrink-0 ${
                  activeAdminTab === "settings"
                    ? "border-emerald-600 text-emerald-600"
                    : "border-transparent text-zinc-500 hover:text-zinc-800 hover:border-zinc-300"
                }`}
              >
                Konfigurasi Gateway API
              </button>
            </div>

            {/* TAB PANELS */}
            
            {/* TAB: DATA APPLICANTS */}
            {activeAdminTab === "data" && (
              <div className="bg-white rounded-[2rem] border border-zinc-200/85 p-6 space-y-6 shadow-sm">
                
                {/* Search / Filter Deck */}
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                  <div className="relative w-full md:max-w-md">
                    <Search className="absolute left-3 top-1/2 -tranzinc-y-1/2 text-zinc-400 h-4.5 w-4.5" />
                    <input
                      type="text"
                      placeholder="Cari Calon Siswa (Nama / NISN / No. Daftar)"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full text-xs sm:text-sm pl-10 pr-4 py-2.5 rounded-2xl border border-zinc-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3 shrink-0 w-full md:w-auto justify-end">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-zinc-500 uppercase tracking-tight hidden sm:inline">Status:</span>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="text-xs border border-zinc-300 rounded-2xl px-3 py-2 bg-white font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="All">Semua Status</option>
                        <option value="Baru">Baru</option>
                        <option value="Terverifikasi">Terverifikasi</option>
                        <option value="Ditolak">Ditolak</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-zinc-500 uppercase tracking-tight hidden sm:inline">Jenjang:</span>
                      <select
                        value={jenjangFilter}
                        onChange={(e) => setJenjangFilter(e.target.value)}
                        className="text-xs border border-zinc-300 rounded-2xl px-3 py-2 bg-white font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="All">Semua Jenjang</option>
                        <option value="PAUD">PAUD</option>
                        <option value="MADIN">MADIN</option>
                        <option value="SMPI">SMPI (SMP Islam)</option>
                        <option value="SMAI">SMAI (SMA Islam)</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={exportApplicantsToCSV}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-2xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                      title="Ekspor Data Siswa ke CSV"
                    >
                      <Download className="h-4 w-4" />
                      <span>Ekspor CSV</span>
                    </button>
                  </div>
                </div>

                {/* Applications Table */}
                <div className="overflow-x-auto rounded-3xl border border-zinc-200">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-zinc-50 text-[10px] font-mono uppercase text-zinc-500 tracking-wider border-b border-zinc-200">
                        <th className="py-4 px-6 font-bold">No. Registrasi</th>
                        <th className="py-4 px-6 font-bold">Nama Lengkap</th>
                        <th className="py-4 px-6 font-bold">Jenjang</th>
                        <th className="py-4 px-6 font-bold">NISN</th>
                        <th className="py-4 px-6 font-bold">Sekolah Asal</th>
                        <th className="py-4 px-6 font-bold">Whatsapp</th>
                        <th className="py-4 px-6 font-bold">Ubah Status</th>
                        <th className="py-4 px-6 font-bold text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 text-sm">
                      {filteredApplicants.length > 0 ? (
                        filteredApplicants.map((student, idx) => (
                          <motion.tr
                            key={student.noDaftar}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.35, delay: Math.min(idx * 0.04, 0.4), ease: "easeOut" }}
                            className="hover:bg-zinc-50/50 transition"
                          >
                            <td className="py-4 px-6 font-mono font-semibold text-emerald-600">{student.noDaftar}</td>
                            <td className="py-4 px-6 font-bold text-zinc-900 uppercase">{student.nama}</td>
                            <td className="py-4 px-6">
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-150">
                                {student.jenjang || "-"}
                              </span>
                            </td>
                            <td className="py-4 px-6 font-medium text-zinc-600">{student.nisn}</td>
                            <td className="py-4 px-6 text-zinc-500 font-medium">{student.asalSekolah}</td>
                            <td className="py-4 px-6 font-mono text-zinc-600">{student.noWA}</td>
                            <td className="py-4 px-6">
                              <select
                                value={student.status}
                                onChange={(e) => handleUpdateStatus(student.noDaftar, e.target.value as any)}
                                className={`text-xs font-bold rounded-full px-3.5 py-1.5 focus:outline-none focus:ring-0 cursor-pointer ${
                                  student.status === "Baru"
                                    ? "bg-amber-50 text-amber-800 border border-amber-200"
                                    : student.status === "Terverifikasi"
                                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                    : "bg-rose-50 text-rose-800 border border-rose-200"
                                }`}
                              >
                                <option value="Baru">Baru</option>
                                <option value="Terverifikasi">Terverifikasi</option>
                                <option value="Ditolak">Ditolak</option>
                              </select>
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => setCurrentDetailStudent(student)}
                                  className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-zinc-900 px-3 py-1.5 rounded-2xl text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer"
                                  title="Lihat Berkas"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  <span>Detail</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteStudent(student.noDaftar)}
                                  className="bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 px-3 py-1.5 rounded-2xl text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer"
                                  title="Hapus Data Calon Siswa"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  <span>Hapus</span>
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={8} className="text-center py-12 text-zinc-400 font-medium bg-zinc-50/30">
                            Tidak ditemukan data pendaftar yang cocok dengan filter atau kata kunci pencarian.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

              </div>
            )}

            {/* TAB: CONTENT MANAGER */}
            {activeAdminTab === "konten" && (
              <div className="bg-white rounded-[2rem] border border-zinc-200/85 p-6 space-y-6 shadow-sm">
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 font-display">Manajemen Halaman Utama Website</h3>
                  <p className="text-xs text-zinc-500 mt-1">Perbarui profil lembaga, visi & misi (lembaga & per-jenjang), keunggulan, serta daftar ekstrakurikuler dan galeri secara langsung.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2">Profil Lembaga</label>
                    <textarea
                      rows={5}
                      value={editProfil}
                      onChange={(e) => setEditProfil(e.target.value)}
                      className="w-full text-sm border border-zinc-200 rounded-3xl p-4 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none focus:border-emerald-600 bg-zinc-50"
                      placeholder="Uraikan profil lembaga..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2">Visi & Misi Lembaga</label>
                    <textarea
                      rows={5}
                      value={editVisiMisi}
                      onChange={(e) => setEditVisiMisi(e.target.value)}
                      className="w-full text-sm border border-zinc-200 rounded-3xl p-4 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none focus:border-emerald-600 bg-zinc-50"
                      placeholder="Masukkan visi dan misi lembaga..."
                    />
                  </div>

                  <div className="md:col-span-2 border-t border-zinc-100 pt-6 my-2 space-y-4">
                    <h4 className="text-sm font-semibold text-zinc-800 uppercase tracking-wider">Pengaturan Bagian Hero & Statistik Utama</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2">Judul Hero Utama (Headline)</label>
                        <input
                          type="text"
                          value={editHeroTitle}
                          onChange={(e) => setEditHeroTitle(e.target.value)}
                          className="w-full text-sm border border-zinc-200 rounded-3xl p-4 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none focus:border-emerald-600 bg-zinc-50"
                          placeholder="Masukkan judul hero utama..."
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2">Deskripsi Hero Utama (Sub-headline)</label>
                        <textarea
                          rows={3}
                          value={editHeroSubtitle}
                          onChange={(e) => setEditHeroSubtitle(e.target.value)}
                          className="w-full text-sm border border-zinc-200 rounded-3xl p-4 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none focus:border-emerald-600 bg-zinc-50"
                          placeholder="Masukkan penjelasan / deskripsi selamat datang..."
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-teal-700 uppercase tracking-wider mb-2">Jumlah Siswa Terdaftar (Statistik)</label>
                        <input
                          type="text"
                          value={editSiswaCount}
                          onChange={(e) => setEditSiswaCount(e.target.value)}
                          className="w-full text-sm border border-zinc-200 rounded-3xl p-4 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none focus:border-emerald-600 bg-zinc-50"
                          placeholder="Contoh: 147"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-teal-700 uppercase tracking-wider mb-2">Jumlah Guru / Pengajar (Statistik)</label>
                        <input
                          type="text"
                          value={editGuruCount}
                          onChange={(e) => setEditGuruCount(e.target.value)}
                          className="w-full text-sm border border-zinc-200 rounded-3xl p-4 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none focus:border-emerald-600 bg-zinc-50"
                          placeholder="Contoh: 40"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2">Keunggulan Sekolah (1 Baris = 1 Keunggulan)</label>
                    <textarea
                      rows={5}
                      value={editKeunggulan}
                      onChange={(e) => setEditKeunggulan(e.target.value)}
                      className="w-full text-sm border border-zinc-200 rounded-3xl p-4 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none focus:border-emerald-600 bg-zinc-50 font-medium"
                      placeholder="Tulis keunggulan di tiap baris..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2">Prestasi Terkini (1 Baris = 1 Prestasi)</label>
                    <textarea
                      rows={5}
                      value={editPrestasi}
                      onChange={(e) => setEditPrestasi(e.target.value)}
                      className="w-full text-sm border border-zinc-200 rounded-3xl p-4 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none focus:border-emerald-600 bg-zinc-50 font-medium"
                      placeholder="Tulis prestasi di tiap baris..."
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2">Daftar Ekstrakurikuler (1 Baris = 1 Ekstrakurikuler)</label>
                    <textarea
                      rows={4}
                      value={editEkskul}
                      onChange={(e) => setEditEkskul(e.target.value)}
                      className="w-full text-sm border border-zinc-200 rounded-3xl p-4 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none focus:border-emerald-600 bg-zinc-50 font-medium"
                      placeholder="Tulis ekstrakurikuler di tiap baris..."
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2">Tautan Galeri Gambar Kegiatan (1 Baris = 1 Link URL Gambar)</label>
                    <textarea
                      rows={4}
                      value={editGaleri}
                      onChange={(e) => setEditGaleri(e.target.value)}
                      className="w-full text-xs font-mono border border-zinc-200 rounded-3xl p-4 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none focus:border-emerald-600 bg-zinc-50"
                      placeholder="https://contoh-link-gambar.com/foto1.jpg"
                    />
                    <p className="text-[10px] text-emerald-600 font-medium mt-1.5 flex items-center gap-1">
                      <Info className="h-3.5 w-3.5" /> Gunakan link yang langsung berakhiran berekstensi .jpg, .png atau tautan hosting publik.
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-100 flex gap-4">
                  <button
                    onClick={saveModifiedContents}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-3 rounded-full shadow-[0_8px_20px_rgb(16,185,129,0.25)] transition-all duration-300 hover:-translate-y-0.5 shadow-[0_4px_20px_rgb(0,0,0,0.05)] transition"
                  >
                    Simpan Perubahan Web
                  </button>
                  <button
                    onClick={resetEditorsToDefaults}
                    className="border border-zinc-300 hover:bg-zinc-50 text-zinc-700 font-bold px-6 py-3 rounded-2xl transition"
                  >
                    Reset Nilai Default
                  </button>
                </div>
              </div>
            )}

            {/* TAB: WHATSAPP BROADCAST */}
            {activeAdminTab === "broadcast" && (
              <div className="bg-white rounded-[2rem] border border-zinc-200/85 p-6 space-y-6 shadow-sm max-w-2xl">
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 font-display">Kirim Pesan Siaran Massal (WhatsApp Broadcast)</h3>
                  <p className="text-xs text-zinc-500 mt-1">Sampaikan informasi serentak ke semua No. WhatsApp pendaftar aktif.</p>
                             <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2">Target Penerima Siaran</label>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <button
                        type="button"
                        onClick={() => setBroadcastTarget("all")}
                        className={`p-3 rounded-3xl text-left border transition ${
                          broadcastTarget === "all"
                            ? "border-emerald-600 bg-emerald-50/70 text-emerald-900 ring-2 ring-emerald-500/10"
                            : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100"
                        }`}
                      >
                        <div className="flex items-center gap-2 font-bold text-xs select-none">
                          <Users className="h-4 w-4 text-emerald-600" />
                          <span>Semua Pendaftar ({pendaftarList.length})</span>
                        </div>
                        <p className="text-[10px] text-zinc-500 mt-1">Kirim ke semua pendaftar tanpa batas filter.</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setBroadcastTarget("filtered")}
                        className={`p-3 rounded-3xl text-left border transition ${
                          broadcastTarget === "filtered"
                            ? "border-emerald-600 bg-emerald-50/70 text-emerald-900 ring-2 ring-emerald-500/10"
                            : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100"
                        }`}
                      >
                        <div className="flex items-center gap-2 font-bold text-xs select-none">
                          <Filter className="h-4 w-4 text-emerald-600" />
                          <span>Sesuai Filter Saat Ini ({filteredApplicants.length})</span>
                        </div>
                        <p className="text-[10px] text-zinc-500 mt-1">Mengikuti filter tabel (Jenjang, Status, Pencarian).</p>
                      </button>
                    </div>

                    <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-3xl text-xs text-zinc-600 font-medium flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="font-semibold text-zinc-700">Status Gateway:</span>
                        {waSettings.endpoint && waSettings.token ? (
                          <span className="text-emerald-700 font-bold bg-emerald-100/80 px-2 py-0.5 rounded-lg text-[10px]">API Gateway Aktif (Riil)</span>
                        ) : (
                          <span className="text-amber-700 font-bold bg-amber-100/80 px-2 py-0.5 rounded-lg text-[10px]">Gateway Belum Dikonfigurasi</span>
                        )}
                      </div>
                      <span className="text-[11px] text-zinc-500 font-mono">
                        Target: {broadcastTarget === "filtered" ? filteredApplicants.length : pendaftarList.length} Nomor
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2">Isi Pesan Broadcast</label>
                    <textarea
                      rows={6}
                      value={broadcastMessage}
                      onChange={(e) => setBroadcastMessage(e.target.value)}
                      className="w-full text-sm border border-zinc-200 rounded-3xl p-4 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none focus:border-emerald-600 bg-zinc-50"
                      placeholder="Tuliskan pesan siaran formal di sini... Contoh: Pemberitahuan penting dari Yayasan Yasyfi PPDB v1.0.0..."
                    />
                    <p className="text-[10px] text-zinc-400 mt-1">
                      {waSettings.endpoint && waSettings.token 
                        ? "Pesan akan secara otomatis terkirim asli/riil satu per satu ke setiap nomor pendaftar tujuan via WhatsApp API Gateway Anda."
                        : "Mohon konfigurasikan API Gateway WhatsApp terlebih dahulu sebelum dapat mengirimkan pesan massal ke pendaftar."}
                    </p>
                  </div>
                </div>      </div>

                <div className="pt-4 border-t border-zinc-100">
                  <button
                    onClick={handleSendBroadcast}
                    disabled={isSendingBroadcast}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-3 rounded-full shadow-[0_8px_20px_rgb(16,185,129,0.25)] transition-all duration-300 hover:-translate-y-0.5 shadow-[0_4px_20px_rgb(0,0,0,0.05)] transition flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSendingBroadcast ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Mengirim Antrean...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        <span>Kirim Siaran Sekarang</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* TAB: GATEWAY SETTINGS */}
            {activeAdminTab === "settings" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                
                {/* LEFT COLUMN: Pengaturan WhatsApp Gateway */}
                <div className="bg-white rounded-[2rem] border border-zinc-200/85 p-6 space-y-6 shadow-sm">
                  <div>
                    <h3 className="text-lg font-bold text-zinc-900 font-display">Pengaturan WhatsApp Gateway API</h3>
                    <p className="text-xs text-zinc-500 mt-1">Hubungkan portal SPMB YASYFI dengan penyedia layanan pengiriman WhatsApp Gateway (Fonnte, Wablas, Whacenter, dll).</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2">API Endpoint URL</label>
                      <input
                        type="text"
                        value={apiEndpoint}
                        onChange={(e) => setApiEndpoint(e.target.value)}
                        placeholder="Contoh: https://api.fonnte.com/send"
                        className="w-full text-sm font-mono border border-zinc-200 rounded-3xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-zinc-50"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2">API Authorization / Token Key</label>
                      <input
                        type="password"
                        value={apiToken}
                        onChange={(e) => setApiToken(e.target.value)}
                        placeholder="Masukkan Token Rahasia Gateway Anda"
                        className="w-full text-sm font-mono border border-zinc-200 rounded-3xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-zinc-50"
                      />
                    </div>

                    <div className="pt-4 border-t border-zinc-100">
                      <label className="block text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2">Nomor WhatsApp Admin (Notifikasi Pendaftaran)</label>
                      <input
                        type="text"
                        value={adminWa}
                        onChange={(e) => setAdminWa(e.target.value)}
                        placeholder="Contoh: 085929800093 atau 6285929800093"
                        className="w-full text-sm font-mono border border-zinc-200 rounded-3xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-zinc-50"
                      />
                      <p className="text-[11px] text-zinc-500 mt-1.5">
                        Setiap kali calon siswa menyelesaikan pendaftaran, notifikasi detail berisi nama, wali, alamat, dsb akan dikirim ke nomor WhatsApp Admin ini.
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-zinc-100">
                    <button
                      onClick={saveWaSettings}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-3 rounded-full shadow-[0_8px_20px_rgb(16,185,129,0.25)] transition-all duration-300 hover:-translate-y-0.5 shadow-[0_4px_20px_rgb(0,0,0,0.05)] transition"
                    >
                      Simpan Konfigurasi Rahasia
                    </button>
                  </div>
                </div>

                {/* DANGER mantenerance card */}
                <div className="bg-rose-50 border border-rose-250/50 rounded-[2rem] p-6 space-y-4 shadow-sm">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-rose-100 text-rose-800 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border border-rose-200">
                        Zona Bahaya
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-rose-950 font-display">Pembersihan Database Sistem</h3>
                    <p className="text-xs text-rose-800 mt-1">
                      Mengosongkan dan menghapus seluruh data pendaftar secara permanen untuk memulai PPDB dengan sistem yang sepenuhnya baru/bersih.
                    </p>
                  </div>

                  <div className="bg-white p-3.5 rounded-3xl border border-rose-150 text-xs text-rose-900 space-y-1">
                    <p className="font-bold flex items-center gap-1">
                      <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                      <span>Peringatan Penting :</span>
                    </p>
                    <ul className="list-disc pl-4 space-y-0.5 text-rose-850 text-[11px]">
                      <li>Seluruh data calon siswa terdaftar di Firestore akan dikosongkan secara permanen.</li>
                      <li>Seluruh lampiran berkas terunggah akan dihilangkan secara permanen.</li>
                      <li>Disarankan mengunduh/ekspor CSV terlebih dahulu di tab Data Berkas sebelum melakukan pembersihan penuh.</li>
                    </ul>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleDeleteAllStudents}
                      className="w-full sm:w-auto bg-rose-600 hover:bg-rose-700 text-white font-extrabold px-5 py-3 rounded-2xl shadow-sm text-xs transition flex items-center justify-center gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Kosongkan Semua Data Pendaftar Sekarang</span>
                    </button>
                  </div>
                </div>

                {/* RIGHT COLUMN: Optimasi Penyimpanan Berkas & Suggestion Box */}
                <div className="bg-zinc-50 rounded-[2rem] border border-zinc-200/85 p-6 space-y-6 shadow-sm">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full">Optimal</span>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full">Google Drive</span>
                    </div>
                    <h3 className="text-lg font-bold text-zinc-900 font-display">Metode Penyimpanan Berkas</h3>
                    <p className="text-xs text-zinc-500 mt-1">Pilih metode penyimpanan dokumen opsional (KK, Akta, SKL, Foto) dari pendaftar baru.</p>
                  </div>

                  {/* Unified Storage Selector */}
                  <div className="space-y-3">
                    {/* Option 1: Base64 Firestore */}
                    <label className={`block p-4 rounded-3xl border transition cursor-pointer select-none ${storageMethod === "base64" ? "bg-white border-emerald-600 shadow-sm" : "bg-white/50 border-zinc-200 hover:border-zinc-300"}`}>
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="storage_method"
                          value="base64"
                          checked={storageMethod === "base64"}
                          onChange={() => {
                            setStorageMethod("base64");
                            localStorage.setItem("ppdb_storage_method", "base64");
                            triggerAlert("info", "Penyimpanan berkas beralih ke Base64 Firestore.");
                          }}
                          className="mt-1 text-emerald-600 focus:ring-emerald-500"
                        />
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold text-zinc-800 block">Base64 Firestore (Lokal/Fallback)</span>
                          <span className="text-[11px] text-zinc-500 block">Berkas disimpan langsung sebagai teks string Base64 di dalam database Firestore. Rentan gagal jika ukuran total berkas melebihi batas 1MB Firestore.</span>
                        </div>
                      </div>
                    </label>

                    {/* Option 2: Google Drive Integration */}
                    <label className={`block p-4 rounded-3xl border transition cursor-pointer select-none ${storageMethod === "gdrive" ? "bg-white border-emerald-600 shadow-sm ring-1 ring-emerald-600/30" : "bg-white/50 border-zinc-200 hover:border-zinc-300"}`}>
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="storage_method"
                          value="gdrive"
                          checked={storageMethod === "gdrive"}
                          onChange={() => {
                            setStorageMethod("gdrive");
                            localStorage.setItem("ppdb_storage_method", "gdrive");
                            triggerAlert("success", "Penyimpanan berkas dialihkan ke Google Drive (Workspace).");
                          }}
                          className="mt-1 text-emerald-650 focus:ring-emerald-500"
                        />
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold text-zinc-850 flex items-center gap-1.5">
                            Google Drive Integration (Direkomendasikan)
                            <span className="bg-emerald-100 text-emerald-800 text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full">Bebas Pajak/Biaya GCP</span>
                          </span>
                          <span className="text-[11px] text-zinc-500 block">Siswa menghubungkan akun Google mereka dan berkas pendaftaran diunggah langsung ke Google Drive mereka di folder terpisah, lalu membagikan akses secara aman kepada Panitia YASYFI.</span>
                        </div>
                      </div>
                    </label>
                  </div>

                  {/* Comparison & Education Stats */}
                  <div className="space-y-3.5 pt-4 border-t border-zinc-200/60">
                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Mengapa Metode Google Drive Lebih Baik?</h4>
                    
                    <div className="grid grid-cols-1 gap-3 text-xs">
                      <div className="bg-white p-3 rounded-2xl border border-zinc-200/50 flex gap-3">
                        <div className="text-emerald-600 font-bold font-mono">1.</div>
                        <div>
                          <p className="font-bold text-zinc-800 font-display">Menghemat Biaya & Kuota GCP</p>
                          <p className="text-zinc-500 mt-0.5 leading-relaxed">Penyimpanan Firebase Storage atau Cloud SQL berbayar setelah kuota gratis terlampaui. Google Drive menawarkan penyimpanan gratis 15GB di setiap akun Google Wali/Calon Siswa.</p>
                        </div>
                      </div>

                      <div className="bg-white p-3 rounded-2xl border border-zinc-200/50 flex gap-3">
                        <div className="text-emerald-600 font-bold font-mono">2.</div>
                        <div>
                          <p className="font-bold text-zinc-800 font-display">Aman dari Limit Dokumen 1MB</p>
                          <p className="text-zinc-500 mt-0.5 leading-relaxed">Menghindari resiko file pecah karena batas dokumen di database Firestore. Layanan tetap andal bahkan saat melayani ribuan pendaftar serentak secara gratis.</p>
                        </div>
                      </div>

                      <div className="bg-white p-3 rounded-2xl border border-zinc-200/50 flex gap-3">
                        <div className="text-emerald-600 font-bold font-mono">3.</div>
                        <div>
                          <p className="font-bold text-zinc-800 font-display">Tergabung Bersih Terstruktur</p>
                          <p className="text-zinc-500 mt-0.5 leading-relaxed">Setiap berkas diunggah dengan nama file terstruktur (misal: KK_NamaSiswa_AkarAsli.jpg) sehingga rapi diletakkan di dalam folder Google Drive khusus.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}

          </motion.div>
        )}
      </AnimatePresence>

      {/* FOOTER */}
      <footer className="bg-zinc-900 text-white border-t border-zinc-900 pt-16 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div className="space-y-4 col-span-2">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-600 text-white p-2.5 rounded-2xl">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <h4 className="text-xl font-bold font-display text-white">PORTAL SPMB YASYFI</h4>
              </div>
              <p className="text-zinc-400 text-xs sm:text-sm max-w-sm leading-relaxed">
                Sistem informasi portal pendaftaran murid baru online yang mempertemukan akuntabilitas, transparansi, ketepatan, serta keamanan data dalam satu ekosistem digital Yayasan Assyafiiyah.
              </p>
            </div>
            <div>
              <h5 className="font-bold text-sm tracking-wider uppercase text-emerald-400 mb-4">Akses Panitia</h5>
              <p className="text-xs text-zinc-400 mb-3">Untuk panitia pendaftar maupun administrator, silakan klik tombol di bawah untuk masuk ke ruang kontrol admin.</p>
              <button
                id="btn-footer-login"
                onClick={() => {
                  if (isAdminLoggedIn) setCurrentView("admin");
                  else setIsLoginModalOpen(true);
                }}
                className="text-xs font-bold text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-4 py-2.5 rounded-2xl transition cursor-pointer"
              >
                {isAdminLoggedIn ? "Buka Dashboard Admin" : "Log In Administrator"}
              </button>
            </div>
            <div>
              <h5 className="font-bold text-sm tracking-wider uppercase text-emerald-400 mb-4 font-mono">PANITIA HUB</h5>
              <ul className="text-xs text-zinc-400 space-y-2">
                <li>Jam Kerja: 08:00 - 15:00 WIB</li>
                <li>WhatsApp Support: +6285929800093</li>
                <li>Email Hub: spmb@yasyfi.sch.id</li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-zinc-900 text-center text-xs text-zinc-500">
            <p>© 2026 SPMB YASYFI - Yayasan Assyafiiyah Lenteng Barat. Seluruh Hak Cipta Dilindungi.</p>
          </div>
        </div>
      </footer>

      {/* ===================== MODAL: ADMIN LOGIN ===================== */}
      <AnimatePresence>
        {isLoginModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm z-[155000] flex items-center justify-center p-4"
            id="login-modal-overlay"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-[0_12px_40px_rgb(0,0,0,0.08)] border border-zinc-200"
              id="login-card-modal"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-zinc-900 font-display">Akses Admin</h3>
                  <p className="text-xs text-zinc-500">Masukkan akun administrator terdaftar.</p>
                </div>
                <button
                  onClick={() => setIsLoginModalOpen(false)}
                  className="p-1.5 hover:bg-zinc-100 rounded-full transition text-zinc-400 hover:text-zinc-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={processLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase tracking-tight mb-1">Username</label>
                  <input
                    type="text"
                    required
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    className="w-full text-sm border border-zinc-300 rounded-2xl px-4 py-3 bg-zinc-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="admin"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase tracking-tight mb-2">Password</label>
                  <div className="relative">
                    <input
                      type={showAdminPassword ? "text" : "password"}
                      required
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="w-full text-sm border border-zinc-300 rounded-2xl pl-4 pr-10 py-3 bg-zinc-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      placeholder="Masukkan password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPassword(!showAdminPassword)}
                      className="absolute right-3 top-1/2 -tranzinc-y-1/2 text-zinc-400 hover:text-zinc-600"
                    >
                      {showAdminPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full bg-zinc-900 text-white hover:bg-zinc-800 font-bold py-3.5 rounded-2xl shadow-lg transition"
                    id="btn-login-submit"
                  >
                    Masuk Akun
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===================== MODAL: REGISTERED CONFIRMATION RECEIPT ===================== */}
      <AnimatePresence>
        {submittedReceipt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm z-[155000] flex items-center justify-center p-4 overflow-y-auto"
            id="receipt-modal-overlay"
          >
            <motion.div
              initial={{ scale: 0.95, y: 25 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 25 }}
              className="bg-white rounded-[2rem] p-8 max-w-xl w-full shadow-[0_12px_40px_rgb(0,0,0,0.08)] border border-zinc-200/80 my-8"
              id="receipt-card-modal"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="bg-emerald-100 text-emerald-800 text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full inline-flex items-center gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5" /> Pendaftaran Sukses Dikirim!
                  </div>
                  <h3 className="text-2xl font-bold text-zinc-900 font-display mt-2">Kartu Tanda Pendaftaran</h3>
                </div>
                <button
                  onClick={() => setSubmittedReceipt(null)}
                  className="p-1.5 hover:bg-zinc-100 rounded-full transition text-zinc-400 hover:text-zinc-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              {/* PDF/Slip Lookalike */}
              <div className="border border-zinc-200 rounded-3xl bg-zinc-50 p-6 space-y-4 font-mono text-xs text-zinc-800 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full filter blur-md"></div>
                <div className="border-b-2 border-dashed border-zinc-200 pb-4 text-center">
                  <h4 className="font-bold text-sm tracking-tight">KARTU BUKTI PENDAFTARAN SPMB</h4>
                  <p className="text-[10px] text-zinc-500 uppercase mt-0.5">YAYASAN PENDIDIKAN YASYFI</p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">NO. REGISTRASI:</span>
                    <span className="font-bold text-emerald-600">{submittedReceipt.noDaftar}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">NAMA LENGKAP:</span>
                    <span className="font-bold text-zinc-900 uppercase text-right">{submittedReceipt.nama}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">JENJANG TUJUAN:</span>
                    <span className="font-bold text-emerald-800">{submittedReceipt.jenjang}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">NISN / NIK:</span>
                    <span className="font-semibold">{submittedReceipt.nisn} / {submittedReceipt.nik}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">ASAL SEKOLAH:</span>
                    <span className="font-semibold text-right">{submittedReceipt.asalSekolah} (Lulus {submittedReceipt.tahunLulus})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">NO. WHATSAPP:</span>
                    <span className="font-semibold font-mono">{submittedReceipt.noWA}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">STATUS SEKARANG:</span>
                    <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded text-[10px]">Baru</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">TANGGAL SUBMIT:</span>
                    <span className="text-zinc-500 font-mono">{new Date(submittedReceipt.createdAt).toLocaleDateString("id-ID", { hour: "numeric", minute: "numeric" })}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-dashed border-zinc-200 text-center text-[10px] text-zinc-500">
                  <p>Harap screenshot halaman ini atau catat <strong>No. Registrasi</strong> Anda.</p>
                  <p className="mt-1">Tunjukkan kartu ini bersama berkas asli ke panitia waktu tes observasi mandiri.</p>
                </div>
              </div>

               <div className="mt-6 flex flex-wrap justify-end gap-3">
                {waSettings.admin_wa && (
                  <button
                    onClick={() => sendWaToAdmin(submittedReceipt)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-2xl text-xs transition flex items-center gap-1.5"
                  >
                    <Smartphone className="h-4 w-4" /> Kirim Notif WA ke Admin
                  </button>
                )}
                <button
                  onClick={() => window.print()}
                  className="bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold px-5 py-2.5 rounded-2xl text-xs transition flex items-center gap-1.5"
                >
                  <Download className="h-4 w-4" /> Cetak Slip
                </button>
                <button
                  onClick={() => setSubmittedReceipt(null)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-2xl text-xs transition"
                >
                  Selesai
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===================== MODAL: APPLICANT DETAIL VIEW ===================== */}
      <AnimatePresence>
        {currentDetailStudent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm z-[155000] flex items-center justify-center p-4 overflow-y-auto"
            id="detail-modal-overlay"
          >
            <motion.div
              initial={{ scale: 0.95, y: 25 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 25 }}
              className="bg-white rounded-[2rem] p-8 max-w-3xl w-full shadow-[0_12px_40px_rgb(0,0,0,0.08)] border border-zinc-200/80 my-8 overflow-hidden flex flex-col max-h-[90vh]"
              id="detail-card-modal"
            >
              {/* Modal Header */}
              <div className="flex justify-between items-start mb-6 shrink-0">
                <div>
                  <h3 className="text-2xl font-bold text-zinc-950 font-display">Detail Data Calon Siswa</h3>
                  <p className="text-xs text-zinc-500 mt-1">Registrasi <span className="font-mono font-bold text-emerald-600">{currentDetailStudent.noDaftar}</span></p>
                </div>
                <button
                  onClick={() => setCurrentDetailStudent(null)}
                  className="p-1.5 hover:bg-zinc-100 rounded-full transition text-zinc-400 hover:text-zinc-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              {/* Informational Content Grid, scrollable inside modal */}
              <div className="space-y-6 overflow-y-auto pr-2 pb-4">
                
                {/* 1. DATA PRIBADI */}
                <div className="bg-zinc-50 p-5 rounded-3xl border border-zinc-200">
                  <h4 className="font-bold text-sm text-zinc-900 border-b border-zinc-200 pb-2 mb-3 flex items-center gap-1.5">
                    <User className="h-4.5 w-4.5 text-emerald-500" /> Data Pribadi Calon Siswa
                  </h4>
                  <div className="grid grid-cols-2 gap-y-2.5 text-xs">
                    <div className="text-zinc-400 font-semibold">Nama Lengkap</div>
                    <div className="font-bold text-zinc-900 uppercase">{currentDetailStudent.nama}</div>

                    <div className="text-zinc-400 font-semibold text-emerald-600">Jenjang yang Dituju</div>
                    <div className="font-bold text-emerald-700">{currentDetailStudent.jenjang || "-"}</div>

                    <div className="text-zinc-400 font-semibold">NISN / NIK</div>
                    <div className="font-medium text-zinc-800">{currentDetailStudent.nisn} / {currentDetailStudent.nik}</div>

                    <div className="text-zinc-400 font-semibold">Tempat & Tanggal Lahir</div>
                    <div className="font-medium text-zinc-800">{currentDetailStudent.tempatLahir}, {currentDetailStudent.tglLahir}</div>

                    <div className="text-zinc-400 font-semibold">Jenis Kelamin / Agama</div>
                    <div className="font-medium text-zinc-800">{currentDetailStudent.jk} / {currentDetailStudent.agama}</div>

                    <div className="text-zinc-400 font-semibold">Alamat Rumah</div>
                    <div className="font-medium text-zinc-800 leading-relaxed">{currentDetailStudent.alamat}</div>
                  </div>
                </div>

                {/* 2. ORANG TUA / WALI & ASAL SEKOLAH */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Ortu */}
                  <div className="bg-zinc-50 p-5 rounded-3xl border border-zinc-200">
                    <h4 className="font-bold text-sm text-zinc-900 border-b border-zinc-200 pb-2 mb-3 flex items-center gap-1.5">
                      <Users className="h-4.5 w-4.5 text-emerald-500" /> Orang Tua / Wali
                    </h4>
                    <div className="grid grid-cols-3 gap-y-2.5 text-xs">
                      <div className="text-zinc-400 font-semibold col-span-1">Ayah</div>
                      <div className="font-medium text-zinc-800 col-span-2">{currentDetailStudent.namaAyah}</div>

                      <div className="text-zinc-400 font-semibold col-span-1">Ibu</div>
                      <div className="font-medium text-zinc-800 col-span-2">{currentDetailStudent.namaIbu}</div>

                      <div className="text-zinc-400 font-semibold col-span-1">NIK Ortu</div>
                      <div className="font-medium text-zinc-800 col-span-2">{currentDetailStudent.nikOrtu}</div>

                      <div className="text-zinc-400 font-semibold col-span-1">Pekerjaan</div>
                      <div className="font-medium text-zinc-800 col-span-2">{currentDetailStudent.pekerjaan}</div>

                      <div className="text-zinc-400 font-semibold col-span-1">Penghasilan</div>
                      <div className="font-medium text-zinc-800 col-span-2">{currentDetailStudent.penghasilan}</div>

                      <div className="text-zinc-400 font-semibold col-span-1">No. WhatsApp</div>
                      <div className="font-bold text-emerald-600 col-span-2">{currentDetailStudent.noWA}</div>
                    </div>
                  </div>

                  {/* Asal Sekolah */}
                  <div className="bg-zinc-50 p-5 rounded-3xl border border-zinc-200">
                    <h4 className="font-bold text-sm text-zinc-900 border-b border-zinc-200 pb-2 mb-3 flex items-center gap-1.5">
                      <Building2 className="h-4.5 w-4.5 text-emerald-500" /> Asal Sekolah
                    </h4>
                    <div className="grid grid-cols-3 gap-y-2.5 text-xs">
                      <div className="text-zinc-400 font-semibold col-span-1">Sekolah Asal</div>
                      <div className="font-medium text-zinc-800 col-span-2">{currentDetailStudent.asalSekolah}</div>

                      <div className="text-zinc-400 font-semibold col-span-1">NPSN</div>
                      <div className="font-medium text-zinc-800 col-span-2">{currentDetailStudent.npsn}</div>

                      <div className="text-zinc-400 font-semibold col-span-1">Tahun Lulus</div>
                      <div className="font-medium text-zinc-800 col-span-2">{currentDetailStudent.tahunLulus}</div>
                    </div>
                  </div>

                </div>

                {/* 3. BERKAS DIGITAL ATTACHMENTS PREVIEW */}
                <div className="bg-zinc-50 p-5 rounded-3xl border border-zinc-200 space-y-4">
                  <h4 className="font-bold text-sm text-zinc-900 border-b border-zinc-200 pb-2 flex items-center gap-1.5">
                    <FolderOpen className="h-4.5 w-4.5 text-emerald-500" /> Dokumen Arsitektur Digital (E-Arsip)
                  </h4>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-white p-3 rounded-2xl border border-zinc-200 text-center space-y-2">
                      <FileText className="h-6 w-6 text-emerald-600 mx-auto" />
                      <p className="text-[10px] font-bold text-zinc-700 truncate">{currentDetailStudent.files.kk ? "Kartu Keluarga" : "Tidak Ada"}</p>
                      {currentDetailStudent.files.kk && (
                        <button
                          onClick={() => handleViewFile(currentDetailStudent.files.kk)}
                          className="bg-emerald-600 text-white font-bold px-2 py-1.5 rounded-2xl text-[10px] hover:bg-emerald-700 transition inline-block w-full cursor-pointer shadow-sm"
                        >
                          Buka Berkas
                        </button>
                      )}
                    </div>

                    <div className="bg-white p-3 rounded-2xl border border-zinc-200 text-center space-y-2">
                      <FileText className="h-6 w-6 text-teal-600 mx-auto" />
                      <p className="text-[10px] font-bold text-zinc-700 truncate">{currentDetailStudent.files.akta ? "Akta Kelahiran" : "Tidak Ada"}</p>
                      {currentDetailStudent.files.akta && (
                        <button
                          onClick={() => handleViewFile(currentDetailStudent.files.akta)}
                          className="bg-emerald-600 text-white font-bold px-2 py-1.5 rounded-2xl text-[10px] hover:bg-emerald-700 transition inline-block w-full cursor-pointer shadow-sm"
                        >
                          Buka Berkas
                        </button>
                      )}
                    </div>

                    <div className="bg-white p-3 rounded-2xl border border-zinc-200 text-center space-y-2">
                      <FileText className="h-6 w-6 text-purple-600 mx-auto" />
                      <p className="text-[10px] font-bold text-zinc-700 truncate">{currentDetailStudent.files.skl ? "Ijazah / SKL" : "Tidak Ada"}</p>
                      {currentDetailStudent.files.skl && (
                        <button
                          onClick={() => handleViewFile(currentDetailStudent.files.skl)}
                          className="bg-emerald-600 text-white font-bold px-2 py-1.5 rounded-2xl text-[10px] hover:bg-emerald-700 transition inline-block w-full cursor-pointer shadow-sm"
                        >
                          Buka Berkas
                        </button>
                      )}
                    </div>

                    <div className="bg-white p-3 rounded-2xl border border-zinc-200 text-center space-y-2">
                      <ImageIcon className="h-6 w-6 text-emerald-600 mx-auto" />
                      <p className="text-[10px] font-bold text-zinc-700 truncate">{currentDetailStudent.files.foto ? "Pas Foto Resmi" : "Tidak Ada"}</p>
                      {currentDetailStudent.files.foto && (
                        <button
                          onClick={() => handleViewFile(currentDetailStudent.files.foto)}
                          className="bg-emerald-600 text-white font-bold px-2 py-1.5 rounded-2xl text-[10px] hover:bg-emerald-700 transition inline-block w-full cursor-pointer shadow-sm"
                        >
                          Buka Berkas
                        </button>
                      )}
                    </div>
                  </div>
                </div>

              </div>

              {/* Action bar and status selector */}
              <div className="mt-6 pt-4 border-t border-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-500 uppercase">Ubah Status Kelayakan:</span>
                  <select
                    value={currentDetailStudent.status}
                    onChange={(e) => {
                      handleUpdateStatus(currentDetailStudent.noDaftar, e.target.value as any);
                      setCurrentDetailStudent({ ...currentDetailStudent, status: e.target.value as any });
                    }}
                    className={`text-xs font-bold rounded-2xl px-3 py-1.5 focus:outline-none focus:ring-0 cursor-pointer ${
                      currentDetailStudent.status === "Baru"
                        ? "bg-amber-100 text-amber-800"
                        : currentDetailStudent.status === "Terverifikasi"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    <option value="Baru">Baru</option>
                    <option value="Terverifikasi">Terverifikasi</option>
                    <option value="Ditolak">Ditolak</option>
                  </select>
                </div>

                <button
                  onClick={() => setCurrentDetailStudent(null)}
                  className="w-full sm:w-auto bg-zinc-900 hover:bg-zinc-800 text-white font-bold px-6 py-2 rounded-2xl text-xs transition"
                >
                  Tutup Tampilan
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===================== MODAL: CONFIRM DELETE ALL ===================== */}
      <AnimatePresence>
        {isConfirmDeleteAllOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm z-[155000] flex items-center justify-center p-4"
            id="delete-all-confirm-overlay"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-[2rem] p-6 max-w-md w-full shadow-[0_12px_40px_rgb(0,0,0,0.08)] border border-rose-100 space-y-5"
              id="delete-all-confirm-card"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-rose-50 rounded-3xl text-rose-600 shrink-0">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-zinc-900 font-display">Kosongkan Semua Data?</h3>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Tindakan ini akan menghapus secara permanen seluruh data calon siswa yang telah terdaftar dari database. Semua berkas gambar/PDF yang diunggah juga tidak akan dapat diakses kembali.
                  </p>
                </div>
              </div>

              <div className="bg-zinc-50 p-4 rounded-3xl border border-zinc-100 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase font-bold text-zinc-400 font-mono">Jumlah pendaftar saat ini</p>
                  <p className="text-base font-black text-zinc-900 font-mono mt-0.5">{pendaftarList.length} Calon Siswa</p>
                </div>
                <div className="bg-rose-100/50 text-rose-700 px-3 py-1 rounded-lg text-[10px] font-extrabold uppercase">
                  Tidak dapat diubah
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsConfirmDeleteAllOpen(false)}
                  className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold py-3 rounded-2xl text-xs transition border border-zinc-200 cursor-pointer"
                >
                  Batalkan
                </button>
                <button
                  type="button"
                  onClick={executeDeleteAllStudents}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold py-3 rounded-2xl text-xs transition shadow-sm shadow-rose-200 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Ya, Hapus Semua</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
