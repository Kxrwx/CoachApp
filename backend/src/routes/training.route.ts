import express from 'express'
import getAllTraining from '../controllers/me/user/training/getAll'
import upsertTraining from '../controllers/me/user/training/upsertTraining'

const route = express.Router()

route.get("/getAll", getAllTraining)
route.post("/upsertTraining", upsertTraining)

export default route