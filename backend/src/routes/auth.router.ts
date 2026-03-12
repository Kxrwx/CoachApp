import { Router } from "express";
import signup from "../controllers/auth/signup/signup"
import signin from "../controllers/auth/signin/signin"

const router = Router();

router.post("/signup", signup);

router.post("/signin", signin);

export default router;