/*=============================================
=            Gulp Starter by @dope            =
=============================================*/

/**
*
* The packages we are using
* Not using gulp-load-plugins as it is nice to see whats here.
*
**/
var gulp         = require('gulp');
var path         = require('path');
var sass         = require('gulp-sass');
var browserSync  = require('browser-sync');
var prefix       = require('gulp-autoprefixer');
var concat       = require('gulp-concat');
var minifyCss    = require('gulp-minify-css');
var plumber      = require('gulp-plumber');
var uglify       = require('gulp-uglify');
var rename       = require("gulp-rename");
var imagemin     = require("gulp-imagemin");
var pngquant     = require('imagemin-pngquant');
var rev          = require('gulp-rev-append');

var config = {
  src: 'src/',
  dest: './',
};
var s = function(file_path){
  return path.join(config.src, file_path);
};
var d = function(file_path){
  return path.join(config.dest, file_path);
};
/**
*  concat common css, 
*/
gulp.task('css', function(){
  gulp.src([s('css/normalize.css'), s('css/main.css')])
  .pipe(concat('common.css'))
  .pipe(minifyCss())
  .pipe(gulp.dest(d('css')));
});
/**
*
* Styles
* - Compile
* - Compress/Minify
* - Catch errors (gulp-plumber)
* - Autoprefixer
*
**/
gulp.task('sass', function() {
  gulp.src(s('sass/**/*.sass'))
  .pipe(sass({outputStyle: 'compressed'}))
  .pipe(prefix('last 2 versions', '> 1%', 'ie 8', 'Android 2', 'Firefox ESR'))
  .pipe(plumber())
  .pipe(gulp.dest(d('css')));
});

/**
*
* BrowserSync.io
* - Watch CSS, JS & HTML for changes
* - View project at: localhost:3000
*
**/
gulp.task('browser-sync', function() {
  browserSync.init([s('css/*.css'), s('js/**/*.js'), s('index.html')], {
    server: {
      baseDir: './'
    },
    port: 8080
  });
});


/**
*
* Javascript
* - Uglify
*
**/
gulp.task('scripts', function() {
  gulp.src(s('js/*.js'))
  .pipe(uglify())
  .pipe(rename({
    // dirname: "min",
    suffix: ".min",
  }))
  .pipe(gulp.dest(d('js')));
});

/**
*
* Images
* - Compress them!
*
**/
gulp.task('images', function () {
  return gulp.src(s('images/*'))
  .pipe(imagemin({
    progressive: true,
    svgoPlugins: [{removeViewBox: false}],
    use: [pngquant()]
  }))
  .pipe(gulp.dest(d('images')));
});


/**
*
* Default task
* - Runs sass, browser-sync, scripts and image tasks
* - Watchs for file changes for images, scripts and sass/css
*
**/
gulp.task('default', ['css', 'sass', 'browser-sync', 'scripts', 'images'], function () {
  gulp.watch(s('sass/**/*.sass'), ['sass']);
  gulp.watch(s('js/**/*.js'), ['scripts']);
  gulp.watch(s('images/*'), ['images']);
  gulp.watch(s('css/*.css'), ['css']);
});

gulp.task('rev', function() {
  gulp.src('./index.html')
    .pipe(rev())
    .pipe(gulp.dest('.'));
});
