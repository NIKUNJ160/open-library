// =========================================================
// Configuration Module
// =========================================================

export const CONFIG = {
  API_BASE_URL: localStorage.getItem('API_BASE_URL') || 'http://localhost:3000/api/v1',
  API_KEY: localStorage.getItem('API_KEY') || '',
  MOCK_MODE: localStorage.getItem('MOCK_MODE') || 'auto', // 'auto', 'always', 'never'
};

export function saveConfig(updates) {
  if (updates.API_BASE_URL !== undefined) {
    CONFIG.API_BASE_URL = updates.API_BASE_URL;
    localStorage.setItem('API_BASE_URL', updates.API_BASE_URL);
  }
  if (updates.API_KEY !== undefined) {
    CONFIG.API_KEY = updates.API_KEY;
    localStorage.setItem('API_KEY', updates.API_KEY);
  }
  if (updates.MOCK_MODE !== undefined) {
    CONFIG.MOCK_MODE = updates.MOCK_MODE;
    localStorage.setItem('MOCK_MODE', updates.MOCK_MODE);
  }
}
