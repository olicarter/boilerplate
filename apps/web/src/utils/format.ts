const dateFormatter = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
const datetimeFormatter = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
const relativeFormatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
const numberFormatter = new Intl.NumberFormat(undefined);
const percentFormatter = new Intl.NumberFormat(undefined, { style: 'percent', maximumFractionDigits: 1 });

export function formatDate(iso: string | Date | null | undefined): string {
  if (!iso) return '';
  return dateFormatter.format(new Date(iso));
}

export function formatDatetime(iso: string | Date | null | undefined): string {
  if (!iso) return '';
  return datetimeFormatter.format(new Date(iso));
}

export function formatRelative(iso: string | Date | null | undefined): string {
  if (!iso) return '';
  const diffMs = new Date(iso).getTime() - Date.now();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);
  if (Math.abs(diffSec) < 60) return relativeFormatter.format(diffSec, 'second');
  if (Math.abs(diffMin) < 60) return relativeFormatter.format(diffMin, 'minute');
  if (Math.abs(diffHour) < 24) return relativeFormatter.format(diffHour, 'hour');
  return relativeFormatter.format(diffDay, 'day');
}

export function formatNumber(n: number): string {
  return numberFormatter.format(n);
}

export function formatPercent(fraction: number): string {
  return percentFormatter.format(fraction);
}
