const defaultApiUrl = 'http://localhost:5000';

const rawApiUrl = import.meta.env.VITE_API_URL || defaultApiUrl;
const normalizedApiUrl = rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl;

export const apiUrl = (path = '') => {
  if (!path) {
    return normalizedApiUrl;
  }

  return `${normalizedApiUrl}${path.startsWith('/') ? '' : '/'}${path}`;
};