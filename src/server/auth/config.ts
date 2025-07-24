import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [GoogleProvider],
  callbacks: {
    signIn: async ({ profile }) => {
      if (!profile?.email) {
        return false;
      }

      const hasAccess = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/access?email=${profile?.email}`
      ).then((res) => res.json());

      return hasAccess.hasAccess;
    },
    async session(params) {
      const hasAccess = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/access?email=${params.session.user.email}`
      ).then((res) => res.json());

      return hasAccess.hasAccess;
    },
  },
});
