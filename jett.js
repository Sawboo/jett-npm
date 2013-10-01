#!/usr/bin/env node

var app = require('commander');
var terminal = require('color-terminal');
var download = require('github-download');
var fs = require('fs');
var util = require('util');
var http = require('http');
var net = require('net');
var stylus = require('stylus');
var nib = require('nib');
var tinylr = require('tiny-lr');


var livereload = false;
app.version('0.1.1');

app.command('create <app_name>').description("Create a new Jet app").action(function(app_name) {
    terminal.colorize("\n%W%0%UCreating " + app_name + "%n\n");
    terminal.write("    Downloading Repo ... ");
    download({user: 'Sawboo', repo: 'Jett'}, process.cwd() + "/." + app_name)
        .on('error', function(err){
            terminal.color("red").write(err).reset().write("\n\n");
            process.kill();
        })
        .on('end', function(){
            fs.renameSync(process.cwd() + "/." + app_name,  process.cwd() + "/" + app_name);
            deleteFolder(process.cwd() + "/." + app_name);
            terminal.color("green").write("OK!").reset().write("\n\n");
        });
});

app.command('watch').description("Watch the current path and recompile CSS on changes").action(function(){
	var rootPath = getRootPath();
	cssPath = rootPath + "css/";
	terminal.colorize("\n%W%0%UWatching App%n\n\n");
	compileStylus(cssPath);
	startLiveReload(cssPath);
	fs.watch(rootPath, function(e, filename) {
		var ext = filename.substr(-4);
		if (livereload && ext !== ".git") {
			http.get("http://localhost:35729/changed?files=" + filename);
		}
	});

	if (fs.existsSync(cssPath + "styl")) {
		var stylFilesArr = fs.readdirSync(cssPath + "styl");
		for (var i = 0; i < stylFilesArr.length; i++) {
			if (fs.statSync(cssPath + "styl/" + stylFilesArr[i]).isDirectory() && stylFilesArr[i].substr(-4, 1) !== ".") {
				fs.watch(cssPath + "styl/" + stylFilesArr[i], function(e, filename){
					if (filename && filename.substr(-5) === ".styl") {
						compileStylus(cssPath);
					}
				});
			}
		}
		fs.watch(cssPath + "styl", function(e, filename){
			if (filename && filename.substr(-5) === ".styl") {
				compileStylus(cssPath);
			}
		});
	}
});

app.parse(process.argv);


//Helper Functions

//Function by timoxley on https://gist.github.com/timoxley/1689041
function isPortTaken (PORT, callback) {
  var tester = net.createServer();
  tester.once('error', function (err) {
    if (err.code == 'EADDRINUSE') {
      callback(null, true);
    } else {
      callback(err);
    }
  });
  tester.once('listening', function() {
    tester.once('close', function() {
      callback(null, false);
    });
    tester.close();
  });
  tester.listen(PORT);
}

function startLiveReload() {
	isPortTaken(35729, function (err, taken) {
		if (!err && !taken) {
			tinylr().listen(35729, function(){
				livereload = true;
				terminal.color("green").write("    Live Reload is on and listening !").reset().write("\n");
			});
			//var server = liveReload.createServer({ port: 35729, exts: ['css', 'html']});
			//server.watch(cssPath.substr(0, cssPath.length-4));
		} else if (!err && taken) {
			terminal.color("red").write("    The livereload port seems to be in use by another app, so live-reload will be turned off").reset().write("\n\n");
		} else {
			terminal.color("red").write(err).reset().write("\n\n");
			process.kill();
		}
	});
}

function getRootPath () {
	var rootPath = process.cwd();
	if (fs.existsSync(rootPath + "/styl")) {
		rootPath = rootPath.substr(0, rootPath.length - 3);
	} else if (fs.existsSync(rootPath + "/css/styl")) {
		rootPath += "/";
	} else {
		terminal.color("red").write("This doesn't appear to be a Jet Project").reset().write("\n\n");
		process.kill();
	}
	return rootPath;
}

function compileStylus (cssPath) {
	var stylFile = "";
	if (fs.existsSync(cssPath + "styl/style.styl")) {
		stylFile = cssPath + "styl/style.styl";
	} else {
		//No STYL style file
		return;
	}
	if (livereload) {
		terminal.write("\n");
	}
	terminal.write("    Compiling Stylus ... ");
	var styleFile = fs.readFileSync(stylFile);
	try {
		styleFile = stylus(styleFile.toString()).set('paths', [cssPath + "styl"]).set('compress', true).use(nib()).render();
		terminal.color("green").write("OK!").reset().write("\n");

		terminal.write("    Saving Compiled Stylus... ");
		fs.writeFileSync(cssPath + "styl/style.css", styleFile);
		terminal.color("green").write("OK!").reset().write("\n\n");
		if (livereload) {
			http.get("http://localhost:35729/changed?files=" + cssPath + "styl/style.css");
		}

	} catch (e) {
		terminal.color("red").write("Error!").reset().write("\n\n");
	}
}

//Function Thanks to geedew on SO

function deleteFolder(path) {
    var files = [];
    if( fs.existsSync(path) ) {
        files = fs.readdirSync(path);
        files.forEach(function(file,index){
            var curPath = path + "/" + file;
            if(fs.statSync(curPath).isDirectory()) { // recurse
                deleteFolder(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
}
