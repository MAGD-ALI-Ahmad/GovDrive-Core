const jwt = require("jsonwebtoken");
class JWTService {
  sign(payload, expiresIn) {
    return jwt.sign(payload, process.env.JWT_SECRET_KEY, { expiresIn });
  }

  verify(token) {
    return jwt.verify(token, process.env.JWT_SECRET_KEY);
  }

  generateAccessToken(payload) {
    return jwt.sign(payload, process.env.JWT_SECRET_KEY, { expiresIn: "15m" });
  }
  generateRefreshToken(payload) {
    return jwt.sign(payload, process.env.REFRESH_JWT_SECRET_KEY, {
      expiresIn: "7d",
    });
  }

  verifyAccessToken(token) {
    return jwt.verify(token, process.env.JWT_SECRET_KEY);
  }
  verifyRefreshToken(token) {
    return jwt.verify(token, process.env.REFRESH_JWT_SECRET_KEY);
  }
}
module.exports = new JWTService();
