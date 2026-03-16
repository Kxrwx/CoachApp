import type { Request, Response } from "express"; 
import { signin } from "../../../models/auth/sign"
import bcrypt from "bcryptjs"
import { session, updateRevokedSession } from "../../../models/auth/session"
import crypto from "crypto"
import { UserSignIn } from "../../../services/shema"

export default async function signIn(req : Request, res : Response) {
    
    try {
        const {emailSign, passwordSign, deviceId, ip, userAgent} = req.body
        const format = UserSignIn.safeParse({
            email : emailSign,
            password : passwordSign
        })
        if(!format.success) return res.status(400).json({error : "Erreur format Back", detail : format.error})
        const user = await signin(emailSign)
        if(!user) {
            return res.status(401).json({error: "Erreur login"})
        }
        const valid = await bcrypt.compare(passwordSign, user?.passwordHash)
        if(!valid){ return res.status(401).json({error: "Erreur login"}) }
        await updateRevokedSession(user.id)
        
        const token = crypto.randomBytes(32).toString("hex")
        const tokenHash = crypto.createHash("sha256").update(token).digest("hex")
        await session(user.id, deviceId, tokenHash, ip, userAgent )
        res.cookie("session_token", token, {
            httpOnly: true, 
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            maxAge: 2 * 60 * 60 * 1000, 
            domain : process.env.FRONT_URL
            })
        const {passwordHash, ...safeUser} = user 
        res.status(200).json(safeUser)
        }
        
    catch(error) {
        return res.status(500).json({error : "Serveur Error"})
    }
}

