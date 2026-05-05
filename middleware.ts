import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized: ({ token }) => !!token,
  },
});

export const config = {
  matcher: [
    "/chat/:path*",
    "/books/:path*",
    "/api/chat/:path*",
    "/api/books/:path*",
  ],
};