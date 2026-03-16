import express, { response } from "express"
import {updateRevokedSessionToken} from "../../../models/auth/session"

const route = express.Router()

route.post("", async (req, res) => {
    try {
        const token = req.cookies.session_token
        await updateRevokedSessionToken(token)
        res.clearCookie("session_token", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            domain : process.env.FRONT_URL
        })
        res.status(200).json({success : true})

    }
    catch(error){
        console.log("erreur route")
        return res.status(500).json({error : "Erreur serveur"})
    }
})
export default route