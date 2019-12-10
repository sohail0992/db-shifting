const logger = require("./logger");
const fs = require("fs");

readFile = function(fileName) {
  return new Promise((resolve,reject) => {
    // let normalizedPath = require("path").resolve(__dirname, '/sourceCollections/' + fileName);
    let path = "./sourceCollections/" + fileName;
    if (fs.lstatSync(path).isDirectory()) {
      logger.trace("file path represnt drirectory", normalizedPath);
      return reject("invalid file name");
    }
    console.log(path, "path");
    fs.readFile(path, "utf8", function(err, fileContents) {
      logger.trace("fs.readFile(): BEGIN");
      if (err) return reject(err);
      resolve(fileContents);
    });
  });
}

writeFile = function(outputFileName,derivedKeyAsString) {
  let filepath = __dirname + '/sourceCollections/';
  ensureExists(filepath, 0744)
    .then(res => {
      fs.writeFile('sourceCollections/' + outputFileName, derivedKeyAsString, "utf8", err => {
        logger.trace("fs.writeFile(): BEGIN");
        // If error occurred, log it (err will be passed to callback later)
        if (err) {
          console.log(err, 'err while writing to file')
        } else {
          logger.debug(
            "fs.writeFile()Wrote derived key '" +
              derivedKeyAsString +
              "' to file: " +
              outputFileName
          );
          return outputFileName;
        }
        logger.trace("fs.writeFile(): END");
      });
    }).catch(error => {
      console.log(error,'errr')
    })
};

function ensureExists(path, mask, cb) {
  return new Promise((resolve, reject) => {
    if (typeof mask == "function") {
    // allow the `mask` parameter to be optional
      cb = mask;
      mask = 0777;
    }
    fs.mkdir(path, mask, function(err) {
      if (err) {
        if (err.code == "EEXIST") resolve(null);
        // ignore the error if the folder already exists
        else reject(err); // something else went wrong
      } else resolve(null); // successfully created folder
    });
  });
}

module.exports.writeFile = writeFile;
module.exports.readFile = readFile;