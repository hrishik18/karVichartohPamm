import { setMode } from '../api';

export default function ModeControl({ currentMode, onError }) {
  const handleMode = async (mode) => {
    try {
      await setMode(mode);
    } catch (err) {
      onError(err.response?.data?.message || 'Failed to set mode');
    }
  };

  return (
    <div className="bg-white/5 rounded-2xl p-5">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
        Mode Control
      </h2>
      <div className="flex gap-3">
        <button
          onClick={() => handleMode('music')}
          className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
            currentMode === 'music'
              ? 'bg-accent text-white'
              : 'bg-white/10 text-gray-300 hover:bg-white/20'
          }`}
        >
          ♫ Music
        </button>
        <button
          onClick={() => handleMode('speaker')}
          className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
            currentMode === 'speaker'
              ? 'bg-purple-600 text-white'
              : 'bg-white/10 text-gray-300 hover:bg-white/20'
          }`}
        >
          🎙 Speaker
        </button>
      </div>
    </div>
  );
}
