// rollup.config.js
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default [{
  input: 'src/main.js',
  output: {
    file: 'main.js',
    format: 'es',
    name: 'zooy',
  },
  plugins: [
    resolve(),
    commonjs(),
    // terser({
    //   output: {
    //     comments: false,
    //   },
    // })
  ],
  treeshake: true
}];
