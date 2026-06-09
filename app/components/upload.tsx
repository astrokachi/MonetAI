"use client";
import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { UploadSimpleIcon, FilePdfIcon, ImageIcon, XIcon, CheckCircleIcon } from "@phosphor-icons/react";

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function UploadComponent() {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (): Promise<void> => {
    if (!file || loading) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    const headers: Record<string, string> = {};
    if (password) {
      headers["x-pdf-password"] = password;
    }

    const data = await fetch('/api/upload', {
      method: "POST",
      body: formData,
      headers: headers
    })
    const res = await data.json();
    setResult(res)
    // setResult({ name: res.info, size: file.size, type: file.type, status: "uploaded" });
    setLoading(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files?.[0] ?? null;
    if (dropped) setFile(dropped);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setResult(null);
  };

  const handleRemove = (): void => {
    setFile(null);
    setResult(null);
  };

  const isImage = file?.type.startsWith("image/") ?? false;

  const isDisabled = !file || loading;

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-6 font-sans">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-sm flex flex-col gap-5">

        <div className="flex flex-col gap-1">
          <UploadSimpleIcon size={20} weight="light" className="text-gray-400 mb-1" />
          <h2 className="text-base font-medium text-gray-800 tracking-tight">Upload file</h2>
          <p className="text-xs text-gray-400">PDF or image, up to 10 MB</p>
        </div>

        <div
          className={`
            rounded-xl border transition-colors duration-150 min-h-28 flex items-center justify-center px-5 py-7
            ${file
              ? "border border-gray-200 bg-white cursor-default"
              : dragOver
                ? "border-dashed border-gray-300 bg-gray-100 cursor-pointer"
                : "border-dashed border-gray-200 bg-gray-50 cursor-pointer"
            }
          `}
          onClick={() => !file && inputRef.current?.click()}
          onDragOver={(e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          {!file ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center">
                <UploadSimpleIcon size={22} weight="light" className="text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">
                {dragOver ? "Drop it here" : "Drag & drop or click to browse"}
              </p>
              <p className="text-xs text-gray-300 tracking-wide">PDF · PNG · JPG · WEBP</p>
            </div>
          ) : (
            <div className="flex items-center gap-3 w-full animate-[fadeUp_0.2s_ease]">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                {isImage
                  ? <ImageIcon size={20} weight="light" className="text-gray-500" />
                  : <FilePdfIcon size={20} weight="light" className="text-gray-500" />
                }
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium text-gray-700 truncate">{file.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{formatSize(file.size)}</p>
              </div>
              <button
                className="text-gray-300 hover:text-gray-400 p-1 rounded transition-colors shrink-0"
                onClick={(e) => { e.stopPropagation(); handleRemove(); }}
              >
                <XIcon size={14} weight="bold" />
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="password" className="text-xs font-medium text-gray-600">Password (optional)</label>
          <input
            id="password"
            type="password"
            placeholder="Enter PDF password if required"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 placeholder-gray-400 transition-colors duration-150 focus:outline-none focus:border-gray-400 focus:bg-gray-50"
          />
        </div>

        <button
          className={`
            w-full py-3 rounded-xl text-sm font-medium tracking-wide transition-colors duration-150
            ${!file || loading
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-gray-800 text-white cursor-pointer hover:bg-gray-700"
            }
          `}
          onClick={handleUpload}
          disabled={isDisabled}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
              Processing…
            </span>
          ) : (
            "Upload"
          )}
        </button>

        {result && (
          <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3.5 animate-[fadeUp_0.25s_ease]">
            <div className="flex items-center gap-2 ">
              <CheckCircleIcon size={14} weight="fill" className="text-emerald-400 shrink-0" />
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Done</span>
            </div>
            <pre className="text-xs text-gray-500 leading-relaxed font-mono whitespace-pre-wrap break-all">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&display=swap');
        body { font-family: 'DM Sans', sans-serif; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
