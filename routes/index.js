const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const get = require('../helpers');
const db = require('../db');

/**
 * Loads user portfolio
 */

router.get('/', get.userSession, async (req, res) => {

    try {

        const {rows} = await db.query(get.AllShares, [req.session.user]);
        const account = await db.query(get.UserCash,[req.session.user]);
        let total = Number(account.rows[0].cash);
        const stocks = [];

        for (let i = 0; i < rows.length; i++){
            let stock = await get.lookup(rows[i].symbol);
            total += rows[i].shares * stock.data.latestPrice;
            stocks.push({symbol: rows[i].symbol, name: stock.data.companyName, shares: rows[i].shares, price: get.money(stock.data.latestPrice), value: get.money(rows[i].shares * stock.data.latestPrice)});
        }

        res.render('index', {stocks: stocks, cash: get.money(Number(account.rows[0].cash)), total: get.money(total)});

    } catch (err){
        res.render('apology', {msg: '400 Bad Request :('});
        console.log(err.stack);
    }

});

/**
 * User Login
 */

router.route('/login').get((req, res) => {
    res.render('login');
}).post(async (req, res) => {

    if (req.body.username === '') {
        res.render('apology', {msg: 'missing username.'});
        return;
    } else if (req.body.password === '') {
        res.render('apology', {msg: 'missing password.'});
        return;
    }

    try {
        const {rows} = await db.query(get.User, [req.body.username]);
        const match = await bcrypt.compare(req.body.password, rows[0].hash);
        if (!match) {
            res.render('apology', {msg: 'invalid password'});
            return;
        }
        req.session.user = rows[0].id;
        res.redirect('/');
    } catch (err) {
        res.render('apology', {msg: 'invalid username'});
        console.log(err.stack);
    }

});

/**
 * Logs out the user
 */

router.get('/logout', (req, res) => {
    delete req.session.user;
    res.redirect('/');
});

/**
 * User to quote shares
 */

router.route('/quote').get((req, res) => {
    res.redirect('/');
}).post(async (req, res) => {

    try {
        const rows = await get.lookup(req.body.symbol);
        res.render('quote', {
            quote: `A Share of ${rows.data.symbol.toUpperCase().split('"').join('')},
            ${rows.data.companyName.split('"').join('')}, 
            costs $${rows.data.latestPrice}`
        });
    } catch (err) {
        res.render('apology', {msg: 'share not found.'});
        console.log(err.stack);
    }

});

/**
 * User register form
 */

router.route('/register').get(async (req, res) => {
    res.render('register');
}).post(async (req, res) => {

    if (!/^[A-z0-9]{2,16}$/.test(req.body.username)) {
        res.render('apology', {msg: 'username must have at least 2 none special characters.'});
        return;
    } else if (!/^(?=.*\d)(?=.*[A-z])[0-9A-z!@#$%]{4,25}$/.test(req.body.password)) {
        res.render('apology', {msg: 'your password must have at least 4 characters (letters and digits).'});
        return;
    } else if (req.body.password !== req.body.confirm) {
        res.render('apology', {msg: 'passwords don\'t match'});
        return;
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(req.body.password, salt);
        const {rows} = await db.query(get.Register, [req.body.username, hash]);
        req.session.user = rows[0].id;
        req.flash('info', 'Registered');
        res.redirect('/');
    } catch (err) {
        res.render('apology', {msg: 'username already exists'});
        console.log(err.stack);
    }

});

/**
 * Allows user to sell shares of stock
 */

router.route('/sell').get(get.userSession, (req, res) => {
    res.render('sell');
}).post(get.userSession, async (req, res) =>{

    if (!/^[A-z]+$/.test(req.body.symbol)) {
        res.render('apology', {msg: 'missing and/or invalid symbol.'});
        return;
    } else if (!/^[1-9]\d*$/.test(req.body.shares)) {
        res.render('apology', {msg: 'missing and/or invalid shares.'});
        return;
    }

    const symbol = req.body.symbol.toUpperCase();
    const numberOfShares = parseFloat(req.body.shares);

    try {
        const {rows} = await db.query(get.Share,[req.session.user, symbol]);
        if(numberOfShares > rows[0].shares){
            res.render('apology', {msg:'too many shares'});
            return;
        }
        const share = await get.lookup(req.body.symbol);
        // update total's user shares sold
        await db.query(get.InsertTransaction, [req.session.user, share.data.symbol.toUpperCase(), -numberOfShares, share.data.latestPrice]);
        // update user cash
        await db.query(get.UpdateUserCash, [(share.data.latestPrice*numberOfShares), req.session.user]);
        req.flash('info', 'Sold');
        res.redirect('/');
    } catch (err) {
        res.render('apology', {msg: 'share not found'})
    }

});

/**
 * Allows user to buy shares of stock
 */

router.route('/buy').get(get.userSession, async (req, res) => {
    res.render('buy');
}).post(get.userSession, async (req, res) => {

    if (!/^[A-z]+$/.test(req.body.symbol)) {
        res.render('apology', {msg: 'missing and/or invalid symbol.'});
        return;
    } else if (!/^[1-9]\d*$/.test(req.body.shares)) {
        res.render('apology', {msg: 'missing and/or invalid shares.'});
        return;
    }

    try {

        const quote = await get.lookup(req.body.symbol);
        console.log(quote.data);
        const shares = parseInt(req.body.shares);
        const cost = shares * quote.data.latestPrice;

        try {
            const {rows} = await db.query(get.UserById, [req.session.user]);
            if (cost > rows[0].cash) {
                res.render('apology', {msg: 'you don\'t have enough cash.'});
                return;
            }
            await db.query(get.InsertTransaction, [req.session.user, quote.data.symbol.toUpperCase(), shares, quote.data.latestPrice]);
            await db.query(get.UpdateUserCash, [-cost, req.session.user]);
            req.flash('info', 'Bought');
            res.redirect('/');
        } catch (err) {
            res.render('apology', {msg: '400 Bad Request :('});
            console.log(err.stack);
        }

    } catch (err) {
        res.render('apology', {msg: 'invalid symbol'});
        console.log(err.stack);
    }

});

/**
 * Shows history of transactions
 */

router.get('/history', get.userSession, async (req, res) => {

    try {
        const {rows} = await db.query(get.History, [req.session.user]);
        res.render('history', {transactions: rows});
    } catch (e) {
        res.render('apology', {msg: 'Any transactions to show'});
        console.log(e.stack);
    }

});

module.exports = router;
