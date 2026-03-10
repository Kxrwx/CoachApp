import express from "express"
import { signup } from "../../models/auth/sign"
import bcrypt from "bcrypt"

const saltRound = 12

const app = express()
app.use(express.json())

app.get("/src/controllers/signin", async (req, res) => {
    try {
        const {email, password, mfa} = req.body
        const password_hash = await bcrypt.hash(password, saltRound)
        const reponse = signup(email, password_hash, mfa)

        res.status(200).json(reponse)
    }
    catch(error){
        res.status(400).json({error : "Serveur Error"})
    }
}
)