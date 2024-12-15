import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import Admin from "../models/Admin";
import Movie from "../models/Movie";
export const addMovie = async (req, res, next) => {
  const extractedToken = req.headers.authorization.split(" ")[1];
  if (!extractedToken || extractedToken.trim() === "") {
    return res.status(404).json({ message: "Token Not Found" });
  }

  let adminId;

  try {
    // verify token
    jwt.verify(extractedToken, process.env.SECRET_KEY, (err, decrypted) => {
      if (err) {
        console.error("JWT Verification Error:", err.message);
        throw new Error("Invalid Token");
      }
      adminId = decrypted.id;
    });

    // Extract and validate inputs
    const { title, description, releaseDate, posterUrl, featured, actors } = req.body;
    if (
      !title || title.trim() === "" || 
      !description || description.trim() === "" || 
      !posterUrl || posterUrl.trim() === ""
    ) {
      return res.status(422).json({ message: "Invalid Inputs" });
    }

    // create a new movie
    const movie = new Movie({
      description,
      releaseDate: new Date(`${releaseDate}`),
      featured,
      actors,
      admin: adminId,
      posterUrl,
      title,
    });

    // Start session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    const adminUser = await Admin.findById(adminId);
    if (!adminUser) {
      return res.status(404).json({ message: "Admin Not Found" });
    }

    await movie.save({ session });
    adminUser.addedMovies.push(movie);
    await adminUser.save({ session });

    await session.commitTransaction();

    return res.status(201).json({ movie });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};
export const getAllMovies = async (req, res, next) => {
  let movies;

  try {
    movies = await Movie.find();
  } catch (err) {
    return console.log(err);
  }

  if (!movies) {
    return res.status(500).json({ message: "Request Failed" });
  }
  return res.status(200).json({ movies });
};

export const getMovieById = async (req, res, next) => {
  const id = req.params.id;
  let movie;
  try {
    movie = await Movie.findById(id);
  } catch (err) {
    return console.log(err);
  }

  if (!movie) {
    return res.status(404).json({ message: "Invalid Movie ID" });
  }

  return res.status(200).json({ movie });
};