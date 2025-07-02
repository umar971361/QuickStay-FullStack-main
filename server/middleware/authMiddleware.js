import User from "../models/User.js";

export const protect = async (req, res, next) => {
  try {
    console.log("🔍 Auth middleware started");
    console.log("Headers:", req.headers);
    
    // Check if req.auth exists (from Clerk)
    if (!req.auth) {
      console.error("❌ No req.auth object found");
      return res.status(401).json({ 
        success: false, 
        message: "Authentication required - no auth object" 
      });
    }
    
    const { userId } = req.auth;
    console.log("🔑 Clerk userId:", userId);
    
    if (!userId) {
      console.error("❌ No userId in auth object");
      return res.status(401).json({ 
        success: false, 
        message: "Not authenticated - no userId" 
      });
    }
    
    // Try to find user by clerkId
    console.log("🔍 Looking for user with clerkId:", userId);
    let user = await User.findOne({ clerkId: userId });
    console.log("👤 Found user:", user ? "Yes" : "No");
    
    // If user doesn't exist, create one
    if (!user) {
      console.log("🆕 Creating new user for clerkId:", userId);
      try {
        user = new User({
          clerkId: userId,
          role: 'guest',
          recentSearchedCities: []
        });
        await user.save();
        console.log("✅ New user created successfully");
      } catch (createError) {
        console.error("❌ Error creating user:", createError);
        return res.status(500).json({ 
          success: false, 
          message: "Error creating user profile",
          error: createError.message 
        });
      }
    }
    
    req.user = user;
    console.log("✅ Auth middleware completed successfully");
    next();
    
  } catch (error) {
    console.error("❌ Auth middleware error:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Authentication error", 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};