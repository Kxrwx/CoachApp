import express from "express"
import stravaUser from "../controllers/me/user/strava/stravaAuth"
import getUserStrava from "../controllers/me/user/userStrava"
import deleteStravaAccount from "../controllers/me/user/strava/stravaLogout"

const route = express.Router()

route.get("/Oauth", stravaUser)
route.get("/user", getUserStrava)
route.get("/logout", deleteStravaAccount)

export default route