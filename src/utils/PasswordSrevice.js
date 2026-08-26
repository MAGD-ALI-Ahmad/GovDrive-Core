const argon = require("argon2");
class PasswordService {
  async hashPassword(password) {
    try {
      return await argon.hash(password);
    } catch (error) {
      throw new Error("Error hashing password `argon2`");
    }
  }
  async comparePassword(password, hashedPassword) {
    try {
      return await argon.verify(hashedPassword, password);
    } catch (error) {
      throw new Error("Error comparing password `argon2`");
    }
  }
}
module.exports = new PasswordService();
