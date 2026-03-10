"use server"
import { NextResponse } from "next/server";
import axios from "axios"


//requete de login au back
export async function POST(req: Request) {
    const backend = process.env.BACKEND_URL
      
    try {

        const {emailSign, passwordSign, mfaSign, deviceId} = await req.json(); //Recup des datas du formulaire

        if (!emailSign || !passwordSign) return NextResponse.json({error : "Données manquante"}, {status : 400})

        const body = {emailSign, passwordSign, mfaSign, deviceId}

        const response = await axios.post( `${backend}/auth/signup`, body)

        return NextResponse.json(response.data, { status: response.status });

    }
    catch(err){
        return NextResponse.json({error : "Error request"}, {status : 500});
    }

}