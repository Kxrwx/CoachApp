import express from "express"
import { signin } from "../../models/auth/sign"
import bcrypt from "bcrypt"

const saltRound = 12

const app = express()
app.use(express.json())

app.get("/src/controllers/signin", async (req, res) => {
    try {
        const {email, password} = req.body
        const password_hash = await bcrypt.hash(password, saltRound)
        const reponse = signin(email, password_hash)
        res.status(200).json(reponse)
    }
    catch(error) {
        res.status(500).json({error : "Serveur Error"})
    }
}
)