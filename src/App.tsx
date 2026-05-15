import React, { useState, useEffect, useRef, useCallback } from 'react';
import { WatermarkEngine, ProcessResult } from './lib/engine';
import JSZip from 'jszip';
import 'iconify-icon';
import { Footer } from './components/Footer'

interface ProcessedFile extends ProcessResult {
  name: string;
  url: string;
}

const App: React.FC = () => {
  const [engine, setEngine] = useState<WatermarkEngine | null>(null);
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initEngine = async () => {
      try {
        const eng = await WatermarkEngine.create();
        setEngine(eng);
      } catch (e) {
        alert("Error: Assets not found.");
      }
    };
    initEngine();
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
    }
  }, [isDarkMode]);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || !engine) return;
    const validFiles = Array.from(files).filter(f => f.type.match('image.*'));
    if (validFiles.length === 0) return;

    setIsProcessing(true);
    const newProcessedFiles: ProcessedFile[] = [];

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      try {
        const result = await engine.process(file);
        const fileName = `clean_${file.name.replace(/\.[^/.]+$/, "")}.png`;
        const fileData: ProcessedFile = {
          ...result,
          name: fileName,
          url: URL.createObjectURL(result.blob),
        };
        newProcessedFiles.push(fileData);
      } catch (err) {
        console.error(err);
      }
    }

    setProcessedFiles(prev => [...prev, ...newProcessedFiles]);
    setIsProcessing(false);
  }, [engine]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    uploadAreaRef.current?.classList.remove('border-brand-primary', 'bg-blue-50');
    handleFiles(e.dataTransfer.files);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    uploadAreaRef.current?.classList.add('border-brand-primary', 'bg-blue-50');
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    uploadAreaRef.current?.classList.remove('border-brand-primary', 'bg-blue-50');
  };

  const reset = () => {
    processedFiles.forEach(file => {
      URL.revokeObjectURL(file.url);
      URL.revokeObjectURL(file.originalSrc);
    });
    setProcessedFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const downloadAll = async () => {
    if (processedFiles.length === 0) return;
    const zip = new JSZip();
    processedFiles.forEach(item => zip.file(item.name, item.blob));
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cleaned_images_${Date.now()}.zip`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const downloadSingle = (file: ProcessedFile) => {
    const a = document.createElement('a');
    a.href = file.url;
    a.download = file.name;
    a.click();
  };

  const bgPattern = "bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0iI2Y5ZmRmZCI+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjZjJmMmYyIi8+PHJlY3QgeD0iMTAiIHk9IjEwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9IiNmMmYyZjIiLz48L3N2Zz4=')] dark:bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0ibm9uZSI+PHJlY3Qgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiBmaWxsPSIjMjYyOTMwIi8+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjMWQxZjI0Ii8+PHJlY3QgeD0iMTAiIHk9IjEwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9IiMxZDFmMjQiLz48L3N2Zz4=')]";

  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-theme-dark/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="text-3xl select-none">✨</span>
            <h1 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white whitespace-nowrap tracking-tight">
              AI Sparkle <span className="text-brand-primary">Remover</span>
            </h1>
          </div>
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-slate-600 dark:text-slate-400 transition-all focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
            aria-label="Toggle Dark Mode"
          >
            {isDarkMode ? (
              <iconify-icon icon="ph:sun-bold" width="22"></iconify-icon>
            ) : (
              <iconify-icon icon="ph:moon-bold" width="22"></iconify-icon>
            )}
          </button>
        </div>
      </header>

      <main className="flex-grow w-full">
        <section className="py-12 text-center px-4">
          <h2 className="text-3xl md:text-5xl font-extrabold mb-4 pb-1 text-slate-900 dark:text-white tracking-tight">
            Remove <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-primary via-brand-secondary to-brand-accent">AI Sparkle Watermark</span>
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-xl mx-auto font-medium leading-relaxed text-base md:text-lg">
            Remove the visible ✨ AI-Sparkle watermark from Gemini AI images.
            <span className="block md:inline"> Client-side processing powered by your browser.</span>
            <span className="block md:inline text-brand-primary dark:text-brand-secondary font-semibold"> Free, fast, lossless and private.</span>
          </p>

          <div className="max-w-5xl mx-auto bg-white dark:bg-theme-cardDark rounded-3xl shadow-xl dark:shadow-none p-4 border border-gray-100 dark:border-gray-800 relative z-10 transition-colors">
            {processedFiles.length === 0 && !isProcessing ? (
              <div
                ref={uploadAreaRef}
                onClick={() => fileInputRef.current?.click()}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                className="group relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl bg-gray-50/50 dark:bg-gray-800/50 hover:bg-indigo-50/50 dark:hover:bg-gray-800 hover:border-brand-primary dark:hover:border-brand-primary transition-all cursor-pointer"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <div className="w-16 h-16 bg-white dark:bg-gray-700 rounded-full shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <iconify-icon icon="ph:upload-simple-bold" class="text-3xl text-gray-400 dark:text-gray-300 group-hover:text-brand-primary"></iconify-icon>
                  </div>
                  <p className="mb-2 text-lg font-bold text-slate-700 dark:text-slate-200 group-hover:text-brand-primary transition-colors">Click to upload or drag images</p>
                  <p className="text-sm text-slate-400 dark:text-slate-500">PNG, JPG, WebP<br />Supports Multiple Files</p>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => handleFiles(e.target.files)}
                  accept="image/*"
                  multiple
                  className="hidden"
                />
              </div>
            ) : (
              <div className="text-left mt-6 animate-fade-in">
                <div className="flex flex-col lg:flex-row gap-8">
                  <div className="flex-1 space-y-6 min-w-0">
                    {processedFiles.map((file, idx) => (
                      <div key={idx} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-white dark:bg-theme-cardDark rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800 animate-fade-in">
                        <div className="bg-white dark:bg-theme-cardDark rounded-xl shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700">
                          <div className="bg-gray-50 dark:bg-gray-800/80 px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="font-bold text-slate-700 dark:text-slate-200 text-xs">Original</h3>
                            <div className="text-[10px] font-mono text-slate-500">{file.width} × {file.height} px</div>
                          </div>
                          <div className={`p-3 ${bgPattern} flex justify-center h-64`}>
                            <img src={file.originalSrc} alt="Original" className="max-h-full object-contain rounded shadow-sm mx-auto" />
                          </div>
                        </div>
                        <div className="bg-white dark:bg-theme-cardDark rounded-xl shadow-md overflow-hidden border border-green-500/40 ring-2 ring-green-500/20">
                          <div className="bg-green-50 dark:bg-green-900/20 px-3 py-2 border-b border-green-500/30 flex justify-between items-center">
                            <div className="flex items-center gap-1 font-bold text-green-600 dark:text-green-400 text-xs">
                              <iconify-icon icon="ph:check-circle-fill" width="16"></iconify-icon>Completed
                            </div>
                            <button
                              onClick={() => downloadSingle(file)}
                              className="flex items-center gap-1 px-3 py-1.5 text-[11px] sm:text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-all active:scale-95"
                            >
                              <iconify-icon icon="ph:download-simple-bold" width="14"></iconify-icon> Download
                            </button>
                          </div>
                          <div className={`p-3 ${bgPattern} flex justify-center h-64`}>
                            <img src={file.url} alt="Processed" className="max-h-full object-contain rounded shadow-sm mx-auto" />
                          </div>
                        </div>
                      </div>
                    ))}
                    {isProcessing && (
                      <div className="flex flex-col items-center py-12">
                        <div className="w-12 h-12 rounded-full border-4 border-transparent border-t-brand-primary animate-spin mb-4"></div>
                        <p className="text-brand-primary font-bold">Processing images...</p>
                      </div>
                    )}
                  </div>
                  <div className="w-full lg:w-72 flex-shrink-0">
                    <div className="bg-white dark:bg-theme-cardDark rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800 p-5 sticky top-24">
                      <h4 className="font-bold text-slate-900 dark:text-white mb-4">Actions</h4>
                      {processedFiles.length === 1 && (
                        <button
                          onClick={() => downloadSingle(processedFiles[0])}
                          className="group w-full py-3.5 relative overflow-hidden rounded-xl font-bold mb-3 text-white shadow-lg shadow-brand-primary/30 transition-all duration-300"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-brand-primary via-brand-secondary to-brand-accent opacity-100 group-hover:scale-110 transition-transform duration-500"></div>
                          <div className="relative flex items-center justify-center gap-2">
                            <iconify-icon icon="ph:download-simple-bold" width="20"></iconify-icon>
                            Download
                          </div>
                        </button>
                      )}
                      {processedFiles.length > 1 && (
                        <button
                          onClick={downloadAll}
                          className="group w-full py-3.5 relative overflow-hidden rounded-xl font-bold mb-3 text-white shadow-lg shadow-green-500/30 transition-all duration-300"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 opacity-100 group-hover:scale-110 transition-transform duration-500"></div>
                          <div className="relative flex items-center justify-center gap-2">
                            <iconify-icon icon="ph:file-zip-bold" width="20"></iconify-icon>
                            Download All ZIP
                          </div>
                        </button>
                      )}
                      <button
                        onClick={reset}
                        className="w-full py-3.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-slate-600 dark:text-slate-300 hover:border-brand-primary hover:text-brand-primary dark:hover:border-brand-primary dark:hover:text-brand-primary rounded-xl font-bold transition-all duration-300"
                      >
                        Process Another
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default App;
