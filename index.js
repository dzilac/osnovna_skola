require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();


app.use(cors());
app.use(express.json());
app.use('/api/parents', require('./routes/parentRoutes'));
app.use('/api/items', require('./routes/items'));
app.use('/api/upload', require('./routes/upload'));
app.use("/api", require("./routes/auth"));
app.use("/api", require("./routes/quiz")); 
app.use("/api", require("./routes/extracurriculars"));
app.use('/api/ai', require('./routes/aiAnalysis'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/activities', require('./routes/activities'));
app.use('/api/private-lessons', require('./routes/privateLessons'));
app.use('/api/users', require('./routes/users'));
app.use('/api/location', require('./routes/location'));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
