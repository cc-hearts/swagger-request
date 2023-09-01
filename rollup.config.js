import typescript from 'rollup-plugin-typescript2'

export default {
  input: './src/bin/fetch.ts',
  output: {
    file: './bin/fetch.mjs',
    format: 'esm',
  },
  plugins: [typescript()],
}
