import type { Report, SessionNote, CaseFile, LST } from './types';

// Base URL for the backend API
// Original Supabase URL (commented out): 
// const API_BASE = 'https://zuvhkazgoonarugqlvwi.supabase.co/functions/v1/make-server-7fe18c53';
export const API_BASE = 'https://api.salphadnis.org';

export const API_HEADERS = {
  'Content-Type': 'application/json',
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
  return Array.isArray(data) ? data : (data.caseFiles || []);
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

export async function fetchErrorLog(): Promise<any[]> {
  const response = await fetch(`${API_BASE}/error-log`, {
    headers: API_HEADERS,
  });
  if (!response.ok) throw new Error('Failed to fetch error log');
  return response.json();
}

export async function clearErrorLog(): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE}/error-log`, {
    method: 'DELETE',
    headers: API_HEADERS,
  });
  if (!response.ok) throw new Error('Failed to clear error log');
  return response.json();
}

export async function fetchTemplates(): Promise<any[]> {
  const response = await fetch(`${API_BASE}/templates`, {
    headers: API_HEADERS,
  });
  if (!response.ok) throw new Error('Failed to fetch templates');
  return response.json();
}

export async function addTemplate(template: any): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE}/templates`, {
    method: 'POST',
    headers: API_HEADERS,
    body: JSON.stringify(template),
  });
  if (!response.ok) throw new Error('Failed to add template');
  return response.json();
}

export async function deleteTemplate(id: string): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE}/templates/${id}`, {
    method: 'DELETE',
    headers: API_HEADERS,
  });
  if (!response.ok) throw new Error('Failed to delete template');
  return response.json();
}

export async function fetchAuditLog(): Promise<any[]> {
  const response = await fetch(`${API_BASE}/audit-log`, {
    headers: API_HEADERS,
  });
  if (!response.ok) throw new Error('Failed to fetch audit log');
  return response.json();
}

export async function fetchBackup(): Promise<any> {
  const response = await fetch(`${API_BASE}/backup`, {
    headers: API_HEADERS,
  });
  if (!response.ok) throw new Error('Failed to fetch backup');
  return response.json();
}

export async function restoreData(data: any): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE}/restore`, {
    method: 'POST',
    headers: API_HEADERS,
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to restore data');
  return response.json();
}

export async function searchReports(query: string): Promise<Report[]> {
  const response = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`, {
    headers: API_HEADERS,
  });
  if (!response.ok) throw new Error('Search failed');
  return response.json();
}

export async function* streamGenerateReport(payload: any): AsyncGenerator<string> {
  const response = await fetch(`${API_BASE}/generate-report`, {
    method: 'POST',
    headers: API_HEADERS,
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error('Generation failed');
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No stream reader');

  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    yield decoder.decode(value);
  }
}

