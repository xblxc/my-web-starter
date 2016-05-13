var gulp         = require('gulp');
var del          = require('del');
var fs           = require('fs');
var path         = require('path');
var taskname     = require('yargs').argv._[0];
var gulpif       = require('gulp-if');
var uglify       = require('gulp-uglify');
var cleanCss     = require('gulp-clean-css');
var stylus       = require('gulp-stylus');
var plumber      = require('gulp-plumber');
var notify       = require('gulp-notify');
var rev          = require('gulp-rev');
var revCollector = require('gulp-rev-collector');
var imagemin     = require('gulp-image');
var sourcemaps   = require('gulp-sourcemaps');
var rucksack     = require('gulp-rucksack');
var concat       = require('gulp-concat');
var browserSync  = require('browser-sync').create();
var gulpSequence = require('gulp-sequence');
var template     = require('gulp-template');
var fileinclude  = require('gulp-file-include');
var postcss      = require('gulp-postcss');
var spritesmith  = require('gulp.spritesmith');
var cache        = require('gulp-cache');
var merge        = require('merge-stream');

var browserify   = require('browserify');
var gutil        = require('gulp-util');
var tap          = require('gulp-tap');
var buffer       = require('gulp-buffer');

var DEV = taskname != 'deploy'; //是否测试环境

//设置各种输入输出文件夹的位置;
var srcScript = './js/*.js',
    dstScript = './dist/js',
    srcStylus = './stylus/*.styl',
    dstStylus = './dist/css',
    srcWatchStylus = './stylus/**/*.styl',
    srcTmpStylus = './tmp/*.css', //考虑到css中也要进行rev处理，所以需要这个中间态
    dstTmpStylus = './tmp',
    srcImage = './img/**/*.*',
    dstImage = './dist/img',
    srcSprite = './img/sprite/*.*',
    dstSprite = './img/sprite',
    dstSpriteCss = './stylus/common/',
    srcHtml = './pages/*.html',
    srcWatchHtml = './pages/**/*.html',
    srcHtmlDir = './pages',
    dstHtml = './dist',
    srcTmpHtml = './tmp/*.html',
    dstTmpHtml = './dist',
    srcRev = './rev/*.json',
    dstRev = './rev';
var config = {
  root: '/',
  sprite_path: './dist/img/sprite/',
};

//若是测试环境，则执行任务
var ifDev = function(task){
  return gulpif(DEV, task);
};
//rev, 测试环境下，不生成版本号文件，阻止版本号生效
var ifRev = function(){
  return gulpif(!DEV, rev.apply(null, Array.prototype.slice.call(arguments)))
};

gulp.task('clean', function(){
  return del(['./dist', './rev', './tmp', './*.html']);
});

//处理JS文件:压缩;
//命令行使用gulp script启用此任务;
gulp.task('script', function() {
  return (
    gulp.src(srcScript, {read: false})
      .pipe(tap(function (file) {
        gutil.log('bundling ' + file.path);
        file.contents = browserify(file.path, {debug: true}).bundle();
       }))
      .pipe(buffer())
      .pipe(ifDev(sourcemaps.init({loadMaps: true})))
      .pipe(uglify())
      .pipe(ifDev(sourcemaps.write('./')))
      .pipe(ifRev())
      .pipe(gulp.dest(dstScript))
      .pipe(rev.manifest('js.json'))
      .pipe(gulp.dest(dstRev))
  )
});
gulp.task('script:deploy', gulpSequence('init:deploy', 'script'));

var onError = function (err) {
  notify.onError({
    title: "编译出错",
    message: err.message,
    sound: "Beep"
  })(err);
};

//STYLUS文件输出CSS,天生自带压缩特效;
//命令行使用gulp stylus启用此任务;

gulp.task('stylus', function() {
  return (
    gulp.src(srcStylus)
      .pipe(plumber({errorHandler: onError}))
      .pipe(stylus({compress: !DEV}))
      .pipe(rucksack({fallbacks: true})) //一系列postcss处理
      .pipe(postcss([
        require('postcss-triangle'), //三角形
        require('autoprefixer')({ browsers: ['last 2 versions', '> 1%', 'ie 8-11'] }),
        require('postcss-csso')({restructure: false}) //css去重，压缩
       ]))
      .pipe(ifRev())
      .pipe(gulp.dest(DEV ? dstStylus : dstTmpStylus)) //测试时，直接放到dstStylus中
      .pipe(ifDev(browserSync.stream()))
      .pipe(rev.manifest('stylus.json'))
      .pipe(gulp.dest(dstRev))
  )
});

gulp.task('sprite:del', function(){
  return del(path.join(dstSprite, 'sprite.png'));
});
gulp.task('sprite', ['sprite:del'], function() {
  var spriteData = 
    gulp.src(srcSprite)
      .pipe(spritesmith({
        imgName: 'sprite.png',
        imgPath: path.join(config.sprite_path, 'sprite.png'),
        padding: 1,
        cssName: 'sprite.styl',
        cssFormat: 'stylus',
        cssVarMap: function(sprite) {
          sprite.name = 's-' + sprite.name
        }
      }));
  return merge(
    spriteData.img.pipe(gulp.dest(dstSprite)),
    spriteData.css.pipe(gulp.dest(dstSpriteCss))
  );
});

//图片压缩任务,支持JPEG、PNG及GIF文件;
//采用cache机制可以大幅减少压缩时间（只压缩更改的文件）
gulp.task('imgmin', function() {
    return (
      gulp.src(srcImage)
        //.pipe(cache(imagemin()))
        .pipe(ifRev())
        .pipe(gulp.dest(dstImage))
        .pipe(rev.manifest('img.json'))
        .pipe(gulp.dest(dstRev))
    )
});

//清除imgmin产生的中间缓存文件
gulp.task('img:cache:clear', function(done){
  return cache.clearAll(done);
})
gulp.task('img:w', gulpSequence('sprite', 'imgmin', 'stylus'));

gulp.task('html', function(){
  return (
    gulp.src([srcRev, srcHtml])
      .pipe(fileinclude({
        prefix: '@@',
        basepath: '@file', //relative to the src file
        indent: true
      }))
      .pipe(template({
        root: config.root
      }))
      .pipe(gulpif(!DEV, revCollector()))
      .pipe(gulp.dest(dstHtml))
  )
});

//给css中的image加入版本号
gulp.task('rev:img', function() {
  return (
    gulp.src([srcRev, srcTmpStylus])
      .pipe(revCollector())
      .pipe(gulp.dest(dstStylus)) //发布状态下：临界css文件是在这里又被转到了dstStylus
  )
});

gulp.task('rev', gulpSequence(['rev:html', 'rev:img']));

//服务器任务:以当前文件夹为基础,启动服务器;
//命令行使用gulp server启用此任务;
gulp.task('server', function() {
  browserSync.init({
    server: './dist',
    port: 8080,
    ui: {port: 8081},
    open: false,
    reloadOnRestart: true,
  });
});

//监控改动并自动刷新任务;
//命令行使用gulp watch启动;
gulp.task('watch', function() {
  gulp.watch(srcScript, ['script']);
  gulp.watch(srcWatchStylus, ['stylus']);
  gulp.watch(srcImage, ['img:w']);
  gulp.watch(srcWatchHtml, ['html']);
  //gulp.watch(srcRev, ['rev:html', 'rev:img']);
  gulp.watch(['./dist/*.html']).on('change', browserSync.reload);
});

//gulp默认任务(集体走一遍,然后开监控);
gulp.task('default', gulpSequence(
  'clean', 'sprite', ['script', 'stylus', 'imgmin', 'html'], 'server', 'watch'
));
gulp.task('deploy', gulpSequence(
  'sprite', ['script', 'stylus', 'imgmin'], 'html', 'rev:img'
));

