import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "../api";

export function useCashSummary() {
  return useQuery({
    queryKey: ['cash', 'summary'],
    queryFn: () => apiGet<any>('/cash/summary').then(r => r.data)
  });
}

export function useCashTransactions(page: number) {
  return useQuery({
    queryKey: ['cash', 'transactions', page],
    queryFn: () => apiGet<any>(`/cash/transactions?page=${page}&limit=20`).then(r => r.data)
  });
}

export function useDepositToBank() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { amount: number; note?: string; bankAccountLabel?: string }) =>
      apiPost('/cash/deposit', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash'] });
    }
  });
}

export function useAdjustCash() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { amount: number; note?: string }) =>
      apiPost('/cash/adjust', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash'] });
    }
  });
}
