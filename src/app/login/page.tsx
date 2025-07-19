import GoogleIcon from "~/components/icons/google";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

import SigninWithProviderButton from "./SigninWithProviderButton";

export default function Login() {
  return (
    <main className="flex h-screen items-center justify-center">
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Naughty Zone!</CardTitle>
          <CardDescription>Sign in to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <SigninWithProviderButton provider="google" className="w-full">
            <GoogleIcon className="h-6 w-6" />
            Sign in with Google
          </SigninWithProviderButton>
        </CardContent>
      </Card>
    </main>
  );
}
