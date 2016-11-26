///// put this file and all dependencies into 
///// web/bundles/{bundle} dir of symfony project
///// for front-end development. Move all front-end 
///// files to src for production and use assets:install



var gulp         = require('gulp'),
	sass         = require('gulp-sass'),
	autoprefixer = require('gulp-autoprefixer'),
	cleanCSS     = require('gulp-clean-css'),
	rename       = require('gulp-rename'),
	browserSync  = require('browser-sync').create(),
	concat       = require('gulp-concat'),
	uglify       = require('gulp-uglify');

gulp.task('browser-sync', ['styles', 'scripts_main', 'scripts_admin'], function() {
		browserSync.init({
				proxy: "localhost:8000",
				notify: false
		});
});

// compile all sass
gulp.task('sass', function () {
	return gulp.src('sass/*.sass')
	.pipe(sass({
		outputStyle: 'expanded',
		includePaths: require('node-bourbon').includePaths
	}).on('error', sass.logError))
	.pipe(rename({suffix: '.min', prefix : ''}))
	.pipe(autoprefixer({browsers: ['last 15 versions'], cascade: false}))
	.pipe(cleanCSS())
	.pipe(gulp.dest('css'))
	.pipe(browserSync.stream());
});


//clear and concat main site libs
gulp.task('css_main', ['sass'],  function () {
	return gulp.src(['css/*/**/*.css', 'css/main.min.css'])
	.pipe(autoprefixer({browsers: ['last 15 versions'], cascade: false}))
	//.pipe(cleanCSS())
	.pipe(concat('main.min.css'))
	.pipe(gulp.dest('css'))
	.pipe(browserSync.stream());
});

//clear and concat admin site libs
gulp.task('css_admin', ['sass'], function () {
	return gulp.src(['libs/ckeditor/contents.css', 'css/admin.min.css', 'libs/bootstrap/css/*.css'])
	.pipe(autoprefixer({browsers: ['last 15 versions'], cascade: false}))
	.pipe(cleanCSS())
	.pipe(concat('admin.min.css'))
	.pipe(gulp.dest('css'))
	.pipe(browserSync.stream());
});

gulp.task('styles', ['sass', 'css_main', 'css_admin']);

gulp.task('scripts_main', function() {
	return gulp.src([
		'libs/modernizr/modernizr.custom.js',
		'libs/jquery/jquery-1.11.2.min.js',
		'libs/*.js',
		'js/custom/main.custom.js'
		])
		.pipe(concat('main.js'))
		// .pipe(uglify()) //Minify libs.js
		.pipe(gulp.dest('js'));
});

gulp.task('scripts_admin', function() {
	return gulp.src([
		'libs/jquery/jquery-1.11.2.min.js',
		'libs/bootstrap/js/bootstrap.min.js',
		'libs/ckeditor/ckeditor.js',
		'js/custom/admin.custom.js'
		])
		.pipe(concat('admin.js'))
		// .pipe(uglify()) //Minify libs.js
		.pipe(gulp.dest('js'));
});

gulp.task('watch', function () {
	gulp.watch(['sass/*.sass', 'libs/**/*.css', 'css/*/**/*.css'], ['styles']);
	gulp.watch(['libs/**/*.js', 'js/custom/*.js'], ['scripts_main', 'scripts_admin']);
	gulp.watch(['js/custom/*.js', 'libs/**/*.js', 'sass/*.sass', 'libs/**/*.css', 'css/*/**/*.css']).on("change", browserSync.reload);
	// gulp.watch('../../../app/Resources/views/**/*.twig').on('change', browserSync.reload);
	// gulp.watch('../../../**/*.php').on('change', browserSync.reload);
});

gulp.task('default', ['browser-sync', 'watch']);