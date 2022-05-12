import { QueryKey, useQueryClient, InfiniteData } from 'react-query';
import { useBackgroundRequest } from './useBackgroundRequest';

export const useBackgroundPaginatedRequest = <T extends InfiniteData<unknown>>(
  queryKey: QueryKey,
): void => {
  const client = useQueryClient();
  useBackgroundRequest(queryKey, ({ res, req }) => {
    if (!res) {
      return;
    }

    const current = client.getQueryData(queryKey) as T;
    const updated = { ...current } as T;
    const index = updated.pages.length - 1;
    updated.pageParams[index] = req.variables.after;
    client.setQueryData(queryKey, updated);
  });
};