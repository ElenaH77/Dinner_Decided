import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  url: string,
  options?: {
    method?: string,
    body?: any,
    headers?: Record<string, string>,
    signal?: AbortSignal
  } | undefined,
): Promise<Response>;

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  options?: { signal?: AbortSignal } | undefined,
): Promise<Response>;

export async function apiRequest(
  methodOrUrl: string,
  urlOrOptions?: string | object | undefined,
  data?: unknown | undefined,
  extraOptions?: object | undefined,
): Promise<Response> {
  // Handle the newer function signature
  if (typeof urlOrOptions === 'object' || urlOrOptions === undefined) {
    const url = methodOrUrl;
    const options = urlOrOptions as { method?: string, body?: any, headers?: Record<string, string>, signal?: AbortSignal } || {};
    
    const res = await fetch(url, {
      method: options.method || 'GET',
      headers: options.body ? { 'Content-Type': 'application/json', ...options.headers || {} } : options.headers || {},
      body: options.body ? JSON.stringify(options.body) : undefined,
      credentials: 'include',
      signal: options.signal
    });
    
    await throwIfResNotOk(res);
    return res;
  }
  
  // Handle the older function signature
  const method = methodOrUrl;
  const url = urlOrOptions as string;
  const options = extraOptions as { signal?: AbortSignal } || {};
  
  const res = await fetch(url, {
    method,
    headers: data ? { 'Content-Type': 'application/json' } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: 'include',
    signal: options?.signal
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
