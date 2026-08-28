const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.render('index');
});

router.get('/login', (req, res) => {
    res.render('login');
});

router.get('/register', (req, res) => {
    res.render('register');
});

router.get('/children/:id', (req, res) => {
    res.render('child-details');
});

router.get('/register-child', (req, res) => {
    res.render('register-child');
});

router.get('/donate', (req, res) => {
    res.render('donate');
});

router.get('/profile', (req, res) => {
    res.render('profile');
});

router.get('/verifier-login', (req, res) => {
    res.render('verifier-login');
});

router.get('/verifier-dashboard', (req, res) => {
    res.render('verifier-dashboard');
});

module.exports = router;