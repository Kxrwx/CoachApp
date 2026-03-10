import express from "express"
import { signup } from "../../models/auth/sign"
import bcrypt from "bcrypt"
import { session } from "../../models/auth/session"
import prisma from "../../utils/prisma"
import {v4} from "uuid"

const saltRound = 12


const app = express()
app.use(express.json())

app.post("/src/controllers/signup", async (req, res) => {
    try {
        const {email, password, mfa, deviceId} = req.body
        const password_hash = await bcrypt.hash(password, saltRound)
        const reponse = await signup(email, password_hash, mfa)
        const user  = await prisma.user.findUnique({
            where : {email : email},
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
            res.status(200).json(reponse)
        }
    }
    catch(error){
        res.status(500).json({error : "Serveur Error"})
    }
}
)