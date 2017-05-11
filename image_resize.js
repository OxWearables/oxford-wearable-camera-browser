'use strict';
const Promise       = require('bluebird');
const fs            = Promise.promisifyAll(require('fs'));
const path          = require('path');
const watch         = require('watch');
const jimp          = Promise.promisifyAll(require("jimp"));
const exifParser    = require('exif-parser');
const util          = require('util');

const ipcMain = require('electron').ipcMain;
ipcMain.on('resize_disable', (event, arg) => {
	Image_processor.disabled = true;
});
ipcMain.on('resize_image', (event, arg) => {
  console.log('resize_image', arg);
  imagesModified("added",arg);
});
ipcMain.on('resize_outstanding', (event, arg) => {
  console.log('resize_outstanding', arg);
  resize_outstanding("added",arg);
});
var event_sender = null;
ipcMain.on('resize_status', (event, arg) => {
  console.log('resize_status');
  event_sender = event.sender;
  event.sender.send('resize_status', {queue:Image_processor.queue, busy: Image_processor.busy, disabled: Image_processor.disabled});
});

process.on("unhandledRejection", function(reason, promise) {
    console.log("Possibly Unhandled Rejection", JSON.stringify(reason), JSON.stringify(promise)); 
});

// for resizing
var img_sizes = {
	thumbnail: [100, 87],
	medium: [864,645],
	full: [2592,1936]
};

function initialize() {
	// must be done at start of application 
	return Promise.all([fs.mkdirAsync('./images'),fs.mkdirAsync('./annotation')])
	.catch({code:"EEXIST"}, (e) =>{
		console.log("folder exists:", e.path	);
	})
	.then(()=>{
		console.log("'images' and 'annotation' folders found..");
	}).then(()=>{
		watch.watchTree("./images", {'interval':1}, function (f, curr, prev) {
			if (typeof f == "object" && prev === null && curr === null) {
			  // Finished walking the tree
			} else if (prev === null) {
			  console.log('new file added:', f);
			  imagesModified('added',f);
			} else if (curr.nlink === 0) {
			  console.log('file removed:', f);
			  imagesModified('deleted',f);
			  // f was removed
			} else {
			  console.log('file modified:', f);
			  // f was changed
			}
		});
	}).then(resize_outstanding);
}

function resize_outstanding() {
	var participants = [];
	return Promise.resolve()
	.then( () => {
		return fs.readdirAsync('images').map(
			(p_folder) => {
				var sizes = {};
				console.log("participant folder:", p_folder);

				
				var dir = path.join('images', p_folder);
				var stat = fs.lstatSync(dir);
				if (stat.isDirectory() || stat.isSymbolicLink()) {
					// ensure corresponding annotation directory also exists
					fs.statAsync(path.join('annotation', p_folder)).catch( {code:'ENOENT'}, (e) => {
						console.log("creating annotatioin dir:", path.join('annotation', p_folder));
						fs.mkdir(path.join('annotation', p_folder));
					});
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
								    console.log('no a dir!' + subdir);
								    return fs.unlinkAsync(subdir).then(() => {
								    	return fs.mkdirAsync(subdir);
								    });
								} else {
									// console.log('Does exist');
									return;
								}
							}).catch({code:'ENOENT'}, (e) => {
								// doesn't exist
								console.log('folder not found so creating it: ' + e.path);
								return fs.mkdirAsync(subdir);	
							}).then( () => {
								return fs.readdirAsync(subdir).map((f) => {
									// console.log(f)
									sizes[size].push(f);
								});
							});
				}).then(() => {

					console.log('is dir');
					participants.push({
						name:p_folder,
						dir:dir,
						sizes:sizes
					});
				});
					
				
			}

		}).all();
	}).then(() => {
		console.log('done reading');
		console.log(participants);
	}).then(() => {
		console.log('ensuring all sizes exist');
		var queue = [];
		Promise.each(participants, (p) => {

			console.log(p.name, "has", p.sizes.full.length, "images");
			return Promise.map(p.sizes.full,
			// p.sizes.full.forEach(
				(f) => {
					// console.log(f)
					if (filename_is_image(f)) {
						return process_full(p.name, f, Image_processor.queue);
					}
				}
			);
		}).then( ()=>{
			console.log(Image_processor.queue.length +  " images in resizing queue");
		});
	});
	
}

var Image_processor = {
	queue: [],
	busy:false,
	disabled:false,
	process_next: function() {
		if (Image_processor.disabled) return;
		var queue_item = Image_processor.queue.pop();
		console.log("process_next", queue_item);
		if (event_sender!==null) event_sender.send('resize_status', {queue:Image_processor.queue, busy: Image_processor.busy});
		Image_processor.process_image(queue_item[0],queue_item[1],queue_item[2]);
	},
	process_image: function(size, f, p_name)  {
		Image_processor.busy = true;
		jimp.read(path.join('images', p_name,f))
			.then((img) => {
				// if (err) throw err;
				img.resize(img_sizes[size][0],img_sizes[size][1])
					.write(path.join('images', p_name, size,f));
			}
		).catch((e) =>{
			console.log("error resizing image",f, e);
		}).then(()=>{
			if (Image_processor.queue.length>0) Image_processor.process_next();
			else {
				Image_processor.busy = false;
				console.log('done');
				console.log('all sizes should be created');
			}
		});
	}
};
setInterval(() => {
	if (!Image_processor.busy && !Image_processor.disabled && Image_processor.queue.length>0) {
		Image_processor.process_next();
	}
}, 1000);



function filename_is_image(filename) {
	return filename.toLowerCase().endsWith('.jpg') || filename.toLowerCase().endsWith('.jpeg');
}

function imagesModified(state, f) {
	// triggered by fileWatch
	var rel_f = path.relative('./images', f);
	console.log(state, rel_f);
	var rel_dir = path.dirname(rel_f);
	console.log(rel_dir);
	var p_name = rel_dir.split(path.sep, 1)[0];
	var size = rel_dir.slice(p_name.length+1);
	console.log("participant:", p_name, "rel_dir=",rel_dir);
	if (size=='') {
		if (state='added') {
			// console.log(db.participants[p_name].sizes.full)
			var filename = path.basename(f);
			if (filename_is_image(filename)) {
				process_full(p_name, filename, Image_processor.queue);
			}
		}
	}
}

function date_from_filename(n) {
    return new Date(
        n.slice(17,21), // year
        parseInt(n.slice(21,23))-1 , // month
        n.slice(23,25), // day
        n.slice(26,28), // hour
        n.slice(28,30), // minutes
        n.slice(30,32), // seconds
        n.slice(6,9) // this is the photo's sequence number, used as a tiebreaker millisecond value for photos with the same timestamp 
    ); 
}

// pad string/number with zeros
function pad(str, len) {
	str = "" + str;
	var pad = Array(len+1).join('0')
	return pad.substring(0, pad.length - str.length) + str;
}

function date_to_filename(d) {
    return "AUTO_"+pad(d.getMilliseconds(),4)+"_RENAME_"+pad(d.getFullYear(),4)+
    	pad(d.getMonth(),2)+pad(d.getDay(),2)+"_"+
    	pad(d.getHours(),2)+pad(d.getMinutes(),2)+pad(d.getSeconds(),2)+"A.JPG";
}

// Date without timezone .. since EXIF doesn't support timezone information
// http://stackoverflow.com/questions/2771609/how-to-ignore-users-time-zone-and-force-date-use-specific-time-zone
function date_remove_timezone(date) {
  return new Date(date.getTime() + (new Date().getTimezoneOffset() * 60 * 1000));
};

function process_full(p_name, f, queue) {

	var f_full = path.join('images', p_name, f);
	var f_medium = path.join('images', p_name, 'medium',f);
	var f_thumbnail = path.join('images', p_name, 'thumbnail',f);
	
	return Promise.all([
		fs.lstatAsync(f_full).catch({code:'ENOENT'},()=> {
			console.log("no such file to resize:",f_full);
		}).then((stat)=>{
			if (stat===undefined) {
				throw new Error({code:'FNOTEXIST'})
			}
			else if (!stat.isFile()) {
				console.log("file is dir:", f_full);
				throw new Error({code: "EISDIR"});
			}
			return stat
		}),
		// ensure subfolders exist (for adding images while running)
		fs.mkdirAsync(path.join('images', p_name, 'medium')).catch({code:'EEXIST'}, ()=>{}),
		fs.mkdirAsync(path.join('images', p_name, 'thumbnail')).catch({code:'EEXIST'}, ()=>{})
	]).then((stat)=>{
		stat = stat[0] // Promise.all returns array of promises
		// var filenameChange;
		if (isNaN( date_from_filename(f).getTime())) {
			console.log("filename:", f, "not valid, will be renamed")
			return new Promise(function(resolve, reject) {
				// get date from either EXIF (ideally) or 'last modified' property
				try {
					var parser = exifParser.create(fs.readFileSync(f_full));
					var result = parser.parse();
					var dateTime = date_remove_timezone(new Date(result.tags.DateTimeOriginal*1000));
					if (!isNaN(dateTime.getTime())) {
				    	console.log("found EXIF datetime",dateTime)
						resolve(dateTime)
					} else {
						throw new Error('Invalid EXIF Date')
					}

				} 
				catch (error) {
				    if (stat.mtime && !isNaN(new Date(util.inspect(stat.mtime)).getTime())) {
				    	var dateTime = new Date(util.inspect(stat.mtime))
				    	console.log("dateTime",dateTime)
						resolve(dateTime)
				    } else {
				    	reject("Error no EXIF or date modified for image:", f)
				    }
				} 
			}).then(function(dateTime) {
				// rename file based on date, will then be picked up as new file by fileWatcher
				console.log("dateTime",dateTime)
				var new_filename = date_to_filename(dateTime);
				console.log("new_filename",new_filename)
				var f_full_new = path.join('images', p_name, new_filename);
				f_medium = path.join('images', p_name, 'medium',new_filename);
				f_thumbnail = path.join('images', p_name, 'thumbnail',new_filename);
				return new Promise(function(resolve, reject) {
					fs.rename(f_full, f_full_new, function (err) {
					  if (err) throw err;
					  f_full = f_full_new;
					  console.log('renamed complete', f_full);
					  imagesModified('added',f_full);
					  resolve(new_filename);
					});
				})
			})
		} else {
			// generate resized thumbnails
			Promise.all([
				fs.statAsync(f_medium).catch({code:'ENOENT'}, (err) => {
					if (err!==null && err.code == 'ENOENT') {
						console.log(p_name, 'need to create medium size for:', f);
						queue.push(['medium', f, p_name]);
					}
				}),
				fs.statAsync(f_thumbnail).catch({code:'ENOENT'}, (err) => {
					if (err!==null && err.code == 'ENOENT') {
						console.log(p_name, 'need to create thumbnail size for:', f);
						queue.push(['thumbnail', f, p_name]);

					}
				})
			])
		}
	}).catch({code:'FNOTEXIST'}, () => {
		console.log("skipping file (no longer exists)",p,f)
	}).catch({code:'EISDIR'}, () => {
		console.log("skipping file (is directory)",p,f)
	});
}

exports.resize_outstanding = resize_outstanding;
exports.initialize = initialize;