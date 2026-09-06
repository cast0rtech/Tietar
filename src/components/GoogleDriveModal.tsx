import React, { useEffect, useState } from 'react';
import { 
  X, 
  Cloud, 
  HardDrive, 
  Download, 
  Upload, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  FolderArchive,
  Sparkles
} from 'lucide-react';
import { GoogleDriveService, type StorageStats } from '../services/googleDrive';

interface GoogleDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataRestored?: () => void;
}

export const GoogleDriveModal: React.FC<GoogleDriveModalProps> = ({
  isOpen,
  onClose,
  onDataRestored,
}) => {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadStats();
    }
  }, [isOpen]);

  const loadStats = async () => {
    const s = await GoogleDriveService.getStorageStats();
    setStats(s);
  };

  const handleDownloadBackup = async () => {
    try {
      setLoading(true);
      await GoogleDriveService.downloadBackupFile();
      setStatusMessage({ type: 'success', text: 'Copia de seguridad descargada con éxito para Google Drive.' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'Error al generar la copia.' });
    } finally {
      setLoading(false);
    }
  };

  const handleFileRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const text = await file.text();
      await GoogleDriveService.restoreBackupFromJson(text);
      setStatusMessage({ type: 'success', text: '¡Base de datos restaurada correctamente!' });
      await loadStats();
      if (onDataRestored) onDataRestored();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error al restaurar copia.' });
    } finally {
      setLoading(false);
    }
  };

  const handleFreeStorage = async () => {
    if (!confirm('¿Deseas archivar los puntos GPS detallados de hace más de 30 días? Se generará un archivo de respaldo para Drive y se liberará espacio en el móvil, conservando los resúmenes de tus viajes.')) {
      return;
    }

    try {
      setLoading(true);
      const res = await GoogleDriveService.freeStorageArchiveOldPoints(30);
      if (res.pointsDeleted > 0) {
        setStatusMessage({
          type: 'success',
          text: `¡Liberado ${res.spaceSavedFormatted}! Se archivaron ${res.pointsDeleted} puntos GPS antiguos.`,
        });
      } else {
        setStatusMessage({ type: 'success', text: 'No había puntos GPS con más de 30 días de antigüedad.' });
      }
      await loadStats();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'Error al liberar espacio.' });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md rounded-2xl glass-panel p-5 border border-white/10 space-y-4 shadow-2xl relative">
        {/* Botón Cerrar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Título */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Cloud className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white font-heading">Google Drive y Almacenamiento</h3>
            <p className="text-xs text-gray-400">Copias de seguridad y liberación de espacio móvil</p>
          </div>
        </div>

        {/* Mensaje de Estado */}
        {statusMessage && (
          <div className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
            statusMessage.type === 'success' 
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' 
              : 'bg-red-500/15 border-red-500/30 text-red-300'
          }`}>
            {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {statusMessage.text}
          </div>
        )}

        {/* Estadísticas de Almacenamiento Local */}
        <div className="bg-black/40 p-3.5 rounded-xl border border-white/5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400 flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
              Espacio Ocupado en el Móvil:
            </span>
            <span className="font-bold text-white">{stats?.estimatedSizeFormatted || 'Calculando...'}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-[11px] text-gray-400">
            <div>• {stats?.drivesCount || 0} viajes ({stats?.drivePointsCount || 0} puntos GPS)</div>
            <div>• {stats?.chargesCount || 0} sesiones de carga</div>
          </div>
        </div>

        {/* Función Especial: Liberar Espacio en el Móvil */}
        <div className="bg-gradient-to-br from-indigo-950/40 to-blue-950/30 p-4 rounded-xl border border-indigo-500/30 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-300 font-heading">
            <FolderArchive className="w-4 h-4 text-indigo-400" />
            Liberar Espacio en el Móvil
          </div>
          <p className="text-xs text-gray-300 leading-relaxed">
            Archiva en Google Drive los puntos GPS antiguos (&gt; 30 días) y bórralos del teléfono. Mantendrás intactos los resúmenes, consumos y fechas de todos tus viajes sin sobrecargar la memoria.
          </p>
          <button
            disabled={loading}
            onClick={handleFreeStorage}
            className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Archivar a Drive y Liberar Espacio
          </button>
        </div>

        {/* Acciones de Copia y Restauración */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            disabled={loading}
            onClick={handleDownloadBackup}
            className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 text-xs font-semibold text-white flex items-center justify-center gap-2 transition"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            Crear Copia (JSON)
          </button>

          <label className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 text-xs font-semibold text-white flex items-center justify-center gap-2 cursor-pointer transition">
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
            <span>Restaurar Copia</span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileRestore}
              className="hidden"
            />
          </label>
        </div>
      </div>
    </div>
  );
};
