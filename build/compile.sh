#!/bin/bash

WORKSPACE=$1
BUILD=$2

echo "${WORKSPACE}"
echo "${BUILD}"
cd ${WORKSPACE}

ES5=(
#  "--assume_function_wrapper"
#  "--output_wrapper=(function(){%output%})();"
  "--language_in=ES6_Strict"
  "--language_out=ES5_Strict"
  "--compilation_level=ADVANCED"
  "--js_output_file=dist/z2_es5.min.js"
  "--dependency_mode=STRICT"
  "--entry_point=dist/_temp.js"
  "dist/_temp.js"
)

ES6=(
#  "--assume_function_wrapper"
#  "--output_wrapper=(function(){%output%})();"
  "--language_in=ES6_Strict"
  "--language_out=ES6_Strict"
  "--compilation_level=ADVANCED"
  "--js_output_file=dist/z2_es6.min.js"
#  "--dependency_mode=STRICT"
  "--entry_point=dist/_temp.js"
  "dist/_temp.js"
)

DEV=(
  "--language_in=ES6_Strict"
  "--language_out=ES6_Strict"
  "--compilation_level=ADVANCED"
#  "--js_output_file=dist/dag-solve.min.js"
#  "--hide_warnings_for=node_modules"
#  "--dependency_mode=STRICT"
  "--entry_point=src/ui/split.js"
#  "node_modules/!(test)**/!(test).js"
  "node_modules/badu/badu.js"
  "node_modules/material-components-web/dist/material-components-web.js"
#  "node_modules/moment/src/moment.js"
  "'src/**.js'"
#  "ui/split.js"
)

if [[ "${BUILD}" == "es5" ]]; then
    BLD=${ES5[*]}
elif [[ "${BUILD}" == "es6" ]]; then
    BLD=${ES6[*]}
else
    BLD=${DEV[*]}
fi

#shopt -s extglob globstar
#set -ex
node_modules/google-closure-compiler-linux/compiler $(echo ${BLD[*]})

#rm dist/_temp.js
echo "Done"
