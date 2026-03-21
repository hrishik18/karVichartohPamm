import { useState } from 'react';
import {
  addSongToPlaylist,
  removeSongFromPlaylist,
  playSongFromPlaylist,
  setSong,
  editSongInPlaylist,
  reorderSong,
} from '../api';

export default function SongQueue({ songs, onError, onRefresh }) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [duration, setDuration] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [editing, setEditing] = useState(null); // { id, title, url, duration }

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!title.trim() || !url.trim()) return;
    setLoading(true);
    try {
      const dur = parseInt(duration, 10);
      await addSongToPlaylist(title.trim(), url.trim(), dur > 0 ? dur : undefined);
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
      await playSongFromPlaylist(id);
    } catch (err) {
      onError(err.response?.data?.message || 'Failed to select song');
    }
  };

  const handleRemove = async (id) => {
    try {
      await removeSongFromPlaylist(id);
      if (selectedId === id) setSelectedId(null);
      if (editing?.id === id) setEditing(null);
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

  const handleReorder = async (id, direction) => {
    try {
      await reorderSong(id, direction);
      onRefresh();
    } catch (err) {
      onError(err.response?.data?.message || 'Failed to reorder');
    }
  };

  const startEdit = (song) => {
    setEditing({
      id: song.id,
      title: song.title,
      url: song.url,
      duration: song.duration || '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    try {
      const updates = {};
      if (editing.title) updates.title = editing.title;
      if (editing.url) updates.url = editing.url;
      const dur = parseInt(editing.duration, 10);
      if (dur > 0) updates.duration = dur;
      else updates.duration = null;
      await editSongInPlaylist(editing.id, updates);
      setEditing(null);
      onRefresh();
    } catch (err) {
      onError(err.response?.data?.message || 'Failed to edit song');
    }
  };

  const toggleSelect = (id) => {
    setSelectedId(selectedId === id ? null : id);
    if (editing && editing.id !== id) setEditing(null);
  };

  return (
    <div className="bg-white/5 rounded-2xl p-5">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
        Playlist
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
            Add to Playlist
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
        <p className="text-gray-500 text-sm">Playlist empty</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {songs.map((song, index) => (
            <li key={song.id}>
              {/* Song row */}
              <div
                onClick={() => toggleSelect(song.id)}
                className={`flex items-center justify-between rounded-lg px-3 py-2 cursor-pointer transition-colors ${
                  selectedId === song.id
                    ? 'bg-white/10 ring-1 ring-accent/40'
                    : 'bg-white/5 hover:bg-white/[0.07]'
                }`}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-gray-500 text-xs w-5 text-right shrink-0">
                    {index + 1}
                  </span>
                  <span className="text-white text-sm truncate">
                    {song.title}
                  </span>
                  {song.duration && (
                    <span className="text-gray-500 text-xs shrink-0">
                      {Math.floor(song.duration / 60)}:{String(song.duration % 60).padStart(2, '0')}
                    </span>
                  )}
                </div>
                <span className="text-gray-600 text-xs shrink-0 ml-2">
                  {selectedId === song.id ? '▾' : '▸'}
                </span>
              </div>

              {/* Expanded actions */}
              {selectedId === song.id && !editing && (
                <div className="flex flex-wrap gap-1 px-3 py-2 bg-white/[0.03] rounded-b-lg -mt-1">
                  <button
                    onClick={() => handleReorder(song.id, 'up')}
                    disabled={index === 0}
                    className="px-2 py-1 rounded bg-white/10 text-gray-300 text-xs hover:bg-white/20 transition-colors disabled:opacity-30"
                  >
                    ▲ Up
                  </button>
                  <button
                    onClick={() => handleReorder(song.id, 'down')}
                    disabled={index === songs.length - 1}
                    className="px-2 py-1 rounded bg-white/10 text-gray-300 text-xs hover:bg-white/20 transition-colors disabled:opacity-30"
                  >
                    ▼ Down
                  </button>
                  <button
                    onClick={() => startEdit(song)}
                    className="px-2 py-1 rounded bg-yellow-500/20 text-yellow-400 text-xs hover:bg-yellow-500/30 transition-colors"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleSelect(song.id)}
                    className="px-2 py-1 rounded bg-accent/20 text-accent text-xs hover:bg-accent/30 transition-colors"
                  >
                    ▶ Play
                  </button>
                  <button
                    onClick={() => handleRemove(song.id)}
                    className="px-2 py-1 rounded bg-red-500/20 text-red-400 text-xs hover:bg-red-500/30 transition-colors"
                  >
                    🗑 Remove
                  </button>
                </div>
              )}

              {/* Edit form */}
              {editing && editing.id === song.id && (
                <div className="flex flex-col gap-2 px-3 py-3 bg-white/[0.03] rounded-b-lg -mt-1">
                  <input
                    type="text"
                    value={editing.title}
                    onChange={(e) =>
                      setEditing({ ...editing, title: e.target.value })
                    }
                    placeholder="Title"
                    className="px-2 py-1.5 rounded bg-white/10 text-white text-xs border border-white/10 focus:border-accent focus:outline-none"
                  />
                  <input
                    type="url"
                    value={editing.url}
                    onChange={(e) =>
                      setEditing({ ...editing, url: e.target.value })
                    }
                    placeholder="URL"
                    className="px-2 py-1.5 rounded bg-white/10 text-white text-xs border border-white/10 focus:border-accent focus:outline-none"
                  />
                  <input
                    type="number"
                    value={editing.duration}
                    onChange={(e) =>
                      setEditing({ ...editing, duration: e.target.value })
                    }
                    placeholder="Duration (seconds)"
                    min="0"
                    className="px-2 py-1.5 rounded bg-white/10 text-white text-xs border border-white/10 focus:border-accent focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveEdit}
                      className="flex-1 py-1.5 rounded bg-accent hover:bg-green-600 text-white text-xs font-semibold transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditing(null)}
                      className="flex-1 py-1.5 rounded bg-white/10 text-gray-300 text-xs hover:bg-white/20 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
