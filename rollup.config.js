// rollup.config.js
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from "@rollup/plugin-terser";

export default [{
  input: 'src/main.js',
  output: {
    dir: '.',
    entryFileNames: 'main.js',
    chunkFileNames: 'chunks/[name]-[hash].js',
    format: 'es',
    name: 'zooy',
  },
  plugins: [
    resolve(),
    commonjs(),
    terser({
      output: {
        comments: false,
      },
    })
  ],
  treeshake: true
}];
