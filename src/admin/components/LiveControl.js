import { useState } from 'react';
import { goLive, stopLive } from '../api';

function VoiceWaves() {
  return (
    <div className="flex items-end gap-[3px] h-8">
      {[1, 2, 3, 4, 5, 6, 7].map((i) => (
        <span
          key={i}
          className="w-[3px] rounded-full bg-red-400"
          style={{
            animation: `wave 1.2s ease-in-out ${i * 0.1}s infinite alternate`,
          }}
        />
      ))}
      <style>{`
        @keyframes wave {
          0%   { height: 6px; opacity: 0.4; }
          50%  { height: 24px; opacity: 1; }
          100% { height: 8px; opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

export default function LiveControl({ currentMode, onError }) {
  const [loading, setLoading] = useState(false);

  const isLive = currentMode === 'speaker';

  const handleGoLive = async () => {
    setLoading(true);
    try {
      await goLive();
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

  if (isLive) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5">
        {/* Live header */}
        <div className="flex items-center gap-2 mb-4">
          <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
          <span className="text-red-400 font-bold text-sm uppercase tracking-wider">
            Speaker is Live
          </span>
        </div>

        {/* Voice wave visualization */}
        <div className="flex items-center justify-center py-4">
          <VoiceWaves />
        </div>

        {/* Stop button */}
        <button
          onClick={handleStopLive}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors disabled:opacity-50"
        >
          {loading ? 'Stopping…' : 'Stop Live'}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl p-5">
      <button
        onClick={handleGoLive}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-colors disabled:opacity-50"
      >
        <span className="text-lg">🎙</span>
        {loading ? 'Going Live…' : 'Go Live as Speaker'}
      </button>
    </div>
  );
}
