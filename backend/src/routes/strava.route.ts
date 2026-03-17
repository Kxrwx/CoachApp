import express from "express"
import stravaUser from "../controllers/me/user/strava/stravaAuth"
import getUserStrava from "../controllers/me/user/userStrava"

const route = express.Router()

route.get("/Oauth", stravaUser)
route.get("/user", getUserStrava)

export default route