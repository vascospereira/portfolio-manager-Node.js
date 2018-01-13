const axios = require('axios');

const userSession = function (req, res, next) {

    if (!req.session.user) {
        res.redirect('/login');
    } else {
        next();
    }

};

const money = function (value) {
    return (value).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
    });
};

const lookup = (symbol) =>{
    const url = `https://api.iextrading.com/1.0/stock/${symbol}/quote?filter=symbol,companyName,latestPrice`;
    return axios.get(url);
};

const Users = {
    // give the query a unique name
    name: 'fetch-all-users',
    text: 'SELECT * FROM users',
};

const User = {
    // give the query a unique name
    name: 'fetch-user',
    text: 'SELECT * FROM users WHERE username = $1',
};

const Register = {
    name: 'register-user',
    text: 'INSERT INTO users(username, hash) VALUES($1, $2) RETURNING id',
};

const History = {
    name: 'history',
    text: 'SELECT * FROM transactions WHERE user_id = $1',
};

const InsertTransaction = {
    name: 'insert-data',
    text: 'INSERT INTO transactions (user_id,symbol,shares,price) VALUES($1,$2,$3,$4)',
};

const UpdateUserCash = {
    name: 'update-cash',
    text: 'UPDATE users SET cash = cash + $1 WHERE id = $2',
};

const UserById = {
    name: 'user-by-id',
    text: 'SELECT * FROM users WHERE id = $1',
};

const Transactions = {
    name: 'transactions',
    text: 'SELECT * FROM transactions'
};

const Share = {
    name: 'share',
    text: 'SELECT SUM(shares) AS shares FROM transactions WHERE user_id = $1 AND symbol = $2 GROUP BY symbol'
};

const AllShares = {
    name: 'all-shares',
    text: 'SELECT symbol, SUM(shares) AS shares FROM transactions WHERE user_id = $1 GROUP BY symbol HAVING SUM(shares) > 0'
};

const UserCash = {
    name: 'cash',
    text: 'SELECT cash FROM users WHERE id = $1'
};

module.exports = {
    userSession,
    money,
    lookup,
    User,
    Users,
    UserById,
    Register,
    History,
    InsertTransaction,
    UpdateUserCash,
    Transactions,
    Share,
    AllShares,
    UserCash
};
