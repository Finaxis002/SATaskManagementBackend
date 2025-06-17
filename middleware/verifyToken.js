// middleware/verifyToken.js
const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  // Define public routes that do not need authentication
  const publicPaths = ["/api/employees/login", "/api/employees/register"];

  // If current route is public, skip token check
  if (publicPaths.includes(req.path)) {
    return next();
  }

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};

module.exports = verifyToken;
