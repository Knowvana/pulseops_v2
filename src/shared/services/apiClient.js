// ============================================================================
// ApiClient — PulseOps V2
//
// PURPOSE: Centralized HTTP client for all frontend API calls. Handles
// base URL, JSON serialization, and error formatting.
// SECURITY: Auth is handled via HttpOnly cookies (credentials: 'include').
// No JWT tokens are stored in JavaScript memory to prevent XSS attacks.
//
// USAGE:
//   import { ApiClient } from '@shared';
//   const response = await ApiClient.get(urls.auth.me);
// ============================================================================

const API_BASE = '';

class ApiClientClass {
  _buildHeaders() {
    return { 'Content-Type': 'application/json' };
  }

  async _request(method, url, body = null) {
    const options = {
      method,
      headers: this._buildHeaders(),
      credentials: 'include', // HttpOnly cookie sent automatically by browser
    };
    if (body) {
      options.body = JSON.stringify(body);
    }
    try {
      const response = await fetch(`${API_BASE}${url}`, options);
      const data = await response.json();
      return data;
    } catch (err) {
      return { success: false, error: { message: err.message } };
    }
  }

  get(url) { return this._request('GET', url); }
  post(url, body) { return this._request('POST', url, body); }
  put(url, body) { return this._request('PUT', url, body); }
  patch(url, body) { return this._request('PATCH', url, body); }
  delete(url, body) { return this._request('DELETE', url, body); }
}

const ApiClient = new ApiClientClass();
export default ApiClient;
