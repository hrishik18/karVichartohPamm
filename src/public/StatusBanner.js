export default function StatusBanner({ socketConnected, speakerLive }) {
  return (
    <div className="w-full flex items-center justify-center gap-4 px-4 py-2 text-xs">
      {/* Socket status */}
      <div className="flex items-center gap-1.5">
        <span
          className={`w-2 h-2 rounded-full ${
            socketConnected ? 'bg-accent' : 'bg-red-500 animate-pulse'
          }`}
        />
        <span className={socketConnected ? 'text-txt-secondary' : 'text-red-400'}>
          {socketConnected ? 'Connected' : 'Reconnecting…'}
        </span>
      </div>

      {/* Speaker status */}
      <div className="flex items-center gap-1.5">
        <span
          className={`w-2 h-2 rounded-full ${
            speakerLive ? 'bg-purple-500 animate-pulse' : 'bg-faint'
          }`}
        />
        <span className={speakerLive ? 'text-purple-400' : 'text-muted'}>
          {speakerLive ? 'Speaker Live' : 'Music Mode'}
        </span>
      </div>
    </div>
  );
}
