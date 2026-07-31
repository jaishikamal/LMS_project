"use client";

import { signIn } from "next-auth/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

const LoginPage = () => {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    <div className="h-screen flex items-center justify-center bg-kamal-sky-light">
      <form
        action={handleSubmit}
        className="bg-white p-12 rounded-md shadow-2xl flex flex-col gap-2 w-[22rem]"
      >
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Image src="/logo.png" alt="" width={24} height={24} />
          LMS
        </h1>
        <h2 className="text-gray-400">Sign in to your account</h2>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex flex-col gap-2">
          <label htmlFor="username" className="text-xs text-gray-500">
            Username
          </label>
          <input
            id="username"
            name="username"
            type="text"
            required
            autoComplete="username"
            className="p-2 rounded-md ring-1 ring-gray-300"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="password" className="text-xs text-gray-500">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="p-2 rounded-md ring-1 ring-gray-300"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-blue-500 text-white my-1 rounded-md text-sm p-[10px] disabled:opacity-60"
        >
          {isSubmitting ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </div>
  );
};

export default LoginPage;
