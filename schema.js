const ipcMain = require('electron').ipcMain;
const path = require('path');
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));

const {app} = require('electron');
const userHomePath = app.getPath('home');
const browserRootPath = path.join(userHomePath, 'OxfordImageBrowser')
var SCHEMA_DIR = path.normalize(path.join(browserRootPath, './schema')+path.sep);

ipcMain.on('SCHEMA_DIR', (event, arg) => {
  console.log("ipc SCHEMA_DIR", SCHEMA_DIR)
  event.returnValue = SCHEMA_DIR;
});


// schema.js
// handles parsing of schema files, into the json format expected by jstree

// main endpoint, arg is the filename of the schema .csv in the schemas subdirectory
ipcMain.on('get_schema', (event, arg) => {
  console.log('get_schema', arg);
  parse_schema(path.normalize(path.join(SCHEMA_DIR, arg))).then(
    (parsedCsv) => {
      console.log("parsed schema:", arg)
      event.sender.send('schema_json', {schema_json:parsedCsv, schema_name: arg})
    }
  );
});

String.prototype.last = Array.prototype.last = function(){
    return this[this.length - 1];
};
var readStream;
function parse_schema(fn) {
  // using sync here since Async has some issues reading small files..
  // old method below is async, but since user need schema to continue we will use sync here.
  var data = fs.readFileSync(fn, 'utf-8')
  var json = {
    text: 'root node',
    children: []
  };
  data += '\r';
  data.split('\n').forEach(line => { 
    // console.log("line:", line)
    if (line.last()!='\r'){
        line += '\r'
    }
    var currPos = json.children;
    if (line.length>0 && /\w/.test(line)) line.split(';').forEach(val => {
      // console.log(currPos)
      var child = currPos.find(e => e.text === val);
      if (child === undefined) {
        if (val.last()=='\r') {
          currPos.push({
            'text': val.slice(0, -1), // remove trailing return
            'a_attr': {
              'class':'is_label',
              'label':line.trim()
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
        currPos = child.children;
      }
    });
  });
  return Promise.resolve(json);
}

/*const es = require('event-stream');
function parse_schema_old(fn) {
  console.log("parse:", fn)
  var lineNr = 0;
  var json = {
    text: 'root node',
    children: []
  };
  return new Promise((resolve,reject) => {
      if (readStream!==undefined) readStream.end();
      readStream = fs.createReadStream(fn,'utf8')
        .pipe(es.split())
        .pipe(es.mapSync(function(line){

          console.log("line:", lineNr, line)
          // pause the readstream
          // readStream.pause();

          lineNr += 1;
          var currPos = json.children;
          if (line.length>0 && /\w/.test(line)) line.split(';').forEach(val => {
            // console.log(currPos)
            console.log(val)
            var child = currPos.find(e => e.text === val);
            if (child === undefined) {
              if (val.last()=='\r') {
                currPos.push({
                  'text': val.slice(0, -1), // remove trailing return
                  'a_attr': {
                    'class':'is_label',
                    'label':line.trim()
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
              currPos = child.children;
            }

          })
        })
        .on('error', function(err){
            console.log('Error while reading file.', err);
        })
        .on('end', function(){
            console.log('Read entire file.')
            resolve(json)
        })

      )
    })
  }
  // return fs.readFileAsync(fn,'utf8').then((data) => {
  //     console.log("hi")
  //     var json = {
  //       text: 'root node',
  //       children: []
  //     };
  //     data += '\r';
  //     data.split('\n').forEach(line => { 
  //       console.log("line:", line)
  //       var currPos = json.children;
  //       if (line.length>0 && /\w/.test(line)) line.split(';').forEach(val => {
  //         // console.log(currPos)
  //         var child = currPos.find(e => e.text === val);
  //         if (child === undefined) {
  //           if (val.last()=='\r') {
  //             currPos.push({
  //               'text': val.slice(0, -1), // remove trailing return
  //               'a_attr': {
  //                 'class':'is_label',
  //                 'label':line.trim()
  //               },
  //               'icon':false
  //             });
  //           } else {
  //             currPos.push({
  //               'text': val,
  //               'children': [],
  //               'a_attr': {
  //                 'class':'is_folder'
  //               }
  //             });
  //           }
  //           currPos = currPos.last().children;
  //         } else {
  //           currPos = child.children;
  //         }
  //       });
  //     });
  //     return json;
  //   });
// }
*/
