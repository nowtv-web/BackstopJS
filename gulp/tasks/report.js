var gulp = require('gulp'),
    spawn = require('child_process').spawn;


gulp.task('report',['start'],function(){
  setTimeout(function(){gulp.run('openReport')},100);
});

gulp.task('junit', function (callback) {
  var thread = spawn('node', [process.cwd() + '/compare/createXunitReport.js'], { cwd: process.cwd() + '/compare'});

  thread.on('exit', callback);
});