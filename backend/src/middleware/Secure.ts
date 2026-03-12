import express from "express";
import { getSession } from "../models/auth/session";
import prisma from "../utils/prisma";
import { error } from "node:console";

const route = express.Router()

route.get("/user/:id", async (req, res) => {
    try {
        const token = req.cookies("session_token")
    const session = await getSession(token)
    if(!session || !session.userId){
        res.status(401).json({error : "Non autorisé"})
    }
    else{
        const user = await prisma.users.findUnique({
        where : {id : session.userId},
        select : {id : true}
        })
        if(!user) res.status(401).json({error : "Non autorisé aucun user attribué à la session"})
        else {
            if(session.expiresAt < new Date() && session.userId != user?.id && session.revoked == true){
                res.status(401).json({error : "Session non conforme"})
            }
            else{
                res.status(200)
            }
        }
        
    }
    }
    catch(error) {
        res.status(401).json({error : "Erreur Serveur"})
    }
    
    
    
})