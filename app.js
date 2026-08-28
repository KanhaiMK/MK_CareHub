const express = require('express');
const app = express();
const path = require('path');
const cookieParser = require('cookie-parser');

// Middleware to parse incoming JSON request bodies
app.use(express.json());
// Middleware to parse incoming URL-encoded data (form submissions)
app.use(express.urlencoded({ extended: true }));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());

const authRoutes = require('./src/routes/auth.routes');
const childRoutes = require('./src/routes/child.routes');
const adoptionRoutes = require('./src/routes/adoption.routes');
const donationRoutes = require('./src/routes/donation.routes');
const aiRoutes = require('./src/routes/ai.routes');
const pageRoutes = require('./src/routes/page.routes');

app.use('/api/auth', authRoutes);
app.use('/api/children', childRoutes);
app.use('/api/adoptions', adoptionRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/assistant', aiRoutes);
app.use('/', pageRoutes);

module.exports = app;