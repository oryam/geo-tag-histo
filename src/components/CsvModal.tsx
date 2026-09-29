import React, { useState } from 'react';
import { Upload, Download, X, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { BleLocationPoint } from '../types/ble';
import { parseBleCsv, exportToCsv, downloadCsvFile } from '../utils/geo';

interface CsvModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (points: BleLocationPoint[], mode: 'replace' | 'append') => void;
  allPoints: BleLocationPoint[];
  filteredPoints: BleLocationPoint[];
}

export const CsvModal: React.FC<CsvModalProps> = ({
  isOpen,
  onClose,
  onImport,
  allPoints,
  filteredPoints,
}) => {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');
  const [fileContent, setFileContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [exportScope, setExportScope] = useState<'filtered' | 'all'>('filtered');

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setErrorMsg(null);

    const reader = new FileReader();
    reader.onload = event => {
      const text = event.target?.result as string;
      setFileContent(text);
      try {
        const parsed = parseBleCsv(text);
        if (parsed.length === 0) {
          setErrorMsg('Aucune donnée valide trouvée dans ce fichier CSV.');
          setPreviewCount(null);
        } else {
          setPreviewCount(parsed.length);
        }
      } catch (err) {
        setErrorMsg('Erreur lors de la lecture du fichier CSV.');
        setPreviewCount(null);
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = () => {
    if (!fileContent) return;
    try {
      const parsed = parseBleCsv(fileContent);
      if (parsed.length === 0) {
        setErrorMsg('Aucune ligne de coordonnées valide détectée.');
        return;
      }
      onImport(parsed, importMode);
      onClose();
    } catch (err) {
      setErrorMsg('Impossible d’importer ce fichier.');
    }
  };

  const handleExecuteExport = () => {
    const dataToExport = exportScope === 'filtered' ? filteredPoints : allPoints;
    const csvString = exportToCsv(dataToExport);
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadCsvFile(csvString, `ble_geolocalisation_${exportScope}_${dateStr}.csv`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-[#111827] border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Import / Export CSV</h3>
              <p className="text-xs text-slate-400">Gérez les données de géolocalisation en mémoire</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-900/60 p-1 m-4 rounded-lg">
          <button
            onClick={() => setActiveTab('import')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'import'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Importer un fichier CSV
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'export'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            Exporter les données
          </button>
        </div>

        {/* Modal Body */}
        <div className="px-5 pb-5">
          {activeTab === 'import' ? (
            <div className="space-y-4">
              {/* Option Mode: Replace or Append */}
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-2">
                  Action sur les données existantes :
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setImportMode('replace')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      importMode === 'replace'
                        ? 'bg-indigo-600/10 border-indigo-500 text-white'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-semibold text-xs text-indigo-300 mb-0.5">Remplacer</div>
                    <div className="text-[11px] text-slate-400">Écrase toutes les données actuelles</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportMode('append')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      importMode === 'append'
                        ? 'bg-indigo-600/10 border-indigo-500 text-white'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-semibold text-xs text-indigo-300 mb-0.5">Ajouter</div>
                    <div className="text-[11px] text-slate-400">Ajoute aux données existantes</div>
                  </button>
                </div>
              </div>

              {/* Upload Zone */}
              <div className="border-2 border-dashed border-slate-700/80 hover:border-indigo-500/80 rounded-xl p-5 text-center bg-slate-900/40 transition-colors">
                <input
                  type="file"
                  id="csv-file-input"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label
                  htmlFor="csv-file-input"
                  className="cursor-pointer flex flex-col items-center justify-center"
                >
                  <Upload className="w-8 h-8 text-indigo-400 mb-2" />
                  <span className="text-xs font-medium text-slate-200">
                    Cliquez pour choisir un fichier CSV
                  </span>
                  <span className="text-[11px] text-slate-500 mt-1">
                    Format attendu : device_id, location_latitude, location_longitude...
                  </span>
                </label>
              </div>

              {/* File status / preview */}
              {fileName && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span className="text-slate-200 font-mono truncate">{fileName}</span>
                  </div>
                  {previewCount !== null && (
                    <span className="text-emerald-400 font-medium shrink-0 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {previewCount} positions prêtes
                    </span>
                  )}
                </div>
              )}

              {errorMsg && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={onClose}
                  className="px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  disabled={!fileContent || previewCount === null || previewCount === 0}
                  onClick={handleExecuteImport}
                  className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors"
                >
                  Confirmer l'import ({importMode === 'replace' ? 'Remplacer' : 'Ajouter'})
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Export scope choice */}
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-2">
                  Périmètre de l'exportation :
                </label>
                <div className="space-y-2">
                  <label
                    onClick={() => setExportScope('filtered')}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      exportScope === 'filtered'
                        ? 'bg-indigo-600/10 border-indigo-500 text-white'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-xs text-slate-200">
                        Données actuellement filtrées
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Exporte les {filteredPoints.length} positions visibles selon les filtres
                      </div>
                    </div>
                    <span className="font-mono text-xs font-bold text-indigo-400">
                      {filteredPoints.length}
                    </span>
                  </label>

                  <label
                    onClick={() => setExportScope('all')}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      exportScope === 'all'
                        ? 'bg-indigo-600/10 border-indigo-500 text-white'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-xs text-slate-200">
                        Toutes les données en mémoire
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Exporte l'intégralité des {allPoints.length} positions
                      </div>
                    </div>
                    <span className="font-mono text-xs font-bold text-indigo-400">
                      {allPoints.length}
                    </span>
                  </label>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={onClose}
                  className="px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Fermer
                </button>
                <button
                  onClick={handleExecuteExport}
                  className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Télécharger le fichier CSV
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
