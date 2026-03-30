import { Platform } from "react-native";
import Constants from "expo-constants";
import { QueryClient, QueryFunction } from "@tanstack/react-query";

function resolveApiUrl(): string {
  const c = Constants as Record<string, any>;

  console.log("[API] === Resolving API URL ===");
  console.log("[API] Platform:", Platform.OS);
  console.log("[API] __DEV__:", __DEV__);

  if (Platform.OS === "web" && typeof window !== "undefined" && window.location) {
    const url = window.location.origin + "/";
    console.log("[API] Web platform, using origin:", url);
    return url;
  }

  if (__DEV__) {
    const devDomain = process.env.EXPO_PUBLIC_DOMAIN;
    if (devDomain) {
      const url = `https://${devDomain}/`;
      console.log("[API] DEV mode, using EXPO_PUBLIC_DOMAIN:", url);
      return url;
    }
    const hostUri = c.expoConfig?.hostUri || c.manifest?.hostUri;
    if (hostUri) {
      const host = hostUri.split("/")[0].split(":")[0];
      if (host && host.includes(".")) {
        const devUrl = `https://${hostUri.split("/")[0]}/`;
        console.log("[API] DEV mode, using hostUri:", devUrl);
        return devUrl;
      }
    }
  }

  const explicitUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (explicitUrl && typeof explicitUrl === "string" && explicitUrl.startsWith("https://")) {
    const url = explicitUrl.endsWith("/") ? explicitUrl : explicitUrl + "/";
    console.log("[API] Using explicit EXPO_PUBLIC_API_BASE_URL:", url);
    return url;
  }

  console.log("[API] Production native mode - searching manifest sources...");

  const apiBaseUrl =
    c.manifest2?.extra?.expoClient?.apiBaseUrl ||
    c.__unsafeNoWarnManifest2?.extra?.expoClient?.apiBaseUrl ||
    c.manifest?.extra?.expoClient?.apiBaseUrl ||
    c.expoConfig?.extra?.apiBaseUrl;

  if (apiBaseUrl && typeof apiBaseUrl === "string" && apiBaseUrl.startsWith("https://")) {
    const url = apiBaseUrl.endsWith("/") ? apiBaseUrl : apiBaseUrl + "/";
    console.log("[API] Found apiBaseUrl in manifest:", url);
    return url;
  }

  const launchAssetUrl =
    c.manifest2?.launchAsset?.url ||
    c.__unsafeNoWarnManifest2?.launchAsset?.url ||
    c.manifest?.bundleUrl;

  if (launchAssetUrl && typeof launchAssetUrl === "string") {
    try {
      const parsed = new URL(launchAssetUrl);
      const url = parsed.origin + "/";
      console.log("[API] Extracted origin from launchAsset/bundle URL:", url);
      return url;
    } catch (e) {
      console.log("[API] Failed to parse launchAsset URL:", launchAssetUrl, e);
    }
  }

  const hostUri =
    c.manifest2?.extra?.expoClient?.hostUri ||
    c.__unsafeNoWarnManifest2?.extra?.expoClient?.hostUri ||
    c.manifest?.hostUri ||
    c.expoConfig?.hostUri;

  if (hostUri && typeof hostUri === "string") {
    const host = hostUri.split("/")[0].split(":")[0];
    if (host && host.includes(".") && !host.startsWith("127.") && !host.startsWith("localhost")) {
      const url = `https://${host}/`;
      console.log("[API] Using hostUri as API URL:", url);
      return url;
    }
  }

  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) {
    const host = domain.split(":")[0];
    const url = `https://${host}/`;
    console.log("[API] Last resort EXPO_PUBLIC_DOMAIN:", url);
    return url;
  }

  console.warn("[API] All dynamic sources failed, using hardcoded production URL");
  return "https://islamic-center-connect.replit.app/";
}

let cachedApiUrl: string | null = null;

export function getApiUrl(): string {
  if (!cachedApiUrl) {
    cachedApiUrl = resolveApiUrl();
  }
  return cachedApiUrl;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  route: string,
  data?: unknown | undefined,
): Promise<Response> {
  const baseUrl = getApiUrl();
  const url = new URL(route, baseUrl);

  const res = await fetch(url.toString(), {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
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
    const baseUrl = getApiUrl();
    const url = new URL(queryKey.join("/") as string, baseUrl);

    const res = await fetch(url.toString());

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
      retry: 2,
    },
    mutations: {
      retry: false,
    },
  },
});
