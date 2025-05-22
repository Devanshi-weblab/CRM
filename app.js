// Import required modules
const express = require('express');
const mongoose = require('mongoose');
const ejs = require('ejs');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');

// Create Express app
const app = express();

// MongoDB connection
const url = 'mongodb://127.0.0.1:27017/CRMDb';
const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true
};

mongoose.connect(url, options)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err);
  });

// Set up view engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'ThisIsMySessionSecret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Make user data available to all views
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// Routes
app.get('/', (req, res) => {
  if (req.session.user) {
    const role = req.session.user.role;
    if (role === 'admin') {
      return res.redirect('/dashboard/admin');
    } else if (role === 'employee') {
      return res.redirect('/dashboard/employee');
    }
  }
  res.redirect('/auth/login'); // Or render a public landing page if you want
});


const clientRoutes = require('./routes/clientRoutes');
app.use('/clients', clientRoutes);

const authRoutes = require('./routes/authRoutes');
app.use('/auth', authRoutes);

const dashboardRoutes = require('./routes/dashboardRoutes');
app.use('/dashboard', dashboardRoutes);

const employeeRoutes = require('./routes/employeeRoutes');
app.use('/employees', employeeRoutes);

// Server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log("Server is listening on port " + port);
});
