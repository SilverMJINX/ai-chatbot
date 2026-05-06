import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // Always allow public pages through
        const publicPaths = ["/", "/login", "/register"];
        if (publicPaths.includes(pathname)) return true;
        if (pathname.startsWith("/api/auth")) return true;

        // All other routes require login
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    // Run on everything except Next.js internals and static files
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.svg|.*\\.ico).*)",
  ],
};