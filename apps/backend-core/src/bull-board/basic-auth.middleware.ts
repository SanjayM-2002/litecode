import { Request, Response, NextFunction } from 'express';
import { timingSafeEqual } from 'crypto';

const safeEqual = (a: string, b: string) => {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
};

export const basicAuthMiddleware =
  (user: string, pass: string, realm: string) =>
  (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization ?? '';
    const [scheme, encoded] = header.split(' ');

    if (scheme === 'Basic' && encoded) {
      const decoded = Buffer.from(encoded, 'base64').toString('utf8');
      const sep = decoded.indexOf(':');
      if (sep !== -1) {
        const u = decoded.slice(0, sep);
        const p = decoded.slice(sep + 1);
        if (safeEqual(u, user) && safeEqual(p, pass)) {
          return next();
        }
      }
    }

    res.setHeader('WWW-Authenticate', `Basic realm="${realm}"`);
    res.status(401).send('Authentication required');
  };
