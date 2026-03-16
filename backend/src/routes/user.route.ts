import { Router } from "express";
import User from '../controllers/me/user/user'
import Logout from "../controllers/me/logout/logout"
import SettingGlobal from "../controllers/me/user/setting/global"

const route = Router()

route.get("/profile", User)
route.post("/logout", Logout)
route.post("/setting/global", SettingGlobal)

export default route