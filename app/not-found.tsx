import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 min-h-screen bg-bg">
      <div className="w-full max-w-sm border border-border bg-surface/40 backdrop-blur-sm p-8 rounded-lg shadow-xl flex flex-col items-center text-center">
        {/* Sleek icon indicator */}
        <div className="w-12 h-12 rounded-full border border-border flex items-center justify-center mb-6">
          <span className="text-flag font-data text-sm">404</span>
        </div>

        {/* Text Details */}
        <h1 className="font-display text-2xl font-bold tracking-tight text-text mb-2">
          Page Not Found
        </h1>
        <p className="text-text-muted text-sm leading-relaxed max-w-xs mb-8">
          The requested ledger route does not exist or has been archived.
        </p>

        {/* Action Button */}
        <Link
          href="/"
          className="inline-flex items-center justify-center font-display text-xs font-semibold uppercase tracking-wider bg-action hover:bg-action/90 text-text px-8 py-3 rounded transition duration-200 w-full"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
