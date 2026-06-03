import React, { useState } from "react";
import { Pendaftar } from "../types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import {
  BarChart3,
  PieChart as PieIcon,
  TrendingUp,
  GraduationCap,
  Users,
  Building,
  CheckCircle,
  XCircle,
  Clock,
  ArrowUpRight
} from "lucide-react";

interface AnalyticsChartsProps {
  applicants: Pendaftar[];
}

export default function AnalyticsCharts({ applicants }: AnalyticsChartsProps) {
  const [activeTab, setActiveTab] = useState<"jenjang" | "status">("jenjang");

  // 1. Data Jenjang
  const jenjangCounts = {
    PAUD: applicants.filter((s) => s.jenjang === "PAUD").length,
    MADIN: applicants.filter((s) => s.jenjang === "MADIN").length,
    SMPI: applicants.filter((s) => s.jenjang === "SMPI").length,
    SMAI: applicants.filter((s) => s.jenjang === "SMAI").length,
  };

  const jenjangColors = {
    PAUD: "#3b82f6", // Blue
    MADIN: "#eab308", // Yellow
    SMPI: "#10b981", // Emerald
    SMAI: "#8b5cf6", // Purple
  };

  const jenjangFullNames = {
    PAUD: "PAUD YASYFI",
    MADIN: "MADIN YASYFI",
    SMPI: "SMPI YASYFI",
    SMAI: "SMAI YASYFI",
  };

  const barData = Object.entries(jenjangCounts).map(([key, value]) => ({
    name: key,
    fullName: jenjangFullNames[key as keyof typeof jenjangFullNames] || key,
    pendaftar: value,
    color: jenjangColors[key as keyof typeof jenjangColors] || "#64748b",
  }));

  // 2. Data Status
  const statusCounts = {
    Baru: applicants.filter((s) => s.status === "Baru").length,
    Terverifikasi: applicants.filter((s) => s.status === "Terverifikasi").length,
    Ditolak: applicants.filter((s) => s.status === "Ditolak").length,
  };

  const statusColors = {
    Baru: "#f59e0b", // Amber
    Terverifikasi: "#10b981", // Emerald
    Ditolak: "#ef4444", // Rose
  };

  const pieData = Object.entries(statusCounts).map(([key, value]) => ({
    name: key,
    value: value,
    color: statusColors[key as keyof typeof statusColors] || "#64748b",
  }));

  const totalPendaftar = applicants.length;

  // Render Custom Tooltip for Recharts
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-lg border border-slate-700/50 text-xs">
          <p className="font-extrabold">{data.fullName || data.name}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: data.color }} />
            <p className="font-medium text-slate-300">
              <span className="font-bold text-white text-sm">{data.pendaftar ?? data.value}</span> Calon Siswa
            </p>
          </div>
          {totalPendaftar > 0 && (
            <p className="text-[10px] text-slate-400 mt-1">
              Porsi: {(((data.pendaftar ?? data.value) / totalPendaftar) * 100).toFixed(1)}% dari total pendaftar
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200/85 shadow-sm space-y-6">
      
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 px-2.5 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] uppercase font-extrabold tracking-wider border border-indigo-100">
              Visual Analytics
            </span>
          </div>
          <h3 className="text-lg font-bold text-slate-900 font-display mt-1 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-indigo-600 animate-pulse" />
            <span>Grafik & Distribusi Calon Siswa</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Analisis pendaftaran santri/siswa per jenjang pendidikan dan status verifikasi berkas.</p>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-slate-100 p-1 rounded-xl self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab("jenjang")}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
              activeTab === "jenjang"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <GraduationCap className="h-3.5 w-3.5" />
            <span>Per Jenjang</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("status")}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
              activeTab === "status"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Status Verifikasi</span>
          </button>
        </div>
      </div>

      {/* Grid Layout: Visual Chart Left, Detail Summary Cards Right */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Visual Chart area (Takes 3 columns on large screens) */}
        <div className="lg:col-span-3 min-h-[280px] sm:min-h-[320px] flex items-center justify-center bg-slate-50/50 rounded-2xl border border-slate-100 p-4">
          {totalPendaftar === 0 ? (
            <div className="text-center py-10 space-y-2">
              <Users className="h-10 w-10 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-500">Belum Ada Data Pendaftar</p>
              <p className="text-xs text-slate-400">Statistik visual akan muncul setelah ada pendaftar baru masuk.</p>
            </div>
          ) : activeTab === "jenjang" ? (
            <div className="w-full h-full min-h-[250px] sm:min-h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} 
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fill: '#64748b', fontSize: 11 }} 
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="pendaftar" radius={[8, 8, 0, 0]} maxBarSize={45}>
                    {barData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="w-full h-full min-h-[250px] sm:min-h-[280px] flex items-center justify-center flex-col sm:flex-row gap-6">
              <div className="w-full max-w-[200px] h-[200px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip content={<CustomTooltip />} />
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Pie Legenda */}
              <div className="flex flex-col gap-3 justify-center text-xs flex-1">
                {pieData.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-100 shadow-3xs">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="font-bold text-slate-700">{item.name}</span>
                    </div>
                    <div className="text-right font-mono">
                      <span className="font-extrabold text-slate-900">{item.value}</span>
                      <span className="text-slate-400 text-[10px] ml-1.5">
                        ({totalPendaftar > 0 ? ((item.value / totalPendaftar) * 100).toFixed(0) : 0}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Info panel: Detail Breakdown (Takes 2 columns on large screens) */}
        <div className="lg:col-span-2 flex flex-col justify-between space-y-4">
          
          <div className="space-y-3.5">
            <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Building className="h-3.5 w-3.5 text-slate-400" />
              <span>Rincian Kuota & Pendaftar</span>
            </h4>

            {activeTab === "jenjang" ? (
              <div className="space-y-2.5">
                {barData.map((item, idx) => {
                  const percent = totalPendaftar > 0 ? (item.pendaftar / totalPendaftar) * 100 : 0;
                  return (
                    <div key={idx} className="bg-slate-50 border border-slate-100 p-3 rounded-2xl space-y-2 hover:bg-white hover:shadow-xs transition duration-200">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="font-bold text-slate-800">{item.fullName}</span>
                        </div>
                        <span className="font-mono font-extrabold text-slate-950">
                          {item.pendaftar} <span className="text-slate-400 font-normal">Siswa</span>
                        </span>
                      </div>
                      
                      {/* Visual Progress Line */}
                      <div className="h-2 w-full bg-slate-200/60 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500"
                          style={{ 
                            width: `${totalPendaftar > 0 ? Math.max(percent, 4) : 0}%`, 
                            backgroundColor: item.color 
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                        <span>Porsi Pendaftaran</span>
                        <span className="font-mono">{percent.toFixed(1)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2.5">
                {/* Statistics Box */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-amber-50 border border-amber-150 p-3 rounded-xl text-center">
                    <Clock className="mx-auto h-4 w-4 text-amber-600 mb-1" />
                    <span className="text-[10px] text-slate-500 font-bold block">Baru</span>
                    <span className="text-base font-extrabold text-amber-700 font-mono">{statusCounts.Baru}</span>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-150 p-3 rounded-xl text-center">
                    <CheckCircle className="mx-auto h-4 w-4 text-emerald-600 mb-1" />
                    <span className="text-[10px] text-slate-500 font-bold block">Terverifikasi</span>
                    <span className="text-base font-extrabold text-emerald-700 font-mono">{statusCounts.Terverifikasi}</span>
                  </div>
                  <div className="bg-rose-50 border border-rose-150 p-3 rounded-xl text-center">
                    <XCircle className="mx-auto h-4 w-4 text-rose-600 mb-1" />
                    <span className="text-[10px] text-slate-500 font-bold block">Ditolak</span>
                    <span className="text-base font-extrabold text-rose-700 font-mono">{statusCounts.Ditolak}</span>
                  </div>
                </div>

                {/* Additional Insight Summary Card */}
                <div className="bg-indigo-50/50 border border-indigo-100 p-3 rounded-xl text-xs space-y-1">
                  <span className="font-bold text-indigo-900 block">Status Rasio Kelulusan</span>
                  <p className="text-slate-650 leading-relaxed text-[11px]">
                    Hingga hari ini, sebanyak <strong className="text-slate-900 font-extrabold">{totalPendaftar > 0 ? ((statusCounts.Terverifikasi / totalPendaftar) * 100).toFixed(0) : 0}%</strong> pendaftar baru telah diverifikasi kelayakan berkasnya secara sukses dan siap disurati untuk tahap seleksi / lapor diri berikutnya.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Card Footer Banner */}
          <div className="bg-slate-900 text-white p-3.5 rounded-2xl flex items-center justify-between gap-3 shadow-md">
            <div>
              <p className="text-[9px] text-slate-400 uppercase tracking-widest font-mono font-bold">Total Registrasi Masuk</p>
              <p className="text-lg font-black font-display text-white mt-0.5">{totalPendaftar} Siswa Pendaftar</p>
            </div>
            <div className="bg-white/10 hover:bg-white/20 p-2 rounded-xl transition cursor-pointer">
              <ArrowUpRight className="h-4.5 w-4.5 text-white" />
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
