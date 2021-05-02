require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());

const refresh_tokens = [];

app.post('/login', function(req, res) {
    console.log(req.body);
    if (!req.body || !req.body.username) return res.send('Empty credentials!').sendStatus(333);

    // generate access and refresh tokens
    const token_payload = generateTokenPayload(req.body);
    const access_token = generateAccessToken(token_payload);
    const refresh_token = generateRefreshToken(token_payload);

    updateRefreshTokenData(req.body.username, req.body.orgId, refresh_token);

    res.send({ accessToken: access_token, refreshToken: refresh_token, refresh_tokens });
});

/* Generates new token using refresh token */
app.post('/token', function(req, res) {
    const suspicious_token = req.body && req.body.token;

    if (!suspicious_token) return res.sendStatus(401);

    if (!refresh_tokens.find(token_obj => token_obj.token === suspicious_token))
        return res.sendStatus(403);

    jwt.verify(suspicious_token, process.env.REFRESH_TOKEN_SECRET, (err, data) => {
        if (err && err.name !== 'TokenExpiredError') return res.sendStatus(403);

        // fetch token object from data/database
        refresh_token_obj = refresh_tokens.find(token_obj => token_obj.token === suspicious_token);
        // generate new access token
        const token_payload = generateTokenPayload({ 
                                        username: refresh_token_obj.username,
                                        orgId: refresh_token_obj.orgId
                                    });
        const new_access_token = generateAccessToken(token_payload);
        let new_refresh_token;

        if (err && err.name === 'TokenExpiredError') {
            new_refresh_token = generateRefreshToken(token_payload);
            updateRefreshTokenData(token_payload.username, token_payload.orgId, new_refresh_token);
        }

        res.json({ accessToken: new_access_token, refreshToken: new_refresh_token });
    });
});

/* Using Refresh Token */
app.get('/logout', function(req, res) {
    if (!req.body || !req.body.token) return req.sendStatus(401);

    const idx = refresh_tokens.findIndex(token_obj => token_obj.token === req.body.token);
    
    if (idx >= 0) {
        refresh_tokens.splice(idx, 1);
        req.sendStatus(204);
    }
});

/* Generating access token with expiry */
function generateAccessToken(payload) {
    const tok = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, { expiresIn: process.env.ACCESS_TOKEN_EXPIRE_TIME });
    return tok;
}

/* Generating refresh token with no expiry */
function generateRefreshToken(payload) {
    let token;
    do {
        if (process.env.REFRESH_TOKEN_EXPIRE_TIME) {
            token = jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, { expiresIn: process.env.REFRESH_TOKEN_EXPIRE_TIME });
        } else {
            token = jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET);
        }
    } while(token && refresh_tokens.includes(token));

    return token;
}

function generateTokenPayload(data) {
    return { username: data.username, orgId: data.orgId };
}

function updateRefreshTokenData(username, orgId, new_token) {
    const idx = refresh_tokens.findIndex(token_obj => token_obj.username === username );
    refresh_tokens.splice(idx, 1);
    refresh_tokens.push({ username, orgId, token: new_token });
}

app.listen(process.env.AUTH_SERVER_PORT);