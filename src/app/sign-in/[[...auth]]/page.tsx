"use client";

import { isRole, roleHomeRoute } from "@/lib/roles";
import { useSignIn, useUser } from "@clerk/nextjs";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const LoginPage = () => {
  const { signIn, errors, fetchStatus } = useSignIn();
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();

  // Already signed in? Send the user straight to their role dashboard.
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    const role = user?.publicMetadata?.role;
    router.replace(isRole(role) ? roleHomeRoute(role) : "/");
  }, [isLoaded, isSignedIn, user, router]);

  const handleSubmit = async (formData: FormData) => {
    const identifier = String(formData.get("identifier") ?? "");
    const password = String(formData.get("password") ?? "");

    const { error } = await signIn.password({ identifier, password });
    if (error) return;

    if (signIn.status === "complete") {
      await signIn.finalize({
        navigate: ({ session, decorateUrl }) => {
          if (session?.currentTask) return;

          // "/" resolves the role server-side and forwards to the right dashboard.
          const url = decorateUrl("/");
          if (url.startsWith("http")) {
            window.location.href = url;
          } else {
            router.push(url);
          }
        },
      });
    }
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

        {errors.global?.map((error) => (
          <p key={error.message} className="text-sm text-red-400">
            {error.message}
          </p>
        ))}

        <div className="flex flex-col gap-2">
          <label htmlFor="identifier" className="text-xs text-gray-500">
            Username
          </label>
          <input
            id="identifier"
            name="identifier"
            type="text"
            required
            autoComplete="username"
            className="p-2 rounded-md ring-1 ring-gray-300"
          />
          {errors.fields.identifier && (
            <p className="text-xs text-red-400">
              {errors.fields.identifier.message}
            </p>
          )}
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
          {errors.fields.password && (
            <p className="text-xs text-red-400">
              {errors.fields.password.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={fetchStatus === "fetching"}
          className="bg-blue-500 text-white my-1 rounded-md text-sm p-[10px] disabled:opacity-60"
        >
          {fetchStatus === "fetching" ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </div>
  );
};

export default LoginPage;
