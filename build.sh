#!/usr/bin/env bash

mkdir dist \
&& npx babel js --out-dir ./dist/js \
&& npx uglifyjs dist/js/styles.js -c -o dist/js/styles.js \
&& cp -r css ./dist/css \
&& cp -r images ./dist/images \
&& cp index.html ./dist/index.html