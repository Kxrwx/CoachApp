import axios from "axios"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST(req : Request) {
    try {

        const cookieStore = cookies()
        const sessionToken = (await cookieStore).get("session_token")
        const body = await req.json()

        const response = await axios.post(
            `${process.env.BACKEND_URL}/goal/upsertGoal`,
            body,
            {
                headers: {
                    Cookie: `session_token=${sessionToken?.value}`
                },
                withCredentials: true
            }
        )

        return NextResponse.json(response.data, { status: response.status })

    } 
    
    catch (err: unknown) {
    let message = "Erreur inconnue";
    let status = 500;

    if (axios.isAxiosError(err)) {
        if (err.response?.data?.error) {
            message = err.response.data.error;
            status = err.response.status;
        } else if (err.message) {
            message = err.message;
        }
    } else if (err instanceof Error) {
        message = err.message;
    }

    return NextResponse.json({ error: message }, { status });
}
}