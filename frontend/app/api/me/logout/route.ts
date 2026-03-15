import axios from "axios"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET() {
    try {

        const cookieStore = cookies()
        const sessionToken = (await cookieStore).get("session_token")

        const response = await axios.post(
            `${process.env.BACKEND_URL}/logout`,
            {},
            {
                headers: {
                    Cookie: `session_token=${sessionToken?.value}`
                },
                withCredentials: true
            }
        )

        return NextResponse.json(response.data, { status: response.status })

    } catch (err) {
        return NextResponse.json({ error: "Error request" }, { status: 500 })
    }
}