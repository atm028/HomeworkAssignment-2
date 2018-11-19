const debug = require('../lib/debug');
const _token_handlers = require('./tokens_handlers');
const helpers = require('./helpers');
const _data = require('./data');

var method_handler = {};

method_handler.get = (data, callback) => {
    debug.info(data);
    var email = typeof(data.queryStringObject.email) == 'string' && data.queryStringObject.email.trim().length > 0 ? 
           data.queryStringObject.email.trim() :  false;
    var cardName = typeof(data.queryStringObject.cardName) == 'string' && data.queryStringObject.cardName.trim().length > 0 ? data.queryStringObject.cardName.trim() : false;
    if(cardName) {
        var token = typeof(data.queryStringObject.token) == 'string' && data.queryStringObject.token.trim().length > 0 ? data.queryStringObject.token : false;
        if(!token) callback(403, {'error': 'token is not specified'});
        else {
            debug.info("Verify token");
            _token_handlers._tokens.verifyToken(token, email, (isValid) => {
                debug.info(isValid);
                if(isValid) {
                    _data.read('cards', cardName, (readErr, readData) => {
                        debug.info(readErr, readData);
                        if(!readErr) {
                            callback(200, readData);
                        } else callback(404, {'error': 'Cannot find menu with file '+cardName});
                    });
                } else callback(404, {'error': 'Cannot find specified user'});
            });
        }
    } else callback(400, {'error': 'Missing required fields'});
};

method_handler.post = (data, callback) => {
    debug.info(data);
    var email = typeof(data.payload.email) == 'string' && data.payload.email.trim().length > 0 ? 
           data.payload.email.trim() :  false;
    var cardName = typeof(data.payload.cardName) == 'string' && data.payload.cardName.trim().length > 0 ? data.payload.cardName.trim() : false;
    var cardItems = typeof(data.payload.cardItems) == 'object' && data.payload.cardItems instanceof Array ? data.payload.cardItems : [];

    if(email && cardName && cardItems) {
        debug.info("<<<");
        var token = typeof(data.payload.token) == 'string' && data.payload.token.trim().length > 0 ? data.payload.token : false;
        if(!token) callback(403, {'error': 'token is not specified'});
        else {
            debug.info("Verify token");
            _token_handlers._tokens.verifyToken(token, email, (isValid) => {
                debug.info(isValid);
                if(isValid) {
                    debug.info(cardName);
                    _data.read('cards', cardName, (cardErr, cardData) => {
                        debug.info(cardErr);
                        if(cardErr) {
                            debug.info("Prepare object");
                            var cardObject = {
                                name: cardName,
                                items: cardItems,
                                by: email,
                                data: Date.now()
                            };
                            debug.info(cardObject);
                            _data.create('cards', cardName, cardObject, (err) => {
                                debug.info(err);
                                if(!err) callback(200);
                                else callback(500, {'error': 'Cannot create menu'});
                            });
                        } else callback(400, {'error': 'The menu already exist'});
                    });
                } else callback(404, {'error': 'Cannot find specified user'});
            });
        }
    } else callback(400, {'error': 'Missing required fields'});
};

method_handler.put = (data, callback) => {
    debug.info(data);
    var email = typeof(data.queryStringObject.email) == 'string' && data.queryStringObject.email.trim().length > 0 ? 
           data.queryStringObject.email.trim() :  false;
    var cardName = typeof(data.payload.cardName) == 'string' && data.payload.cardName.trim().length > 0 ? data.payload.cardName.trim() : false;

    if(typeof(data.payload.update) == 'object') {
        var cardItems = typeof(data.payload.update.cardItems) == 'object' && data.payload.update.cardItems instanceof Array ? data.payload.update.cardItems : [];
        debug.info(email, cardName);
        if(email && cardName) {
            debug.info("Verify token");
            var token = typeof(data.queryStringObject.token) == 'string' && data.queryStringObject.token.trim().length > 0 ? data.queryStringObject.token : false;
            if(!token) callback(403, {'error': 'token is not specified'});
            else {
                _token_handlers._tokens.verifyToken(token, email, (isValid) => {
                    debug.info(isValid);
                    if(isValid) {
                        _data.read('cards', cardName, (readErr, readData) => {
                            debug.info(readData);
                            debug.info(readData.items);                            
                            if(!readErr) {
                                cardItems.forEach(item => {
                                    var index = readData.items.indexOf(readData.items.filter(el => el.menuName == item.menuName && el.itemName == item.itemName)[0]);
                                    debug.info(index, item);
                                    if(index > -1) readData.items[index].volume = item.volume;
                                    else readData.items.push(item)
                                });
                                readData.data = Date.now();
                                debug.info("Update with object: ", readData);
                                _data.update('cards', cardName, readData, (updateErr) => {
                                    if(!updateErr) callback(200, readData);
                                    else callback(500, updateErr);
                                });
                            } else callback(500, readErr);
                        });
                    }
                });
            }
        } else callback(400, {'error': 'Missing required fields'});
    } else callback(400, {'error': 'Missing required update fields'});
};

method_handler.delete = (data, callback) => {
    debug.info(data);
    var email = typeof(data.queryStringObject.email) == 'string' && data.queryStringObject.email.trim().length > 0 ? 
           data.queryStringObject.email.trim() :  false;
    var cardName = typeof(data.payload.cardName) == 'string' && data.payload.cardName.trim().length > 0 ? data.payload.cardName.trim() : false;
    var cardItems = typeof(data.payload.cardItems) == 'object' && data.payload.cardItems instanceof Array ? data.payload.cardItems : [];
    
    if(email && cardName) {
        var token = typeof(data.queryStringObject.token) == 'string' && data.queryStringObject.token.trim().length > 0 ? data.queryStringObject.token : false;
        if(!token) callback(403, {'error': 'token is not specified'});
        else {
            debug.info("Verify token");
            _token_handlers._tokens.verifyToken(token, email, (isValid) => {
                debug.info(isValid);
                if(isValid) {
                    if(cardItems.length > 0) {
                        _data.read('cards', cardName, (readErr, readData) => {
                            if(!readErr) {
                                cardItems.forEach(item => {
                                    readData.items.splice(
                                        readData.items.indexOf(
                                            readData.items.filter(el => el.itemName == item)[0]
                                        ), 
                                        1
                                    );
                                });
                                debug.info("Update with object", readData);
                                _data.update('cards', cardName, readData, (updateErr) => {
                                    if(!updateErr) callback(200, readData);
                                    else callback(500, updateErr);
                                });
                            } else callback(500, readErr);
                        });
                    } else {
                        _data.delete('cards', cardName, (err) => {
                            if(!err) callback(200);
                            else callback(404, {'error': 'Cannot find specified menu'});
                        });
                    }
                }
            });
        }
    } else callback(400, {'error': 'Missing required fields'});
};

module.exports = method_handler;