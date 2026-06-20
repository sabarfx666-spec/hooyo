"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/store/AuthContext";

const PUBLIC_PATHS = ["/login", "/home", "/contact"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, hydrated } = useAuth();
  const router   = useRouter();
  const pathname = usePathname();

  const isPublic = PUBLIC_PATHS.includes(pathname);

  useEffect(() => {
    if (!hydrated) return;
    if (!isPublic && !user) {
      router.replace("/login");
    }
  }, [hydrated, user, isPublic, router]);

  // Show nothing until hydrated (avoids flash of protected content)
  if (!hydrated) return null;

  // On protected routes, show nothing until logged in
  if (!isPublic && !user) return null;

  return <>{children}</>;
}
