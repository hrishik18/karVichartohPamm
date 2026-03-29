import { useState, useRef } from 'react';
import { uploadSongs, addSongToPlaylist } from '../api';
import { useToast } from '../../components/Toast';

const MAX_FILES = 10;

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
  const toast = useToast();
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(''); // status text
  const inputRef = useRef(null);

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length > MAX_FILES) {
      onError(`Maximum ${MAX_FILES} files at once`);
      e.target.value = '';
      return;
    }
    setFiles(selected);
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    setProgress(`Uploading ${files.length} file${files.length > 1 ? 's' : ''}…`);
    try {
      // 1. Upload all files to Azure Blob
      const res = await uploadSongs(files);
      const results = res.data.results;

      // 2. For each uploaded file, get duration and add to playlist
      for (let i = 0; i < results.length; i++) {
        const { originalName, url: blobUrl } = results[i];
        const title = titleFromFilename(originalName);
        setProgress(`Adding ${i + 1}/${results.length}: "${title}"…`);

        const matchingFile = files.find((f) => f.name === originalName);
        const duration = matchingFile ? await getAudioDuration(matchingFile) : null;

        await addSongToPlaylist(title, blobUrl, duration);
      }

      setProgress('');
      toast.success(`Added ${results.length} song${results.length > 1 ? 's' : ''} to playlist`);
      setFiles([]);
      if (inputRef.current) inputRef.current.value = '';
      if (onUploaded) onUploaded();
    } catch (err) {
      setProgress('');
      onError(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-card rounded-2xl p-5">
      <h2 className="text-sm font-semibold text-txt-secondary uppercase tracking-wider mb-3">
        Upload Songs
      </h2>

      <div className="flex flex-col gap-3">
        <input
          ref={inputRef}
          type="file"
          accept="audio/*"
          multiple
          onChange={handleFileChange}
          className="text-sm text-body file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-elevated file:text-heading file:font-semibold file:cursor-pointer hover:file:bg-elevated-hover"
        />

        {files.length > 0 && (
          <div className="text-txt-secondary text-xs space-y-0.5">
            {files.map((f, i) => (
              <p key={i} className="truncate">
                {f.name} ({(f.size / 1024 / 1024).toFixed(1)} MB)
              </p>
            ))}
            <p className="text-muted pt-1">
              {files.length} file{files.length > 1 ? 's' : ''} selected (max {MAX_FILES})
            </p>
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={files.length === 0 || uploading}
          className="py-2 rounded-lg bg-accent hover:bg-green-600 text-white text-sm font-semibold transition-colors disabled:opacity-50"
        >
          {uploading ? progress || 'Uploading…' : `Upload${files.length > 0 ? ` ${files.length}` : ''} & Add to Playlist`}
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
