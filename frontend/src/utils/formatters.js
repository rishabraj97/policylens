/**
 * Utility formatting functions for PolicyLens
 */

/**
 * Format bytes into human-readable size
 */
export function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes <= 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Format date strings cleanly
 */
export function formatDate(dateString, includeTime = false) {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const options = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    };
    if (includeTime) {
      options.hour = '2-digit';
      options.minute = '2-digit';
    }
    return date.toLocaleDateString(undefined, options);
  } catch {
    return dateString;
  }
}

/**
 * Relative time calculation (e.g., "5 minutes ago", "2 hours ago", "Just now")
 */
export function formatRelativeTime(dateString) {
  if (!dateString) return 'recently';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'recently';
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 45) return 'just now';
    if (diffSec < 90) return '1 minute ago';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} minutes ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 30) return `${diffDays} days ago`;
    return formatDate(dateString);
  } catch {
    return 'recently';
  }
}
