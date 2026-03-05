// New backend API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const headers = {
  'Content-Type': 'application/json',
};

// Generic API call handler
async function apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`API error on ${endpoint}:`, data);
      throw new Error(data.error || 'API request failed');
    }

    return data;
  } catch (error) {
    console.error(`API call failed for ${endpoint}:`, error);
    throw error;
  }
}

// ============================================
// MEDICINES API
// ============================================

export const medicinesApi = {
  getAll: () => apiCall<{ success: boolean; data: any[] }>('/medicines'),
  
  getById: (id: string) => apiCall<{ success: boolean; data: any }>(`/medicines/${id}`),
  
  create: (medicine: any) =>
    apiCall<{ success: boolean; data: any }>('/medicines', {
      method: 'POST',
      body: JSON.stringify(medicine),
    }),
  
  update: (id: string, medicine: any) =>
    apiCall<{ success: boolean; data: any }>(`/medicines/${id}`, {
      method: 'PUT',
      body: JSON.stringify(medicine),
    }),
  
  delete: (id: string) =>
    apiCall<{ success: boolean }>(`/medicines/${id}`, {
      method: 'DELETE',
    }),
};

// ============================================
// INVENTORY API
// ============================================

export const inventoryApi = {
  getAll: () => apiCall<{ success: boolean; data: any[] }>('/inventory'),
  
  create: (item: any) =>
    apiCall<{ success: boolean; data: any }>('/inventory', {
      method: 'POST',
      body: JSON.stringify(item),
    }),

  // alias consistent with API spec
  addBatch: (batch: any) =>
    apiCall<{ success: boolean; data: any }>('/inventory', {
      method: 'POST',
      body: JSON.stringify(batch),
    }),
  
  updateStock: (id: string, quantity: number, operation: 'add' | 'subtract' | 'set') =>
    apiCall<{ success: boolean; data: any }>(`/inventory/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity, operation }),
    }),
  
  update: (id: string, batch: any) =>
    apiCall<{ success: boolean; data: any }>(`/inventory/${id}`, {
      method: 'PUT',
      body: JSON.stringify(batch),
    }),
  
  delete: (id: string) =>
    apiCall<{ success: boolean; data: any }>(`/inventory/${id}`, {
      method: 'DELETE',
    }),

  // compatibility alias used by updated inventory flows
  deleteBatch: (id: string) =>
    apiCall<{ success: boolean; data: any }>(`/inventory/${id}`, {
      method: 'DELETE',
    }),
};

// ============================================
// PURCHASE ORDERS API
// ============================================

export const purchaseOrdersApi = {
  getAll: () => apiCall<{ success: boolean; data: any[] }>('/purchase-orders'),
  
  getById: (id: string) => apiCall<{ success: boolean; data: any }>(`/purchase-orders/${id}`),
  
  create: (order: any) =>
    apiCall<{ success: boolean; data: any }>('/purchase-orders', {
      method: 'POST',
      body: JSON.stringify(order),
    }),
  
  updateStatus: (
    id: string,
    status: string,
    options: {
      receivedItems?: Array<{
        itemId: number;
        medicineId: number;
        quantityReceived: number;
        expiryDate: string;
      }>;
    } = {}
  ) =>
    apiCall<{ success: boolean; data: any }>(`/purchase-orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, ...options }),
    }),
};

// ============================================
// PRESCRIPTIONS API
// ============================================

export const prescriptionsApi = {
  getAll: () => apiCall<{ success: boolean; data: any[] }>('/prescriptions'),
  
  getById: (id: string) => apiCall<{ success: boolean; data: any }>(`/prescriptions/${id}`),
  
  create: (prescription: any) =>
    apiCall<{ success: boolean; data: any }>('/prescriptions', {
      method: 'POST',
      body: JSON.stringify(prescription),
    }),
  
  updateStatus: (id: string, status: string) =>
    apiCall<{ success: boolean; data: any }>(`/prescriptions/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
};

// ============================================
// SALES API
// ============================================

export const salesApi = {
  getAll: (options?: { all?: boolean }) =>
    apiCall<{ success: boolean; data: any[] }>(`/sales${options?.all ? '?all=true' : ''}`),
  
  getById: (id: string) => apiCall<{ success: boolean; data: any }>(`/sales/${id}`),
  
  create: (sale: any) =>
    apiCall<{ success: boolean; data: any }>('/sales', {
      method: 'POST',
      body: JSON.stringify(sale),
    }),
};

// ============================================
// DASHBOARD API
// ============================================

export const dashboardApi = {
  getStats: () => apiCall<{ success: boolean; data: any }>('/dashboard/stats'),
  
  getSalesAnalytics: () => apiCall<{ success: boolean; data: any }>('/dashboard/sales-analytics'),
};

// ============================================
// SUPPLIERS API
// ============================================

export const suppliersApi = {
  getAll: () => apiCall<{ success: boolean; data: any[] }>('/suppliers'),
  
  getById: (id: string) => apiCall<{ success: boolean; data: any }>(`/suppliers/${id}`),
  
  create: (supplier: any) =>
    apiCall<{ success: boolean; data: any }>('/suppliers', {
      method: 'POST',
      body: JSON.stringify(supplier),
    }),
  
  update: (id: string, supplier: any) =>
    apiCall<{ success: boolean; data: any }>(`/suppliers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(supplier),
    }),
};
