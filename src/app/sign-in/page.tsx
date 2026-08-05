import SignInForm from "@/components/SignInForm";
import { getSchoolSettings } from "@/lib/settings";

// Always render at request time: branding lives in the database, so the login
// page must never be baked into the build (avoids Prerender Error when the DB
// is unreachable during `next build` and keeps the logo/name fresh).
export const dynamic = "force-dynamic";

const LoginPage = async () => {
  const school = await getSchoolSettings();

  return (
    <SignInForm schoolName={school.schoolName} logo={school.logo} />
  );
};

export default LoginPage;
