// Utility to open Google OAuth popup
export function googleOAuthLogin() {
  window.location.href = `${import.meta.env.VITE_API_URL || "http://localhost:4000/api/user"}/auth/google`;
}
