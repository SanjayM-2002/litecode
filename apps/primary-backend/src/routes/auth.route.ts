import express, { Request, Response } from "express";
import { signup, login } from "../controllers/auth.controller";
const router = express.Router();

router.get("/health", (req: Request, res: Response) => {
  console.log("GET /api/v1/auth/health");
  res.status(200).json({ status: "success" });
});

router.post("/signup", signup);
router.post("/login", login);

export { router };
