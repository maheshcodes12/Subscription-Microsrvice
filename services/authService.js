const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { generateToken } = require('../middleware/auth'); 
const redisService = require('./redis');

class AuthService {
  // Register new user
  async register(userData) {
    const { name, email, password, role } = userData;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role: role || 'user'
    });

    await user.save();

    // Generate token
    const token = generateToken({ id: user._id, email: user.email, role: user.role });

    // Cache user session in Redis (expire in 24 hours)
    const sessionKey = `session:${user._id}`;
    await redisService.set(sessionKey, {
      userId: user._id,
      email: user.email,
      role: user.role,
      loginTime: new Date()
    }, 86400);

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    return {
      user: userResponse,
      token
    };
  }

  // Login user
  async login(email, password) {
    // Find user and include password field
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Generate token
    const token = generateToken({ id: user._id, email: user.email, role: user.role });

    // Cache user session in Redis (expire in 24 hours)
    const sessionKey = `session:${user._id}`;
    await redisService.set(sessionKey, {
      userId: user._id,
      email: user.email,
      role: user.role,
      loginTime: new Date()
    }, 86400);

    // Update last login (optional)
    await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    return {
      user: userResponse,
      token
    };
  }

  // Logout user
  async logout(userId) {
    const sessionKey = `session:${userId}`;
    await redisService.del(sessionKey);
    
    return { message: 'Logged out successfully' };
  }

}

module.exports = new AuthService();