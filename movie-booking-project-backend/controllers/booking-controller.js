import mongoose from "mongoose";
import Bookings from "../models/Bookings";
import Movie from "../models/Movie";
import User from "../models/User";

export const newBooking = async (req, res, next) => {
  const { movie, date, seatNumber, user } = req.body;

  if (!movie || !date || !seatNumber || !user) {
    return res.status(400).json({ message: "All fields are required" });
  }

  let existingMovie, existingUser;
  try {
    existingMovie = await Movie.findById(movie);
    existingUser = await User.findById(user);

    if (!existingMovie || !existingUser) {
      return res.status(404).json({ message: "Movie/User not found" });
    }
  } catch (err) {
    return next(new Error("Fetching movie/user failed"));
  }

  let booking;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    booking = new Bookings({
      movie,
      date: new Date(date),
      seatNumber,
      user,
    });
    existingUser.bookings.push(booking);
    existingMovie.bookings.push(booking);

    await existingUser.save({ session });
    await existingMovie.save({ session });
    await booking.save({ session });

    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    return next(new Error("Unable to create a booking"));
  } finally {
    session.endSession();
  }

  if (!booking) {
    return res.status(500).json({ message: "Unable to create a booking" });
  }

  return res.status(201).json({ booking });
};
export const getBookingById = async (req, res, next) => {
  const id = req.params.id;

  try {
    const booking = await Bookings.findById(id).populate("user movie");
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    return res.status(200).json({ booking });
  } catch (err) {
    return next(new Error("Fetching booking failed"));
  }
};

export const deleteBooking = async (req, res, next) => {
  const id = req.params.id;

  let booking;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    booking = await Bookings.findByIdAndRemove(id).populate("user movie");
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    booking.user.bookings.pull(booking);
    booking.movie.bookings.pull(booking);

    await booking.user.save({ session });
    await booking.movie.save({ session });

    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    return next(new Error("Unable to delete booking"));
  } finally {
    session.endSession();
  }

  return res.status(200).json({ message: "Successfully Deleted" });
};
