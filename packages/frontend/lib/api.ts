/**
 * API client for communicating with AWS API Gateway
 * Handles authentication headers and request/response formatting
 */

import { getAccessToken } from './auth';

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
  name: string;
  email: string;
  phone?: string;
  unitId?: string;
  message: string;
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
  phoneNumber?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface ResidentCheck {
  isResident: boolean;
  isStaff?: boolean;
  residentInfo?: Resident;
}

/**
 * Generic API request wrapper
 */
const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = getAccessToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
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
 * Check if current user is an approved resident
 */
export const checkResident = async (): Promise<ResidentCheck> => {
  return apiRequest<ResidentCheck>('/check-resident');
};

/**
 * Self-register as a resident (requires authentication)
 */
export const registerResident = async (registration: { email: string; unitNumber: string; buildingId?: string }): Promise<{ success: boolean; message: string }> => {
  return apiRequest('/residents/register', {
    method: 'POST',
    body: JSON.stringify(registration),
  });
};

/**
 * Get all residents (admin/staff only)
 */
export const getResidents = async (): Promise<Resident[]> => {
  return apiRequest<Resident[]>('/residents');
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
 * Delete a resident (admin only)
 */
export const deleteResident = async (residentId: string): Promise<{ success: boolean }> => {
  return apiRequest(`/residents/${residentId}`, {
    method: 'DELETE',
  });
};

