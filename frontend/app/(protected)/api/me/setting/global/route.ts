import { NextResponse } from "next/server";
import axios from "axios"
import { cookies } from "next/headers";

export async function POST(req:Request) {
    try {

        const {mfaEnabled} = await req.json()
        const cookieStore = cookies()
        const sessionToken = (await cookieStore).get("session_token")

        const response = await axios.post(
            `${process.env.BACKEND_URL}/user/setting/global`,
            {mfaEnabled},
            {
                headers: {
                    Cookie: `session_token=${sessionToken?.value}`
                },
                withCredentials: true
            }
        )
        if(!response) return NextResponse.json({status : 400, error : "Erreur reponse serveur"})
        return NextResponse.json(response.data, { status: 200 })
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