
import express from "express"
import type {AuthRequest}  from "../../../middleware/Secure"
import {updateLastSeenSession} from "../../../models/auth/session"

const route = express.Router()

route.get("", async (req: AuthRequest,  res) => {
    try {
        if(!req.session) return res.status(401).json({error : "Unauthorized"})
        await updateLastSeenSession(req.session.id)
        res.status(200).json({
            authenfied : true,
        })
    }
    catch(error) {
        res.status(401).json({error : "Unauthorized"})
    }
})
export default route