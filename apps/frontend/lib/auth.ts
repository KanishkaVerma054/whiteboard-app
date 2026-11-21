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
