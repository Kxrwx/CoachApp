import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import cookieParser from "cookie-parser"
import rateLimit from "express-rate-limit";

//import metier

//middleware
import Secure from "./middleware/Secure";

//Routers
import authRouter from "./routes/auth.router"
import userRouter from "./routes/user.route"
import stravaRouter from "./routes/strava.route"
import trainingRouter from "./routes/training.route"

//Controllers
import authorized from "./controllers/me/authorized/authorized"
import logout from "./controllers/me/logout/logout"


const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, 
  max: 35,
  message: { error: "Trop de tentatives, réessayez plus tard" },
  standardHeaders: true, 
  legacyHeaders: false,  
});



dotenv.config();

const app = express();
app.use(helmet());
app.use(cors({
  origin: process.env.FRONT_URL,
  credentials: true
}));
app.use(cookieParser());
app.use(morgan("dev"));
app.use(express.json());


//Router 


//Route public 
app.use("/auth/signin", authLimiter);
app.use("/auth/signup", authLimiter);
app.use("/auth", authRouter)

//Middleware
app.use(Secure)

//Route protégé
app.use("/authorized", authorized)
app.use('/logout', logout)

//Routers protégé
app.use('/user', userRouter)
app.use("/strava", stravaRouter)
app.use("/training", trainingRouter)




const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));



