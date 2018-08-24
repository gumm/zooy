// rollup.config.js
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';

export default [{
  input: 'main.js',
  output: {
    file: 'dist/_temp.js',
    format: 'iife',
    name: 'zooy',
  },
  plugins: [
    resolve(),
    commonjs()
  ],
  treeshake: true
}];
