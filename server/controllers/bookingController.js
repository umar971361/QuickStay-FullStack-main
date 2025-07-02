import transporter from "../configs/nodemailer.js";
import Booking from "../models/Booking.js";
import Hotel from "../models/Hotel.js";
import Room from "../models/Room.js";
import User from "../models/User.js";
import stripe from "stripe";

// Function to Check Availablity of Room
const checkAvailability = async ({ checkInDate, checkOutDate, room }) => {
  try {
    const bookings = await Booking.find({
      room,
      checkInDate: { $lte: checkOutDate },
      checkOutDate: { $gte: checkInDate },
    });

    const isAvailable = bookings.length === 0;
    return isAvailable;

  } catch (error) {
    console.error("Check availability error:", error.message);
    return false;
  }
};

// API to check availability of room
// POST /api/bookings/check-availability
export const checkAvailabilityAPI = async (req, res) => {
  try {
    const { room, checkInDate, checkOutDate } = req.body;
    const isAvailable = await checkAvailability({ checkInDate, checkOutDate, room });
    res.json({ success: true, isAvailable });
  } catch (error) {
    console.error("Check availability API error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// API to create a new booking
// POST /api/bookings/book
export const createBooking = async (req, res) => {
  try {
    const { room, checkInDate, checkOutDate, guests } = req.body;

    // Use the user from auth middleware
    const userId = req.user._id;
    
    // Before Booking Check Availability
    const isAvailable = await checkAvailability({
      checkInDate,
      checkOutDate,
      room,
    });

    if (!isAvailable) {
      return res.json({ success: false, message: "Room is not available" });
    }

    // Get totalPrice from Room
    const roomData = await Room.findById(room).populate("hotel");
    
    if (!roomData) {
      return res.json({ success: false, message: "Room not found" });
    }
    
    let totalPrice = roomData.pricePerNight;

    // Calculate totalPrice based on nights
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const timeDiff = checkOut.getTime() - checkIn.getTime();
    const nights = Math.ceil(timeDiff / (1000 * 3600 * 24));

    totalPrice *= nights;

    const booking = await Booking.create({
      user: userId,
      room,
      hotel: roomData.hotel._id,
      guests: +guests,
      checkInDate,
      checkOutDate,
      totalPrice,
    });

    // Use user from middleware (already available)
    const user = req.user;

    if (user && user.email) {
      const mailOptions = {
        from: process.env.SENDER_EMAIL,
        to: user.email,
        subject: 'Hotel Booking Details',
        html: `
          <h2>Your Booking Details</h2>
          <p>Dear ${user.name || user.username || 'Guest'},</p>
          <p>Thank you for your booking! Here are your details:</p>
          <ul>
            <li><strong>Booking ID:</strong> ${booking.id}</li>
            <li><strong>Hotel Name:</strong> ${roomData.hotel.name}</li>
            <li><strong>Location:</strong> ${roomData.hotel.address}</li>
            <li><strong>Check-in Date:</strong> ${new Date(booking.checkInDate).toDateString()}</li>
            <li><strong>Check-out Date:</strong> ${new Date(booking.checkOutDate).toDateString()}</li>
            <li><strong>Total Amount:</strong> ${process.env.CURRENCY || '$'}${booking.totalPrice}</li>
            <li><strong>Nights:</strong> ${nights}</li>
            <li><strong>Guests:</strong> ${guests}</li>
          </ul>
          <p>We look forward to welcoming you!</p>
          <p>If you need to make any changes, feel free to contact us.</p>
        `,
      };

      try {
        await transporter.sendMail(mailOptions);
      } catch (emailError) {
        console.log("Email sending failed:", emailError);
        // Don't fail the booking if email fails
      }
    }

    res.json({ success: true, message: "Booking created successfully" });

  } catch (error) {
    console.log("Booking creation error:", error);
    res.status(500).json({ success: false, message: "Failed to create booking" });
  }
};

// API to get all bookings for a user
// GET /api/bookings/user
export const getUserBookings = async (req, res) => {
  try {
    // Use the user from auth middleware
    const userId = req.user._id;
    
    const bookings = await Booking.find({ user: userId }).populate("room hotel").sort({ createdAt: -1 });
    res.json({ success: true, bookings });
  } catch (error) {
    console.error("getUserBookings error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch bookings" });
  }
};

export const getHotelBookings = async (req, res) => {
  try {
    // Use the user from auth middleware
    const ownerId = req.user._id;
    
    const hotel = await Hotel.findOne({ owner: ownerId });
    if (!hotel) {
      return res.json({ success: false, message: "No Hotel found" });
    }
    
    const bookings = await Booking.find({ hotel: hotel._id }).populate("room hotel user").sort({ createdAt: -1 });
    
    // Total Bookings
    const totalBookings = bookings.length;
    // Total Revenue
    const totalRevenue = bookings.reduce((acc, booking) => acc + booking.totalPrice, 0);

    res.json({ success: true, dashboardData: { totalBookings, totalRevenue, bookings } });
  } catch (error) {
    console.error("getHotelBookings error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch bookings" });
  }
};

export const stripePayment = async (req, res) => {
  try {
    const { bookingId } = req.body;

    const booking = await Booking.findById(bookingId);
    
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    const roomData = await Room.findById(booking.room).populate("hotel");
    
    if (!roomData) {
      return res.status(404).json({ success: false, message: "Room not found" });
    }

    const totalPrice = booking.totalPrice;
    const { origin } = req.headers;

    const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);

    // Create Line Items for Stripe
    const line_items = [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: roomData.hotel.name,
          },
          unit_amount: totalPrice * 100,
        },
        quantity: 1,
      },
    ];

    // Create Checkout Session
    const session = await stripeInstance.checkout.sessions.create({
      line_items,
      mode: "payment",
      success_url: `${origin}/loader/my-bookings`,
      cancel_url: `${origin}/my-bookings`,
      metadata: {
        bookingId,
      },
    });
    
    res.json({ success: true, url: session.url });

  } catch (error) {
    console.error("Stripe payment error:", error);
    res.status(500).json({ success: false, message: "Payment Failed" });
  }
};