import type { AuthRequest } from "../../../../middleware/Secure"
import type { Response } from "express"
import axios from "axios"

//import requete 
import { updateAuthStrava, isAuthStrava, createAuthStrava } from "../../../../models/user/userStrava"


export default async function stravaUser(req: AuthRequest, res : Response) {
    
    try {
        const userId = req.session?.userId
        if (!userId) return res.status(401).json({error : "Aucun user trouvé"})
        const client_id = process.env.STRAVA_CLIENT_ID
        const client_secret = process.env.STRAVA_CLIENT_SECRET
        const code = req.query.code as string
        const scope = (req.query.scope as string) || "read";
        console.log(code)
        if(!code) return res.status(401).json({error : "Code authorization manquant"})
        const grant_type = 'authorization_code'

        const reponse = await axios.post("https://www.strava.com/oauth/token", {
            client_id, client_secret, code, grant_type
        })

        const { 
            access_token, 
            refresh_token, 
            expires_at, 
            athlete, 
        } = reponse.data
        const exist = await isAuthStrava(userId)
        if(exist) {
            const AuthStava = await updateAuthStrava(userId, athlete, access_token, refresh_token, expires_at, scope)
            return res.status(200).json(AuthStava)
        }
        const AuthStrava = await createAuthStrava(userId, athlete, access_token, refresh_token, expires_at, scope)
        return res.status(200).json(AuthStrava)

        
    }
    catch(error) {
        return res.status(500).json({error : "Erreur serveur"})
    }

}