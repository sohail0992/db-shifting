var express = require('express');
var session = require('express-session');
var app = express();
var cors = require("cors");
app.use(cors())
//uuid automatically generate unique strings
const uuidv4 = require('uuid/v4');
// const mongo = require('mongodb').MongoClient;
const mongoose = require("mongoose");
const processFileASync = require("./processFile");
var bodyParser = require('body-parser');
//bodyParser is a node.js middleware for handling JSON, Raw, Text and URL encoded form data.
// configure the app to use bodyParser()
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.use(
  session({
    secret: "Shh, its a secret!",
    name: 'aaa',
    // store: sessionStore, // connect-mongo session store
    proxy: true,
    resave: true,
    saveUninitialized: true
  })
);
var db = null;
var sourceDb = {
  dbClient: null,
  dbCon: null,
  dbName: null
};
var destinationDb = {
  dbClient: null,
  dbCon: null,
  dbName: null
};
// connectToMongo("mongodb://localhost:27017/seasions").then(database => {
// 	db = database;
// });

// var MongoClient = require('mongodb').MongoClient
//   , format = require('util').format;

app.get('/', function(req, res) {
    console.log(req.session,'req.session')
    if(req.session.page_views){
        req.session.page_views++;
        res.send("You visited this page " + req.session.page_views + " times");
    } else {
        req.session.page_views = 1;
        res.send("Welcome to this page for the first time!");
    }
});

app.post('/initiate-db-migration', function (req, res) {
	 console.log(processFileASync, "processFileASync");
    if((!req.body.sourceDb && !req.body.destinationDb) && req.body.dbName) return handleError(req,res,'Please provide db name and also sourceDb or destinationDb flag true or false');
    // let obj = findSeasion(req,null,null);
    // if(req.body.sourceDb && obj.sourceDb) return res.status(200).send('Already Connection Exist');
    // if(req.body.destinationDb && obj.destinationDb) return res.status(200).send('Already Connection Exist');
			connectToMongo(req.body.sourceDb).then(client => {
				if(client && client.name) {
					getCollectionsList(client)
					.then(allCollections => {
						console.log(allCollections, "allCollections");
						if(allCollections && allCollections.length > 0) {
							sourceDb.collections = allCollections;
							sourceDb.dbClient = client;
							sourceDb.dbName = client.name;
							sendData(client, req.body.destinationDb, allCollections);
						}
					})
					res.status(200).send('Connected')
				} else {
					return handleError(req,res,'Connection failed');
				}
			}).catch(err => {
					console.log(err,'err')
					if(err) return handleError(req,res,err);
			});
});

async function sendData(client,destinationDb,allCollections) {
	connectToMongo(destinationDb).then(detClient => {
			if (detClient && detClient.name) {
				destinationDb.dbClient = detClient;
				// destinationDb.dbCon = client.db(req.body.dbName);
				destinationDb.dbName = detClient.name;
				console.log(detClient.name, "destinationDb.dbName");
				console.log(client.name,'source db');
				migrate(client, detClient, allCollections);
			}
		});
}

app.get('/getCollections/:dbType', function(req,res) {
  let dbType = req.params.dbType;
  if(dbType !== 'sourceDb' && dbType !== 'destinationDb') return handleError(req,res,'which db source or detination');
  getCollectionsList(dbType === 'sourceDb' ? sourceDb.dbClient : destinationDb.dbClient)
  .then(response => {
    res.status(200).send(response);
  }).catch(err => {
    return handleError(req,res,err);
  });
});

app.get('/getDataOfCollection/:dbType/:collectionName', function(req,res) {
  let collectionName = req.params.collectionName;
  let dbClient = req.params.dbType === 'sourceDb' ? sourceDb.dbClient : destinationDb.dbClient;
	if(!collectionName || !dbClient) {
		return handleError(req,res,'Please Provide a valid collection name.');
	}
  findDataInCollection(dbClient,collectionName)
	.then(data => {
		res.status(200).send(data);
	}).catch(err => {
		return handleError(req,res,err)
	})
});


app.get('/export-db', function(req, res) {
	let dbClient = sourceDb.dbClient;
	getCollectionsList(dbClient)
    .then(collections => {
      if (collections && collections.length > 0) {
				collections.forEach(eachCollection => {
					exportCollectionToJson(collection);
					// findDataInCollection(dbClient, eachCollection).then(dataOfCollection => {
					// 	processFileASync.writeFile(eachCollection + ".json", JSON.stringify(dataOfCollection), function(err,data) {
					// 		if (err) return handleError(req, res, "err");
					// 		console.log(data, "d");
					// 	});
					// });
				});
				res.status(200).send('Export In Proccess. Please wait');
      } else {
				return handleError(req,res,'No Collections Record found try connecting again')
			}
    })
    .catch(err => {
			console.log(err,'err');
      return handleError(req, res, err);
    });
});

async function exportCollectionToJson(dbClient, eachCollection) {
  findDataInCollection(dbClient, eachCollection).then(dataOfCollection => {
		if(dataOfCollection) {
			processFileASync.writeFile(eachCollection + ".json", JSON.stringify(dataOfCollection),function(err, data) {
        if (err) return handleError(req, res, "err");
        console.log(data, "d");
				return data;
      });
		} else {
			console.log('no data in collecton' + eachCollection);
		}
  });
}

async function migrate(sourceDb, destinationDb, collections) {
  collections.forEach(eachCollection => {
    let ignore = ["objectlabs-system.admin.collections", "objectlabs-system", "system.indexes"];
    if (ignore.indexOf(eachCollection) === -1) {
      findDataInCollection(sourceDb, eachCollection)
			.then(dataOfCollection => {
        writeDataInCollection(destinationDb, eachCollection, dataOfCollection)
          .then(res => {})
          .catch(errr => {
            console.log(errr, "errr in writeDataInCollection");
          });
      });
    }
  });
}

app.get("/migrate", function(req,res) {
	getCollectionsList(sourceDb.dbClient).then(collections => {
    if (collections && collections.length > 0) {
			count = collections.length;
			console.log(collections, "allcollections");

      res.status(200).send("Export In Proccess. Please wait");
    } else {
      return handleError(
        req,
        res,
        "No Collections Record found try connecting again"
      );
    }
  });
})

app.get("/import-db", function(req, res) {
  let dbClient = sourceDb.dbClient;
  getCollectionsList(dbClient)
    .then(collections => {
      if (collections && collections.length > 0) {
        collections.forEach(eachCollection => {
					console.log(eachCollection, "eachCollection");
					 processFileASync.readFile(eachCollection + '.json')
					 .then(collectionResData => {
							collectionResData = JSON.parse(collectionResData);
							writeDataInCollection(destinationDb.dbClient, eachCollection,collectionResData)
							.then(res => {
								
							}).catch(errr => {
								console.log(errr, "errr in writeDataInCollection");
							})
					 }).catch(err => {
						 console.log(err,'err while reading files from directory');
					 });
        });
      }
    })
    .catch(err => {
      return handleError(req, res, err);
    });
});

app.get("/test-reading", function(req,res) {
	processFileASync.readFile('file.json')
	.then(content => {
		console.log(content,'c')
	}).catch(err => {
		console.log(err,'')
	})
});

var server = app.listen(3000, function () {
   var host = server.address().address
   var port = server.address().port
   console.log("Example app listening at http://%s:%s", host, port)
});

function handleError(req,res,msg) {
    return res.status(500).send(msg);
}

function findSeasion(req,sourceDb,destinationDb) {
	let obj = {};
	if(req.session.uuid && req.session.mongoConnection){
			obj.uuid = req.session.uuid;
			obj.mongoConnection = ++req.session.mongoConnection;
	} else {
			obj.uuid = req.session.uuid = uuidv4();
			obj.mongoConnection = req.session.mongoConnection = 1;
	}
	if(sourceDb || req.session.sourceDb) {
			obj.sourceDb = req.session.sourceDb ? req.session.sourceDb : req.session.sourceDb = sourceDb;
	}
	if(destinationDb || req.session.destinationDb) {
			obj.destinationDb = req.session.destinationDb ? req.session.destinationDb : req.session.destinationDb = destinationDb;
	}
	return obj;
}

function findDataInCollection(dbInstance,collectionName) {
	return new Promise((resolve, reject) => {
		var collection = dbInstance.db.collection(collectionName);
		collection.find().toArray(function(err, data) {
			if (err) reject(err);
			resolve(data);
		});
	});
}

function writeDataInCollection(dbClient,collectionName,data) {
	return new Promise((resolve, reject) => {
		var collection = dbClient.db.collection(collectionName);
		console.log(collection,data,'d');
		collection.insertMany(data, { "ordered":false }, function(err, response) {
      if (err) return reject(err);
      resolve(response);
    });
	});
}

function getCollectionsList(client) {
	return new Promise((resolve,reject) => {
		let allCollections = [];
		//create client by providing database name
		client.db.listCollections().toArray(function(err, collections) {
				if(err) reject(err);
				//iterate to each collection detail and push just name in array
				collections.forEach(eachCollectionDetails => {
						allCollections.push(eachCollectionDetails.name);
				});
				//close client
				resolve(allCollections);
		});
	});
}

function connectToMongo(url) {
	return new Promise((resolve, reject) => {
		mongoose.createConnection(url, { useNewUrlParser: true, useUnifiedTopology: true },
      function(err, db) {
        if (err) {
          return reject(err);
        }
        resolve(db);
      }
    );
	});
}

