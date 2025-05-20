const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Company = require('../models/Company');

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

    req.session.user = {
      id: user._id,
      name: user.name,
      role: user.role,
      companyId: user.companyId._id,
      companyName: user.companyId.name
    };

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

