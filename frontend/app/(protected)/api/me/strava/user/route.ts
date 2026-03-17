import axios from "axios"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"


export async function GET(req:Request) {
    try {

        const cookieStore = await cookies()
        const sessionToken = (await cookieStore).get("session_token")
        const response = await axios.get(
            `${process.env.BACKEND_URL}/strava/user`,
            
            {
                headers: {
                    Cookie: `session_token=${sessionToken?.value}`
                },
                withCredentials: true
            }
        )

        return NextResponse.json(response.data)

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