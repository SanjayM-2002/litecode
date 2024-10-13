import { Request, Response } from "express";
import { signupRequest, loginRequest } from "@repo/constants";
import { PrismaClient } from "@repo/db";
import bcrypt from "bcrypt";
import { generateToken } from "../utils/jwt.util";

const prisma = new PrismaClient();

const signup = async (req: Request, res: Response): Promise<any> => {
  try {
    const body: signupRequest = req.body;
    const { email, password, name } = body;
    const isEmailPresent = await prisma.user.findUnique({
      where: {
        email,
      },
    });
    if (isEmailPresent) {
      return res.status(400).json({ error: "Email already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });
    const token = generateToken(user.id);
    res.status(201).json({ user, token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const signupAdmin = async (req: Request, res: Response): Promise<any> => {
  try {
    const body: signupRequest = req.body;
    const { email, password, name } = body;
    const isEmailPresent = await prisma.user.findUnique({
      where: {
        email,
      },
    });
    if (isEmailPresent) {
      return res.status(400).json({ error: "Email already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: "ADMIN",
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });
    const token = generateToken(user.id);
    res.status(201).json({ user, token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const login = async (req: Request, res: Response): Promise<any> => {
  try {
    const body: loginRequest = req.body;
    const { email, password } = body;
    const user = await prisma.user.findUnique({
      where: {
        email,
        role: "PARTICIPANT",
      },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
      },
    });
    if (!user) {
      return res.status(400).json({ error: "Invalid email" });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: "Invalid password" });
    }
    const token = generateToken(user.id);
    const { password: userPassword, ...userData } = user;
    res.status(200).json({ user: userData, token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const loginAdmin = async (req: Request, res: Response): Promise<any> => {
  try {
    const body: loginRequest = req.body;
    const { email, password } = body;
    const user = await prisma.user.findUnique({
      where: {
        email,
        role: "ADMIN",
      },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
      },
    });
    if (!user) {
      return res.status(400).json({ error: "Invalid email" });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: "Invalid password" });
    }
    const token = generateToken(user.id);
    const { password: userPassword, ...userData } = user;
    res.status(200).json({ user: userData, token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export { signup, login, signupAdmin, loginAdmin };
