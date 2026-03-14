import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import Secure from "./middleware/Secure";
import authRouter from "./routes/auth.router"
import cookieParser from "cookie-parser"
import authorized from "./controllers/me/authorized"
import rateLimit from "express-rate-limit";

const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, 
  max: 5,
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



const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));



