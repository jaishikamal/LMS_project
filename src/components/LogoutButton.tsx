"use client";

import { useClerk } from "@clerk/nextjs";
import Image from "next/image";
import { useState } from "react";

/**
 * Signs the user out and forces a full page navigation to `/sign-in`.
 *
 * A soft (client-router) redirect after sign-out leaves other dashboard
 * routes sitting in Next's client Router Cache, so pressing Back (or
 * clicking a menu link right after logging out) can briefly show stale,
 * "still signed in" content until a hard reload. Navigating with
 * `window.location` instead of `router.push` avoids that: it drops the
 * Router Cache entirely and re-requests `/sign-in` with the cleared
 * session cookie.
 */
const LogoutButton = ({ className }: { className: string }) => {
  const { signOut } = useClerk();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
    } finally {
      window.location.href = "/sign-in";
    }
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={isSigningOut}
      className={`${className} disabled:opacity-60`}
    >
      <Image src="/logout.png" alt="" width={20} height={20} />
      <span className="hidden lg:block">
        {isSigningOut ? "Signing out..." : "Logout"}
      </span>
    </button>
  );
};

export default LogoutButton;
