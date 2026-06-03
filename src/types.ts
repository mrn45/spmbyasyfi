export interface PendaftarFiles {
  kk: { name: string; mimeType: string; data: string } | null;
  akta: { name: string; mimeType: string; data: string } | null;
  skl: { name: string; mimeType: string; data: string } | null;
  foto: { name: string; mimeType: string; data: string } | null;
}

export interface Pendaftar {
  noDaftar: string;
  nisn: string;
  nik: string;
  nama: string;
  tempatLahir: string;
  tglLahir: string;
  jk: string;
  agama: string;
  alamat: string;
  rtrw: string;
  dusun: string;
  desa: string;
  kecamatan: string;
  kodepos: string;
  namaAyah: string;
  namaIbu: string;
  nikOrtu: string;
  pekerjaan: string;
  penghasilan: string;
  noWA: string;
  asalSekolah: string;
  tahunLulus: string;
  npsn: string;
  jenjang: string;
  status: "Baru" | "Terverifikasi" | "Ditolak";
  files: PendaftarFiles;
  createdAt: string;
}

export interface WebContent {
  profil: string;
  visimisi: string;
  hero_title?: string;
  hero_subtitle?: string;
  siswa_count?: string;
  guru_count?: string;
  keunggulan: string;
  ekskul: string;
  prestasi: string;
  galeri: string;
}

export interface WaSettings {
  endpoint: string;
  token: string;
  admin_wa?: string;
}
