import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchReports, fetchGeneratedReports, fetchNotes, fetchCaseFiles, fetchLSTs, updateLst, addLst, deleteLst, mergeLsts, fetchErrorLog, clearErrorLog, fetchHydration, fetchLstHistory, deleteReport, updateReport, updateCaseFile, updateNote } from '../api';
import { CaseFile, LST, Report, SessionNote } from '../types';

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
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: ['lsts'] });
      const previousLsts = queryClient.getQueryData(['lsts']);
      queryClient.setQueryData(['lsts'], (old: LST[] | undefined) => 
        old ? old.map(l => l.id === id ? { ...l, ...payload } : l) : []
      );
      return { previousLsts };
    },
    onError: (err, variables, context) => {
      if (context?.previousLsts) {
        queryClient.setQueryData(['lsts'], context.previousLsts);
      }
    },
    onSettled: () => {
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
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['lsts'] });
      const previousLsts = queryClient.getQueryData(['lsts']);
      queryClient.setQueryData(['lsts'], (old: LST[] | undefined) => 
        old ? old.filter(l => l.id !== id) : []
      );
      return { previousLsts };
    },
    onError: (err, id, context) => {
      if (context?.previousLsts) {
        queryClient.setQueryData(['lsts'], context.previousLsts);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['lsts'] });
    },
  });
}

export function useMergeLSTs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, mergedLST }: { ids: string[], mergedLST: Partial<LST> }) => mergeLsts(ids, mergedLST),
    onMutate: async ({ ids }) => {
      await queryClient.cancelQueries({ queryKey: ['lsts'] });
      const previousLsts = queryClient.getQueryData(['lsts']);
      queryClient.setQueryData(['lsts'], (old: LST[] | undefined) => 
        old ? old.filter(l => !ids.includes(l.id)) : []
      );
      return { previousLsts };
    },
    onError: (err, variables, context) => {
      if (context?.previousLsts) {
        queryClient.setQueryData(['lsts'], context.previousLsts);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['lsts'] });
    },
  });
}

export function useDeleteReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteReport(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['reports'] });
      const previousReports = queryClient.getQueryData<Report[]>(['reports']);
      queryClient.setQueryData<Report[]>(['reports'], (old = []) =>
        old.filter((r) => r.id !== id)
      );
      return { previousReports };
    },
    onError: (_err, _id, context) => {
      queryClient.setQueryData(['reports'], context?.previousReports);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

export function useUpdateReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string, payload: Partial<Report> }) => updateReport(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['generatedReports'] });
      queryClient.invalidateQueries({ queryKey: ['hydration'] });
    },
  });
}

export function useUpdateCaseFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string, payload: Partial<CaseFile> }) => updateCaseFile(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caseFiles'] });
      queryClient.invalidateQueries({ queryKey: ['hydration'] });
    },
  });
}

export function useUpdateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string, payload: Partial<SessionNote> }) => updateNote(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['hydration'] });
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
