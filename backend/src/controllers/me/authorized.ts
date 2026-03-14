
import express from "express"
import type {AuthRequest}  from "../../middleware/Secure"

const route = express.Router()

route.get("", async (req: AuthRequest,  res) => {
    try {
        if(!req.session) return res.status(401).json({error : "Unauthorized"})

        res.status(200).json({
            authenfied : true,
        })
    }
    catch(error) {
        res.status(401).json({error : "Unauthorized"})
    }
})
export default route