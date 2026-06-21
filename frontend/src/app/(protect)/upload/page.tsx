"use client";

import { useState } from "react";
import { Upload, FileUp, CheckCircle2, Loader2, X, AlertCircle, FileText } from "lucide-react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function UploadActivityPage() {
  const router = useRouter();
  
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    validateAndSetFile(droppedFile);
  };

  const validateAndSetFile = (selectedFile: File) => {
    setError(null);
    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    if (ext !== 'fit' && ext !== 'gpx') {
      setError("Seuls les fichiers .fit et .gpx sont acceptés.");
      return;
    }
    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('startDate', new Date().toISOString());

    try {
      const res = await api('/upload/activity', {
        method: 'POST',
        body: formData,
      }); 

      if (!res.ok) throw new Error("Erreur lors de l'envoi");

      setShowSuccess(true);
      setFile(null);
      
      setTimeout(() => {
        setShowSuccess(false);
        router.push('/upload'); 
      }, 2000);
    } catch (err) {
      setError("Impossible de téléverser le fichier. Vérifiez votre connexion.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic">Ajouter une activité</h2>
          <p className="text-slate-500 text-sm mt-1">Importez vos fichiers .FIT ou .GPX manuellement.</p>
        </div>
      </div>

      {showSuccess && (
        <div className="mb-6 flex items-center gap-3 bg-emerald-50 text-emerald-700 p-4 rounded-xl border border-emerald-100 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 size={18} />
          <span className="text-sm font-bold tracking-tight">Activité importée avec succès ! Redirection...</span>
        </div>
      )}

      {error && (
        <div className="mb-6 flex items-center gap-3 bg-red-50 text-red-700 p-4 rounded-xl border border-red-100 text-sm font-bold animate-in fade-in slide-in-from-top-2">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      <div className="space-y-8">
        <section className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <div 
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`
              relative group cursor-pointer
              border-2 border-dashed rounded-2xl p-12
              flex flex-col items-center justify-center transition-all duration-200
              ${isDragging ? "border-indigo-500 bg-indigo-50/50" : "border-slate-200 hover:border-slate-300 bg-slate-50/50"}
              ${file ? "border-emerald-500 bg-emerald-50/20" : ""}
            `}
          >
            <input 
              type="file" 
              accept=".fit,.gpx"
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={(e) => e.target.files && validateAndSetFile(e.target.files[0])}
            />

            {!file ? (
              <>
                <div className="p-4 bg-white rounded-2xl shadow-sm mb-4 text-indigo-600 group-hover:scale-110 transition-transform">
                  <Upload size={32} />
                </div>
                <p className="text-lg font-bold text-slate-900 tracking-tight">
                  Cliquez ou glissez votre fichier
                </p>
                <p className="text-slate-500 text-sm mt-1 font-medium">Fichiers .FIT ou .GPX uniquement</p>
              </>
            ) : (
              <div className="flex flex-col items-center animate-in zoom-in-95 duration-200">
                <div className="p-4 bg-emerald-500 rounded-2xl shadow-lg text-white mb-4">
                  <FileText size={32} />
                </div>
                <p className="text-lg font-bold text-emerald-900 tracking-tight max-w-xs truncate">
                  {file.name}
                </p>
                <p className="text-emerald-600 text-xs font-bold uppercase tracking-widest mt-1">
                  {(file.size / 1024).toFixed(1)} KB — Prêt à l'envoi
                </p>
                <button 
                  onClick={(e) => { e.preventDefault(); setFile(null); }}
                  className="mt-6 flex items-center gap-2 text-red-500 hover:text-red-600 text-xs font-black uppercase tracking-tighter transition-colors"
                >
                  <X size={14} /> Annuler
                </button>
              </div>
            )}
          </div>

          <div className="mt-8 flex justify-end">
            <button
              onClick={handleUpload}
              disabled={!file || isUploading}
              className={`
                flex items-center gap-3 px-8 py-4 rounded-2xl text-sm font-black uppercase tracking-widest transition-all
                ${!file || isUploading 
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                  : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-100 hover:translate-y-[-2px] active:translate-y-[0px]"}
              `}
            >
              {isUploading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <FileUp size={18} />
                  Importer l'activité
                </>
              )}
            </button>
          </div>
        </section>

        <section className="bg-slate-900 p-8 rounded-3xl text-white overflow-hidden relative">
            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-white/10 rounded-lg">
                        <AlertCircle className="text-indigo-400" size={20} />
                    </div>
                    <h3 className="font-bold text-lg italic uppercase tracking-tight">Conseils d'import</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                        <p className="text-xs font-black text-indigo-400 uppercase tracking-widest">Doublons</p>
                        <p className="text-sm text-slate-300 leading-relaxed">
                            Si une activité existe déjà sur Strava à la même date, nous fusionnerons les données pour éviter les doublons.
                        </p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs font-black text-indigo-400 uppercase tracking-widest">Confidentialité</p>
                        <p className="text-sm text-slate-300 leading-relaxed">
                            Vos fichiers sont stockés de manière sécurisée sur nos serveurs et ne sont accessibles que par vous.
                        </p>
                    </div>
                </div>
            </div>
            <div className="absolute -right-10 -bottom-10 opacity-10 text-white">
                <Upload size={200} />
            </div>
        </section>
      </div>
    </div>
  );
}