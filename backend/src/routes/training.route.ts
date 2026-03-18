import express from 'express'
import getAllTraining from '../controllers/me/user/training/getAll'
import upsertTraining from '../controllers/me/user/training/upsertTraining'
import deleteTraining from '../controllers/me/user/training/deleteTraining'

const route = express.Router()

route.get("/getAll", getAllTraining)
route.post("/upsertTraining", upsertTraining)
route.post("/delete", deleteTraining)

export default route