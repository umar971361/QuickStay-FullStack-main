export const getUserData = async (req, res) => {
  try {
    console.log("🔍 getUserData started");
    console.log("User from req:", req.user);
    
    if (!req.user) {
      console.error("❌ No user in request object");
      return res.status(401).json({ 
        success: false, 
        message: "User not found in request" 
      });
    }

    const { role, recentSearchedCities, firstName, lastName, email } = req.user;
    
    console.log("✅ Returning user data");
    res.json({ 
      success: true, 
      role: role || 'guest', 
      recentSearchedCities: recentSearchedCities || [],
      firstName: firstName || null,
      lastName: lastName || null,
      email: email || null
    });
    
  } catch (error) {
    console.error("❌ getUserData error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to get user data",
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};