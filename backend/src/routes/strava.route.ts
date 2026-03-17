import express from "express"
import stravaUser from "../controllers/me/user/strava/stravaAuth"
import getUserStrava from "../controllers/me/user/userStrava"
import deleteStravaAccount from "../controllers/me/user/strava/stravaLogout"
import getAllDataStats from "../controllers/me/user/strava/getData/GetAllStats"
import getAllActivities from "../controllers/me/user/strava/getData/GetAllActivities"
import getDetailActivity from "../controllers/me/user/strava/getData/GetDetailActivity"

const route = express.Router()

route.get("/Oauth", stravaUser)
route.get("/user", getUserStrava)
route.get("/logout", deleteStravaAccount)
route.get("/allStats", getAllDataStats)
route.get("/allActivities", getAllActivities)
route.post("/detailActivity", getDetailActivity)


export default route