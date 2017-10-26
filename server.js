'use strict';

const Promise       = require('bluebird');
const fs            = Promise.promisifyAll(require('fs'));
const path          = require('path');
const express       = require('express')
const reload        = require('reload')
const bodyParser    = require("body-parser");
const http          = require('http')
const watch         = require('watch')
const jimp          = require("jimp");
var app           = express()

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.set('port', 3000);


// handy function
String.prototype.last = Array.prototype.last = function(){
    return this[this.length - 1];
};
Array.prototype.extend = function(array) {
    for (var i = 0, len = array.length; i < len; ++i) {
        this.push(array[i]);
    };    
}

// for resizing
var img_sizes = {
	thumbnail: [100, 87],
	medium: [864,645],
	full: [2592,1936]
}

class Db {

	constructor() {
		// this.cache = {};
		this.participants = [];
	}
	load() {
		Promise.all([fs.mkdirAsync('images'),fs.mkdirAsync('annotation')])
		.catch({code:"EEXIST"}, (e) =>{
			console.log("folder exists:", e.path	)
		})
		.then(()=>{
			console.log("folder creation done")
		})
		.then( () => {
			return fs.readdirAsync('images').map(
				(p_folder) => {
					var sizes = {}
					console.log("participant folder:", p_folder);

					
					var dir = path.join('images', p_folder)

					if (fs.lstatSync(dir).isDirectory()) {
						// ensure corresponding annotation directory also exists
						fs.statAsync(path.join('annotation', p_folder)).catch( {code:'ENOENT'}, (e) => {
							console.log("creating annotatioin dir:", path.join('annotation', p_folder))
							fs.mkdir(path.join('annotation', p_folder));
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
						this.participants.push({
							name:p_folder,
							dir:dir,
							sizes:sizes
						})
					})
						
					
				}

			}).all()
		}).then(() => {
			console.log('done reading')
			console.log(this.participants)
		}).then(() => {
			console.log('ensuring all sizes exist')
			var queue = [];
			Promise.each(this.participants, (p) => {

				console.log("all", p.sizes.full.length)
				return Promise.map(p.sizes.full,
				// p.sizes.full.forEach(
					(f) => {
						// console.log(f)
					return process_full(p.name, f, Image_processor.queue);
					
				})
			}).then( ()=>{
				console.log(Image_processor.queue.length +  " images in resizing queue")
			})
		})
	}
}

var Image_processor = {
	queue: [],
	busy:false,
	process_next: function() {
		var queue_item = Image_processor.queue.pop();
		console.log(queue_item)
		Image_processor.process_image(queue_item[0],queue_item[1],queue_item[2])
	},
	process_image: function(size, f, p_name)  {
		Image_processor.busy = true;
		jimp.read(path.join('images', p_name, 'full',f))
			.then((img) => {
			// if (err) throw err;
			img.resize(img_sizes[size][0],img_sizes[size][1])
				.write(path.join('images', p_name, size,f))
		}).then(()=>{
			if (Image_processor.queue.length>0) Image_processor.process_next();
			else {
				Image_processor.busy = false;
				console.log('done')
				console.log('all sizes should be created')
			}
		})
	}
}
setInterval(() => {
	if (!Image_processor.busy && Image_processor.queue.length>0) {
		Image_processor.process_next()
	}
}, 1000)

watch.watchTree(__dirname + "/images", {'interval':1}, function (f, curr, prev) {
	if (typeof f == "object" && prev === null && curr === null) {
	  // Finished walking the tree
	} else if (prev === null) {
	  console.log('new file added:', f)
	  imagesModified('added',f)
	} else if (curr.nlink === 0) {
	  console.log('file removed:', f)
	  imagesModified('deleted',f)
	  // f was removed
	} else {
	  console.log('file modified:', f)
	  // f was changed
	}
})
function imagesModified(state, f) {
	var rel_f = path.relative(path.join(__dirname,'images'), f);
	console.log(state, rel_f)
	var rel_dir = path.dirname(rel_f);
	console.log(rel_dir)
	if (rel_dir!=='.' && rel_dir.length>0) {
		var p_name = rel_dir.split(path.sep, 1)[0];
		if (p_name in db.participants) {
			console.log("good pariticipant", p_name)
			var size = rel_dir.slice(p_name.length+1);
			if (size=='full') {
				if (state='added') {
					// console.log(db.participants[p_name].sizes.full)
					var filename = path.basename(f);
					db.participants[p_name].sizes.full.push(filename)
					process_full(p_name, filename, Image_processor.queue)
				}
			}
			// console.log(rel_dir)
			// console.log(rel_dir.slice(p_name.length+1))
		}
		else console.log("bad participant name", p_name);
	}
	
	// console.log(path.parse(rel_f))
	// if (rel_f.startsWith(path.join('images')) )
}
function process_full(p_name, f, queue) {
	// var queue = [];
	var f_medium = path.join('images', p_name, 'medium',f)
	var f_thumbnail = path.join('images', p_name, 'thumbnail',f)
	// console.log(f_medium)
	return Promise.all([
	fs.statAsync(f_medium).catch({code:'ENOENT'}, (err) => {
		// .then( (err, stat) => {
		if (err!==null && err.code == 'ENOENT') {
			console.log(p_name, 'need to create medium size for:', f);
			// sharp(path.join('images', p.name, 'full',f))
			// 	.resize(img_sizes['medium'][0],img_sizes['medium'][1])
			// 	.toFile(f_medium)
			queue.push(['medium', f, p_name])
			if (0) jimp.read(path.join('images', p_name, 'full',f), function(err,img){
				if (err) throw err;
				img.resize(img_sizes['medium'][0],img_sizes['medium'][1])
					.write(f_medium)
			});
			
		}
	}),
	fs.statAsync(f_thumbnail).catch({code:'ENOENT'}, (err) => {
		// .then( (err, stat) => {
		if (err!==null && err.code == 'ENOENT') {
			console.log(p_name, 'need to create thumbnail size for:', f);
			// sharp(path.join('images', p_name, 'full',f))
			// 	.resize(img_sizes['thumbnail'][0],img_sizes['thumbnail'][1])
			// 	.toFile(f_thumbnail)
			queue.push(['thumbnail', f, p_name])
			if (0) jimp.read(path.join('images', p_name, 'full',f), function(err,img){
				if (err) throw err;
				img.resize(img_sizes['thumbnail'][0],img_sizes['thumbnail'][1])
					.write(f_thumbnail)
			});
		}
	})
	])
	// return queue;
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
	if (db.participants.length>0) {
	  res.send('<h1>Participant list:</h1><br>'+db.participants.map( p => '<br><a href="participant/'+p.name+'">'+p.name+' - '+p.sizes.full.length + ' images </a>').reduce((a, b) => a+b));
	} else {
		res.send('Hello World!<br>no participants exist, add images to the images folder to create');
	}
})

app.get('/participant/:pName', function (req, res) {
	var name = req.params.pName;

	var p = db.participants.find(i => i.name===name);

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

app.post('/participant/:pName/images/', function (req, res) {
	console.log(req.params)
	console.log(req.body)
	console.log(req.body.test)
	console.log( req.query )
	var name = req.params.pName;

	var p = db.participants.find(i => i.name===name);
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
watch.watchTree(__dirname + "/static", {'interval':0.1}, function (f, curr, prev) {
    // Fire server-side reload event
    reloadServer.reload();
});


server.listen(app.get('port'), '127.0.0.1', function(){
  console.log("Web server listening on port " + app.get('port'));
});

