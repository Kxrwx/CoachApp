import express from "express"
import { signup } from "../../../models/auth/sign"
import bcrypt from "bcryptjs"
import { session } from "../../../models/auth/session"
import prisma from "../../../utils/prisma.js"
import {v4} from "uuid"

const saltRound = 12

const router = express.Router()

router.post("/signup", async (req, res) => {
    try {
        const {emailSign, passwordSign, mfaSign, deviceId} = req.body
        const mfa = mfaSign === true || mfaSign === "true"
        const password_hash = await bcrypt.hash(passwordSign, saltRound)
        const reponse = await signup(emailSign, password_hash, mfa) 
        const user  = await prisma.users.findUnique({
            where : {email : emailSign},
        })
        
        if(!user) {res.status(400).json({error : "Erreur session"})}
        else { 
            const ip = (Array.isArray(req.headers['x-forwarded-for']) ? req.headers['x-forwarded-for'][0] : req.headers['x-forwarded-for']) ?? req.socket.remoteAddress ?? "";
            const userAgent = req.headers['user-agent'] ?? "";
            const token = v4()
            await session(user.id, deviceId, token, ip, userAgent)
            res.cookie("session_token", token, {
                httpOnly: true, 
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                maxAge: 2 * 60 * 60 * 1000, 
            });
            const { passwordHash, ...safeUser } = user; // On enleve le password
            res.status(200).json(safeUser)
        }
    }
    catch(error){
        console.error("Erreur détaillée du Signup :", error);
        res.status(500).json({error : "Serveur Error"})
    }
}
)

export default router