const bcrypt = require('bcryptjs');
const geoip = require('geoip-lite');
const User = require('../models/User');
const Company = require('../models/Company');
const LoginLog = require('../models/LoginLog');

exports.renderLogin = (req, res) => {
  res.render('login');
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
    if (!user) return res.status(400).send('User not found');

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(400).send('Incorrect password');

    // Setup session
    req.session.user = {
      id: user._id,
      name: user.name,
      role: user.role,
      companyId: user.companyId._id,
      companyName: user.companyId.name
    };

    // Record login log
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const geo = geoip.lookup(ip);

    await LoginLog.create({
      userId: user._id,
      ipAddress: ip,
      location: geo ? `${geo.city || 'Unknown'}, ${geo.country || 'Unknown'}` : 'Unknown',
      userAgent: req.headers['user-agent']
    });

    // Redirect based on role
    if (user.role === 'admin') {
      res.redirect('/dashboard/admin');
    } else {
      res.redirect('/dashboard/employee');
    }
  } catch (err) {
    res.status(500).send('Login error: ' + err.message);
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