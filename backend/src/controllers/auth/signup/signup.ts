import express from "express"
import { signup } from "../../../models/auth/sign"
import bcrypt from "bcryptjs"
import { session } from "../../../models/auth/session"
import crypto from "crypto"

const saltRound = 12

const router = express.Router()

router.post("/signup", async (req, res) => {
    try {
        const {emailSign, passwordSign, mfaSign, deviceId, ip, userAgent} = req.body
        const mfa = mfaSign === true || mfaSign === "true"
        const password_hash = await bcrypt.hash(passwordSign, saltRound)
        const user = await signup(emailSign, password_hash, mfa) 
        
        
        if(!user) {return res.status(400).json({error : "Erreur session"})}
            
        const token = crypto.randomBytes(32).toString("hex")
        const tokenHash = crypto.createHash("sha256").update(token).digest("hex")
        await session(user.id, deviceId, tokenHash, ip, userAgent)
        res.cookie("session_token", token, {
            httpOnly: true, 
            secure: true,
            sameSite: "none",
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
)

export default router