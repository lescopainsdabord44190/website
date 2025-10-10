export function handleServerError(error: unknown) {
  console.error('Server error:', error);
  window.location.href = '/500';
}

export function isServerError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status: number }).status;
    return status >= 500 && status < 600;
  }
  return false;
}

