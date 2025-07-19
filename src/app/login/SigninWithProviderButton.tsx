import { redirect } from "next/navigation";
import { AuthError } from "next-auth";

import { Button, type ButtonProps } from "~/components/ui/button";
import { signIn } from "~/server/auth/config";

type SigninWithProviderButtonProps = {
  provider: "google";
} & ButtonProps;

export default function SigninWithProviderButton({
  provider,
  children,
  ...props
}: SigninWithProviderButtonProps) {
  return (
    <form
      action={async () => {
        "use server";
        try {
          await signIn(provider, {
            redirectTo: "/",
          });
        } catch (error) {
          // Signin can fail for a number of reasons, such as the user
          // not existing, or the user not having the correct role.
          // In some cases, you may want to redirect to a custom error
          if (error instanceof AuthError) {
            return redirect(`/login/error?error=${error.type}`);
          }

          // Otherwise if a redirects happens Next.js can handle it
          // so you can just re-thrown the error and let Next.js handle it.
          // Docs:
          // https://nextjs.org/docs/app/api-reference/functions/redirect#server-component
          throw error;
        }
      }}
    >
      <Button type="submit" variant="outline" size="sm" {...props}>
        {children}
      </Button>
    </form>
  );
}
