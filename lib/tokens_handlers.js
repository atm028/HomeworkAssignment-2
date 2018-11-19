const _data = require('../lib/data');
const helpers = require('../lib/helpers');
const debug = require('./debug');

var method_handler = {};
method_handler._tokens = {};

method_handler._tokens.verifyToken = (token, email, callback) => {
    _data.read('tokens', token, (err, data) => {
        debug.info(err, data);
        if(!err) {
            if(data.email == email && data.id == token) {
                callback(true);
            } else {
                callback(false);
            }
        } else {
            callback(false);
        }
    });
};

method_handler.get = (data, callback) => {
    var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length > 0 ? 
            data.queryStringObject.id.trim() :  false;
    if(id) {
        _data.read('tokens', id, (err, data) => {
            if(!err) {
                callback(200, data);
            } else {
                callback(404);
            }
        });
    } else {
        callback(400, {"error": 'Missing required fields'});
    }
};

method_handler.post = (data, callback) => {
    var email = typeof(data.payload.email) == 'string' && data.payload.email.trim().length > 0 ? 
        data.payload.email.trim() :  false;
    var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

    if(email && password) {
        _data.read('users', email, (err, data) => {
            if(!err) {
                var hashedPassword = helpers.hash(password);
                if(hashedPassword == data.hashedPassword) {
                    var tokenID = helpers.createRandomString(20);
                    var expires = Date.now() + 1000 * 60 * 60;
                    var tokenObj = {
                        "email": email,
                        "id": tokenID,
                        "expires": expires
                    };
                    _data.create('tokens', tokenID, tokenObj, (err) => {
                        if(!err) {
                            callback(200, tokenObj);
                        } else {
                            callback(500, {'error': 'could not create token, maybe it already exist'});
                        }
                    });
                } else {
                    callback(400, {"error": "Password doesnt match"});
                }
            } else {
                callback(400, {"error": "Could not find specified user"});
            }
        });
    } else {
        callback(400, {"error": "Missing required fields"});
    }

};

method_handler.put = (data, callback) => {
    var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length > 0 ? 
            data.queryStringObject.id.trim() :  false;
    var extend = typeof(data.payload.extend) == 'boolean' && data.payload.extend == true ?  true : false;

    if(id && extend) {
        _data.read('tokens', id, (err, data) => {
            if(!err) {
                if(data.expires > Date.now()) {
                    data.expires = Date.now() + 1000 * 60 * 60;
                    _data.update('tokens', id, data, (err) => {
                        if(!err) {
                            callback(200);
                        } else {
                            callback(400, {'error': 'Could not update token\'s data'});
                        }
                    });
                } else {
                    callback(400, {'error': 'Token is expired and could not be extended'});
                }
            } else callback(400, {'error': 'Specified token does not exist'});
        });
    } else {
        callback(400, {"error": "Missing required fields or one of them is incorrect"});
    }

};

method_handler.delete = (data, callback) => {
     var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length > 0 ? 
            data.queryStringObject.id.trim() :  false;
    if(id) {
        _data.read('tokens', id, (err, data) => {
            if(!err) {
                _data.delete('tokens', id, (err) => {
                    if(!err) {
                        callback(200);
                    } else {
                        callback(500, {"error": "Could not delete the specified token"});
                    }
                });
            } else {
                callback(404);
            }
        });
    } else {
        callback(400, {"error": 'Missing required fields'});
    }
};

module.exports = method_handler;