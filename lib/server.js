const http = require('http');
const url = require('url');
const config = require('./config');
const {StringDecoder} = require('string_decoder'); 
const handlers = require('./handlers');
const helpers = require('./helpers');
const path = require('path');
const debug = require('./debug');

var server = {};

debug.info("Create HTTP Server");
server.httpServer = http.createServer((req, res) => {
    var parsedUrl = url.parse(req.url, true);
    var path = parsedUrl.pathname;
    var trimmedPath = path.replace(/^\/+|\/+$/g, '');
    var queryStringObject = parsedUrl.query;
    var decoder = new StringDecoder('utf-8');
    var method = req.method.toLowerCase();
    var headers = req.headers;
    var buffer = '';

    req.on('data', (data) => { buffer += decoder.write(data); });
    
    req.on('end', () => {
        buffer += decoder.end();
        debug.info("reg: ", trimmedPath, buffer);

        let handler = typeof(server.router[trimmedPath]) !== 'undefined' 
                        ? server.router[trimmedPath] : handlers.notFound;

        var data = {
            'trimmedPath': trimmedPath,
            'queryStringObject': queryStringObject,
            'method': method,
            'headers': headers,
            'payload': helpers.parseJsonToObject(buffer)
        };
        debug.info(data);
        handler(data, (code, payload) => {
            code = typeof(code) !== 'number' ? code : 200;
            payload = typeof(payload) == 'object' ? payload : {};
            let payloadString = JSON.stringify(payload);
            res.setHeader('Content-Type', 'application/json');
            res.writeHead(code);
            debug.info("res: ", payloadString);
            res.end(payloadString);
        });
    });
});

server.router = {
    "cards": handlers.cards,
    "menus": handlers.menus,
    "orders": handlers.orders,
    "tokens": handlers.tokens,
    "users": handlers.users
};

server.init = () => {
    debug.info("Start listening on port ", config.httpPort);
    server.httpServer.listen(config.httpPort, () => {
        debug.info("Server started listening on port: ", config.httpPort);
        debug.info("Server started listening on port: ", config.httpPort);
    });
};


module.exports = server;