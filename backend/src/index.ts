import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import Secure from "./middleware/Secure";
import authRouter from "./routes/auth.router"
import cookieParser from "cookie-parser"
import me from "./controllers/me/me"

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
app.use("/auth", authRouter)

//Middleware
app.use(Secure)

//Route protégé
app.use("/me", me)



const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));



