const ipcMain = require('electron').ipcMain
const path = require('path')
const Promise = require('bluebird')
const fs = Promise.promisifyAll(require('fs'));


// schema.js
// handles parsing of schema files, into the json format expected by jstree

// main endpoint, arg is the filename of the schema .csv in the schemas subdirectory
ipcMain.on('get_schema', (event, arg) => {
  console.log('get_schema', arg)
  parse_schema(path.join('schema', arg)).then(
    parsedCsv => event.sender.send('schema_json', {schema_json:parsedCsv, schema_name: arg})
  );
})

String.prototype.last = Array.prototype.last = function(){
    return this[this.length - 1];
};
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
