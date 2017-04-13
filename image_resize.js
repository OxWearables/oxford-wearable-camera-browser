'use strict';
const Promise       = require('bluebird');
const fs            = Promise.promisifyAll(require('fs'));
const path          = require('path');
const watch         = require('watch')
const jimp          = Promise.promisifyAll(require("jimp"));

const ipcMain = require('electron').ipcMain
ipcMain.on('resize_image', (event, arg) => {
  console.log('resize_image', arg)
  imagesModified("added",arg)
})
ipcMain.on('resize_status', (event, arg) => {
  console.log('resize_status', arg)
  event.sender.send('resize_status', {queue:Image_processor.queue, busy: Image_processor.busy})
})

// for resizing
var img_sizes = {
	thumbnail: [100, 87],
	medium: [864,645],
	full: [2592,1936]
}

function initialize() {
	// must be done at start of application 
	return Promise.all([fs.mkdirAsync('./images'),fs.mkdirAsync('./annotation')])
	.catch({code:"EEXIST"}, (e) =>{
		console.log("folder exists:", e.path	)
	})
	.then(()=>{
		console.log("'images' and 'annotation' folders found..")
	}).then(()=>{
		watch.watchTree("./images", {'interval':1}, function (f, curr, prev) {
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
	}).then(resize_outstanding)
}

function resize_outstanding() {
	var participants = [];
	return Promise.resolve()
	.then( () => {
		return fs.readdirAsync('images').map(
			(p_folder) => {
				var sizes = {}
				console.log("participant folder:", p_folder);

				
				var dir = path.join('images', p_folder)
				var stat = fs.lstatSync(dir);
				if (stat.isDirectory() || stat.isSymbolicLink()) {
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
							if (size=='full') subdir = dir;
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
					participants.push({
						name:p_folder,
						dir:dir,
						sizes:sizes
					})
				})
					
				
			}

		}).all()
	}).then(() => {
		console.log('done reading')
		console.log(participants)
	}).then(() => {
		console.log('ensuring all sizes exist')
		var queue = [];
		Promise.each(participants, (p) => {

			console.log(p.name, "has", p.sizes.full.length, "images")
			return Promise.map(p.sizes.full,
			// p.sizes.full.forEach(
				(f) => {
					// console.log(f)
					if (filename_is_image(f)) {
						return process_full(p.name, f, Image_processor.queue);
					}
				}
			)
		}).then( ()=>{
			console.log(Image_processor.queue.length +  " images in resizing queue")
		})
	})
	
}

var Image_processor = {
	queue: [],
	busy:false,
	process_next: function() {
		var queue_item = Image_processor.queue.pop();
		console.log("process_next", queue_item)
		Image_processor.process_image(queue_item[0],queue_item[1],queue_item[2])
	},
	process_image: function(size, f, p_name)  {
		Image_processor.busy = true;
		jimp.read(path.join('images', p_name,f))
			.then((img) => {
				// if (err) throw err;
				img.resize(img_sizes[size][0],img_sizes[size][1])
					.write(path.join('images', p_name, size,f))
			}
		).catch((e) =>{
			console.log("error resizing image",f, e);
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



function filename_is_image(filename) {
	return filename.toLowerCase().endsWith('.jpg') || filename.toLowerCase().endsWith('.jpeg');
}

function imagesModified(state, f) {
	var rel_f = path.relative(path.join(__dirname,'images'), f);
	console.log(state, rel_f)
	var rel_dir = path.dirname(rel_f);
	console.log(rel_dir)
	var p_name = rel_dir.split(path.sep, 1)[0];
	var size = rel_dir.slice(p_name.length+1);
	console.log("participant:", p_name, "rel_dir=",rel_dir)
	if (size=='') {
		if (state='added') {
			// console.log(db.participants[p_name].sizes.full)
			var filename = path.basename(f);
			if (filename_is_image(filename)) {
				process_full(p_name, filename, Image_processor.queue)
			}
		}
	}
	
	// console.log(path.parse(rel_f))
	// if (rel_f.startsWith(path.join('images')) )
}
function process_full(p_name, f, queue) {
	// var queue = [];
	var f_full = path.join('images', p_name, f)
	var f_medium = path.join('images', p_name, 'medium',f)
	var f_thumbnail = path.join('images', p_name, 'thumbnail',f)
	// console.log(f_medium)
	return fs.lstatAsync(f_full).catch({code:'ENOENT'},()=> {
		console.log("no such file to resize:",f_full)
	}).then((stat)=>{
		if (stat===undefined || !stat.isFile()) {
			console.log("file is dir:", f_full)
			return;
		}
		// console.log("file exists",f_full, "checking if we need resizing..")
		return Promise.all([
			fs.statAsync(f_medium).catch({code:'ENOENT'}, (err) => {
				// .then( (err, stat) => {
				if (err!==null && err.code == 'ENOENT') {
					console.log(p_name, 'need to create medium size for:', f);
					// sharp(path.join('images', p.name, 'full',f))
					// 	.resize(img_sizes['medium'][0],img_sizes['medium'][1])
					// 	.toFile(f_medium)
					queue.push(['medium', f, p_name])
					
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

				}
			})
		])
	})
}

exports.resize_outstanding = resize_outstanding
exports.initialize = initialize