export default function StatusBanner({ socketConnected, streamUrl }) {
  return (
    <div className="w-full flex items-center justify-center gap-4 px-4 py-2 text-xs">
      {/* Socket status */}
      <div className="flex items-center gap-1.5">
        <span
          className={`w-2 h-2 rounded-full ${
            socketConnected ? 'bg-accent' : 'bg-red-500 animate-pulse'
          }`}
        />
        <span className={socketConnected ? 'text-gray-400' : 'text-red-400'}>
          {socketConnected ? 'Connected' : 'Reconnecting…'}
        </span>
      </div>

      {/* Stream status */}
      <div className="flex items-center gap-1.5">
        <span
          className={`w-2 h-2 rounded-full ${
            streamUrl ? 'bg-accent' : 'bg-yellow-500'
          }`}
        />
        <span className={streamUrl ? 'text-gray-400' : 'text-yellow-400'}>
          {streamUrl ? 'Stream Live' : 'Stream Offline'}
        </span>
      </div>
    </div>
  );
}
