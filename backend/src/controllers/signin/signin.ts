import express, { response } from "express"
import { signin } from "../../models/auth/sign"
import bcrypt from "bcrypt"
import { session } from "../../models/auth/session"
import {v4} from "uuid"

const app = express()
app.use(express.json())

app.get("/src/controllers/signin", async (req, res) => {
    try {
        const {email, password, deviceId} = req.body
        const ip = (Array.isArray(req.headers['x-forwarded-for']) ? req.headers['x-forwarded-for'][0] : req.headers['x-forwarded-for']) ?? req.socket.remoteAddress ?? "";
        const userAgent = req.headers['user-agent'] ?? "";
        const user = await signin(email)
        if(!user) {
            res.status(201).json({error: "Erreur login"})
        }
        else{
            const valid = await bcrypt.compare(password, user?.passwordHash)
            if(valid){
                const token = v4()
                await session(user.id, deviceId, token, ip, userAgent )
                res.cookie, token, {
                    httpOnly: true, 
                    secure: process.env.NODE_ENV === "production",
                    sameSite: "lax",
                    maxAge: 2 * 60 * 60 * 1000, 
                }
                res.status(200).json(user)
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