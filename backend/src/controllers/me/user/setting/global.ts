import type {Response} from "express"
import type { AuthRequest } from "../../../../middleware/Secure"
import {updateUserMfa} from "../../../../models/user/user"

export default async function globalSetting(req :AuthRequest, res : Response) {
    try {
        const {mfaEnabled} = req.body
        const userId = req.session?.userId
        if(!userId) return res.status(401).json("Unauthorize")
        const response = await updateUserMfa(userId, mfaEnabled)
        if (!response) return res.status(400).json("Erreur DB")
        return res.status(200).json({success : true})
    }
    catch(error) {
        return res.status(500).json({error : "Erreur serveur"})
    }
}