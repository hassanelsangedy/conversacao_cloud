import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const supabaseUrl = envUrl && envUrl.trim().length > 0 && envUrl.startsWith("http")
    ? envUrl
    : "https://mock-project.supabase.co";

  const supabaseAnonKey = envKey && envKey.trim().length > 0
    ? envKey
    : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock-key";

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Can be ignored if called from Server Component
        }
      },
    },
  });
}
