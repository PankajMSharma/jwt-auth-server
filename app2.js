require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());

var cars = [
    {username: 'pankajmsharma357', carName: 'Tesla Model S'},
    {username: 'spooja357', carName: 'Ferrari'}
]

app.get('/my-cars', authorizationCheck, (req, res) => {
    const result = cars.filter(car => car.username === req.username);
    res.json(result);
});

function authorizationCheck(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.sendStatus(401);

    const token = !!authHeader.split(' ').length && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);
    console.log(token);

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, body) => {
        if (err) return res.sendStatus(403);

        if(body) {
            req.username = body.username;
            next();
        }
    });
}

app.listen(process.env.RESOURCE_2_SERVER_PORT);