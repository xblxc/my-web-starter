var gulp                   = require('gulp');
var del                    = require('del');
var uglify                 = require('gulp-uglify');
var cleanCss               = require('gulp-clean-css');
var stylus                 = require('gulp-stylus');
var rev                    = require('gulp-rev');
var revCollector           = require('gulp-rev-collector');
var sourcemaps             = require('gulp-sourcemaps');
var autoprefixer           = require('gulp-autoprefixer');
var concat                 = require('gulp-concat');
var imagemin               = require('gulp-imagemin');
var imageminJpegRecompress = require('imagemin-jpeg-recompress');
var imageminOptipng        = require('imagemin-optipng');
var browserSync            = require('browser-sync').create();
var gulpSequence           = require('gulp-sequence');

//设置各种输入输出文件夹的位置;
var srcScript = './src/js/*.js',
    dstScript = './dist/js',
    srcCss = './src/css/*.css',
    dstCss = './dist/css',
    srcStylus = './src/stylus/*.styl',
    dstStylus = './dist/css',
    srcImage = './src/img/*.*',
    dstImage = './dist/img',
    srcHtml = './src/*.html',
    dstHtml = './',
    srcRev = './rev/*.json',
    dstRev = './rev';

gulp.task('clean', function(){
  return del(['./dist', './rev'])
})

//处理JS文件:压缩;
//命令行使用gulp script启用此任务;
gulp.task('script', function() {
  return (
    gulp.src(srcScript)
      .pipe(sourcemaps.init())
      .pipe(uglify())
      .pipe(sourcemaps.write())
      .pipe(rev())
      .pipe(gulp.dest(dstScript))
      .pipe(rev.manifest('js.json'))
      .pipe(gulp.dest(dstRev))
  )
});

//处理CSS文件:压缩;
//命令行使用gulp css启用此任务;
gulp.task('css', function() {
  return (
    gulp.src(srcCss)
      .pipe(concat('base.css'))
      .pipe(autoprefixer('last 2 versions', '> 1%', 'ie 8', 'Android 2', 'Firefox ESR'))
      .pipe(cleanCss({compatibility:'ie8'}))
      .pipe(rev())
      .pipe(gulp.dest(dstCss))
      .pipe(rev.manifest('css.json'))
      .pipe(gulp.dest(dstRev))
  )
});

//STYLUS文件输出CSS,天生自带压缩特效;
//命令行使用gulp stylus启用此任务;

gulp.task('stylus', function() {
  return (
    gulp.src(srcStylus)
      .pipe(sourcemaps.init())
      .pipe(stylus({compress: true}))
      .pipe(autoprefixer('last 2 versions', '> 1%', 'ie 8', 'Android 2', 'Firefox ESR'))
      .pipe(sourcemaps.write())
      .pipe(rev())
      .pipe(gulp.dest(dstStylus))
      .pipe(rev.manifest('stylus.json'))
      .pipe(gulp.dest(dstRev))
  )
});

//图片压缩任务,支持JPEG、PNG及GIF文件;
//命令行使用gulp jpgmin启用此任务;
gulp.task('imgmin', function() {
  var jpgmin = imageminJpegRecompress({
      accurate: true,//高精度模式
      quality: "high",//图像质量:low, medium, high and veryhigh;
      method: "smallfry",//网格优化:mpe, ssim, ms-ssim and smallfry;
      min: 70,//最低质量
      loops: 0,//循环尝试次数, 默认为6;
      progressive: false,//基线优化
      subsample: "default"//子采样:default, disable;
    }),
    pngmin = imageminOptipng({
      optimizationLevel: 4
    });
    return (
      gulp.src(srcImage)
        .pipe(imagemin({
          use: [jpgmin, pngmin]
        }))
        .pipe(gulp.dest(dstImage))
    )
});

//把所有html页面扔进dist文件夹(不作处理);
//命令行使用gulp html启用此任务;
gulp.task('html', function() {
  return (
    gulp.src(srcHtml)
      .pipe(gulp.dest(dstHtml))
  )
});


//服务器任务:以当前文件夹为基础,启动服务器;
//命令行使用gulp server启用此任务;
gulp.task('server', function() {
  browserSync.init({
    server: "./",
    port: 8080,
    ui: {port: 8081},
    open: false,
    reloadOnRestart: true,
  });
});

//给js, css加入版本号
//命令行使用gulp rev启用此任务;
gulp.task('rev', function() {
  return (
    gulp.src([srcRev, srcHtml])   //- 读取 rev-manifest.json 文件以及需要进行js, css名替换的html文件
      .pipe(revCollector())
      .pipe(gulp.dest(dstHtml))
  )
});

//监控改动并自动刷新任务;
//命令行使用gulp auto启动;
gulp.task('auto', function() {
  gulp.watch(srcScript, ['script']);
  gulp.watch(srcCss, ['css']);
  gulp.watch(srcStylus, ['stylus']);
  gulp.watch(srcImage, ['imgmin']);
  gulp.watch(srcHtml, ['html']);
  gulp.watch(srcRev, ['rev']);
  gulp.watch('./dist/**/*.*').on('change', browserSync.reload);
});

//gulp默认任务(集体走一遍,然后开监控);
gulp.task('default', gulpSequence(
  'clean', ['script', 'css', 'stylus', 'imgmin', 'html', 'server'], 'rev', 'auto'
));
//发布
gulp.task('deploy', gulpSequence(
  'clean', ['script', 'css', 'stylus', 'imgmin', 'html'], 'rev'
));
