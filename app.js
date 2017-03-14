'use strict';

var Promise       = require('bluebird');
const fs          = Promise.promisifyAll(require('fs'));
const path        = require('path');
var express       = require('express')
var reload        = require('reload')
var bodyParser    = require("body-parser");
var http          = require('http')
var watch         = require('watch')
// var sharp         = require('sharp')
var jimp = require("jimp");

var app           = express()

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.set('port', 3000);


// handy function
String.prototype.last = Array.prototype.last = function(){
    return this[this.length - 1];
};

// for resizing
var img_sizes = {
	thumbnail: [100, 87],
	medium: [864,645],
	full: [2592,1936]
}
class Db {

	constructor() {
		this.cache = {};
		this.participant = [];
	}
	load() {
		var p_dir = 'images'
		var annotation_dir = 'annotation'
		Promise.all([fs.mkdirAsync(p_dir),fs.mkdirAsync(annotation_dir)])
		.catch({code:"EEXIST"}, (e) =>{
			console.log("folder exists:", e.path	)
		})
		.then(()=>{
			console.log("folder creation done")
		})
		.then( () => {
			return fs.readdirAsync(p_dir).map(
				(p_folder) => {
					var sizes = {}
					console.log("participant folder:", p_folder);

					
					var dir = path.join(p_dir, p_folder)

					if (fs.lstatSync(dir).isDirectory()) {
						// ensure corresponding annotation directory also exists
						fs.statAsync(path.join(annotation_dir, p_folder)).catch( {code:'ENOENT'}, (e) => {
							console.log("creating annotatioin dir:", path.join(annotation_dir, p_folder))
							fs.mkdir(path.join(annotation_dir, p_folder));
						})
						// ensure all size directories exist
						return Promise.each(
							['full', 'medium', 'thumbnail'], 
							(size) => {
								sizes[size] = [];
								var subdir = path.join(dir,size);
								return fs.statAsync(subdir).then( (stats) => {
									if (!stats.isDirectory()) {
										// must be a file
									    console.log('no a dir!' + subdir)
									    return fs.unlinkAsync(subdir).then(() => {
									    	fs.mkdir(subdir);
									    })
									} else {
										// console.log('Does exist');
										return
									}
								}).catch({code:'ENOENT'}, (e) => {
									// doesn't exist
									console.log('folder not found so creating it: ' + e.path);
									fs.mkdir(subdir);	
								}).then( () => {
									return fs.readdirAsync(subdir).map((f) => {
										// console.log(f)
										sizes[size].push(f);
									})
								});
					}).then(() => {

						console.log('is dir')
						this.participant.push({
							name:p_folder,
							dir:dir,
							sizes:sizes
						})
					})
						
					
				}

			}).all()
		}).then(() => {
			console.log('done reading')
			console.log(this.participant)
		}).then(() => {
			console.log('ensuring all sizes exist')
			Promise.each(this.participant, (p) => {

				p.sizes.full.forEach((f) => {


					var f_medium = path.join(p_dir, p.name, 'medium',f)
					// console.log(f_medium)
					fs.stat(f_medium, (err, stat) => {
						if (err!==null && err.code == 'ENOENT') {
							console.log(p.name, 'medium not exist', f);
							// sharp(path.join(p_dir, p.name, 'full',f))
							// 	.resize(img_sizes['medium'][0],img_sizes['medium'][1])
							// 	.toFile(f_medium)

							jimp.read(path.join(p_dir, p.name, 'full',f), function(err,img){
								if (err) throw err;
								img.resize(img_sizes['medium'][0],img_sizes['medium'][1])
									.write(f_medium)
							});
								// .resize(img_sizes['medium'][0],img_sizes['medium'][1])
								// .toFile(f_medium)
						}
					})
					var f_thumbnail = path.join(p_dir, p.name, 'thumbnail',f)
					fs.stat(f_thumbnail, (err, stat) => {
						if (err!==null && err.code == 'ENOENT') {
							console.log(p.name, 'thumbnail not exist', f);
							// sharp(path.join(p_dir, p.name, 'full',f))
							// 	.resize(img_sizes['thumbnail'][0],img_sizes['thumbnail'][1])
							// 	.toFile(f_thumbnail)
							jimp.read(path.join(p_dir, p.name, 'full',f), function(err,img){
								if (err) throw err;
								img.resize(img_sizes['thumbnail'][0],img_sizes['thumbnail'][1])
									.write(f_thumbnail)
							});
						}
					})
				})

			})
			console.log('all sizes should be created')
		})
	}
}

var db = new Db()
db.load();

app.use('/static/', express.static('static'))
app.use('/fonts/', express.static('fonts'))
app.use('/images/', express.static('images'))
app.use('/annotation/', express.static('annotation'))
app.get('/favicon.ico', (req, res) => {
	console.log('favicon', res)
  res.sendFile(__dirname+'/static/favicon.ico')
})
app.get('/', function (req, res) {
	if (db.participant.length>0) {
	  res.send('Hello World!'+db.participant.map( p => '<br><a href="participant/'+p.name+'">'+p.name+' - '+p.sizes.full.length + ' images </a>').reduce((a, b) => a+b));
	} else {
		res.send('Hello World!<br>no participants exist, add images to the images folder to create');
	}
})

app.get('/participant/:pName', function (req, res) {
	var name = req.params.pName;

	var p = db.participant.find(i => i.name===name);

	if (p===undefined) {
		res.send("no user with name: " + name + " - " + p);
	} else {
		// res.send("User: " + name + " - " + p);
		res.sendFile('static/main.html', { root: __dirname });
	}
});

app.post('/participant/:pName/save/', function (req, res) {
	var data = req.body.data; // text to go in the csv
	var schema = req.body.schema; // name of schema in use
	var tmp = req.body.tmp;
	var pName = req.params.pName;
	console.log(tmp, schema,pName)
	var schema_filepath = path.join(__dirname, 'schema',schema)
	fs.statAsync(schema_filepath)
		.catch({code:'ENOENT'}, (e) => {
			console.log('schema does not exist' , schema_filepath)
			throw e;
		}).then(()=>{
			console.log('schema exists ' , schema_filepath)
			var dir = path.join(__dirname, 'annotation', pName);
			return fs.exists(dir)
		}).catch({code:'ENOENT'}, (e) => {
		    console.log('participant',pName,'had no annotation folder so created it: ', dir)
		    return fs.mkdir(dir);
		}).then(() => {
			console.log('annotation dir exists')
			var filename = path.join(__dirname, 'annotation', pName, 'annotation_'+schema);
			// console.log(data)
			return fs.writeFile(filename, data)
		}).catch((e)=>{
			console.log("error writing annotation file: ", e);
			throw e;
		}).then(()=>{
			res.status(200)
			res.send('success')
		});
		
});


// app.use(express.json());
app.post('/participant/:pName/images/', function (req, res) {
	console.log(req.params)
	console.log(req.body)
	console.log(req.body.test)
	console.log( req.query )
	var name = req.params.pName;

	var p = db.participant.find(i => i.name===name);
	if (p===undefined) {
		res.status(400);
		res.send('invalid participant`');
		return
	}

	var start = parseInt(req.body.start);
	var end = parseInt(req.body.end);
	console.log('start',typeof(start),'end', typeof(end), start>end)
	if ( (!start && start!==0) || (!end && end!==0) || start > end) {
		res.status(400);
		res.send(start > end ? 'need start < end' : 'need start and end params' );
		return
	}

	console.log(typeof(p.sizes))
	var requestedData = [];//p.sizes['full'].slice(start, end);
	for(var i=start; i<=end; i++) {
		requestedData[i-start] = p.sizes['full'][i];
		// console.log(i, p.sizes['full'][i])
	}

	
	res.setHeader('Content-Type', 'application/json');
	res.send(JSON.stringify(requestedData));
	
	//  else {
	// }
	// var test = req.param('test', null);
});

app.get('/schema/:schema', function (req, res) {
	var name = req.params.schema;

	parse_schema(path.join('schema', name)).then(parsedCsv => res.json(parsedCsv));
}); 

function parse_schema(fn) {
	return fs.readFileAsync(fn,'utf8').then((data) => {
			var json = {
				text: 'root node',
				children: []
			}
			data.split('\n').forEach(line => {
				var currPos = json.children;
				if (line.length>0) line.split(';').forEach(val => {
					// console.log(currPos)
					var child = currPos.find(e => e.text === val);
					if (child === undefined) {
						if (val.last()=='\r') {
							currPos.push({
								'text': val.slice(0, -1), // remove trailing return
								'a_attr': {
									'class':'is_label'
								},
								'icon':false
							});
						} else {
							currPos.push({
								'text': val,
								'children': [],
								'a_attr': {
									'class':'is_folder'
								}
							});
						}
						currPos = currPos.last().children;
					} else {
						currPos = child.children
					}
				})
			})
			return json;
		})
}

var server = http.createServer(app)

var reloadServer = reload(server, app);
watch.watchTree(__dirname + "/static", {'interval':0.01}, function (f, curr, prev) {
    // Fire server-side reload event
    reloadServer.reload();
});


server.listen(app.get('port'), '127.0.0.1', function(){
  console.log("Web server listening on port " + app.get('port'));
});