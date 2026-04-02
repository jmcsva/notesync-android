import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

export function generateId() {
  return uuidv4();
}

export function formatDate(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export function formatRelative(ts) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return formatDate(ts);
}

export function formatDateTime(dateStr, timeStr) {
  if (!dateStr) return '';
  const d = new Date(`${dateStr}T${timeStr || '00:00'}`);
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function parseTags(raw) {
  try { return JSON.parse(raw || '[]'); } catch { return []; }
}

export function isOverdue(dateStr, timeStr) {
  if (!dateStr) return false;
  return new Date(`${dateStr}T${timeStr || '23:59'}`) < new Date();
}
