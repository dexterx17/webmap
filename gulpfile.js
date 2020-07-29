var gulp = require('gulp'),
    sass = require('gulp-sass'),
    concat = require('gulp-concat'), //une varios archjivos en uno
    imagemin = require('gulp-imagemin'), //para optimizar el peso de las imagenes
    imacss = require('gulp-imacss'), // converte imagen a css
    newer = require('gulp-newer'), //para filtrar solo archivos que tuvieron cambios
    htmlclean = require('gulp-htmlclean'), //minifica html
    del = require('del'), //para borrar archivos
    deporder = require('gulp-deporder'), //ordena los scripts
    size = require('gulp-size'), //obtiene el tamaño de los archivos o carpetas
    jshint = require('gulp-jshint'), //validador de js
    pleease = require('gulp-pleeease'), // prefijos css para compatibilidad
    preprocess = require('gulp-preprocess'), //para inyectar variables y condiciones en html
    stripdebug = require('gulp-strip-debug'),
    uglify = require('gulp-uglify'),
    browsersync = require('browser-sync'),
    pkg = require('./package.json'); //para acceder a nuestros valores del package.json

//set NODE_ENV=development
//set NODE_ENV=production
var
    devBuild = true, // TRUE for development, FALSE for production
    source = 'pets/',
    dest = 'pets/build/',
    html = { in: source + '*.html',
        watch: [source + '*.html', source + 'pages/**/*'],
        out: dest,
        context: {
            devBuild: devBuild,
            author: pkg.author,
            version: pkg.version
        }
    },
    imguri = { in: source + 'img/inline/*.*',
        out: source + 'scss/images',
        filename: '_datauri.scss',
        namespace: 'img'
    },
    images = { in: source + 'img/*.*',
        out: dest + 'img/'
    },
    css = { in: source + 'scss/estilos.scss',
        watch: [
            source + 'scss/**/*',
            '!' + imguri.out + imguri.filename
        ],
        out: dest + 'css/',
        sassOpts: {
            outPutStyle: 'nested',
            imagePath: '../images',
            precision: 3,
            errLogToConsole: true
        },
        pleeeaseOpts: {
            autoprefixer: { browsers: ['last 2 versions', '> 2%'] },
            rem: ['16px'],
            pseudoElements: true,
            mqpacker: true,
            minifier: !devBuild
        }
    },
    fonts = { in: source + 'fonts/*.*',
        out: css.out + 'fonts'
    },
    js = { in: source + 'js/**/*',
        out: dest + 'js/',
        filename: 'main.js'
    },
    syncOpts = {
        server: {
            baseDir: dest,
            index: 'index.html'
        },
        open: false,
        notyfy: true
    };

console.log(pkg.name + ' ' +
    pkg.version + ', ' + (devBuild ? 'development' : 'production'));

//Copia las imagenes y las comprime en tamaño
gulp.task('images', async function() {
    gulp.src(images.in)
        .pipe(newer(images.out)) //solo pasa las nuevas
        .pipe(imagemin()) //comprime
        .pipe(gulp.dest(images.out));
});

//elimina los archivos de la carpeta destino
gulp.task('clean', async function() {
    del([
        dest + '*'
    ]);
});

gulp.task('html', function() {
    var page = gulp.src(html.in)
        .pipe(preprocess({ context: html.context })); //inyecta variables en html
    if (!devBuild) {
        page = page
            .pipe(size({ title: 'HTML in' }))
            .pipe(htmlclean()) //minifica el html
            .pipe(size({ title: 'HTML out' }));
    }
    return page.pipe(gulp.dest(html.out));
});

gulp.task('estilos', function() {
    return gulp.src([
            'node_modules/purecss/build/pure.css'
        ])
        .pipe(gulp.dest(css.out));
});

//copiar fuentes
gulp.task('fonts', function() {
    return gulp.src(fonts.in)
        .pipe(newer(fonts.out)) //solo fuentes nuevas que no esten en el destino
        .pipe(gulp.dest(fonts.out));
});

//covertir inline images to dataURIs in SCSS source
gulp.task('imguri', async function() {
    return gulp.src(imguri.in)
        .pipe(imagemin())
        .pipe(imacss(imguri.filename))
        .pipe(gulp.dest(imguri.out));
})

//compila los estilos css y les a;ade los prefijos necesarios para compatibilidad
gulp.task('sass', function() {
    return gulp.src(css.in)
        .pipe(sass(css.sassOpts))
        .pipe(size({ title: 'CSS in' }))
        .pipe(pleease(css.pleeeaseOpts))
        .pipe(size({ title: 'CSS out' }))
        .pipe(gulp.dest(css.out))
        .pipe(browsersync.reload({ stream: true }));
});

//combina los javasript en uno
gulp.task('js', function() {
    if (devBuild) {
        return gulp.src(js.in)
            .pipe(newer(js.out))
            .pipe(jshint())
            .pipe(jshint.reporter('default'))
            .pipe(jshint.reporter('fail'))
            .pipe(gulp.dest(js.out));
    } else {
        del([
            dest + 'js/*'
        ]);
        return gulp.src(js.in)
            .pipe(deporder())
            .pipe(size({ title: 'JS in' }))
            .pipe(concat(js.filename))
            .pipe(stripdebug())
            .pipe(uglify())
            .pipe(size({ title: 'JS out' }))
            .pipe(gulp.dest(js.out));

    }
});

gulp.task('browsersync', function() {
    browsersync(syncOpts);
});
//gulp.watch('pets/scss/**/*.scss', gulp.series(['sass']));



gulp.watch(images.in, gulp.series(['images']));

gulp.watch(html.watch, gulp.series(['html', browsersync.reload]));

gulp.watch(css.watch, gulp.series(['sass']));

gulp.watch(fonts.in, gulp.series(['fonts']));

gulp.watch(js.in, gulp.series(['js', browsersync.reload]));


gulp.task('default', gulp.series(['images', 'html', 'sass', 'fonts', 'js', 'browsersync']));