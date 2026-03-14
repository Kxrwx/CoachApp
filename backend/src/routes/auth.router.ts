import { Router } from "express";
import signUp from "../controllers/auth/signup/signup"
import signIn from "../controllers/auth/signin/signin"



const router = Router();

router.post("/signup", signUp);

router.post("/signin", signIn);

export default router;