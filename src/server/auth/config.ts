import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const allowedEmails = [
  "adin@esibanstudios.com",
  "adinowscar@gmail.com",
  "jsharette@gmail.com",
  "succprime@gmail.com",
];

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [GoogleProvider],
  callbacks: {
    signIn: ({ profile }) => {
      return allowedEmails.includes(profile?.email ?? "");
    },
  },
});
