const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const XLSX = require("xlsx");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log("MongoDB Connected"))
.catch(err => console.error("MongoDB Connection Failed:", err));

// Question Schema
const Question = mongoose.model("Question", new mongoose.Schema({
  question: String,
  options: [String],
  correct: String,
  subject: String,
  chapter: String,
}));

// Multer Setup for File Uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Upload Route
app.post("/upload", upload.single("file"), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
  
    // Transform Data
    const questions = sheetData.map((row) => ({
      question: row.Question,
      options: [row.Option1, row.Option2, row.Option3, row.Option4],
      correct: row.Correct,
      subject: row.Subject,
      chapter:row.Chapter // Read subject from Excel
    }));
  
    await Question.insertMany(questions);
    res.json({ message: "File uploaded and data saved successfully" });
  });

// ✅ FIXED: API Route to Fetch Chapters by Subject
app.get("/chapters/:subject", async (req, res) => {
  try {
    const subject = req.params.subject.toLowerCase();
    const chapters = await Question.distinct("chapter", { subject });
    res.json(chapters);
  } catch (error) {
    console.error("Error fetching chapters:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ FIXED: API Route to Fetch Questions by Subject & Chapter
app.get("/questions/:subject/:chapter", async (req, res) => {
  try {
    const subject = req.params.subject.toLowerCase();
    const chapter = req.params.chapter.toLowerCase();

    const questions = await Question.find({
      subject: { $regex: new RegExp(`^${subject}$`, "i") }, // Case-insensitive
      chapter: { $regex: new RegExp(`^${chapter}$`, "i") },
    });

    if (questions.length === 0) {
      return res.status(404).json({ message: "No questions found for this subject and chapter." });
    }

    res.json(questions);
  } catch (error) {
    console.error("Error fetching questions:", error);
    res.status(500).json({ error: "Server error" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
