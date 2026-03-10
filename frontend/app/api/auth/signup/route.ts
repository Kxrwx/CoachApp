"use server"
import { NextResponse } from "next/server";
import axios from "axios"


//requete de login au back
export default async function GET(req: Request) {
    const backend = process.env.BACKEND_URL
    
    try {

        const response = await axios.get( `${backend}/src/controllers/signin`)

        return NextResponse.json(response);

    }
    catch(err){
        return NextResponse.json({error : "Error request"}, {status : 500});
    }

}