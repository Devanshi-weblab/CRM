const axios = require('axios');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Company = require('../models/Company');
const LoginLog = require('../models/LoginLog');
require('dotenv').config();

exports.renderLogin = (req, res) => {
  res.render('login', { error: null });
};

exports.renderSignup = (req, res) => {
  res.render('signup');
};

exports.signup = async (req, res) => {
  try {
    const { name, email, password, confirmPassword, companyName } = req.body;

    // Server-side password confirmation
    if (password !== confirmPassword) {
      return res.status(400).send('Passwords do not matchhh.');
    }

    // Check or create company
    let company = await Company.findOne({ name: companyName });
    if (!company) {
      company = new Company({ name: companyName });
      await company.save();
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      passwordHash,
      role: 'admin',
      companyId: company._id
    });

    await newUser.save();
    res.redirect('/auth/login');
  } catch (err) {
    res.status(500).send('Error during signup: ' + err.message);
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).populate('companyId');
    if (!user) {
      return res.render('login', { error: 'User not found' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.render('login', { error: 'Incorrect password' });
    }

    // Setup session
    req.session.user = {
      id: user._id,
      name: user.name,
      role: user.role,
      companyId: user.companyId._id,
      companyName: user.companyId.name
    };

    // Get IP address
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || 
               req.connection.remoteAddress || 
               req.socket?.remoteAddress;

    // Save initial login log (location will be updated later via HTML5 geolocation)
    await LoginLog.create({
      userId: user._id,
      ipAddress: ip,
      userAgent: req.headers['user-agent'],
      fullAddress: 'Pending HTML5 Geolocation',
      city: 'Pending',
      country: 'Pending',
      postalCode: 'Pending'
    });

    // Redirect based on role
    if (user.role === 'admin') {
      res.redirect('/dashboard/admin');
    } else {
      res.redirect('/dashboard/employee');
    }
  } catch (err) {
    res.render('login', { error: 'An error occurred during login. Please try again.' });
  }
};

exports.logout = (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).send('Could not log out.');
    }
    res.redirect('/auth/login');
  });
};

exports.updateLocation = async (req, res) => {
  try {
    const { latitude, longitude, timestamp } = req.body;
    const userId = req.session.user.id;

    // Get IP address
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || 
               req.connection.remoteAddress || 
               req.socket?.remoteAddress;

    // Use OpenCageData API to get address details
    let locationData = {
      fullAddress: 'Unknown',
      city: 'Unknown',
      country: 'Unknown',
      postalCode: 'Unknown'
    };

    try {
      const geoRes = await axios.get(
        `https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=${process.env.OPENCAGE_API_KEY}`
      );
      
      if (geoRes.data.results && geoRes.data.results.length > 0) {
        const result = geoRes.data.results[0].components;
        locationData = {
          fullAddress: geoRes.data.results[0].formatted,
          city: result.city || result.town || result.village || 'Unknown',
          country: result.country || 'Unknown',
          postalCode: result.postcode || 'Unknown'
        };
      }
    } catch (geoErr) {
      console.error('OpenCage API error:', geoErr.message);
    }

    // Update the most recent login log for this user
    await LoginLog.findOneAndUpdate(
      { userId },
      {
        latitude,
        longitude,
        ...locationData,
        ipAddress: ip,
        userAgent: req.headers['user-agent']
      },
      { sort: { loginTime: -1 } }
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Location update error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};