import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Runs an async loader and tracks { data, loading, error }.
 * Stale responses are dropped, so fast filter changes cannot flicker.
 */
export function useAsync(loader, deps = [], { immediate = true, initialData = null } = {}) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);
  const runId = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(async (...args) => {
    const id = ++runId.current;
    setLoading(true);
    setError(null);
    try {
      const result = await loader(...args);
      if (mounted.current && id === runId.current) setData(result);
      return result;
    } catch (err) {
      if (mounted.current && id === runId.current) setError(err);
      throw err;
    } finally {
      if (mounted.current && id === runId.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    if (immediate) run().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, immediate]);

  return { data, loading, error, run, reload: run, setData };
}

export default useAsync;
