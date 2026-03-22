import { useState, useRef } from 'react';
import { uploadSong, addSongToPlaylist } from '../api';

function getAudioDuration(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.addEventListener('loadedmetadata', () => {
      const dur = Math.round(audio.duration);
      URL.revokeObjectURL(url);
      resolve(dur > 0 && isFinite(dur) ? dur : null);
    });
    audio.addEventListener('error', () => {
      URL.revokeObjectURL(url);
      resolve(null);
    });
    audio.src = url;
  });
}

function titleFromFilename(name) {
  return name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ').trim() || 'Untitled';
}

export default function UploadSection({ onError, onUploaded }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(''); // status text
  const inputRef = useRef(null);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setProgress('Uploading…');
    try {
      // 1. Upload to Azure Blob
      const res = await uploadSong(file);
      const blobUrl = res.data.url;

      // 2. Extract duration from audio file
      setProgress('Reading duration…');
      const duration = await getAudioDuration(file);

      // 3. Derive title from filename
      const title = titleFromFilename(file.name);

      // 4. Auto-add to playlist
      setProgress('Adding to playlist…');
      await addSongToPlaylist(title, blobUrl, duration);

      setProgress(`Added "${title}"`);
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
      if (onUploaded) onUploaded(blobUrl);

      // Clear success message after 3s
      setTimeout(() => setProgress(''), 3000);
    } catch (err) {
      setProgress('');
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

        {file && (
          <p className="text-gray-400 text-xs truncate">
            {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)
          </p>
        )}

        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="py-2 rounded-lg bg-accent hover:bg-green-600 text-white text-sm font-semibold transition-colors disabled:opacity-50"
        >
          {uploading ? progress || 'Uploading…' : 'Upload & Add to Playlist'}
        </button>

        {!uploading && progress && (
          <div className="bg-accent/10 rounded-lg px-3 py-2">
            <p className="text-accent text-sm font-medium">{progress}</p>
          </div>
        )}
      </div>
    </div>
  );
}
