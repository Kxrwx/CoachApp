"use server"
import { NextResponse } from "next/server";
import axios from "axios"
import { headers } from 'next/headers'

// Requete qui permet d'envoyé les données de connexion au back
export async function POST(req: Request) {
    const backend = process.env.BACKEND_URL
    
    try {

        const headersList = await headers()
        
        const ip = headersList.get("x-forwarded-for")
                
        const userAgent = headersList.get('user-agent')

        const {emailSign, passwordSign, deviceId} = await req.json(); //Recup des datas du formulaire

        if (!emailSign || !passwordSign) return NextResponse.json({error : "Données manquante"}, {status : 400})

        const body = {emailSign, passwordSign, deviceId, ip, userAgent}

        const response = await axios.post( `${backend}/auth/signin`, body) //Envoi des datas

        return NextResponse.json(response.data, { status: response.status }); //Réponse du back + propoagation d'erreur vers le front

    }
    catch(err){
        return NextResponse.json({error : "Error request"}, {status : 500});
    }

}