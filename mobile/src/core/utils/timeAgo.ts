import { Language } from '../i18n/strings';

/**
 * Relative timestamps like "12 min ago", in English or Filipino.
 *
 * Hazard reports are only useful if you can tell at a glance how fresh they
 * are, so the app leans on relative time everywhere and only falls back to an
 * absolute date once a report is more than a week old.
 */
export function timeAgo(iso: string, language: Language, now = new Date()): string {
  const fil = language === 'fil';
  const diffMs = now.getTime() - Date.parse(iso);
  if (!Number.isFinite(diffMs) || diffMs < 60_000) {
    return fil ? 'ngayon lang' : 'just now';
  }

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return fil ? `${minutes} min ang nakalipas` : `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return fil
      ? `${hours} oras ang nakalipas`
      : `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return fil ? `${days} araw ang nakalipas` : `${days} ${days === 1 ? 'day' : 'days'} ago`;
  }

  return new Date(iso).toLocaleDateString(fil ? 'fil-PH' : 'en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Compact form for dense lists: "12m", "3h", "2d". */
export function timeAgoCompact(iso: string, now = new Date()): string {
  const diffMs = now.getTime() - Date.parse(iso);
  if (!Number.isFinite(diffMs)) return '--';
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}

/** Duration as a travel-time label: "8 min" or "1 hr 20 min". */
export function formatDuration(seconds: number, language: Language): string {
  const fil = language === 'fil';
  const minutes = Math.round(seconds / 60);
  if (minutes < 1) return fil ? 'wala pang 1 min' : 'under 1 min';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const hourLabel = fil ? 'oras' : 'hr';
  return rest === 0 ? `${hours} ${hourLabel}` : `${hours} ${hourLabel} ${rest} min`;
}

/** Clock time for an ETA, e.g. "4:35 PM". */
export function formatClock(date: Date, language: Language): string {
  return date.toLocaleTimeString(language === 'fil' ? 'fil-PH' : 'en-PH', {
    hour: 'numeric',
    minute: '2-digit',
  });
}
