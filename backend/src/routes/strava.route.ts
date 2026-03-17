import express from "express"
import stravaUser from "../controllers/me/user/strava/stravaAuth"

const route = express.Router()

route.get("/Oauth", stravaUser)

export default route