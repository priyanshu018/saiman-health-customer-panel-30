"use client";

import { useEffect, useState } from "react";
import type { AuthUserSummary } from "@/lib/customer-web-live";
import { getCurrentCustomer } from "@/lib/customer-web-live";
import { getSupabaseEnv } from "@/lib/supabase-browser";

type LoadState = {
  loading: boolean;
  error: string;
};

type CustomerSessionState = {
  user: AuthUserSummary | null;
  setUser: React.Dispatch<React.SetStateAction<AuthUserSummary | null>>;
  state: LoadState;
  configured: boolean;
  hasServiceRoleOnly: boolean;
};

export function useCustomerUser(): CustomerSessionState {
  const [user, setUser] = useState<AuthUserSummary | null>(null);
  const env = getSupabaseEnv();
  const [state, setState] = useState<LoadState>({
    loading: env.configured,
    error: "",
  });

  useEffect(() => {
    let active = true;

    if (!env.configured) {
      return () => {
        active = false;
      };
    }

    getCurrentCustomer()
      .then((result) => {
        if (!active) return;
        setUser(result);
        setState({ loading: false, error: "" });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({
          loading: false,
          error: error instanceof Error ? error.message : "Unable to load customer session.",
        });
      });

    return () => {
      active = false;
    };
  }, [env.configured]);

  return {
    user,
    setUser,
    state,
    configured: env.configured,
    hasServiceRoleOnly: env.hasServiceRoleOnly,
  };
}
