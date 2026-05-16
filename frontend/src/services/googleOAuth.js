// Utility to open Google OAuth popup
export function googleOAuthLogin() {
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:4000";
  window.location.href = `${apiUrl}/api/user/auth/google`;
}
