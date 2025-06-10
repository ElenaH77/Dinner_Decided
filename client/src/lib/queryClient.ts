import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Cache the household ID to prevent race conditions
let cachedHouseholdId: string | null = null;

// Get household ID from localStorage with caching to prevent race conditions
function getHouseholdId(): string {
  if (cachedHouseholdId) {
    return cachedHouseholdId;
  }
  
  try {
    const HOUSEHOLD_ID_KEY = 'dinner-decided-household-id';
    let householdId = localStorage.getItem(HOUSEHOLD_ID_KEY);
    
    if (!householdId) {
      // Check if user has selected an account via URL or localStorage preference
      const urlParams = new URLSearchParams(window.location.search);
      const accountParam = urlParams.get('account');
      const storedAccount = localStorage.getItem('selected-account');
      
      // Use AltElena for fancy meals, KidsElena for kid-friendly meals
      if (accountParam === 'alt' || storedAccount === 'alt') {
        householdId = '971194b1-c94c-42c5-9b09-c800290fa380'; // AltElena
        localStorage.setItem('selected-account', 'alt');
        console.log('[API] Using AltElena household ID for fancy meals');
      } else {
        householdId = 'e971dd06-ce76-49bf-ad89-12b4106e4e7e'; // KidsElena  
        localStorage.setItem('selected-account', 'kids');
        console.log('[API] Using KidsElena household ID for kid-friendly meals');
      }
      
      localStorage.setItem(HOUSEHOLD_ID_KEY, householdId);
    } else {
      console.log('[API] Using existing household ID:', householdId);
    }
    
    cachedHouseholdId = householdId;
    return householdId;
  } catch (error) {
    // Fallback if localStorage isn't available
    console.warn('[API] localStorage not available, generating fallback household ID');
    cachedHouseholdId = crypto.randomUUID();
    return cachedHouseholdId;
  }
}

// Export function to reset household ID (for testing or user reset)
export function resetHouseholdId(): string {
  const newId = crypto.randomUUID();
  const HOUSEHOLD_ID_KEY = 'dinner-decided-household-id';
  localStorage.setItem(HOUSEHOLD_ID_KEY, newId);
  cachedHouseholdId = newId;
  console.log('[API] Reset to new household ID:', newId);
  return newId;
}

// Export function to switch accounts
export function switchToAccount(account: 'kids' | 'alt'): void {
  const HOUSEHOLD_ID_KEY = 'dinner-decided-household-id';
  
  // Clear all cached data
  localStorage.removeItem(HOUSEHOLD_ID_KEY);
  localStorage.removeItem('selected-account');
  cachedHouseholdId = null;
  
  // Set the account preference
  localStorage.setItem('selected-account', account);
  
  // Force reload to pick up new household ID
  window.location.reload();
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
    
    const res = await fetch(requestUrl, {
      method: options.method || 'GET',
      headers: {
        'X-Household-Id': getHouseholdId(),
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
