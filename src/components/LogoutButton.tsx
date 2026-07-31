"use client";

import { signOut } from "next-auth/react";
import Image from "next/image";
import { useState } from "react";

/**
 * Signs the user out and forces a full page navigation to `/sign-in`.
 *
 * A soft (client-router) redirect after sign-out can leave other dashboard
 * routes sitting in Next's client Router Cache, so pressing Back (or
 * clicking a menu link right after logging out) could briefly show stale,
 * "still signed in" content until a hard reload. `redirect: false` plus a
 * manual `window.location` assignment avoids that: it drops the Router
 * Cache entirely and re-requests `/sign-in` with the cleared session cookie.
 */
const LogoutButton = ({ className }: { className: string }) => {
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut({ redirect: false });
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
