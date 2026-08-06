"use client";

import { signOut } from "next-auth/react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Signs the user out after showing a clean confirmation popup.
 * Uses createPortal to mount the modal directly to document.body, avoiding z-index or stacking context issues.
 */
const LogoutButton = ({ className }: { className: string }) => {
  const [showModal, setShowModal] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleConfirmLogout = async () => {
    setIsSigningOut(true);
    try {
      await signOut({ redirect: false });
    } finally {
      window.location.href = "/sign-in";
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-all"
      onClick={() => !isSigningOut && setShowModal(false)}
    >
      <div
        className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 flex flex-col items-center text-center space-y-4 animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* LOGOUT BADGE ICON */}
        <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 text-red-600 flex items-center justify-center shrink-0">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
        </div>

        {/* TITLE & DESCRIPTION */}
        <div className="space-y-1">
          <h3 className="text-base font-bold text-slate-800">Confirm Logout</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Are you sure you want to log out of your session? You will need to sign in again to access the portal.
          </p>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex items-center gap-3 w-full pt-2">
          <button
            type="button"
            disabled={isSigningOut}
            onClick={() => setShowModal(false)}
            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSigningOut}
            onClick={handleConfirmLogout}
            className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSigningOut ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Logging out...</span>
              </>
            ) : (
              <span>Yes, Logout</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className={`${className}`}
      >
        <Image src="/logout.png" alt="" width={20} height={20} />
        <span className="hidden lg:block">Logout</span>
      </button>

      {/* RENDER MODAL VIA PORTAL TO BODY */}
      {showModal && mounted && createPortal(modalContent, document.body)}
    </>
  );
};

export default LogoutButton;
