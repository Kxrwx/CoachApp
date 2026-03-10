"use server"
import { NextResponse } from "next/server";
import axios from "axios"

// Requete qui permet d'envoyé les données d'inscription au back

export default async function POST(req: Request) {
    const backend = process.env.BACKEND_URL
    
    try {


        const {emailSign, passwordSign, mfaSign} = await req.json(); //Recup des datas du formulaire

        if (!emailSign || !passwordSign) return NextResponse.json({error : "Données manquante"}, {status : 400})

        const mfa = mfaSign ?? false;

        const body = {emailSign, passwordSign, mfa}

        const response = await axios.post( `${backend}/src/controllers/signin`, body) //Envoi des datas

        return NextResponse.json(response.data, { status: response.status }); //Réponse du back + propoagation d'erreur vers le front

    }
    catch(err){
        return NextResponse.json({error : "Error request"}, {status : 500});
    }

}