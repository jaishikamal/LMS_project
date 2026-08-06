"use client";

import { signIn } from "next-auth/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

const LockIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-4 h-4"
    aria-hidden
  >
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const EyeIcon = ({ closed }: { closed: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-4 h-4"
    aria-hidden
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
    {closed && <line x1="4" y1="4" x2="20" y2="20" />}
  </svg>
);

const SignInForm = ({
  schoolName,
  logo,
}: {
  schoolName: string;
  logo: string;
}) => {
  return <SignInCard schoolName={schoolName} logo={logo} />;
};

const SignInCard = ({
  schoolName,
  logo,
}: {
  schoolName: string;
  logo: string;
}) => {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    setError(null);
    setIsSubmitting(true);

    const username = String(formData.get("username") ?? "");
    const password = String(formData.get("password") ?? "");

    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    setIsSubmitting(false);

    if (result?.error) {
      setError("Invalid username or password.");
      return;
    }

    // "/" resolves the role server-side and forwards to the right dashboard.
    router.push("/");
    router.refresh();
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-kamal-purple-light via-white to-kamal-sky-light p-4">
      <div className="absolute -top-28 -left-28 w-96 h-96 rounded-full bg-kamal-purple/30 blur-3xl" />
      <div className="absolute -bottom-28 -right-28 w-[28rem] h-[28rem] rounded-full bg-kamal-sky/40 blur-3xl" />
      <div className="absolute top-1/4 right-0 w-48 h-48 rounded-full bg-kamal-yellow/30 blur-2xl" />

      <form
        action={handleSubmit}
        className="relative w-full max-w-sm flex flex-col gap-6 rounded-3xl border border-white/60 bg-white/80 p-8 shadow-2xl backdrop-blur sm:p-10"
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-kamal-purple to-kamal-sky p-2 shadow-lg">
            <Image
              src={logo}
              alt=""
              width={48}
              height={48}
              className="rounded-xl object-contain"
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{schoolName}</h1>
            <p className="text-sm text-gray-500">
              Welcome back! Please sign in to continue.
            </p>
          </div>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-500 ring-1 ring-red-200">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <label htmlFor="username" className="text-xs font-medium text-gray-600">
            Username
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4"
                aria-hidden
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </span>
            <input
              id="username"
              name="username"
              type="text"
              required
              autoComplete="username"
              className="w-full rounded-xl border border-gray-200 bg-white/70 p-2.5 pl-9 text-sm text-gray-800 outline-none transition-all focus:border-kamal-purple focus:ring-2 focus:ring-kamal-purple/30"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="password" className="text-xs font-medium text-gray-600">
            Password
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <LockIcon />
            </span>
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              className="w-full rounded-xl border border-gray-200 bg-white/70 p-2.5 pl-9 pr-10 text-sm text-gray-800 outline-none transition-all focus:border-kamal-purple focus:ring-2 focus:ring-kamal-purple/30"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              title={showPassword ? "Hide password" : "Show password"}
              className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-gray-400 transition-colors hover:text-gray-600"
            >
              <EyeIcon closed={!showPassword} />
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="cursor-pointer rounded-xl bg-gradient-to-r from-kamal-purple to-kamal-sky p-2.5 text-sm font-semibold text-gray-800 shadow-md transition-all hover:shadow-lg hover:brightness-105 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Signing in..." : "Sign In"}
        </button>

        <p className="text-center text-xs text-gray-400">
          Having trouble signing in? Contact your administrator.
        </p>
      </form>
    </div>
  );
};

export default SignInForm;
