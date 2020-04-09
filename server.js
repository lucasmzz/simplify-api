const express = require('express');
const app = express();
const cors = require('cors');
const axios = require('axios');
const knex = require('knex');
const db = knex({
    client: 'pg',
    connection: {
        host : '127.0.0.1',
        user : 'lmazzutti',
        password : '',
        database : 'simplify'
    }
});
const bcrypt = require('bcrypt-nodejs');
const PORT = 3000;

app.use(cors());
app.use(express.json());

let quotes = null;

// Function to run during server startup to get all quotes from API
const getQuotes = async () => {
    try{
        const res = await axios.get("https://type.fit/api/quotes");
        return res.data;
    }catch (error){
        console.log(error);
    }
};

const dailyQuoteHandler = (req, res) => {    
    const id = Math.round(Math.random() * (quotes.length - 1));
    res.send(quotes[id]);
};

app.get('/', (req, res) => res.send('Welcome to Simplify!'));
app.get('/daily', dailyQuoteHandler);

app.post('/signin', (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password){
        return res.status(400).json('incomplete data, pls check');
    }

    db.from('login').select('email','hash')
    .where('email', '=', email)
    .then(data => {    
        const isValid =	bcrypt.compareSync(password,data[0].hash);
        if (isValid){
          return db.select('*')
            .from('users')
            .where('email', '=', email)
            .then(user => res.json(user[0]))
        } else {
		      res.status(400).json('invalid credentials');
		    }
    })
    .catch(err => res.status(400).json('unable to log in'));
});

app.post('/register', (req, res) =>{
    
    const { name, password, email } = req.body;

    if (!name || !password || !email){
        return res.status(400).json('incomplete data, pls check');
    }

    const hash = bcrypt.hashSync(password);

    db.transaction(trx => {
        trx.insert({
            hash: hash,
            email: email
        })
        .into('login')
        .returning('email')
        .then(loginEmail => {
            return trx.insert({
                name: name,
                email: loginEmail[0],
                joined: new Date()
                })
                .into('users')
                .returning('*')
                .then(user => {
                    res.json(user[0])
                })
        })
        .then(trx.commit)
        .catch(trx.rollback)
    })
    .catch(err => res.status(400).json('unable to register'));    
});

app.listen(PORT, async () => {
    quotes = await getQuotes();
    console.log(`Simplify app listening on port ${PORT}!`);
});