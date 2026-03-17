import type { AuthRequest } from "../../../../middleware/Secure"
import type { Response } from "express"
import axios from "axios"

//import requete 
import { upsertAuthStrava, upsertUserStrava } from "../../../../models/user/userStrava"
import controllerATData from "./dataLoader/atStravaData"
import controllerYearlyData from "./dataLoader/yearStravaData"
import controllerMonthlyData from "./dataLoader/monthStravaData"
import controllerRecentActivities from "./dataLoader/activityStravaData"


export default async function stravaUser(req: AuthRequest, res : Response) {
    
    try {
        const userId = req.session?.userId
        if (!userId) return res.status(401).json({error : "Aucun user trouvé"})
        const client_id = process.env.STRAVA_CLIENT_ID
        const client_secret = process.env.STRAVA_CLIENT_SECRET
        const code = req.query.code as string
        const scope = (req.query.scope as string);
        if(!scope || !code) return res.status(404).json({error : "Erreur code ou scope"})
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
        const {
            id, 
            firstname, 
            lastname, 
            profile, 
            city, 
            state, 
            country, 
            sex
        } = athlete
        const AuthStrava = await upsertAuthStrava(userId, athlete, access_token, refresh_token, expires_at, scope)
        const UserStrava = await upsertUserStrava(id, userId, firstname, lastname, profile, city, state, country, sex)

        //Loading data Strava
        await controllerATData(id, access_token)
        await controllerYearlyData(id, access_token)
        await controllerMonthlyData(id, access_token)
        await controllerRecentActivities(id, access_token)
        
        return res.status(200).json({AuthStrava, UserStrava})

        
    }
    catch(error) {
        return res.status(500).json({error : "Erreur serveur"})
    }

}