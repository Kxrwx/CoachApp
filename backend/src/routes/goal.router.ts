import express from "express"
import getObjectif from "../controllers/me/user/objectif/getObjectif"
import UpsertObjectif from "../controllers/me/user/objectif/upserObjectif"

const route = express.Router()

route.get("/allGoal", getObjectif)
route.post("/upsertGoal", UpsertObjectif)

export default route