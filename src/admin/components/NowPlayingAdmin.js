export default function NowPlayingAdmin({ mode, currentTrack }) {
  const isMusic = mode === 'music';

  return (
    <div className="bg-card rounded-2xl p-5">
      <h2 className="text-sm font-semibold text-txt-secondary uppercase tracking-wider mb-3">
        Now Playing
      </h2>
      <div className="flex items-center gap-3">
        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${
            isMusic
              ? 'bg-accent/20 text-accent'
              : 'bg-purple-500/20 text-purple-400'
          }`}
        >
          {isMusic ? 'Music' : 'Speaker Live'}
        </span>
        <span className="text-heading font-medium truncate">
          {isMusic
            ? currentTrack?.title || '—'
            : 'Speaker is Live'}
        </span>
      </div>
    </div>
  );
}
