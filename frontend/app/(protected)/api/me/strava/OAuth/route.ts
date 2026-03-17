import axios from "axios"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"


export async function GET(req:Request) {
    try {

        const cookieStore = cookies()
        const sessionToken = (await cookieStore).get("session_token")
        const { searchParams } = new URL(req.url); 
        const code = searchParams.get('code');
        const scope = searchParams.get('scope')

        if (!code) {
            return NextResponse.json({ error: "Code manquant" }, { status: 400 });
        }

        const response = await axios.get(
            `${process.env.BACKEND_URL}/strava/Oauth?code=${code}&scope=${scope}`,
            
            {
                headers: {
                    Cookie: `session_token=${sessionToken?.value}`
                },
                withCredentials: true
            }
        )

        return NextResponse.redirect(new URL('/?success=strava_linked', req.url))

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