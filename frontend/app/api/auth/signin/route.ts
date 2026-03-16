"use server"
import { NextResponse } from "next/server";
import axios from "axios"
import { headers } from 'next/headers'

export async function POST(req: Request) {
    const backend = process.env.BACKEND_URL
    
    try {

        const headersList = await headers()
        
        const ip = headersList.get("x-forwarded-for")?.split(",")[0]
                
        const userAgent = headersList.get('user-agent')

        const {emailSign, passwordSign, deviceId} = await req.json(); 

        if (!emailSign || !passwordSign) return NextResponse.json({error : "Données manquante"}, {status : 400})

        const body = {emailSign, passwordSign, deviceId, ip, userAgent}

        const response = await axios.post(`${backend}/auth/signin`, body)

        const res = NextResponse.json(response.data, { status: response.status })

        const cookies = response.headers["set-cookie"]

        if (cookies) {
            if (Array.isArray(cookies)) {
                cookies.forEach((c) => res.headers.append("set-cookie", c))
            } else {
                res.headers.set("set-cookie", cookies)
            }
        }
        return res

    }
    catch(err: unknown) {
    let message = "Error request";
    let status = 500;

    if (axios.isAxiosError(err) && err.response) {
        message = err.response.data?.error || "Error request";
        status = err.response.status;
    } else if (err instanceof Error) {
        message = err.message;
    }

    return NextResponse.json({ error: message, status }, { status });
}

}