import React, {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { normalizeUserAssets } from "../lib/assetUrls";

const AuthCtx = createContext(null);
const USER_REFRESH_INTERVAL_MS = 60 * 1000;

export const useAuth = () => useContext(AuthCtx);

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return normalizeUserAssets(JSON.parse(localStorage.getItem("psr_user")) || null);
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const refreshInFlightRef = useRef(null);

  /*
   * Store the user in both React state and localStorage.
   */
  const updateUser = useCallback((nextUser) => {
    if (!nextUser) {
      setUser(null);
      localStorage.removeItem("psr_user");
      return;
    }

    const normalizedUser = normalizeUserAssets(nextUser);
    setUser(normalizedUser);
    localStorage.setItem("psr_user", JSON.stringify(normalizedUser));
  }, []);

  /*
   * Login
   */
  const login = async (email, password) => {
    setLoading(true);
    setError("");

    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await r.json();

      if (!r.ok) {
        throw new Error(data.message || "Login failed");
      }

      updateUser(data.user);

      return data.user;
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  /*
   * Logout
   */
  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("psr_user");
  }, []);

  /*
   * Refresh the user from MongoDB.
   *
   * This is what prevents stale roles, statuses, and positions from localStorage.
   */
  const refreshUser = useCallback(async () => {
    if (!user?.id && !user?._id) {
      return null;
    }

    if (refreshInFlightRef.current) {
      return refreshInFlightRef.current;
    }

    const refreshPromise = (async () => {
      try {
        const userId = user._id || user.id;

        const r = await fetch("/api/auth/me", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${userId}`,
          },
          credentials: "include",
        });

        if (!r.ok) {
          if (r.status === 401 || r.status === 403) {
            logout();
          }

          throw new Error("Failed to refresh user");
        }

        const data = await r.json();

        if (!data.user) {
          throw new Error("No user returned from /me");
        }

        updateUser(data.user);

        return data.user;
      } catch (e) {
        console.error("Refresh user error:", e);
        return null;
      } finally {
        refreshInFlightRef.current = null;
      }
    })();

    refreshInFlightRef.current = refreshPromise;
    return refreshPromise;
  }, [logout, updateUser, user?.id, user?._id]);

  /*
   * Automatically refresh the user once when the app starts.
   *
   * This means changes made by an admin are picked up even if
   * the user hasn't logged out and back in.
   */
  useEffect(() => {
    if (!user?.id && !user?._id) {
      return;
    }

    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") {
        refreshUser();
      }
    };

    refreshUser();

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        refreshUser();
      }
    }, USER_REFRESH_INTERVAL_MS);

    window.addEventListener("focus", refreshIfVisible);
    document.addEventListener("visibilitychange", refreshIfVisible);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshIfVisible);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, [refreshUser, user?.id, user?._id]);

  return (
    <AuthCtx.Provider
      value={{
        user,
        loading,
        error,

        login,
        logout,

        updateUser,
        refreshUser,
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
}