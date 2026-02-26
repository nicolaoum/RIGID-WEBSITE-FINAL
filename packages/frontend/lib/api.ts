/**
 * API client for communicating with AWS API Gateway
 * 
 * SECURITY: Authentication is handled via HttpOnly cookies.
 * The Next.js proxy (/api/proxy) reads the token from the cookie
 * and injects the Authorization header server-side.
 * No tokens are ever exposed to client-side JavaScript.
 */

// Route all API calls through the local Next.js proxy to avoid browser CORS issues.
const API_URL = '/api/proxy';

export interface Unit {
  id: string;
  buildingId?: string;
  buildingName: string;
  unitNumber: string;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  rent: number;
  price?: number;
  available: boolean;
  availableDate?: string;
  imageUrl?: string;
  images?: string[];
  videoUrl?: string;
}

export interface Building {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  totalUnits: number;
  availableUnits: number;
  imageUrl?: string;
  amenities: string[];
}

export interface Inquiry {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  unitId?: string;
  message: string;
  status?: 'new' | 'read' | 'replied' | 'pending' | 'done';
  createdAt?: string;
}

export interface Ticket {
  id?: string;
  residentEmail: string;
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status?: 'open' | 'in-progress' | 'resolved' | 'closed';
  residentName?: string;
  unitNumber?: string;
  buildingId?: string;
  buildingName?: string;
  phoneNumber?: string;
  allowEntry?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'urgent';
  publishedAt: string;
  buildingId?: string;
}

export interface User {
  email: string;
  name?: string;
  sub: string;
  groups?: string[];
}

export interface Resident {
  id: string;
  email: string;
  name: string;
  unitNumber?: string;
  buildingId?: string;
  buildingName?: string;
  phoneNumber?: string;
  status: 'active' | 'pending' | 'inactive';
  createdAt: string;
  updatedAt?: string;
  cognitoUsername?: string;
}

export interface ResidentCheck {
  isResident: boolean;
  isStaff?: boolean;
  residentInfo?: Resident;
}

/**
 * Generic API request wrapper.
 * Authentication is handled automatically by the proxy reading HttpOnly cookies.
 * No Authorization header is sent from the browser.
 */
const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // NOTE: No Authorization header! The proxy reads the HttpOnly cookie server-side.

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'same-origin', // Ensure cookies are sent to our proxy
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error: ${response.status} - ${error}`);
  }

  return response.json();
};

/**
 * Fetch all available units
 */
export const getUnits = async (): Promise<Unit[]> => {
  return apiRequest<Unit[]>('/units');
};

/**
 * Add a new unit (staff/admin only)
 */
export const postUnit = async (unit: Partial<Unit>): Promise<Unit> => {
  return apiRequest('/units', {
    method: 'POST',
    body: JSON.stringify(unit),
  });
};

/**
 * Delete a unit (staff/admin only)
 */
export const deleteUnit = async (unitId: string): Promise<{ success: boolean }> => {
  return apiRequest(`/units/${unitId}`, {
    method: 'DELETE',
  });
};

/**
 * Get a presigned upload URL for S3 image uploads (staff/admin only)
 */
export const getUploadUrl = async (fileName: string, contentType: string): Promise<{ uploadUrl: string; fileUrl: string }> => {
  return apiRequest('/upload-url', {
    method: 'POST',
    body: JSON.stringify({ fileName, contentType }),
  });
};

/**
 * Fetch all buildings
 */
export const getBuildings = async (): Promise<Building[]> => {
  return apiRequest<Building[]>('/buildings');
};

/**
 * Submit a general inquiry
 */
export const submitInquiry = async (inquiry: Inquiry): Promise<{ success: boolean; message: string }> => {
  return apiRequest('/inquiries', {
    method: 'POST',
    body: JSON.stringify(inquiry),
  });
};

/**
 * Get all inquiries (staff/admin only)
 */
export const getInquiries = async (): Promise<Inquiry[]> => {
  return apiRequest<Inquiry[]>('/inquiries');
};

/**
 * Update inquiry status (staff/admin only)
 */
export const updateInquiryStatus = async (id: string, status: string): Promise<{ success: boolean; message: string }> => {
  return apiRequest(`/inquiries/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
};

/**
 * Submit a maintenance ticket (requires authentication)
 */
export const submitTicket = async (ticket: Ticket): Promise<{ success: boolean; ticketId: string }> => {
  return apiRequest('/tickets', {
    method: 'POST',
    body: JSON.stringify(ticket),
  });
};

/**
 * Get all tickets for current resident (requires authentication)
 */
export const getTickets = async (): Promise<Ticket[]> => {
  return apiRequest<Ticket[]>('/tickets');
};

/**
 * Get all tickets across all users (staff/admin only)
 */
export const getAllTickets = async (): Promise<Ticket[]> => {
  return apiRequest<Ticket[]>('/tickets/all');
};

/**
 * Update ticket status (staff/admin only)
 */
export const updateTicketStatus = async (
  ticketId: string, 
  status: 'open' | 'in-progress' | 'resolved' | 'closed'
): Promise<{ success: boolean }> => {
  return apiRequest(`/tickets/${ticketId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
};

/**
 * Post a new ticket (alias for submitTicket for consistency)
 */
export const postTicket = async (ticket: Ticket): Promise<{ success: boolean; ticketId: string }> => {
  return submitTicket(ticket);
};

/**
 * Get all notices (requires authentication)
 */
export const getNotices = async (): Promise<Notice[]> => {
  return apiRequest<Notice[]>('/notices');
};

/**
 * Post a new notice (staff/admin only)
 */
export const postNotice = async (notice: { title: string; content: string; type: 'info' | 'warning' | 'urgent'; buildingId?: string }): Promise<{ success: boolean; message: string; notice: Notice }> => {
  return apiRequest('/notices', {
    method: 'POST',
    body: JSON.stringify(notice),
  });
};

/**
 * Delete a notice (staff/admin only)
 */
export const deleteNotice = async (noticeId: string): Promise<{ success: boolean }> => {
  return apiRequest(`/notices/${noticeId}`, {
    method: 'DELETE',
  });
};

/**
 * Check if current user is an approved resident
 */
export const checkResident = async (): Promise<ResidentCheck> => {
  const result = await apiRequest<ResidentCheck>('/check-resident');
  console.log('🔍 checkResident raw response:', result);
  console.log('🔍 residentInfo:', result.residentInfo);
  console.log('🔍 residentInfo.unitNumber:', result.residentInfo?.unitNumber);
  console.log('🔍 residentInfo.buildingId:', result.residentInfo?.buildingId);
  return result;
};

/**
 * Self-register as a resident (requires authentication)
 */
export const registerResident = async (registration: { email: string; unitNumber: string; buildingId?: string; phoneNumber?: string }): Promise<{ success: boolean; message: string }> => {
  return apiRequest('/residents/register', {
    method: 'POST',
    body: JSON.stringify(registration),
  });
};

/**
 * Get all residents (admin/staff only)
 */
export const getResidents = async (): Promise<Resident[]> => {
  // Add cache-busting timestamp to force fresh data
  const response = await apiRequest<{ residents: Resident[] }>(`/residents?_t=${Date.now()}`);
  return response.residents || [];
};

/**
 * Add a new resident or authorize pending resident (admin/staff only)
 */
export const addResident = async (resident: Partial<Resident>): Promise<Resident> => {
  return apiRequest('/residents', {
    method: 'POST',
    body: JSON.stringify(resident),
  });
};

/**
 * Get current resident's info from checkResident endpoint
 */
export const getResidentInfo = async (): Promise<Resident | null> => {
  const result: ResidentCheck = await apiRequest('/check-resident', {
    method: 'GET',
  });
  return result.residentInfo || null;
};

/**
 * Delete a resident (admin only)
 */
export const deleteResident = async (residentId: string, cognitoUsername?: string): Promise<{ success: boolean }> => {
  const url = cognitoUsername 
    ? `/residents/${residentId}?cognitoUsername=${encodeURIComponent(cognitoUsername)}`
    : `/residents/${residentId}`;
  return apiRequest(url, {
    method: 'DELETE',
  });
};

/**
 * Delete a ticket (resident can delete own, staff/admin can delete any)
 */
export const deleteTicket = async (ticketId: string): Promise<{ success: boolean; message: string }> => {
  return apiRequest(`/tickets/${ticketId}`, {
    method: 'DELETE',
  });
};

/**
 * Sync pending residents - checks if pending residents have signed up and activates them (admin/staff only)
 */
export const syncPendingResidents = async (): Promise<{ success: boolean; message: string; results: { checked: number; activated: number; stillPending: number; errors: number } }> => {
  return apiRequest('/residents/sync', {
    method: 'POST',
  });
};
