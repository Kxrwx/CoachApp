import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import signup from "./controllers/auth/signup/signup";
import signin from "./controllers/auth/signin/signin";
import Secure from "./middleware/Secure";
import authRouter from "./routes/auth.router"

dotenv.config();

const app = express();
app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

//Router 
//Route public 
app.use("/auth", authRouter)

//Middleware
app.use(Secure)

// Test route
app.get("/", (req, res) => {
  res.send("Backend Node.js fonctionne");
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));



