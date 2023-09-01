import typescript from 'rollup-plugin-typescript2'

export default {
  input: './src/bin/cli.ts',
  output: {
    file: './bin/cli.mjs',
    format: 'esm',
  },
  plugins: [typescript()],
}
