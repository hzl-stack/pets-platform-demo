/**
 * Format date to China Shanghai timezone (UTC+8)
 */
export function formatToShanghaiTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  } catch (error) {
    return dateString;
  }
}

/**
 * Get current Shanghai time in ISO format for database storage
 */
export function getCurrentShanghaiTime(): string {
  const now = new Date();
  const shanghaiTime = new Date(
    now.toLocaleString('en-US', { timeZone: 'Asia/Shanghai' })
  );
  return shanghaiTime.toISOString().slice(0, 19).replace('T', ' ');
}