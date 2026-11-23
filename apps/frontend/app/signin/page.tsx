import { Suspense } from "react";
import { AuthPage } from "@/components/AuthPage";

const Signin = () => {
  return (
    <Suspense>
      <AuthPage isSignin={true} />
    </Suspense>
  );
};

export default Signin;
