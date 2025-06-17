// middleware/checkHeaders.js
const allowedOrigins = ["https://tasks.sharda.co.in", "http://localhost:5173"];

const checkHeaders = (req, res, next) => {
  // ⛔ Skip header checks for public routes like login/register
  const publicPaths = ["/api/employees/login", "/api/employees/register"];
  if (publicPaths.includes(req.path)) {
    return next();
  }

  const origin = req.get("origin") || req.get("referer");
  const customHeader = req.headers["x-app-client"];

  if (!origin || !allowedOrigins.some((allowed) => origin.startsWith(allowed))) {
    return res.status(403).json({ message: "Blocked: Invalid origin or referer" });
  }

  if (customHeader !== "frontend-authenticated") {
    return res.status(403).json({ message: "Blocked: Invalid custom header" });
  }

  next();
};

module.exports = checkHeaders;
