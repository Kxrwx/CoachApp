import express, { response, Router } from "express"
import { signin } from "../../../models/auth/sign"
import bcrypt from "bcryptjs"
import { session } from "../../../models/auth/session"
import crypto from "crypto"


const router = express.Router()

router.post("/signin", async (req, res) => {
    try {
        const {emailSign, passwordSign, deviceId, ip, userAgent} = req.body
        const user = await signin(emailSign)
        if(!user) {
            return res.status(401).json({error: "Erreur login"})
        }
        const valid = await bcrypt.compare(passwordSign, user?.passwordHash)
        if(!valid){ return res.status(401).json({error: "Erreur login"}) }
        const token = crypto.randomBytes(32).toString("hex")
        const tokenHash = crypto.createHash("sha256").update(token).digest("hex")
        await session(user.id, deviceId, tokenHash, ip, userAgent )
        res.cookie("session_token", token, {
            httpOnly: true, 
            secure: true,
            sameSite: "none",
            maxAge: 2 * 60 * 60 * 1000, 
            })
        const {passwordHash, ...safeUser} = user // On enleve le password
        res.status(200).json(safeUser)
        }
        
    catch(error) {
        return res.status(500).json({error : "Serveur Error"})
    }
}
)

export default router