var express = require('express');
var session = require('express-session');
var app = express();
//uuid automatically generate unique strings
const uuidv4 = require('uuid/v4');
const mongo = require('mongodb').MongoClient;
var bodyParser = require('body-parser');
//bodyParser is a node.js middleware for handling JSON, Raw, Text and URL encoded form data.
// configure the app to use bodyParser()
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.use(session({secret: "Shh, its a secret!"}));
var db = null;
var sourceDb = null;
var destinationDb = null;
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

app.post('/connect-to-mongo', function (req, res) {
	if(req.body.sourceDb && req.body.destinationDb) return handleError(req,res,'A db may be source or detination once');
	// let obj = findSeasion(req,null,null);
	// if(req.body.sourceDb && obj.sourceDb) return res.status(200).send('Already Connection Exist');
	// if(req.body.destinationDb && obj.destinationDb) return res.status(200).send('Already Connection Exist');
  connectToMongo(req.body.url).then(dbCon => {
		 if(dbCon)  {
			sourceDb = req.body.sourceDb ? dbCon : null;
			destinationDb = req.body.destinationDb ? dbCon : null;
		 }
		// let newObj = findSeasion(req,sourceDb,destinationDb);
		//  console.log(dbCon,'sourceDb')
  	res.status(200).send('hey')

	 }).catch(err => {
		 console.log(err,'err')
		 if(err) return handleError(req,res,err);
	 })
});

app.get('/getCollections/:dbType', function(req,res) {
	console.log(req.params,'re')
	if(!sourceDb) return handleError(req,res,'which db source or detination');
	let dbType = 'source';
	if(dbType === 'source') {
		console.log(sourceDb,'req.session.sourceDb')
		getCollectionsList(sourceDb,'TRADB')
		.then(response => {
			res.status(200).send(response);
		}).catch(err => {
			return handleError(req,res,err);
		});
	}
	if(dbType === 'destinationDb') {
		getCollectionsList(req.session.destinationDb)
		.then(res => {
			res.status(200).send(res);
		}).catch(err => {
			return handleError(req,res,err);
		});
	}
	res.status(200)
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

function getCollectionsList(client,dbName) {
	return new Promise((resolve,reject) => {
		let allCollections = [];
		//create client by providing database name
		const db = client.db(dbName);
		db.listCollections().toArray(function(err, collections) {
			if(err) reject(err);
			//iterate to each collection detail and push just name in array
			collections.forEach(eachCollectionDetails => {
				allCollections.push(eachCollectionDetails.name);
			});
			//close client
			client.close();
			resolve(allCollections);
		});
	})
}

function connectToMongo(url) {
	return new Promise((resolve, reject) => {
		mongo.connect(url, { 
			useNewUrlParser: true,
			useUnifiedTopology: true 
		}, function(err, db) {
				if (err) {
					return reject(err)
				}
				resolve(db);
		});
	});
}

