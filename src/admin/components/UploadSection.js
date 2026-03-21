import { useState, useRef } from 'react';
import { uploadSong } from '../api';

export default function UploadSection({ onError, onUploaded }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setResult(null);
    try {
      const res = await uploadSong(file);
      setResult(res.data);
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
      if (onUploaded) onUploaded(res.data.url);
    } catch (err) {
      onError(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white/5 rounded-2xl p-5">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
        Upload Song
      </h2>

      <div className="flex flex-col gap-3">
        <input
          ref={inputRef}
          type="file"
          accept="audio/*"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="text-sm text-gray-300 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-white/10 file:text-white file:font-semibold file:cursor-pointer hover:file:bg-white/20"
        />
        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="py-2 rounded-lg bg-accent hover:bg-green-600 text-white text-sm font-semibold transition-colors disabled:opacity-50"
        >
          {uploading ? 'Uploading…' : 'Upload'}
        </button>

        {result && (
          <div className="bg-accent/10 rounded-lg p-3">
            <p className="text-accent text-sm font-medium">{result.message}</p>
            <p className="text-gray-400 text-xs mt-1 break-all">{result.url}</p>
          </div>
        )}
      </div>
    </div>
  );
}
