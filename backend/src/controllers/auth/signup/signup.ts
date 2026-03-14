import type { Request, Response } from "express"; 
import { signup } from "../../../models/auth/sign"
import bcrypt from "bcryptjs"
import { session } from "../../../models/auth/session"
import crypto from "crypto"
import { UserSignUp } from "../../../services/shema";

const saltRound = 12

 export default async function signUp(req : Request, res : Response) {
    try {
        const {emailSign, passwordSign, mfaSign, deviceId, ip, userAgent} = req.body
        const format = UserSignUp.safeParse({
            email : emailSign,
            password : passwordSign,

        })
        if(!format.success) return res.status(400).json({error : "Erreur Format Back", detail : format.error})
        const mfa = mfaSign === true || mfaSign === "true"
        const password_hash = await bcrypt.hash(passwordSign, saltRound)
        const user = await signup(emailSign, password_hash, mfa) 
        
        if(!user) {return res.status(400).json({error : "Erreur session"})}
            
        const token = crypto.randomBytes(32).toString("hex")
        const tokenHash = crypto.createHash("sha256").update(token).digest("hex")
        await session(user.id, deviceId, tokenHash, ip, userAgent)
        res.cookie("session_token", token, {
            httpOnly: true, 
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            maxAge: 2 * 60 * 60 * 1000, 
        });
        const { passwordHash, ...safeUser } = user; // On enleve le password
        return res.status(200).json(safeUser)
    }
    catch(error){
        console.error("Erreur détaillée du Signup :", error);
        res.status(500).json({error : "Serveur Error"})
    }
}
