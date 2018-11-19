const crypto = require('crypto');
const config = require('./config');
const querystring = require('querystring');
const https = require('https');
const _data = require('./data');

var helpers = {};

helpers.hash = (str) => {
    if(typeof(str) == 'string' && str.length > 0) {
        var hash = crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex');
        return hash;
    } else {
        return false;
    }
};

helpers.parseJsonToObject = (str) => {
    try {
        var obj = JSON.parse(str);
        return obj;
    } catch {
        return {};
    }
};

helpers.createRandomString = (length) => {
    length = typeof(length) == 'number' && length > 0 ? length : 10;
    var posChars = 'abcdefgijklmnopqrstuwvwxyz01234567890';
    var str = '';
    for(i = 1; i <= length; i++) {
        str += posChars.charAt(Math.floor(Math.random() * posChars.length));
    }
    return str;
};

helpers.sendEmail = (to, subj, msg, callback) => {
    const payload = {
        'to': to,
        'from': config.mailgun.from,
        'subject': subj,
        'text': msg
    };
    const strPayload = querystring.stringify(payload);
    const reqOptions = {
        'protocol': 'https:',
        'hostname': 'api.mailgun.net',
        'auth': ['api', config.mailgun.apiKey].join(":"),
        'port': 443,
        'method': 'POST',
        'path': '/v3/'+config.mailgun.domain+'/messages',
        'headers': {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(strPayload)
        }
    };
    const req = https.request(reqOptions, (res) => {
        const statusCode = res.statusCode;
        if(200 == statusCode || 201 == statusCode) callback(false, res);
        else callback(true, res);
    });
    req.on('error', (err) => callback(true, err));
    req.write(strPayload);
    req.end();
};

module.exports = helpers;