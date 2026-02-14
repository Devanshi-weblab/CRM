const axios = require('axios');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Company = require('../models/Company');
const StatusOption = require('../models/StatusOption');
const LoginLog = require('../models/LoginLog');
const Invitation = require('../models/Invitation');
require('dotenv').config();

const DEFAULT_STATUS_OPTIONS = ['Lead', 'Qualified', 'Proposal', 'Won', 'Lost'];

exports.renderLogin = (req, res) => {
  res.render('login', { error: null });
};

exports.renderSignup = (req, res) => {
  res.render('signup');
};

exports.signup = async (req, res, next) => {
  try {
    const { name, email, password, confirmPassword, companyName } = req.body;

    // Server-side password confirmation
    if (password !== confirmPassword) {
      return res.status(400).send('Passwords do not match.');
    }

    // Check or create company
    let company = await Company.findOne({ name: companyName });
    let companyJustCreated = false;
    if (!company) {
      company = new Company({ name: companyName });
      await company.save();
      companyJustCreated = true;
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

    if (companyJustCreated) {
      await StatusOption.insertMany(
        DEFAULT_STATUS_OPTIONS.map((name) => ({
          name,
          companyId: company._id,
          createdBy: newUser._id
        }))
      );
    }

    res.redirect('/auth/login');
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
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
    next(err);
  }
};

exports.getAcceptInvite = async (req, res, next) => {
  try {
    const invitation = await Invitation.findOne({
      token: req.params.token,
      acceptedAt: null
    });
    if (!invitation || invitation.expiresAt < new Date()) {
      return res.render('accept-invite', { error: 'Invalid or expired invitation link.', token: null });
    }
    res.render('accept-invite', { error: null, token: req.params.token, email: invitation.email });
  } catch (err) {
    next(err);
  }
};

exports.postAcceptInvite = async (req, res, next) => {
  try {
    const { token, tempPassword, name, newPassword, confirmNewPassword } = req.body;
    const invitation = await Invitation.findOne({
      token,
      acceptedAt: null
    });
    if (!invitation || invitation.expiresAt < new Date()) {
      return res.render('accept-invite', { error: 'Invalid or expired invitation link.', token: null });
    }
    if (invitation.tempPassword !== tempPassword) {
      return res.render('accept-invite', {
        error: 'Incorrect temporary password.',
        token,
        email: invitation.email
      });
    }
    if (!newPassword || newPassword.length < 6) {
      return res.render('accept-invite', {
        error: 'Password must be at least 6 characters.',
        token,
        email: invitation.email
      });
    }
    if (newPassword !== confirmNewPassword) {
      return res.render('accept-invite', {
        error: 'Passwords do not match.',
        token,
        email: invitation.email
      });
    }
    const existingUser = await User.findOne({ email: invitation.email });
    if (existingUser) {
      return res.render('accept-invite', { error: 'This email is already registered.', token: null });
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await User.create({
      name: (name || invitation.email).trim() || invitation.email,
      email: invitation.email,
      passwordHash,
      role: 'employee',
      companyId: invitation.companyId
    });
    invitation.acceptedAt = new Date();
    await invitation.save();
    req.session.flash = { type: 'success', message: 'Account created. You can now log in.' };
    res.redirect('/auth/login');
  } catch (err) {
    next(err);
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

exports.updateLocation = async (req, res, next) => {
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
    next(err);
  }
};