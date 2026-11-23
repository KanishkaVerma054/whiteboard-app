import { Suspense } from "react";
import { AuthPage } from "@/components/AuthPage";

const Signup = () => {
  return (
    <Suspense>
      <AuthPage isSignin={false} />
    </Suspense>
  );
};

export default Signup;
