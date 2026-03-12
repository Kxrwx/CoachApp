import express from "express";
import { getSession } from "../models/auth/session";
import prisma from "../utils/prisma";

const route = express.Router()

route.get("/user/:id", async (req, res) => {
    try {
        const token = req.cookies.session_token
        const session = await getSession(token)
        if(session?.userId !== req.params.id){
            return res.status(403).json({error: "Accès interdit"})
        }
        if(!session || !session.userId){
            return res.status(401).json({error : "Non autorisé"})
        }
        const user = await prisma.users.findUnique({
        where : {id : session.userId},
        select : {id : true}
        })
        if(!user) res.status(401).json({error : "Non autorisé aucun user attribué à la session"})
        else {
            if(session.expiresAt < new Date() || session.userId != user?.id || session.revoked == true){
                return res.status(401).json({error : "Session non conforme"})
            }
            else{
                return res.status(200).json({value : true})
            }
        }
        
    }
    catch(error) {
        return res.status(400).json({error : "Erreur Serveur"})
    }
    
    
    
})

export default route