
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { getMe } from "../services/api";

const OAuthCallback = () => {
  const navigate = useNavigate();
  const { login } = useApp();

  useEffect(() => {
    const completeLogin = async () => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");

      if (!token) {
        navigate("/login?error=oauth_failed", { replace: true });
        return;
      }

      localStorage.setItem("token", token);

      try {
        const res = await getMe();
        login(res.data, token);
        navigate("/", { replace: true });
      } catch {
        localStorage.removeItem("token");
        navigate("/login?error=oauth_failed", { replace: true });
      }
    };

    completeLogin();
  }, [login, navigate]);

  return <p>Signing you in...</p>;
};

export default OAuthCallback;
