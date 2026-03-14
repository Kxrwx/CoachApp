// middleware.ts
import { NextRequest, NextResponse } from "next/server";

export async function proxy(req: NextRequest) {
    console.log("middleware Next")
    const token = req.cookies.get("session_token")?.value;
    const path = req.nextUrl.pathname;

    if (
        path.startsWith("/auth") ||
        path.startsWith("/_next") ||
        path === "/favicon.ico"
    ) {
        return NextResponse.next();
    }
    if(!token) {
        return NextResponse.redirect(new URL("/auth", req.url))
    }
    const res = await fetch(`${process.env.BACKEND_URL}/me`, {
        headers: { Cookie: `session_token=${token}` },
    });
    if (!res.ok) {
        return NextResponse.redirect(new URL("/auth", req.url));
    }
    
    return NextResponse.next();
    
}

export const config = {
  matcher: [
    "/((?!auth|api/auth).*)", 
  ],
};