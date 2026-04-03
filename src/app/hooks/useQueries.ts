import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchReports, fetchGeneratedReports, fetchNotes, fetchCaseFiles, fetchLSTs, updateLst } from '../api';
import { LST } from '../types';

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

export function useUpdateLST() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string, payload: Partial<LST> }) => updateLst(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lsts'] });
    },
  });
}
