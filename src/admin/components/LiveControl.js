import { useState } from 'react';
import { goLive, stopLive } from '../api';

export default function LiveControl({ currentMode, currentSpeaker, onError }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const isLive = currentMode === 'speaker';

  const handleGoLive = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await goLive(name.trim());
      setName('');
    } catch (err) {
      onError(err.response?.data?.message || 'Failed to go live');
    } finally {
      setLoading(false);
    }
  };

  const handleStopLive = async () => {
    setLoading(true);
    try {
      await stopLive();
    } catch (err) {
      onError(err.response?.data?.message || 'Failed to stop live');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white/5 rounded-2xl p-5">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
        Live Speaker
      </h2>

      {isLive ? (
        /* Currently live — show stop button */
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-400 font-semibold text-sm">
              LIVE — {currentSpeaker}
            </span>
          </div>
          <button
            onClick={handleStopLive}
            disabled={loading}
            className="w-full py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors disabled:opacity-50"
          >
            {loading ? 'Stopping…' : 'Stop Live'}
          </button>
        </div>
      ) : (
        /* Not live — show go live form */
        <form onSubmit={handleGoLive} className="flex flex-col gap-2">
          <input
            type="text"
            placeholder="Speaker name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="px-3 py-2 rounded-lg bg-white/10 text-white text-sm placeholder-gray-500 border border-white/10 focus:border-accent focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full py-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-colors disabled:opacity-50"
          >
            {loading ? 'Going Live…' : '🎙 Go Live'}
          </button>
        </form>
      )}
    </div>
  );
}
