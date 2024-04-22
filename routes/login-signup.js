//mail di conferma
const nodemailer = require('nodemailer');
let cryptoRandomString;
import('crypto-random-string').then((module) => {
  cryptoRandomString = module.default;
});

//file con il middleware per il token
const {authenticateToken} = require('../auth.js')

//di base
const express = require('express')
const router = express.Router()

//modelli sql
const { Users, Rooms, Roles, Bookings, UserRoles, Email_verifications } = require('../sequelize/model.js')

//.env
require('dotenv').config();

//bcript
const bcrypt = require('bcrypt');

//get delle pagine login e signup
router.get('/login', async(req, res) => {
    res.render('../public/views/login.ejs');
});

//jwt
const jwt = require('jsonwebtoken');

router.get('/signup', (req, res) => {
    res.render('../public/views/signup.ejs');
});

/*
    Description: register a new user
    Path: http://localhost:3000/api/auth/register
    Method: POST
    Response: a message that confirms the registration
    Requirement: email, password, name, surname (all in the body)
 */
router.post('/register', (req, res) => {
  const { email, password, name, surname } = req.body
  try {
    bcrypt.hash(password, parseInt(process.env.SALT_ROUNDS_SECRET), (err, hash) => {
      if (err) 
        return res.status(500).json({ error: err.message });  
      Users.findOrCreate({
        where: {
          email: email,
        },
        defaults: {
          password: hash,
          name: name,
          surname: surname
        }
      }).then(async ([user, created]) => {
        if (created) {
          //invio mail
          const emailToken = cryptoRandomString({length: 10});
          Email_verifications.create({
            token: emailToken,
            userId: user.user_id,
          });
          let transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user: process.env.EMAIL_USERNAME,
              pass: process.env.EMAIL_PASSWORD
            }
          });
          
          // Invia l'email
          let info = await transporter.sendMail({
            from: '"No Reply" <no-reply@example.com>',
            to: email,
            subject: 'Conferma il tuo account',
            text: `Per favore conferma il tuo account cliccando sul seguente link: http://localhost:3000/api/auth/verifyEmail/${emailToken}`
          });

          const user_for_token = { email: user.email, id: user.user_id };
          const access_token = jwt.sign(user_for_token, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '24h' });
          const refresh_token = jwt.sign(user_for_token, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
          res.cookie('access_token', access_token, { httpOnly: true });
          res.cookie('refresh_token', refresh_token, { httpOnly: true });
          res.status(201).json({success : true, message: 'User created'});
        } else {
          res.status(400).json({success : false, message: 'User already exists'});
        }
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/verifyEmail/:token', async (req, res) => {
  const { token } = req.params;

  try {
    // Trova l'utente associato a questo token
    const user = await Users.findOne({ where: { emailToken: token } });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid token' });
    }

    // Imposta il campo is_verified su true
    user.is_verified = true;
    user.emailToken = null; // Puoi anche cancellare il token
    await user.save();

    res.status(200).json({ success: true, message: 'Email verified' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/*
    Description: login a user
    Path: http://localhost:3000/api/auth/login
    Method: POST
    Response: a message that confirms the login and a cookie with the access and refresh token
    Requirement: email, password (all in the body)
 */
router.post('/login', (req, res) => {
  const dati = req.body;
  Users.findOne({
    where: {
      email: dati.email
    },
  })
    .then((user) => {
      if (user == null) {
        res.status(404).json({ success: false, message: 'L\'user non esiste.' });
      } else {
        console.log(user);
        bcrypt.compare(dati.password, user.password, function(_, result) {
          if(result) {
            // Le password corrispondono
            const user_for_token = { email: user.email, id: user.user_id };
            const access_token = jwt.sign(user_for_token, process.env.ACCESS_TOKEN_SECRET, {
              expiresIn: 86400 // scade in 24 ore
            });
            const refresh_token = jwt.sign(user_for_token, process.env.REFRESH_TOKEN_SECRET, {
              expiresIn: 86400 * 7 // scade in 7 giorni
            });
            res.cookie('access_token', access_token, { httpOnly: true });
            res.cookie('refresh_token', refresh_token, { httpOnly: true });
            res.status(200).json({ success: true, message: 'L\'user esiste.'});
          } else {
            // Le password non corrispondono
            res.status(401).json({ success: false, message: 'Password errata.' });
          }
        });
      }
    })
    .catch((error) => {
      res.status(500).send('Internal Server Error', 'errore:', error);
      console.log(error);
    });
});



router.get('/isLogged', authenticateToken, (req, res) => {
  res.status(200).json({ success: true, message: 'User logged' });
});

router.get('/logout', (req, res) => {
  res.clearCookie('access_token');
  res.clearCookie('refresh_token');
  res.status(200).json({ success: true, message: 'User logged out' });
});


module.exports = router