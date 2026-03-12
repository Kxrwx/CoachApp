import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import signup from "./controllers/auth/signup/signup";
import signin from "./controllers/auth/signin/signin"

dotenv.config();

const app = express();
app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

//Router 
app.use("/auth", signup)
app.use("/auth", signin)

// Test route
app.get("/", (req, res) => {
  res.send("Backend Node.js fonctionne");
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));



