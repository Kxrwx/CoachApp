import { Router } from "express";
import User from '../controllers/me/user/user'

const route = Router()

route.get("/profile", User)

export default route