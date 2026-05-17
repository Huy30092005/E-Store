// Utility to open Google OAuth popup
export function googleOAuthLogin() {
  const apiUrl = (import.meta.env.VITE_API_URL || "http://localhost:4000").replace(
    /\/+$/,
    ""
  );
  const redirect = encodeURIComponent(window.location.origin);
  window.location.href = `${apiUrl}/api/user/auth/google?redirect=${redirect}`;
}
