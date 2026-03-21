import { useState } from 'react';
import { addSpeakerToQueue, selectSpeaker, setSpeaker, removeSpeakerFromQueue } from '../api';

export default function SpeakerQueue({ speakers, onError, onRefresh }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await addSpeakerToQueue(name.trim());
      setName('');
      onRefresh();
    } catch (err) {
      onError(err.response?.data?.message || 'Failed to add speaker');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (id) => {
    try {
      await selectSpeaker(id);
    } catch (err) {
      onError(err.response?.data?.message || 'Failed to select speaker');
    }
  };

  const handleRemove = async (id) => {
    try {
      await removeSpeakerFromQueue(id);
      onRefresh();
    } catch (err) {
      onError(err.response?.data?.message || 'Failed to remove speaker');
    }
  };

  const handleSetDirect = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await setSpeaker(name.trim());
      setName('');
    } catch (err) {
      onError(err.response?.data?.message || 'Failed to set speaker');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white/5 rounded-2xl p-5">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
        Speaker Queue
      </h2>

      {/* Add form */}
      <form onSubmit={handleAdd} className="flex flex-col gap-2 mb-4">
        <input
          type="text"
          placeholder="Speaker name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="px-3 py-2 rounded-lg bg-white/10 text-white text-sm placeholder-gray-500 border border-white/10 focus:border-accent focus:outline-none"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="flex-1 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
          >
            Add to Queue
          </button>
          <button
            type="button"
            onClick={handleSetDirect}
            disabled={loading || !name.trim()}
            className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
          >
            Set Live
          </button>
        </div>
      </form>

      {/* Queue list */}
      {speakers.length === 0 ? (
        <p className="text-gray-500 text-sm">Queue empty</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {speakers.map((speaker) => (
            <li
              key={speaker.id}
              className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2"
            >
              <span className="text-white text-sm truncate flex-1 mr-2">
                {speaker.name}
              </span>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => handleSelect(speaker.id)}
                  className="px-2 py-1 rounded bg-purple-500/20 text-purple-400 text-xs hover:bg-purple-500/30 transition-colors"
                >
                  Set Live
                </button>
                <button
                  onClick={() => handleRemove(speaker.id)}
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
