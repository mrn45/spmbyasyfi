import { WebContent, Pendaftar, WaSettings } from "./types";

export const initialWebContent: WebContent = {
  profil: "Selamat datang di website resmi SPMB YASYFI. Lembaga pendidikan kami berkomitmen untuk melahirkan generasi unggul yang cerdas, berkarakter mulia, menguasai ilmu pengetahuan dan teknologi, serta berpegang teguh pada nilai-nilai keislaman demi menghadapi masa depan dengan penuh integritas dan daya saing global. Kami menyediakan lingkungan belajar yang inklusif, modern, aman, serta terakreditasi A untuk segenap jenjang pendidikan.",
  visimisi: "VISI:\nUnggul dalam Prestasi, Berbudaya, Berkarakter Mulia, dan Kompetitif Secara Global Berlandaskan Nilai-Nilai Ketuhanan.\n\nMISI:\n1. Menyelenggarakan kegiatan pembelajaran inovatif berbasis teknologi dan ramah anak.\n2. Menumbuhkembangkan karakter religius, mandiri, peduli lingkungan, dan berakhlak mulia.\n3. Mengoptimalkan bimbingan potensi akademik, seni, dan olahraga agar bersaing di tingkat nasional maupun internasional.\n4. Menjalin kemitraan sinergis dengan orang tua, masyarakat, dan dunia industri.",
  hero_title: "Penerimaan Peserta Didik Baru Terpadu",
  hero_subtitle: "Selamat Datang di Portal Penerimaan Mahasiswa/Santri Baru (SPMB) Yayasan Yasyfi Tahun Ajaran 2026/2027. Daftarkan putra-putri terbaik Anda secara mandiri dengan praktis, aman, dan transparan.",
  siswa_count: "147",
  guru_count: "40",
  keunggulan: "Kurikulum Merdeka Mandiri Berbagi\nFasilitas Kelas Multimedia dengan AC dan Smart TV\nLaboratorium Komputer & IPA Standar Nasional\nTenaga Pendidik Tersertifikasi & Berpengalaman S2\nBeasiswa Prestasi Akademik, Non-Akademik, & Tahfidz Quran\nLingkungan Sekolah Asri, Aman, Terpantau CCTV 24 Jam",
  ekskul: "Pramuka Wajib\nPalang Merah Remaja (PMR)\nFutsal & Basket Club\nKarya Ilmiah Remaja (KIR)\nSeni Tari & Paduan Suara\nEnglish & Japanese Speaking Club\nRobotika & Coding dasar",
  prestasi: "Juara 1 Olimpiade Sains Nasional (OSN) Bidang Matematika 2025\nJuara Umum Lomba Keterampilan Siswa (LKS) Tingkat Provinsi 2025\nMedali Emas Kejuaraan Pencak Silat Piala Gubernur 2026\nJuara 1 Festival Band Pelajar Klasik Nasional 2026",
  galeri: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&q=80\nhttps://images.unsplash.com/photo-1577896851231-70ef18881754?w=800&q=80\nhttps://images.unsplash.com/photo-1427504494785-319ce224a180?w=800&q=80\nhttps://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800&q=80"
};

export const initialPendaftarList: Pendaftar[] = [];

export const initialWaSettings: WaSettings = {
  endpoint: "https://api.fonnte.com/send",
  token: "",
  admin_wa: ""
};
