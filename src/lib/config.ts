/**
 * Runtime configuration sourced from Vite env vars.
 * Set VITE_API_BASE_URL in `.env` to override the default dev backend.
 */
const rawBase = import.meta.env.VITE_API_BASE_URL as string | undefined;

export const API_BASE_URL = (rawBase ?? 'http://localhost:8001/api').replace(/\/$/, '');
