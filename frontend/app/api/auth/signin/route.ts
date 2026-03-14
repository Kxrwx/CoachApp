"use server"
import { NextResponse } from "next/server";
import axios from "axios"
import { headers } from 'next/headers'

// Requete qui permet d'envoyé les données de connexion au back
export async function POST(req: Request) {
    const backend = process.env.BACKEND_URL
    
    try {

        const headersList = await headers()
        
        const ip = headersList.get("x-forwarded-for")?.split(",")[0]
                
        const userAgent = headersList.get('user-agent')

        const {emailSign, passwordSign, deviceId} = await req.json(); //Recup des datas du formulaire

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
    catch(err){
        return NextResponse.json({error : "Error request"}, {status : 500});
    }

}