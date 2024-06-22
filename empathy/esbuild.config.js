// @ts-check

// https://github.com/evanw/esbuild/issues/69#issuecomment-1302521672

import { config } from 'dotenv'
import esbuild from 'esbuild'

config()

const args = process.argv.slice(2)

const context = await esbuild.context({
  entryPoints: ['index.ts'],
  outfile: 'public/index.js',
  format: 'esm',
  external: ['stream'],
  bundle: true,
  minify: true,
  define: {
    HUME_API_KEY: JSON.stringify(process.env.HUME_API_KEY),
    HUME_SECRET_KEY: JSON.stringify(process.env.HUME_SECRET_KEY)
  }
})

if (args.includes('--watch')) {
  const { host, port } = await context.serve({ servedir: 'public' })
  console.log(`http://${host}:${port}/`)
} else {
  await context.rebuild()
  await context.dispose()
}
