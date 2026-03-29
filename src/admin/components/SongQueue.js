import { useState, useRef, useCallback } from 'react';
import {
  removeSongFromPlaylist,
  playSongFromPlaylist,
  editSongInPlaylist,
  reorderSong,
  bulkRemoveSongs,
  shufflePlaylist,
} from '../api';
import { useToast } from '../../components/Toast';

const SNAP_TOP_PX = 20;

function getDropIndex(songs, itemRefs, clientY) {
  if (songs.length === 0) return 0;

  // Snap to top when cursor is above (or within SNAP_TOP_PX of) the first item
  const firstEl = itemRefs.current.get(songs[0].id);
  if (firstEl) {
    const firstRect = firstEl.getBoundingClientRect();
    if (clientY < firstRect.top + SNAP_TOP_PX) return 0;
  }

  for (let index = 0; index < songs.length; index += 1) {
    const element = itemRefs.current.get(songs[index].id);
    if (!element) continue;

    const rect = element.getBoundingClientRect();
    if (clientY < rect.top + rect.height / 2) {
      return index;
    }
  }

  return songs.length - 1;
}

export default function SongQueue({ songs, currentTrackId, onError, onRefresh }) {
  const [selectedId, setSelectedId] = useState(null);
  const [editing, setEditing] = useState(null); // { id, title, url, duration }
  const [dragState, setDragState] = useState(null);
  const [movingId, setMovingId] = useState(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSelected, setBulkSelected] = useState(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const itemRefs = useRef(new Map());
  const toast = useToast();

  const toggleBulkMode = () => {
    setBulkMode((prev) => !prev);
    setBulkSelected(new Set());
    setSelectedId(null);
    setEditing(null);
  };

  const toggleBulkItem = (id) => {
    setBulkSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (bulkSelected.size === songs.length) {
      setBulkSelected(new Set());
    } else {
      setBulkSelected(new Set(songs.map((s) => s.id)));
    }
  };

  const handleBulkRemove = async () => {
    if (bulkSelected.size === 0) return;
    try {
      setBulkBusy(true);
      await bulkRemoveSongs([...bulkSelected]);
      toast.success(`Removed ${bulkSelected.size} song${bulkSelected.size > 1 ? 's' : ''}`);
      setBulkSelected(new Set());
      setBulkMode(false);
      onRefresh();
    } catch (err) {
      onError(err.response?.data?.message || 'Bulk remove failed');
    } finally {
      setBulkBusy(false);
    }
  };

  const handleShuffle = async () => {
    try {
      setBulkBusy(true);
      await shufflePlaylist();
      toast.success('Playlist shuffled');
      onRefresh();
    } catch (err) {
      onError(err.response?.data?.message || 'Shuffle failed');
    } finally {
      setBulkBusy(false);
    }
  };

  const setItemRef = useCallback((id, node) => {
    if (node) {
      itemRefs.current.set(id, node);
      return;
    }

    itemRefs.current.delete(id);
  }, []);

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
      setMovingId(id);
      await reorderSong(id, direction);

      // Auto-play if moved to the top
      const idx = songs.findIndex((s) => s.id === id);
      if (direction === 'up' && idx === 1) {
        await playSongFromPlaylist(id);
      }

      onRefresh();
    } catch (err) {
      onError(err.response?.data?.message || 'Failed to reorder');
    } finally {
      setMovingId(null);
    }
  };

  const moveSongToIndex = useCallback(async (id, fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;

    const direction = toIndex < fromIndex ? 'up' : 'down';
    const steps = Math.abs(toIndex - fromIndex);

    try {
      setMovingId(id);

      for (let step = 0; step < steps; step += 1) {
        await reorderSong(id, direction);
      }

      // Auto-play if moved to the top
      if (toIndex === 0) {
        await playSongFromPlaylist(id);
      }

      onRefresh();
    } catch (err) {
      onError(err.response?.data?.message || 'Failed to move song');
    } finally {
      setMovingId(null);
    }
  }, [onError, onRefresh]);

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
    if (dragState || movingId) return;
    setSelectedId(selectedId === id ? null : id);
    if (editing && editing.id !== id) setEditing(null);
  };

  const startDrag = useCallback((event, songId, sourceIndex) => {
    if (movingId || (event.pointerType === 'mouse' && event.button !== 0)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);

    setEditing(null);
    setSelectedId((current) => (current === songId ? current : null));
    setDragState({
      songId,
      sourceIndex,
      dropIndex: sourceIndex,
      startY: event.clientY,
      currentY: event.clientY,
    });
  }, [movingId]);

  const updateDrag = useCallback((event) => {
    const songId = event.currentTarget?.dataset?.songId;
    const clientY = event.clientY;

    setDragState((current) => {
      if (!current || current.songId !== songId) {
        return current;
      }

      return {
        ...current,
        currentY: clientY,
        dropIndex: getDropIndex(songs, itemRefs, clientY),
      };
    });
  }, [songs]);

  const finishDrag = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.releasePointerCapture?.(event.pointerId);

    const currentDrag = dragState;
    if (!currentDrag) return;

    setDragState(null);
    moveSongToIndex(
      currentDrag.songId,
      currentDrag.sourceIndex,
      currentDrag.dropIndex
    );
  }, [dragState, moveSongToIndex]);

  const cancelDrag = useCallback((event) => {
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    setDragState(null);
  }, []);

  return (
    <div className="bg-white/5 rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
          Playlist
        </h2>
        <span className="text-[11px] text-gray-500">
          {bulkMode ? 'Select songs, then act' : 'Drag the handle to move songs anywhere in the queue'}
        </span>
      </div>

      {/* Bulk actions toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <button
          onClick={toggleBulkMode}
          disabled={bulkBusy || songs.length === 0}
          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
            bulkMode
              ? 'bg-accent/20 text-accent hover:bg-accent/30'
              : 'bg-white/10 text-gray-300 hover:bg-white/20'
          } disabled:opacity-40`}
        >
          {bulkMode ? '✕ Cancel' : '☐ Select'}
        </button>

        {bulkMode && (
          <>
            <button
              onClick={toggleSelectAll}
              className="px-3 py-1.5 rounded bg-white/10 text-gray-300 text-xs hover:bg-white/20 transition-colors"
            >
              {bulkSelected.size === songs.length ? 'Deselect All' : 'Select All'}
            </button>
            <button
              onClick={handleBulkRemove}
              disabled={bulkSelected.size === 0 || bulkBusy}
              className="px-3 py-1.5 rounded bg-red-500/20 text-red-400 text-xs hover:bg-red-500/30 transition-colors disabled:opacity-40"
            >
              🗑 Remove ({bulkSelected.size})
            </button>
          </>
        )}

        <button
          onClick={handleShuffle}
          disabled={bulkBusy || songs.length < 2}
          className="px-3 py-1.5 rounded bg-white/10 text-gray-300 text-xs hover:bg-white/20 transition-colors disabled:opacity-40"
        >
          🔀 Shuffle
        </button>
      </div>

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
              isNowPlaying={song.id === currentTrackId}
              isSelected={selectedId === song.id}
              isEditing={editing && editing.id === song.id}
              editing={editing}
              isMoving={movingId === song.id}
              dragState={dragState}
              bulkMode={bulkMode}
              bulkChecked={bulkSelected.has(song.id)}
              setItemRef={setItemRef}
              onStartDrag={startDrag}
              onUpdateDrag={updateDrag}
              onFinishDrag={finishDrag}
              onCancelDrag={cancelDrag}
              onToggleSelect={() => bulkMode ? toggleBulkItem(song.id) : toggleSelect(song.id)}
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
  isNowPlaying,
  isSelected,
  isEditing,
  editing,
  isMoving,
  dragState,
  bulkMode,
  bulkChecked,
  setItemRef,
  onStartDrag,
  onUpdateDrag,
  onFinishDrag,
  onCancelDrag,
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
  const isDragging = dragState?.songId === song.id;
  const dragOffset = isDragging ? dragState.currentY - dragState.startY : 0;
  const showDropBefore = dragState && dragState.dropIndex === index && dragState.dropIndex <= dragState.sourceIndex;
  const showDropAfter = dragState && dragState.dropIndex === index && dragState.dropIndex > dragState.sourceIndex;
  const disableActions = isMoving || Boolean(dragState);

  return (
    <li
      ref={(node) => setItemRef(song.id, node)}
      style={{
        transform: isDragging ? `translateY(${dragOffset}px)` : undefined,
        transition: isDragging ? 'none' : 'transform 0.2s ease',
        zIndex: isDragging ? 20 : 'auto',
        opacity: isMoving ? 0.6 : 1,
      }}
      className="relative"
    >
      {showDropBefore && (
        <div className="absolute -top-1 left-0 right-0 h-0.5 rounded-full bg-accent" />
      )}

      {/* Song row */}
      <div
        onClick={onToggleSelect}
        className={`flex items-center justify-between rounded-lg px-3 py-2 cursor-pointer transition-colors ${
          isDragging
            ? 'bg-white/12 ring-1 ring-accent/50 shadow-lg shadow-black/20'
            : isNowPlaying
            ? 'bg-accent/10 border-l-2 border-accent'
            : isSelected
            ? 'bg-white/10 ring-1 ring-accent/40'
            : 'bg-white/5 hover:bg-white/[0.07]'
        }`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {bulkMode && (
            <input
              type="checkbox"
              checked={bulkChecked}
              onChange={onToggleSelect}
              onClick={(e) => e.stopPropagation()}
              className="shrink-0 w-4 h-4 accent-green-500 cursor-pointer"
            />
          )}
          <button
            type="button"
            data-song-id={song.id}
            aria-label={`Drag to move ${song.title}`}
            onPointerDown={(event) => onStartDrag(event, song.id, index)}
            onPointerMove={onUpdateDrag}
            onPointerUp={onFinishDrag}
            onPointerCancel={onCancelDrag}
            disabled={disableActions || isEditing}
            className="shrink-0 text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ touchAction: 'none', cursor: disableActions || isEditing ? 'not-allowed' : 'grab' }}
          >
            ⋮⋮
          </button>
          <span className="text-gray-500 text-xs w-5 text-right shrink-0">
            {index + 1}
          </span>
          {isNowPlaying && (
            <span className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded bg-accent/20 text-accent text-[10px] font-bold uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              Live
            </span>
          )}
          <span className={`text-sm truncate ${isNowPlaying ? 'text-accent font-semibold' : 'text-white'}`}>
            {song.title}
          </span>
          {song.duration && (
            <span className="text-gray-500 text-xs shrink-0">
              {Math.floor(song.duration / 60)}:{String(song.duration % 60).padStart(2, '0')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <span className="text-gray-600 text-xs">
            {isSelected ? '▾' : '▸'}
          </span>
        </div>
      </div>

      {showDropAfter && (
        <div className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full bg-accent" />
      )}

      {/* Expanded actions */}
      {isSelected && !isEditing && (
        <div className="flex flex-wrap gap-1 px-3 py-2 bg-white/[0.03] rounded-b-lg -mt-1">
          <button
            onClick={() => onReorder(song.id, 'up')}
            disabled={!canMoveUp || disableActions}
            className="px-2 py-1 rounded bg-white/10 text-gray-300 text-xs hover:bg-white/20 transition-colors disabled:opacity-30"
          >
            ▲ Up
          </button>
          <button
            onClick={() => onReorder(song.id, 'down')}
            disabled={!canMoveDown || disableActions}
            className="px-2 py-1 rounded bg-white/10 text-gray-300 text-xs hover:bg-white/20 transition-colors disabled:opacity-30"
          >
            ▼ Down
          </button>
          <button
            onClick={onStartEdit}
            disabled={disableActions}
            className="px-2 py-1 rounded bg-yellow-500/20 text-yellow-400 text-xs hover:bg-yellow-500/30 transition-colors"
          >
            ✏️ Edit
          </button>
          <button
            onClick={() => onSelect(song.id)}
            disabled={disableActions}
            className="px-2 py-1 rounded bg-accent/20 text-accent text-xs hover:bg-accent/30 transition-colors"
          >
            ▶ Play
          </button>
          <button
            onClick={() => onRemove(song.id)}
            disabled={disableActions}
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
