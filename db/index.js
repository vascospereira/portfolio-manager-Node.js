const { Client } = require('pg');
const conString = "postgres://postgres@localhost:5432/finance";
const client = new Client({
    connectionString: conString,
});

client.connect().then(() => {
    console.log('Database Connection Established.');
}).catch(err => console.error('Database Connection Failed -', err.stack));

module.exports = {
    query: (text, params) => client.query(text, params)
};