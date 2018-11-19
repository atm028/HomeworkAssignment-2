const fs = require('fs');
const path = require('path');
const debug = require('./debug');
const util = require('util');

const openFile = util.promisify(fs.open);
const readFile = util.promisify(fs.readFile);
const closeFile = util.promisify(fs.close);

var lib = {};

lib.baseDir = path.join(__dirname, '/../.data/');

lib.create = (dir, fname, data, callback) => {
    debug.info("lib.create: ", lib.baseDir+dir+'/'+fname+'.json');
    fs.open(lib.baseDir+dir+'/'+fname+'.json', 'wx', (err, fileDescriptior) => {
        debug.info("fs.open: ", err);
        if(!err && fileDescriptior) {
            var strData = JSON.stringify(data);
            fs.writeFile(fileDescriptior, strData, (err) => {
                debug.info("writeFile: ", err);
                if(!err) {
                    fs.close(fileDescriptior, (err) => {
                        if(!err) {
                            callback(false);
                        } else {
                            callback("Error closing new file");
                        }
                    });
                } else {
                    callback('Could not write the data into the file');
                }
            });
        } else {
            callback('Could not create new file it may already exist');
        }
    });
};

lib.read = (dir, fname, callback) => {
    debug.info(lib.baseDir+dir+'/'+fname+'.json');
    fs.readFile(lib.baseDir+dir+'/'+fname+'.json', 'utf8', (err, data) => {
        if(!err) callback(err, JSON.parse(data));
        else callback(err, {"error": "cannot read the file"});
    });
};

lib.aread = async (dir, fname) => {
    const fileDescriptor = await openFile(lib.baseDir+dir+'/'+fname+'.json', 'r');
    const data = await readFile(fileDescriptor, 'utf8');
    await closeFile(fileDescriptor);
    return JSON.parse(data);
};

lib.update = (dir, fname, data, callback) => {
    fs.open(lib.baseDir+dir+'/'+fname+'.json', 'r+', (err, fileDescriptor) => {
        if(!err && fileDescriptor) {
            fs.truncate(fileDescriptor, (err) => {
                if(!err) {
                    var strData = JSON.stringify(data);
                    fs.writeFile(fileDescriptor, strData, (err) => {
                        if(!err) {
                            fs.close(fileDescriptor, (err) => {
                                if(!err) callback(false);
                                else callback("Cannot close the file");
                            });
                        } else {
                            callback("Eror writing data to file");
                        }
                    });
                } else {
                    callback("Erro truncating file");
                }
            });
        } else {
            callback('Could not open file for updating, it may not existy yet');
        }
    });
};

lib.delete = (dir, fname, callback) => {
    debug.info('Delete file: ', lib.baseDir+dir+'/'+fname+'.json');
    fs.unlink(lib.baseDir+dir+'/'+fname+'.json', (err) => {
        if(!err) callback(false);
        else callback("Cannot delete the file");
    });
};

lib.list = (dir, callback) => {
    fs.readdir(lib.baseDir+dir+'/', (err, data) => {
        if(!err && data && data.length > 0) {
            var trimmedFileNames = [];
            data.forEach(fileName => {
                trimmedFileNames.push(fileName.replace('.json', ''));
            });
            callback(false, trimmedFileNames);
        } else callback(err, data);
    });
};

module.exports = lib;