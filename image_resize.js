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


const {app} = require('electron');
const userHomePath = app.getPath('home');
const BROWSER_ROOT_DIR = path.join(userHomePath, 'OxfordImageBrowser')
// fs.mkdirSync(browserRootPath, { recursive: true })

// fs.mkdir(browserRootPath)

// fs.existsSync(browserRootPath) || fs.mkdirSync(browserRootPath);


// function ensureDirSync (dirpath) {
//   try {
//     return fs.mkdirSync(dirpath)
//   } catch (err) {
//     if (err.code !== 'EEXIST') throw err
//   }
// }

// exports.resize_outstanding = resize_outstanding;


const default_schema_dir = './schema/'
const IMAGE_DIR = path.normalize(path.join(BROWSER_ROOT_DIR, './images')+path.sep);
const ANNOTATION_DIR = path.normalize(path.join(BROWSER_ROOT_DIR, './annotation')+path.sep);
// var IMAGE_DIR = path.normalize(path.resolve('./images')+path.sep);
// var ANNOTATION_DIR = path.normalize(path.resolve('./annotation')+path.sep);
var RESIZING_ENABLED = false;

const SCHEMA_DIR = path.normalize(path.join(BROWSER_ROOT_DIR, './schema')+path.sep);


if (!fs.existsSync(BROWSER_ROOT_DIR)){
    fs.mkdirSync(BROWSER_ROOT_DIR);
    console.log("**** MADE BROWSER ROOT PATH HERE: ", BROWSER_ROOT_DIR)
}

Promise.all([fs.mkdirAsync(IMAGE_DIR),fs.mkdirAsync(ANNOTATION_DIR), fs.mkdirAsync(SCHEMA_DIR)]).catch({code:"EEXIST"}, (e) =>{ 
		})

if (fs.existsSync(default_schema_dir)){
Promise.all([fs.createReadStream(default_schema_dir + '7-class.csv').pipe(fs.createWriteStream(SCHEMA_DIR + '7-class.csv')),
		fs.createReadStream(default_schema_dir + 'annotation.csv').pipe(fs.createWriteStream(SCHEMA_DIR + 'annotation.csv')),
		fs.createReadStream(default_schema_dir + 'free_text.csv').pipe(fs.createWriteStream(SCHEMA_DIR + 'free_text.csv')),
		fs.createReadStream(default_schema_dir + 'social.csv').pipe(fs.createWriteStream(SCHEMA_DIR + 'social.csv'))]).catch({code:"ENOENT"}, (e) =>{
		})
}
		

// this sends the directory names to the main process
// why do we check for default value? because the main process has a different
ipcMain.on('IMAGE_DIR', (event, arg) => {
	console.log("ipc IMAGE_DIR", IMAGE_DIR)
	event.returnValue = IMAGE_DIR;
});
ipcMain.on('ANNOTATION_DIR', (event, arg) => {
	console.log("ipc ANNOTATION_DIR", ANNOTATION_DIR)
	event.returnValue = ANNOTATION_DIR;
});


// function initialize() {
	// // must be done at start of application 
	// return new Promise((resolve, reject)=>{

	// 	try {
	// 		var data = fs.readFileSync('./file_paths.json')
		
	// 		var file_paths = JSON.parse(data);

	// 		console.log("---file_paths.json found:,", file_paths)

	// 		if ('RESIZING_ENABLED' in file_paths) {
	// 			RESIZING_ENABLED = file_paths['RESIZING_ENABLED']
	// 		}
			// if ('IMAGE_DIR' in file_paths) {
			// 	console.log("setting images directory to ",file_paths['IMAGE_DIR'])
			// 	IMAGE_DIR = path.normalize(path.resolve(file_paths['IMAGE_DIR'])+path.sep)
			// }
			// if ('ANNOTATION_DIR' in file_paths) {
			// 	console.log("setting images directory to ",file_paths['ANNOTATION_DIR'])
			// 	ANNOTATION_DIR = path.normalize(path.resolve(file_paths['ANNOTATION_DIR'])+path.sep)
			// }

			// IMAGE_DIR = path.normalize(path.resolve(path.join(browserRootPath, 'images')))
			// ANNOTATION_DIR = path.normalize(path.resolve(path.join(browserRootPath, 'annotations')))


// fs.createReadStream('./schema/7-class.csv').pipe(fs.createWriteStream(SCHEMA_DIR + '7-class.csv'));
// fs.createReadStream('./schema/annotation.csv').pipe(fs.createWriteStream(SCHEMA_DIR + 'annotation.csv'));


function ensureDirSync (dirpath) {
  try {
    return fs.mkdirSync(dirpath)
  } catch (err) {
    if (err.code !== 'EEXIST') throw err
  }
}
// 			resolve()
// 		} 
// 		catch (e) {
// 			console.log("file_paths.json doesn't exist so using default images & annotations directories");
// 			resolve() 
// 		}
// 	}).then(()=>{
// 		return Promise.all([fs.mkdirAsync(IMAGE_DIR),fs.mkdirAsync(ANNOTATION_DIR), fs.mkdirAsync(SCHEMA_DIR)]).catch({code:"EEXIST"}, (e) =>{ 
// 		})
// 	// }).then(()=>{
// 	// 	return Promise.all([fs.createReadStream(default_schema_dir + '7-class.csv').pipe(fs.createWriteStream(SCHEMA_DIR + '7-class.csv')),
// 	// 	fs.createReadStream(default_schema_dir + 'annotation.csv').pipe(fs.createWriteStream(SCHEMA_DIR + 'annotation.csv')),
// 	// 	fs.createReadStream(default_schema_dir + 'free_text.csv').pipe(fs.createWriteStream(SCHEMA_DIR + 'free_text.csv')),
// 	// 	fs.createReadStream(default_schema_dir + 'social.csv').pipe(fs.createWriteStream(SCHEMA_DIR + 'social.csv'))]).catch({code:"ENOENT"}, (e) =>{
// 	// 	})
// 	}).then(()=>{
// 		console.log("'images' and 'annotation' folders setup..");
// 	}).then(()=>{
// 		watch.watchTree(IMAGE_DIR, {'interval':1}, function (f, curr, prev) {
// 			if (typeof f == "object" && prev === null && curr === null) {
// 			  // Finished walking the tree
// 			} else if (prev === null) {
// 			  console.log('new file added:', f);
// 			  imagesModified('added',f);
// 			} else if (curr.nlink === 0) {
// 			  console.log('file removed:', f);
// 			  imagesModified('deleted',f);
// 			  // f was removed
// 			} else {
// 			  console.log('file modified:', f);
// 			  // f was changed
// 			}
// 		});
// 	}).then(()=>{
		
// 		if (RESIZING_ENABLED===true) {
// 			return resize_outstanding().then(Promise.resolve('resizing outstanding images!'));
// 		} else {
// 			console.log("RESIZING_ENABLED = false so skipping resizing")
// 		}
// 	});
// }

function ensureDirSync (dirpath) {
  try {
    return fs.mkdirSync(dirpath)
  } catch (err) {
    if (err.code !== 'EEXIST') throw err
  }
}

function resize_outstanding() {
	var participants = [];
	return Promise.resolve()
	.then( () => {
		return fs.readdirAsync(IMAGE_DIR).map(
			(p_folder) => {if(p_folder!='.DS_Store'){
				var sizes = {};
				console.log("participant folder:", p_folder);

				
				var dir = path.join(IMAGE_DIR, p_folder);
				console.log("resize folder = ", dir)
				var stat = fs.lstatSync(dir);
				if (stat.isDirectory() || stat.isSymbolicLink()) {
					// ensure corresponding annotation directory also exists
					fs.statAsync(path.join(ANNOTATION_DIR, p_folder)).catch( {code:'ENOENT'}, (e) => {
						console.log("creating annotatioin dir:", path.join('annotation', p_folder));
						fs.mkdir(path.join(ANNOTATION_DIR, p_folder));
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

		}}).all();
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
		jimp.read(path.join(IMAGE_DIR, p_name,f))
			.then((img) => {
				// if (err) throw err;
				img.resize(img_sizes[size][0],img_sizes[size][1])
					.write(path.join(IMAGE_DIR, p_name, size,f));
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

function not_ignored(foldername) {
	return !foldername.toLowerCase().endsWith('.ds_store')
}

function imagesModified(state, f) {
	// triggered by fileWatch
	var rel_f = path.relative(IMAGE_DIR, f);
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
fs.existsAsync = function(path){
  return fs.openAsync(path, "r").then(function(stats){
    return true
  }).catch(function(stats){
    return false
  })
}
function process_full(p_name, f, queue) {

	var f_full = path.join(IMAGE_DIR, p_name, f);
	var f_medium = path.join(IMAGE_DIR, p_name, 'medium',f);
	var f_thumbnail = path.join(IMAGE_DIR, p_name, 'thumbnail',f);
	
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
		fs.mkdirAsync(path.join(IMAGE_DIR, p_name, 'medium')).catch({code:'EEXIST'}, ()=>{}),
		fs.mkdirAsync(path.join(IMAGE_DIR, p_name, 'thumbnail')).catch({code:'EEXIST'}, ()=>{})
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
				// date will not have any millisecond value, so we must use the filename to give a unique name
				var f_number = f.match(/\d/g).join("");
				if (parseInt(f_number, 10)!==NaN) {
					// as long as there is a sequence number in the image name
					// this will also eliminate 99% of naming conflicts
					dateTime.setMilliseconds(Math.abs(parseInt(f_number, 10) % 1000))
				}
				// rename file based on date, will then be picked up as new file by fileWatcher
				console.log("dateTime",dateTime)
				// we may have two images with the same date, in which case we need to find non-conflicting filenames
				var numTries = 0;

				function recursive_rename(dateTime) {
					var new_filename = date_to_filename(dateTime);
					console.log("new_filename",new_filename)
					var f_full_new = path.join(IMAGE_DIR, p_name, new_filename);
					f_medium = path.join(IMAGE_DIR, p_name, 'medium',new_filename);
					f_thumbnail = path.join(IMAGE_DIR, p_name, 'thumbnail',new_filename);
					return new Promise(function(resolve, reject) {
						console.log("attempting rename", f_full_new)
						fs.existsAsync(f_full_new).then((exists)=>{
							if (!exists) {
								fs.rename(f_full, f_full_new, function (err) {
								  if (err) reject(err);
								  f_full = f_full_new;
								  console.log('renamed complete', f_full);
								  imagesModified('added',f_full);
								  resolve(new_filename);
								})
							} else {
								reject({code:'EPERM'});
							}
						})
					}).catch({code:"EPERM"},(e)=>{
						console.log("already have filename",new_filename)
						numTries++;
						if (numTries>50) {
							console.log("tried too many times")
							throw (e)
						}
						dateTime = new Date(dateTime.getTime()+1);
						return recursive_rename(dateTime)
					}).catch((e)=>{
						console.log("uncaught error in rename",e)
					})
				}
				return recursive_rename(dateTime)
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


// destination will be created or overwritten by default.

// fs.copyFile('./schema/7-class.csv', SCHEMA_DIR + '7-class.csv', (err) => {
//   if (err) throw err;
//   console.log('7-class file was copied to schema folder');
// });

// fs.copyFile('./schema/annotation.csv', SCHEMA_DIR + 'annotation.csv', (err) => {
//   if (err) throw err;
//   console.log('annotation file was copied to schema folder');
// });


exports.resize_outstanding = resize_outstanding;
// exports.initialize = initialize;



