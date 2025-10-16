import mongoose from "mongoose";

const extracurricularSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: String,
    enum: ["umetnost", "sport", "nauka"], // ograničavamo na tri vrednosti
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  imageUrl: {
    type: String, // opciono, možeš prikazivati sliku uz svaku aktivnost
  },
  teacher: {
    type: String, // ime nastavnika koji vodi sekciju
  },
  schedule: {
    type: String, // npr. "Petkom u 13h"
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("Extracurricular", extracurricularSchema);
