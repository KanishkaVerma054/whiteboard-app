const TOKEN_KEY = "auth_token"

export function getToken(): string | null {
    try {
        return localStorage.getItem(TOKEN_KEY)
    } catch {
        return null;
    }
}

export function setToken(token:string) {
    try {
        localStorage.setItem(TOKEN_KEY, token);
    } catch {
        console.warn("Failed to save auth token");
    }
}

export function clearToken() {
    try {
        localStorage.removeItem(TOKEN_KEY)
    } catch {}
}

// Only allow paths inside this site, so ?callbackUrl= can't send a user to another site after sign-in
export function safeCallbackUrl(raw: string | null): string {
    if (!raw) return "/";
    if (!raw.startsWith("/")) return "/";                             // "https://evil.com"
    if (raw.startsWith("//") || raw.startsWith("/\\")) return "/";    // "//evil.com" also means another site
    return raw;
}
