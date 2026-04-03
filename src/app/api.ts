import { projectId, publicAnonKey } from '../../utils/supabase/info';
import type { Report, SessionNote, CaseFile, LST } from './types';

export const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-7fe18c53`;
export const API_HEADERS = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${publicAnonKey}`,
};

export async function fetchReports(): Promise<Report[]> {
  const res = await fetch(`${API_BASE}/reports`, { headers: API_HEADERS });
  if (!res.ok) throw new Error('Failed to fetch reports');
  const data = await res.json();
  return data.reports || [];
}

export async function fetchGeneratedReports(): Promise<Report[]> {
  const res = await fetch(`${API_BASE}/reports/generated`, { headers: API_HEADERS });
  if (!res.ok) throw new Error('Failed to fetch generated reports');
  const data = await res.json();
  return data.reports || [];
}

export async function fetchNotes(): Promise<SessionNote[]> {
  const res = await fetch(`${API_BASE}/notes`, { headers: API_HEADERS });
  if (!res.ok) throw new Error('Failed to fetch notes');
  const data = await res.json();
  return data.notes || [];
}

export async function fetchCaseFiles(): Promise<CaseFile[]> {
  const res = await fetch(`${API_BASE}/case-files`, { headers: API_HEADERS });
  if (!res.ok) throw new Error('Failed to fetch case files');
  const data = await res.json();
  return data.caseFiles || [];
}

export async function fetchLSTs(): Promise<LST[]> {
  const res = await fetch(`${API_BASE}/lsts`, { headers: API_HEADERS });
  if (!res.ok) throw new Error('Failed to fetch LSTs');
  const data = await res.json();
  return data.lsts || [];
}

export async function updateLst(id: string, payload: Partial<LST>): Promise<LST> {
  const response = await fetch(`${API_BASE}/lsts/${id}`, {
    method: 'PUT',
    headers: API_HEADERS,
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Failed to update LST');
  return response.json();
}

export async function addLst(payload: Partial<LST>): Promise<{ success: boolean, id: string }> {
  const response = await fetch(`${API_BASE}/lsts/add`, {
    method: 'POST',
    headers: API_HEADERS,
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Failed to add LST');
  return response.json();
}

export async function deleteLst(id: string): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE}/lsts/${id}`, {
    method: 'DELETE',
    headers: API_HEADERS,
  });
  if (!response.ok) throw new Error('Failed to delete LST');
  return response.json();
}

export async function mergeLsts(ids: string[], mergedLST: Partial<LST>): Promise<{ success: boolean, id: string }> {
  const response = await fetch(`${API_BASE}/lsts/merge`, {
    method: 'POST',
    headers: API_HEADERS,
    body: JSON.stringify({ ids, mergedLST }),
  });
  if (!response.ok) throw new Error('Failed to merge LSTs');
  return response.json();
}
