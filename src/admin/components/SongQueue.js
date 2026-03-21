import { useState } from 'react';
import {
  addSongToQueue,
  removeSongFromQueue,
  selectSong,
  setSong,
} from '../api';

export default function SongQueue({ songs, onError, onRefresh }) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [duration, setDuration] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!title.trim() || !url.trim()) return;
    setLoading(true);
    try {
      const dur = parseInt(duration, 10);
      await addSongToQueue(title.trim(), url.trim(), dur > 0 ? dur : undefined);
      setTitle('');
      setUrl('');
      setDuration('');
      onRefresh();
    } catch (err) {
      onError(err.response?.data?.message || 'Failed to add song');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (id) => {
    try {
      await selectSong(id);
    } catch (err) {
      onError(err.response?.data?.message || 'Failed to select song');
    }
  };

  const handleRemove = async (id) => {
    try {
      await removeSongFromQueue(id);
      onRefresh();
    } catch (err) {
      onError(err.response?.data?.message || 'Failed to remove song');
    }
  };

  const handleSetDirect = async (e) => {
    e.preventDefault();
    if (!title.trim() || !url.trim()) return;
    setLoading(true);
    try {
      const dur = parseInt(duration, 10);
      await setSong(title.trim(), url.trim(), dur > 0 ? dur : undefined);
      setTitle('');
      setUrl('');
      setDuration('');
    } catch (err) {
      onError(err.response?.data?.message || 'Failed to set song');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white/5 rounded-2xl p-5">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
        Song Queue
      </h2>

      {/* Add form */}
      <form onSubmit={handleAdd} className="flex flex-col gap-2 mb-4">
        <input
          type="text"
          placeholder="Song title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="px-3 py-2 rounded-lg bg-white/10 text-white text-sm placeholder-gray-500 border border-white/10 focus:border-accent focus:outline-none"
        />
        <input
          type="url"
          placeholder="Song URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="px-3 py-2 rounded-lg bg-white/10 text-white text-sm placeholder-gray-500 border border-white/10 focus:border-accent focus:outline-none"
        />
        <input
          type="number"
          placeholder="Duration in seconds (optional)"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          min="0"
          className="px-3 py-2 rounded-lg bg-white/10 text-white text-sm placeholder-gray-500 border border-white/10 focus:border-accent focus:outline-none"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading || !title.trim() || !url.trim()}
            className="flex-1 py-2 rounded-lg bg-accent hover:bg-green-600 text-white text-sm font-semibold transition-colors disabled:opacity-50"
          >
            Add to Queue
          </button>
          <button
            type="button"
            onClick={handleSetDirect}
            disabled={loading || !title.trim() || !url.trim()}
            className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
          >
            Play Now
          </button>
        </div>
      </form>

      {/* Queue list */}
      {songs.length === 0 ? (
        <p className="text-gray-500 text-sm">Queue empty</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {songs.map((song) => (
            <li
              key={song.id}
              className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2"
            >
              <span className="text-white text-sm truncate flex-1 mr-2">
                {song.title}
              </span>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => handleSelect(song.id)}
                  className="px-2 py-1 rounded bg-accent/20 text-accent text-xs hover:bg-accent/30 transition-colors"
                >
                  Play
                </button>
                <button
                  onClick={() => handleRemove(song.id)}
                  className="px-2 py-1 rounded bg-red-500/20 text-red-400 text-xs hover:bg-red-500/30 transition-colors"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
