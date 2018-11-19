const debug = require('../lib/debug');
const _token_handlers = require('./tokens_handlers');
const _card_handler = require('./cards_handlers');
const _helpers = require('./helpers');
const _data = require('./data');
const queryString = require('querystring');
const https = require('https');
const config = require('./config');

var methods = {};

methods.placeOrder = async (obj) => {
    var orderId = _helpers.createRandomString(16);
    const orderData = {
        id: orderId,
        items: obj.items,
        price: obj.final,
        iat: Date.now()
    };
    debug.info(orderData);
    const strOrderData = queryString.stringify({
        currency: 'usd',
        amount: orderData.price*100,
        description: 'charges for orderId '+orderId,
        source: 'tok_visa'
    });
    debug.info(strOrderData);
    const reqOptions = {
        protocol: 'https:',
        hostname: 'api.stripe.com',
        port: 443,
        path: '/v1/charges',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(strOrderData),
            'Authorization': 'Bearer '+config.stripe.secret_key
        }
    };
    debug.info(reqOptions);
    const req = https.request(reqOptions, (res) => {
        res.setEncoding('utf8');
        var rcvData = '';
        res.on('data', (chunk) => rcvData += chunk);
        res.on('end', () => {
            debug.error(rcvData);
            var msg = 'Hello, \n Your order: \n ';
            for(const k of Object.keys(obj.items)) msg += k+" : "+obj.items[k]+'\n';
            msg+= 'Amount: $'+obj.final;
            _helpers.sendEmail(obj.by, 'Order ID: '+orderData.id, msg, (emailErr, emailRes) => {
                if(emailErr) debug.error(emailErr, emailRes);
            });
        });
    });

    req.on('error', (e) => debug.error(e));
    req.on('timeout', (e) => debug.error(e));
    req.write(strOrderData);
    req.end();
};


methods.get = (data, callback) => {
    debug.info(data);
    var email = typeof(data.queryStringObject.email) == 'string' && data.queryStringObject.email.trim().length > 0 ? 
           data.queryStringObject.email.trim() :  false;
    var orderName = typeof(data.queryStringObject.orderName) == 'string' && data.queryStringObject.orderName.trim().length > 0 ? data.queryStringObject.orderName.trim() : false;
    if(orderName) {
        var token = typeof(data.queryStringObject.token) == 'string' && data.queryStringObject.token.trim().length > 0 ? data.queryStringObject.token : false;
        if(!token) callback(403, {'error': 'token is not specified'});
        else {
            debug.info("Verify token");
            _token_handlers._tokens.verifyToken(token, email, (isValid) => {
                debug.info(isValid);
                if(isValid) {
                    _data.read('orders', orderName, (readErr, readData) => {
                        debug.info(readErr, readData);
                        if(!readErr) {
                            callback(200, readData);
                        } else callback(404, {'error': 'Cannot find menu with file '+orderName});
                    });
                } else callback(404, {'error': 'Cannot find specified user'});
            });
        }
    } else callback(400, {'error': 'Missing required fields'});
};

var orderObject = {
    items: {},
    final: 0
};
const makeOrderObject = async (cardNames) => {
    for(const cardName of cardNames) {
        const cardData = await _data.aread('cards', cardName);
        for(const cardItem of cardData.items) {
            const menuData = await _data.aread('menus', cardItem.menuName);
            debug.info(menuData.items[cardItem.itemName]);
            var cost = menuData.items[cardItem.itemName].itemPrice * cardItem.volume;
            if(cardItem.itemName in orderObject.items) {
                orderObject.items[cardItem.itemName] += cost;
            } else {
                orderObject.items[cardItem.itemName] = cost;
            }
            debug.info(cardItem.itemName, orderObject.items[cardItem.itemName]);
            orderObject.final += cost;
        }
    }
};

methods.post = (data, callback) => {
    debug.info(data);
    var email = typeof(data.payload.email) == 'string' && data.payload.email.trim().length > 0 ? 
           data.payload.email.trim() :  false;
    var orderName = typeof(data.payload.orderName) == 'string' && data.payload.orderName.trim().length > 0 ? data.payload.orderName.trim() : false;
    var cardItems = typeof(data.payload.cardItems) == 'object' && data.payload.cardItems instanceof Array ? data.payload.cardItems : [];

    if(email && orderName && cardItems) {
        debug.info("<<<");
        var token = typeof(data.payload.token) == 'string' && data.payload.token.trim().length > 0 ? data.payload.token : false;
        if(!token) callback(403, {'error': 'token is not specified'});
        else {
            debug.info("Verify token");
            _token_handlers._tokens.verifyToken(token, email, (isValid) => {
                debug.info(isValid);
                if(isValid) {
                    debug.info("Prepare order object");
                    var obj = makeOrderObject(cardItems);
                    obj.then(value => {
                        orderObject.name = orderName;
                        orderObject.by = email;
                        orderObject.data = Date.now();
                        orderObject.placed = false;
                        debug.info(orderObject);
                        methods.placeOrder(orderObject);
                    });
                    callback(200);
                } else callback(404, {'error': 'Cannot find specified user'});
            });
        }
    } else callback(400, {'error': 'Missing required fields'});
};

module.exports = methods;