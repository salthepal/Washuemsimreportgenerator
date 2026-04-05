import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchReports, fetchGeneratedReports, fetchNotes, fetchCaseFiles, fetchLSTs, updateLst, addLst, deleteLst, mergeLsts, fetchErrorLog, clearErrorLog, fetchHydration, fetchLstHistory } from '../api';
import { LST } from '../types';

export function useHydration() {
  return useQuery({ queryKey: ['hydration'], queryFn: fetchHydration });
}

export function useReports() {
  return useQuery({ queryKey: ['reports'], queryFn: fetchReports });
}

export function useGeneratedReports() {
  return useQuery({ queryKey: ['generatedReports'], queryFn: fetchGeneratedReports });
}

export function useNotes() {
  return useQuery({ queryKey: ['notes'], queryFn: fetchNotes });
}

export function useCaseFiles() {
  return useQuery({ queryKey: ['caseFiles'], queryFn: fetchCaseFiles });
}

export function useLSTs() {
  return useQuery({ queryKey: ['lsts'], queryFn: fetchLSTs });
}

export function useLSTHistory(id: string) {
  return useQuery({ queryKey: ['lst_history', id], queryFn: () => fetchLstHistory(id), enabled: !!id });
}

export function useUpdateLST() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string, payload: Partial<LST> }) => updateLst(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lsts'] });
    },
  });
}

export function useAddLST() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<LST>) => addLst(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lsts'] });
    },
  });
}

export function useDeleteLST() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteLst(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lsts'] });
    },
  });
}

export function useMergeLSTs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, mergedLST }: { ids: string[], mergedLST: Partial<LST> }) => mergeLsts(ids, mergedLST),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lsts'] });
    },
  });
}

export function useErrorLog() {
  return useQuery({ 
    queryKey: ['errorLog'], 
    queryFn: fetchErrorLog,
    refetchInterval: 10000, // Auto-refresh every 10s
  });
}

export function useClearErrorLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clearErrorLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['errorLog'] });
    },
  });
}
