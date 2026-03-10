import express, { response, Router } from "express"
import { signin } from "../../../models/auth/sign"
import bcrypt from "bcryptjs"
import { session } from "../../../models/auth/session"
import {v4} from "uuid"

const router = express.Router()

router.post("/signin", async (req, res) => {
    try {
        const {emailSign, passwordSign, deviceId} = req.body
        const ip = (Array.isArray(req.headers['x-forwarded-for']) ? req.headers['x-forwarded-for'][0] : req.headers['x-forwarded-for']) ?? req.socket.remoteAddress ?? "";
        const userAgent = req.headers['user-agent'] ?? "";
        const user = await signin(emailSign)
        if(!user) {
            res.status(201).json({error: "Erreur login"})
        }
        else{
            const valid = await bcrypt.compare(passwordSign, user?.passwordHash)
            if(valid){
                const token = v4()
                await session(user.id, deviceId, token, ip, userAgent )
                res.cookie("session_token", token, {
                    httpOnly: true, 
                    secure: process.env.NODE_ENV === "production",
                    sameSite: "lax",
                    maxAge: 2 * 60 * 60 * 1000, 
                })
                const {passwordHash, ...safeUser} = user // On enleve le password
                res.status(200).json(safeUser)
            }
            else {
                res.status(201).json({error: "Erreur login"})
            }
        }
        
        
    }
    catch(error) {
        res.status(500).json({error : "Serveur Error"})
    }
}
)

export default router