import { useState, useRef, useCallback } from 'react';
import {
  removeSongFromPlaylist,
  playSongFromPlaylist,
  editSongInPlaylist,
  reorderSong,
} from '../api';

const SWIPE_THRESHOLD = 40; // px to trigger reorder

function useSwipe(onSwipeUp, onSwipeDown) {
  const startY = useRef(null);
  const deltaY = useRef(0);
  const [offset, setOffset] = useState(0);
  const swiping = useRef(false);

  // --- Touch events (mobile) ---
  const onTouchStart = useCallback((e) => {
    startY.current = e.touches[0].clientY;
    deltaY.current = 0;
    swiping.current = true;
  }, []);

  const onTouchMove = useCallback((e) => {
    if (!swiping.current || startY.current === null) return;
    deltaY.current = e.touches[0].clientY - startY.current;
    setOffset(deltaY.current);
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!swiping.current) return;
    swiping.current = false;
    if (deltaY.current < -SWIPE_THRESHOLD && onSwipeUp) {
      onSwipeUp();
    } else if (deltaY.current > SWIPE_THRESHOLD && onSwipeDown) {
      onSwipeDown();
    }
    startY.current = null;
    deltaY.current = 0;
    setOffset(0);
  }, [onSwipeUp, onSwipeDown]);

  // --- Mouse events (desktop) ---
  const onMouseDown = useCallback((e) => {
    startY.current = e.clientY;
    deltaY.current = 0;
    swiping.current = true;
    e.preventDefault(); // prevent text selection while dragging
  }, []);

  const onMouseMove = useCallback((e) => {
    if (!swiping.current || startY.current === null) return;
    deltaY.current = e.clientY - startY.current;
    setOffset(deltaY.current);
  }, []);

  const onMouseUp = useCallback(() => {
    if (!swiping.current) return;
    swiping.current = false;
    if (deltaY.current < -SWIPE_THRESHOLD && onSwipeUp) {
      onSwipeUp();
    } else if (deltaY.current > SWIPE_THRESHOLD && onSwipeDown) {
      onSwipeDown();
    }
    startY.current = null;
    deltaY.current = 0;
    setOffset(0);
  }, [onSwipeUp, onSwipeDown]);

  const onMouseLeave = useCallback(() => {
    if (swiping.current) {
      swiping.current = false;
      startY.current = null;
      deltaY.current = 0;
      setOffset(0);
    }
  }, []);

  return {
    offset,
    onTouchStart, onTouchMove, onTouchEnd,
    onMouseDown, onMouseMove, onMouseUp, onMouseLeave,
  };
}

export default function SongQueue({ songs, onError, onRefresh }) {
  const [selectedId, setSelectedId] = useState(null);
  const [editing, setEditing] = useState(null); // { id, title, url, duration }

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

      {/* Playlist list */}
      {songs.length === 0 ? (
        <p className="text-gray-500 text-sm">Playlist empty</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {songs.map((song, index) => (
            <SongItem
              key={song.id}
              song={song}
              index={index}
              total={songs.length}
              isSelected={selectedId === song.id}
              isEditing={editing && editing.id === song.id}
              editing={editing}
              onToggleSelect={() => toggleSelect(song.id)}
              onReorder={handleReorder}
              onSelect={handleSelect}
              onRemove={handleRemove}
              onStartEdit={() => startEdit(song)}
              onSaveEdit={handleSaveEdit}
              onCancelEdit={() => setEditing(null)}
              onEditChange={setEditing}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function SongItem({
  song,
  index,
  total,
  isSelected,
  isEditing,
  editing,
  onToggleSelect,
  onReorder,
  onSelect,
  onRemove,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditChange,
}) {
  const canMoveUp = index > 0;
  const canMoveDown = index < total - 1;

  const swipe = useSwipe(
    canMoveUp ? () => onReorder(song.id, 'up') : undefined,
    canMoveDown ? () => onReorder(song.id, 'down') : undefined
  );

  // Visual cue: green tint for swipe-up, orange for swipe-down
  const swipeDir = swipe.offset < -SWIPE_THRESHOLD ? 'up' : swipe.offset > SWIPE_THRESHOLD ? 'down' : null;

  return (
    <li
      onTouchStart={swipe.onTouchStart}
      onTouchMove={swipe.onTouchMove}
      onTouchEnd={swipe.onTouchEnd}
      onMouseDown={swipe.onMouseDown}
      onMouseMove={swipe.onMouseMove}
      onMouseUp={swipe.onMouseUp}
      onMouseLeave={swipe.onMouseLeave}
      style={{
        transform: swipe.offset ? `translateY(${Math.max(-60, Math.min(60, swipe.offset))}px)` : undefined,
        transition: swipe.offset ? 'none' : 'transform 0.2s ease',
        zIndex: swipe.offset ? 10 : 'auto',
        userSelect: 'none',
        cursor: 'grab',
      }}
    >
      {/* Song row */}
      <div
        onClick={onToggleSelect}
        className={`flex items-center justify-between rounded-lg px-3 py-2 cursor-pointer transition-colors ${
          swipeDir === 'up'
            ? 'bg-accent/20 ring-1 ring-accent/40'
            : swipeDir === 'down'
            ? 'bg-orange-500/20 ring-1 ring-orange-500/40'
            : isSelected
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
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {swipeDir === 'up' && <span className="text-accent text-xs">▲</span>}
          {swipeDir === 'down' && <span className="text-orange-400 text-xs">▼</span>}
          {!swipeDir && (
            <span className="text-gray-600 text-xs">
              {isSelected ? '▾' : '▸'}
            </span>
          )}
        </div>
      </div>

      {/* Expanded actions */}
      {isSelected && !isEditing && (
        <div className="flex flex-wrap gap-1 px-3 py-2 bg-white/[0.03] rounded-b-lg -mt-1">
          <button
            onClick={() => onReorder(song.id, 'up')}
            disabled={!canMoveUp}
            className="px-2 py-1 rounded bg-white/10 text-gray-300 text-xs hover:bg-white/20 transition-colors disabled:opacity-30"
          >
            ▲ Up
          </button>
          <button
            onClick={() => onReorder(song.id, 'down')}
            disabled={!canMoveDown}
            className="px-2 py-1 rounded bg-white/10 text-gray-300 text-xs hover:bg-white/20 transition-colors disabled:opacity-30"
          >
            ▼ Down
          </button>
          <button
            onClick={onStartEdit}
            className="px-2 py-1 rounded bg-yellow-500/20 text-yellow-400 text-xs hover:bg-yellow-500/30 transition-colors"
          >
            ✏️ Edit
          </button>
          <button
            onClick={() => onSelect(song.id)}
            className="px-2 py-1 rounded bg-accent/20 text-accent text-xs hover:bg-accent/30 transition-colors"
          >
            ▶ Play
          </button>
          <button
            onClick={() => onRemove(song.id)}
            className="px-2 py-1 rounded bg-red-500/20 text-red-400 text-xs hover:bg-red-500/30 transition-colors"
          >
            🗑 Remove
          </button>
        </div>
      )}

      {/* Edit form */}
      {isEditing && editing && (
        <div className="flex flex-col gap-2 px-3 py-3 bg-white/[0.03] rounded-b-lg -mt-1">
          <input
            type="text"
            value={editing.title}
            onChange={(e) =>
              onEditChange({ ...editing, title: e.target.value })
            }
            placeholder="Title"
            className="px-2 py-1.5 rounded bg-white/10 text-white text-xs border border-white/10 focus:border-accent focus:outline-none"
          />
          <input
            type="url"
            value={editing.url}
            onChange={(e) =>
              onEditChange({ ...editing, url: e.target.value })
            }
            placeholder="URL"
            className="px-2 py-1.5 rounded bg-white/10 text-white text-xs border border-white/10 focus:border-accent focus:outline-none"
          />
          <input
            type="number"
            value={editing.duration}
            onChange={(e) =>
              onEditChange({ ...editing, duration: e.target.value })
            }
            placeholder="Duration (seconds)"
            min="0"
            className="px-2 py-1.5 rounded bg-white/10 text-white text-xs border border-white/10 focus:border-accent focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              onClick={onSaveEdit}
              className="flex-1 py-1.5 rounded bg-accent hover:bg-green-600 text-white text-xs font-semibold transition-colors"
            >
              Save
            </button>
            <button
              onClick={onCancelEdit}
              className="flex-1 py-1.5 rounded bg-white/10 text-gray-300 text-xs hover:bg-white/20 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
