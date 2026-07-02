import { useCallback, useEffect, useState } from "react";

export interface AsyncState<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
  reload: () => Promise<T>;
  setData: (data: T) => void;
}

export const useAsync = <T>(loader: () => Promise<T>, dependencies: unknown[] = []): AsyncState<T> => {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const nextData = await loader();
      setData(nextData);
      return nextData;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load data.");
      throw caught;
    } finally {
      setIsLoading(false);
    }
  }, dependencies);

  useEffect(() => {
    void reload().catch(() => undefined);
  }, [reload]);

  return { data, error, isLoading, reload, setData };
};

