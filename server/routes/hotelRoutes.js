import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { 
  registerHotel, 
  getAllHotels, 
  getHotelById, 
  getHotelsByCity, 
  updateHotel, 
  deleteHotel 
} from "../controllers/hotelController.js";

const hotelRouter = express.Router();

// Public routes (no authentication required)
hotelRouter.get("/", getAllHotels);                    // GET /api/hotels - Get all hotels
hotelRouter.get("/:id", getHotelById);                 // GET /api/hotels/:id - Get specific hotel
hotelRouter.get("/city/:city", getHotelsByCity);       // GET /api/hotels/city/:city - Get hotels by city

// Protected routes (authentication required)
hotelRouter.post("/", protect, registerHotel);        // POST /api/hotels - Register new hotel
hotelRouter.put("/:id", protect, updateHotel);        // PUT /api/hotels/:id - Update hotel
hotelRouter.delete("/:id", protect, deleteHotel);     // DELETE /api/hotels/:id - Delete hotel

export default hotelRouter;