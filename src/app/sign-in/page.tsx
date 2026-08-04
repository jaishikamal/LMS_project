import SignInForm from "@/components/SignInForm";
import { getSchoolSettings } from "@/lib/settings";

const LoginPage = async () => {
  const school = await getSchoolSettings();

  return (
    <SignInForm schoolName={school.schoolName} logo={school.logo} />
  );
};

export default LoginPage;
