import express from "express"
import getObjectif from "../controllers/me/user/objectif/getObjectif"
import UpsertObjectif from "../controllers/me/user/objectif/upserObjectif"
import getObjectifTemplates from "../controllers/me/user/objectif/getTemplates"

const route = express.Router()

route.get("/allGoal", getObjectif)
route.post("/upsertGoal", UpsertObjectif)
route.get("/templates", getObjectifTemplates)

export default route