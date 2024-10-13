import express, { Request, Response } from "express";
import { config } from "dotenv";
config();
import cors from "cors";
import { router as authRoute } from "./routes/auth.route";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/v1/health", (req: Request, res: Response) => {
  res.json({ status: "UP" });
});
app.use("/api/v1/user/auth", authRoute);

app.listen(3000, () => {
  console.log("Server is running on port http://localhost:3000");
});
