import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "default";

const generateToken = (id: string): string => {
  const payload = { id };
  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: "1h",
  });

  return token;
};

export { generateToken };
