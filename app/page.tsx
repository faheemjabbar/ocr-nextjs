'use client'
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import AuthUI from "@/components/Auth";
import type { Session } from "@supabase/supabase-js";
import HomePage from "@/components/HomePage";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  if (!session) {
    return <AuthUI />;  // show login/signup page
  }

  return <HomePage />; 
}
