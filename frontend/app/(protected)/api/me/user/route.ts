"use server"
import axios from "axios";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(req: Request) {
    try {
        const cookieStore = cookies()
        const sessionToken = (await cookieStore).get("session_token")

        const response = await axios.get(
            `${process.env.BACKEND_URL}/user/profile`,
            {
                headers: {
                    Cookie: `session_token=${sessionToken?.value}`
                },
                withCredentials: true
            }
        )

        return NextResponse.json(response.data);

    } catch (err: any) {
        let message = "Error request";
        let status = 500;

        if (axios.isAxiosError(err) && err.response) {
            message = err.response.data?.error || "Error request";
            status = err.response.status;
        }

        return NextResponse.json({ error: message }, { status });
    }
}