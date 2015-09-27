var gulp = require('gulp'),
fs = require('fs'),
uglify = require("gulp-uglify"),
concat = require("gulp-concat"),
header = require("gulp-header"),
zip = require("gulp-zip"),
runSequence = require('run-sequence');
 
var getVersion = function () {
    info = require("./package.json");
    return info.version;
};
var getCopyright = function () {
    return fs.readFileSync('Copyright');
};

gulp.task('js', function () {
    // Concatenate and Minify JS
    // @todo build jquery.widget update as bower gulp task
    return gulp.src(['./src/jquery.widget.js', './src/jquery.blockrain.src.js', './src/jquery.blockrain.themes.js'])
    .pipe(concat('jquery.blockrain.js'))
    .pipe(header(getCopyright(), {version: getVersion()}))
    .pipe(gulp.dest('./dist'))
    .pipe(uglify({preserveComments:'none'}))
    .pipe(concat('jquery.blockrain.min.js'))
    .pipe(header(getCopyright(), {version: getVersion()}))
    .pipe(gulp.dest('./dist'));
});

gulp.task('css', function () {
    // CSS
    return gulp.src(['./src/blockrain.css'])
    .pipe(gulp.dest('./dist'));
});

gulp.task('readme', function () {
    // Readme
    return gulp.src(['./README.md'])
    .pipe(gulp.dest('./dist'));
});

gulp.task('dist', function () {
    // Create a ZIP File
    return gulp.src(['./dist/jquery.blockrain.js', './dist/jquery.blockrain.min.js', './dist/blockrain.css'])
    .pipe(zip('blockrain.zip'))
    .pipe(gulp.dest('./dist'));
});


gulp.task('build', function(callback){
  runSequence('js', 'css', 'readme', 'dist',
              callback);
});

gulp.task('default', ['build']);
