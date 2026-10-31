/**
 * client.js — Centralized API client for Customer Lens.
 * Handles base URL configuration, headers, error parsing, and timeouts.
 */

function getApiBaseUrl() {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // When running in a browser on port 3000 (e.g. Docker container serving built assets),
  // route API requests directly to the backend running on port 8000.
  if (typeof window !== 'undefined' && window.location.port === '3000') {
    return `${window.location.protocol}//${window.location.hostname}:8000/api`;
  }
  // In production (e.g. Vercel deployment), use same-origin relative '/api'.
  // In local Vite dev server, proxy via Vite or direct to port 8000.
  return import.meta.env.PROD ? '/api' : 'http://127.0.0.1:8000/api';
}

const API_BASE_URL = getApiBaseUrl();

/**
 * Format Pydantic validation errors or standard HTTP errors into readable messages.
 */
function parseErrorMessage(status, payload) {
  if (!payload) {
    return `Server returned HTTP ${status}.`;
  }
  
  if (typeof payload === 'string') {
    return payload;
  }

  // Pydantic validation error: { detail: [{ loc, msg, type }, ...] }
  if (Array.isArray(payload.detail)) {
    return payload.detail
      .map((err) => {
        const field = err.loc ? err.loc.filter(l => l !== 'body').join('.') : 'Field';
        return `${field}: ${err.msg}`;
      })
      .join('; ');
  }

  // String detail: { detail: "Customer 999 not found" }
  if (payload.detail && typeof payload.detail === 'string') {
    return payload.detail;
  }

  if (payload.message) {
    return payload.message;
  }

  return `Request failed with HTTP status ${status}.`;
}

/**
 * Core fetch wrapper with timeout and standardized error handling.
 */
export async function apiRequest(endpoint, options = {}) {
  const {
    method = 'GET',
    body = null,
    headers = {},
    params = null,
    timeoutMs = 12000,
  } = options;

  let url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        searchParams.append(key, val);
      }
    });
    const qs = searchParams.toString();
    if (qs) {
      url += (url.includes('?') ? '&' : '?') + qs;
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const requestOptions = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...headers,
    },
    signal: controller.signal,
  };

  if (body) {
    requestOptions.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, requestOptions);
    clearTimeout(timeoutId);

    const isJson = response.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      const error = new Error(parseErrorMessage(response.status, data));
      error.status = response.status;
      error.data = data;
      throw error;
    }

    if (!isJson && typeof data === 'string' && data.trim().startsWith('<')) {
      const error = new Error(`Expected JSON response from API, but received HTML from ${url}. Ensure the backend server is reachable on port 8000.`);
      error.status = 502;
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      const timeoutError = new Error(`Request timed out after ${timeoutMs / 1000}s. Please check backend connection.`);
      timeoutError.status = 408;
      throw timeoutError;
    }
    // Network / connection refused errors
    if (!err.status) {
      err.message = `Cannot connect to Customer Lens backend at ${API_BASE_URL}. Ensure the FastAPI server is running on port 8000.`;
      err.status = 0;
    }
    throw err;
  }
}

export default apiRequest;
