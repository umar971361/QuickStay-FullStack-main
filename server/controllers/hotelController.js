import Hotel from "../models/Hotel.js";
import User from "../models/User.js";

// API to create a new hotel
// POST /api/hotels
export const registerHotel = async (req, res) => {
  try {
    const { name, address, contact, city } = req.body;
    const owner = req.auth?.sessionClaims?.sub;

    // Check if User Already Registered
    const hotel = await Hotel.findOne({ owner });

    await Hotel.create({ name, address, contact, city, owner });

    // Update User Role
    await User.findByIdAndUpdate(owner, { role: "hotelOwner" });

    res.json({ success: true, message: "Hotel Registered Successfully" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// API to get all hotels
// GET /api/hotels
export const getAllHotels = async (req, res) => {
  try {
    const hotels = await Hotel.find({}).populate('owner', 'name email');
    res.json({ success: true, hotels });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// API to get a specific hotel by ID
// GET /api/hotels/:id
export const getHotelById = async (req, res) => {
  try {
    const { id } = req.params;
    const hotel = await Hotel.findById(id).populate('owner', 'name email');
    
    if (!hotel) {
      return res.status(404).json({ success: false, message: "Hotel not found" });
    }
    
    res.json({ success: true, hotel });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// API to get hotels by city
// GET /api/hotels/city/:city
export const getHotelsByCity = async (req, res) => {
  try {
    const { city } = req.params;
    const hotels = await Hotel.find({ city: new RegExp(city, 'i') }).populate('owner', 'name email');
    res.json({ success: true, hotels });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// API to update hotel details
// PUT /api/hotels/:id
export const updateHotel = async (req, res) => {
  try {
    const { id } = req.params;
    const owner = req.auth?.sessionClaims?.sub;
    
    // Check if the hotel belongs to the authenticated user
    const hotel = await Hotel.findOne({ _id: id, owner });
    
    if (!hotel) {
      return res.status(403).json({ success: false, message: "Not authorized to update this hotel" });
    }
    
    const updatedHotel = await Hotel.findByIdAndUpdate(id, req.body, { new: true });
    res.json({ success: true, hotel: updatedHotel });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// API to delete a hotel
// DELETE /api/hotels/:id
export const deleteHotel = async (req, res) => {
  try {
    const { id } = req.params;
    const owner = req.auth?.sessionClaims?.sub;
    
    // Check if the hotel belongs to the authenticated user
    const hotel = await Hotel.findOne({ _id: id, owner });
    
    if (!hotel) {
      return res.status(403).json({ success: false, message: "Not authorized to delete this hotel" });
    }
    
    await Hotel.findByIdAndDelete(id);
    
    // Update user role back to regular user if they have no more hotels
    const remainingHotels = await Hotel.find({ owner });
    if (remainingHotels.length === 0) {
      await User.findByIdAndUpdate(owner, { role: "user" });
    }
    
    res.json({ success: true, message: "Hotel deleted successfully" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};