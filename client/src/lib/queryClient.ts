import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Get household ID from localStorage - simple and direct
function getHouseholdId(): string {
  const HOUSEHOLD_ID_KEY = 'dinner-decided-household-id';
  const householdId = localStorage.getItem(HOUSEHOLD_ID_KEY);
  
  console.log('[API REQUEST] localStorage household ID:', householdId);
  
  if (!householdId) {
    throw new Error('No household ID found. Please refresh the page to create a new household.');
  }
  
  return householdId;
}

// Export function to set a specific household ID (for testing)
export function setHouseholdId(householdId: string): void {
  const HOUSEHOLD_ID_KEY = 'dinner-decided-household-id';
  localStorage.setItem(HOUSEHOLD_ID_KEY, householdId);
  console.log('[API] Set household ID:', householdId);
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
    
    // Create a default timeout controller if no signal is provided and this looks like a long-running operation
    let timeoutController: AbortController | null = null;
    let finalSignal = options.signal;
    
    if (!options.signal && (url.includes('/add-meal') || url.includes('/generate') || options.method === 'POST')) {
      timeoutController = new AbortController();
      setTimeout(() => timeoutController!.abort(), 120000); // 2 minute default timeout for long operations
      finalSignal = timeoutController.signal;
    }
    
    // Force relative URLs to use current origin in development
    const requestUrl = url.startsWith('/') ? url : `/${url}`;
    console.log('[API REQUEST] Making request to:', requestUrl);
    
    const householdId = getHouseholdId();
    console.log('[API REQUEST] Using household ID:', householdId);
    
    const res = await fetch(requestUrl, {
      method: options.method || 'GET',
      headers: {
        'X-Household-Id': householdId,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers || {}
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      credentials: 'include',
      signal: finalSignal
    });
    
    await throwIfResNotOk(res);
    return res;
  }
  
  // Handle the older function signature
  const method = methodOrUrl;
  const url = urlOrOptions as string;
  const options = extraOptions as { signal?: AbortSignal } || {};
  
  // Create a default timeout controller if no signal is provided and this looks like a long-running operation
  let timeoutController: AbortController | null = null;
  let finalSignal = options?.signal;
  
  if (!options?.signal && (url.includes('/add-meal') || url.includes('/generate') || method === 'POST')) {
    timeoutController = new AbortController();
    setTimeout(() => timeoutController!.abort(), 120000); // 2 minute default timeout for long operations
    finalSignal = timeoutController.signal;
  }
  
  // Force relative URLs to use current origin in development
  const requestUrl = url.startsWith('/') ? url : `/${url}`;
  console.log('[API REQUEST] Making request to:', requestUrl);
  
  const res = await fetch(requestUrl, {
    method,
    headers: {
      'X-Household-Id': getHouseholdId(),
      ...(data ? { 'Content-Type': 'application/json' } : {})
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: 'include',
    signal: finalSignal
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
      headers: {
        'X-Household-Id': getHouseholdId()
      }
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    
    // Handle empty responses (like when household doesn't exist)
    const text = await res.text();
    if (!text.trim()) {
      return null;
    }
    
    try {
      return JSON.parse(text);
    } catch (error) {
      console.error('Failed to parse JSON response:', text);
      return null;
    }
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
