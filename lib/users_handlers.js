const _data = require('./data');
const helpers = require('./helpers');
const _token_handlers = require('./tokens_handlers');
const debug = require('./debug');

var method_handler = {};

method_handler.get = (data, callback) => {
    debug.info(data);
    var email = typeof(data.queryStringObject.email) == 'string' && data.queryStringObject.email.trim().length > 0 ? 
            data.queryStringObject.email.trim() :  false;
    if(email) {
        debug.info("Verifying token");
        var token = typeof(data.queryStringObject.token) == 'string' ? data.queryStringObject.token : false;
        if(!token) callback(403, {'error': 'token is not specified'});
        else {
            _token_handlers._tokens.verifyToken(token, email, (isValid) => {
                debug.info(isValid);
                if(isValid) {
                    _data.read('users', email, (err, data) => {
                        debug.info(data);
                        if(!err) {
                            debug.info("Deleting password");
                            delete data.hashedPassword;
                            debug.info(data);
                            callback(200, data);
                        } else {
                            callback(404);
                        }
                    });
                } else {
                    callback(403, {'error': 'Incorrect token'});
                }
            });
        }
   } else {
        callback(400, {"error": 'Missing required fields'});
    }
};

method_handler.post = (data, callback) => {
    var firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    var lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    var email = typeof(data.payload.email) == 'string' && data.payload.email.trim().length > 0 ? data.payload.email.trim() : false;
    var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

    if(firstName && lastName && email && password) {
        _data.read('users', email, (err, data) => {
            if(err) {
                var hashedPassword = helpers.hash(password);
                var userObject = {
                    'firstName': firstName,
                    'lastName': lastName,
                    'email': email,
                    'hashedPassword': hashedPassword
                };
                _data.create('users', email, userObject, (err) => {
                    if(!err) callback(200);
                    else {
                        callback(500, {"error": "Could not create new user"});
                    }
                });
            } else {
                callback(400, {"error": "A user with that email number already exists"});
            }
        });
    } else {
        callback(400, {"error": "Missing required fields"});
    }
};

method_handler.put = (data, callback) => {
    debug.info(data);
    var email = typeof(data.queryStringObject.email) == 'string' && data.queryStringObject.email.trim().length > 0 ? 
        data.queryStringObject.email.trim() :  false;
    var firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    var lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

    if(email) {
        var token = typeof(data.queryStringObject.token) == 'string' ? data.queryStringObject.token : false;
        if(!token) callback(403, {'error': 'token is not specified'});
        else {
            _token_handlers._tokens.verifyToken(token, email, (isValid) => {
                if(isValid) {
                    if(firstName || lastName || password) {
                        _data.read('users', email, (err, data) => {
                            if(!err && data) {
                                if(firstName) data.firstName = firstName;
                                if(lastName) data.lastName = lastName;
                                if(password) data.hashedPassword = helpers.hash(password);
                                _data.update('users', email, data, (err) => {
                                    if(!err) {
                                        callback(200);
                                    } else {
                                        callback(500, {"error": "Could not update the user"});
                                    }
                                });
                            } else {
                                callback(400, {"error": "The specified user does not exist"});
                            }
                        });
                    } else {
                        callback(400, {"error": "Missing fields to update"});
                    }
                } else {
                    callback(403, {'error': 'Incorrect token'});
                }
            });
        }
   } else {
        callback(400, {"error": "Missing required fields"});
    }

};

method_handler.delete = (data, callback) => {
     var email = typeof(data.queryStringObject.email) == 'string' && data.queryStringObject.email.trim().length > 0 ? 
            data.queryStringObject.email.trim() :  false;
    if(email) {
        var token = typeof(data.queryStringObject.token) == 'string' ? data.queryStringObject.token : false;
        if(!token) callback(403, {'error': 'token is not specified'});
        else {
            _token_handlers._tokens.verifyToken(token, email, (isValid) => {
                if(isValid) {
                    _data.read('users', email, (err, userData) => {
                        if(!err) {
                            _data.delete('users', email, (err) => {
                                if(!err) {
                                    var userChecks = typeof(userData.checks) == 'object'
                                                            && userData.checks instanceof Array
                                                            ? userData.checks : false;
                                    var checkLength = userChecks.checkLength;
                                    if(checkLength > 0) {
                                        var checksDeleted = 0;
                                        var deletionErros = false;
                                        userChecks.forEach(checkId => {
                                            _data.delete('checks', checkId, (err) => {
                                                if(err) {
                                                    deletionErros = true;
                                                }
                                                checksDeleted++;
                                                if(checksDeleted == checkLength) {
                                                    if(!deletionErros) callback(200);
                                                    else callback(500, {'error': 'Errors encountered while attempting to delete all of the users check'});
                                                }
                                            });
                                        });
                                    }
                                } else {
                                    callback(500, {"error": "Could not delete the specified user"});
                                }
                            });
                        } else {
                            callback(404);
                        }
                    });
                } else {
                    callback(403, {'error': 'Incorrect token'});
                }
            });
        }
    } else {
        callback(400, {"error": 'Missing required fields'});
    }
};

module.exports = method_handler;