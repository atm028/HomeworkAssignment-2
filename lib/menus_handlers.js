const _data = require('./data');
const _token_handlers = require('./tokens_handlers');
const debug = require('./debug');

var method_handler = {};

method_handler.get = (data, callback) => {
    debug.info(data);
    var email = typeof(data.queryStringObject.email) == 'string' && data.queryStringObject.email.trim().length > 0 ? 
           data.queryStringObject.email.trim() :  false;
    var menuName = typeof(data.queryStringObject.menuName) == 'string' && data.queryStringObject.menuName.trim().length > 0 ? data.queryStringObject.menuName.trim() : false;
    if(menuName) {
        var token = typeof(data.queryStringObject.token) == 'string' && data.queryStringObject.token.trim().length > 0 ? data.queryStringObject.token : false;
        if(!token) callback(403, {'error': 'token is not specified'});
        else {
            debug.info("Verify token");
            _token_handlers._tokens.verifyToken(token, email, (isValid) => {
                debug.info(isValid);
                if(isValid) {
                    _data.read('menus', menuName, (readErr, readData) => {
                        if(!readErr) {
                            callback(200, readData);
                        } else callback(404, {'error': 'Cannot find menu with file '+menuName});
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
    var menuName = typeof(data.payload.menuName) == 'string' && data.payload.menuName.trim().length > 0 ? data.payload.menuName.trim() : false;
    var menuDescription = typeof(data.payload.menuDescription) == 'string' ? data.payload.menuDescription : '';
    var menuItems = typeof(data.payload.menuItems) == 'object' && data.payload.menuItems instanceof Object ? data.payload.menuItems : {};

    if(email && menuName && menuDescription && menuItems) {
        var token = typeof(data.payload.token) == 'string' && data.payload.token.trim().length > 0 ? data.payload.token : false;
        if(!token) callback(403, {'error': 'token is not specified'});
        else {
            debug.info("Verify token");
            _token_handlers._tokens.verifyToken(token, email, (isValid) => {
                debug.info(isValid);
                if(isValid) {
                    debug.info(menuName);
                    _data.read('menus', menuName, (menuErr, menuData) => {
                        debug.info(menuErr);
                        if(menuErr) {
                            var menuObject = {
                                name: menuName,
                                description: menuDescription,
                                items: menuItems,
                                by: email,
                                data: Date.now()
                            };
                            debug.info(menuObject);
                            _data.create('menus', menuName, menuObject, (err) => {
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

method_handler.delete = (data, callback) => {
    debug.info(data);
    var email = typeof(data.queryStringObject.email) == 'string' && data.queryStringObject.email.trim().length > 0 ? 
           data.queryStringObject.email.trim() :  false;
    var menuName = typeof(data.payload.menuName) == 'string' && data.payload.menuName.trim().length > 0 ? data.payload.menuName.trim() : false;
    var menuItems = typeof(data.payload.menuItems) == 'object' && data.payload.menuItems instanceof Array ? data.payload.menuItems : [];
    
    if(email && menuName) {
        var token = typeof(data.queryStringObject.token) == 'string' && data.queryStringObject.token.trim().length > 0 ? data.queryStringObject.token : false;
        if(!token) callback(403, {'error': 'token is not specified'});
        else {
            debug.info("Verify token");
            _token_handlers._tokens.verifyToken(token, email, (isValid) => {
                debug.info(isValid);
                if(isValid) {
                    if(menuItems.length > 0) {
                        _data.read('menus', menuName, (readErr, readData) => {
                            if(!readErr) {
                                menuItems.forEach(item => {
                                    readData.items.splice(
                                        readData.items.indexOf(
                                            readData.items.filter(el => el.itemName == item)[0]
                                        ), 
                                        1
                                    );
                                });
                                debug.info("Update with object", readData);
                                _data.update('menus', menuName, readData, (updateErr) => {
                                    if(!updateErr) callback(200, readData);
                                    else callback(500, updateErr);
                                });
                            } else callback(500, readErr);
                        });
                    } else {
                        _data.delete('menus', menuName, (err) => {
                            if(!err) callback(200);
                            else callback(404, {'error': 'Cannot find specified menu'});
                        });
                    }
                }
            });
        }
    } else callback(400, {'error': 'Missing required fields'});
};

method_handler.put = (data, callback) => {
    debug.info(data);
    var email = typeof(data.queryStringObject.email) == 'string' && data.queryStringObject.email.trim().length > 0 ? 
           data.queryStringObject.email.trim() :  false;
    var menuName = typeof(data.payload.menuName) == 'string' && data.payload.menuName.trim().length > 0 ? data.payload.menuName.trim() : false;

    if(typeof(data.payload.update) == 'object') {
        var menuDescription = typeof(data.payload.update.menuDescription) == 'string' ? data.payload.update.menuDescription : '';
        var menuItems = typeof(data.payload.update.menuItems) == 'object' && data.payload.update.menuItems instanceof Array ? data.payload.update.menuItems : [];

        if(email && menuName) {
            debug.info("Verify token");
            var token = typeof(data.queryStringObject.token) == 'string' && data.queryStringObject.token.trim().length > 0 ? data.queryStringObject.token : false;
            if(!token) callback(403, {'error': 'token is not specified'});
            else {
                _token_handlers._tokens.verifyToken(token, email, (isValid) => {
                    debug.info(isValid);
                    if(isValid) {
                        _data.read('menus', menuName, (readErr, readData) => {
                            if(!readErr) {
                                menuItems.forEach(item => readData.items.push(item));
                                if(menuDescription) readData.description = menuDescription;
                                readData.data = Date.now();
                                debug.info("Update with object: ", readData);
                                _data.update('menus', menuName, readData, (updateErr) => {
                                    if(!updateErr) callback(200, readData);
                                    else callback(500, updateErr);
                                });
                            } else callback(500, readErr);
                        });
                    }
                });
            }
        } else callback(400, {'error': 'Missing required fields'});
    } else callback(400, {'error': 'Missing required fields'});
};

module.exports = method_handler;