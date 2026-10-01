/**
 * PolicyLens Centralized API Client
 * All network communication with the FastAPI backend flows through this service.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

class ApiClient {
  constructor(baseUrl = API_BASE_URL) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  /**
   * Generic internal fetch wrapper with error handling
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    const config = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.warn(`[PolicyLens API] Error connecting to ${url}:`, error.message);
      throw error;
    }
  }

  /**
   * Verify backend connection at root endpoint
   */
  async getRoot() {
    return this.request('/');
  }

  /**
   * Check backend health status
   */
  async checkHealth() {
    return this.request('/health');
  }

  /**
   * Check versioned API health status (/api/v1/health)
   */
  async checkV1Health() {
    return this.request('/api/v1/health');
  }

  /**
   * Upload and ingest a document (PDF or TXT) via multipart/form-data
   * @param {File} file - The file to upload
   * @returns {Promise<{success: boolean, document: object, content: Array}>}
   */
  async uploadDocument(file) {
    const url = `${this.baseUrl}/api/v1/documents/upload`;
    const formData = new FormData();
    formData.append('file', file);

    try {
      // Important: Do not set Content-Type header so the browser populates multipart boundary
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.detail || errorData.message || `Upload failed with status: ${response.status}`
        );
      }

      return await response.json();
    } catch (error) {
      console.warn(`[PolicyLens API] Document upload error:`, error.message);
      throw error;
    }
  }
  /**
   * Analyse extracted document pages using AI requirement decomposition.
   * @param {Array<{page: number, text: string}>} pages - Content from uploadDocument()
   * @param {string} [filename] - Original filename for logging
   * @param {number|null} [documentId] - Optional document ID for persistence linking
   * @param {string|null} [contentHash] - Optional content SHA-256 hash
   * @returns {Promise<{success: boolean, document_id?: number, document_summary: string, requirements: Array}>}
   */
  async analyzeDocument(pages, filename = '', documentId = null, contentHash = null) {
    const url = `${this.baseUrl}/api/v1/documents/analyze`;

    try {
      const payload = { pages, filename };
      if (documentId) payload.document_id = documentId;
      if (contentHash) payload.content_hash = contentHash;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.detail || errorData.message || `Analysis failed with status: ${response.status}`
        );
      }

      return await response.json();
    } catch (error) {
      console.warn('[PolicyLens API] Document analysis error:', error.message);
      throw error;
    }
  }

  /**
   * Fetch all analyzed documents from the database
   * @param {object} [params] - { skip, limit }
   * @returns {Promise<Array>}
   */
  async getDocuments(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = `/api/v1/documents${query ? `?${query}` : ''}`;
    return this.request(endpoint);
  }

  /**
   * Fetch a single document and its decomposed requirements
   * @param {number|string} id - Document ID
   * @returns {Promise<object>}
   */
  async getDocument(id) {
    return this.request(`/api/v1/documents/${id}`);
  }

  /**
   * Fetch compliance requirements from the database
   * @param {object} [params] - { document_id, status }
   * @returns {Promise<Array>}
   */
  async getRequirements(params = {}) {
    const cleanParams = {};
    if (params.document_id) cleanParams.document_id = params.document_id;
    if (params.status && params.status !== 'All') cleanParams.status = params.status;
    const query = new URLSearchParams(cleanParams).toString();
    const endpoint = `/api/v1/requirements${query ? `?${query}` : ''}`;
    return this.request(endpoint);
  }

  /**
   * Update the compliance status of a requirement
   * @param {number|string} id - Requirement ID
   * @param {string} status - 'Pending' | 'Completed' | 'Needs Review'
   * @returns {Promise<object>}
   */
  async updateRequirementStatus(id, status) {
    return this.request(`/api/v1/requirements/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  /**
   * Fetch a single requirement by ID
   * @param {number|string} id - Requirement ID
   * @returns {Promise<object>}
   */
  async getRequirement(id) {
    return this.request(`/api/v1/requirements/${id}`);
  }

  /**
   * Fetch compliance command center dashboard statistics
   * @param {object} [params] - { document_id }
   * @returns {Promise<{total: number, pending: number, completed: number, needs_review: number, compliance_score: number, overdue: number, due_soon: number, upcoming: number, no_deadline: number}>}
   */
  async getDashboardStats(params = {}) {
    const cleanParams = {};
    if (params.document_id) cleanParams.document_id = params.document_id;
    const query = new URLSearchParams(cleanParams).toString();
    const endpoint = `/api/v1/dashboard/stats${query ? `?${query}` : ''}`;
    return this.request(endpoint);
  }

  // -------------------------------------------------------------------------
  // Step 6: PolicyLens AI — Document-grounded conversational RAG chatbot
  // -------------------------------------------------------------------------

  /**
   * Send a chat message to PolicyLens AI for a specific document.
   * The AI answers ONLY using retrieved document chunks (RAG).
   * @param {number|string} documentId - Document ID to chat with
   * @param {string} message - User question
   * @param {Array<{role: string, content: string}>} [conversationHistory] - Recent messages for context
   * @returns {Promise<{message: string, answer: string, sources: Array, confidence: number, grounded: boolean}>}
   */
  async chatWithDocument(documentId, message, conversationHistory = []) {
    return this.request(`/api/v1/documents/${documentId}/chat`, {
      method: 'POST',
      body: JSON.stringify({
        message,
        conversation_history: conversationHistory,
      }),
    });
  }

  /**
   * Index a document for RAG using its page content.
   * Should be called after successful document analysis.
   * @param {number|string} documentId - Document ID
   * @param {Array<{page: number, text: string}>} pages - Page content from upload pipeline
   * @returns {Promise<{success: boolean, document_id: number, chunks_created: number, rag_status: string, message: string}>}
   */
  async indexDocumentForRAG(documentId, pages) {
    return this.request(`/api/v1/documents/${documentId}/index-with-pages`, {
      method: 'POST',
      body: JSON.stringify({ pages }),
    });
  }

  /**
   * Get the RAG index status for a document.
   * @param {number|string} documentId - Document ID
   * @returns {Promise<{document_id: number, rag_status: string, chunk_count: number}>}
   */
  async getRagStatus(documentId) {
    return this.request(`/api/v1/documents/${documentId}/rag-status`);
  }
}

export const api = new ApiClient();
export default api;

