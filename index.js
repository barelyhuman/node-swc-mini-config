#!/usr/bin/env node
const defu = require('defu').default
const sade = require('sade')
const fs = require('node:fs')
const path = require('node:path')
const glob = require('tiny-glob')
const pkg = require(path.join(__dirname, 'package.json'))

const prog = sade('swc-mini', true)
prog.version(pkg.version)

prog
  .option('root', 'root swcrc config to read', '.swcrc')
  .action(async options => {
    const rootConfigPath = path.resolve(options.root)

    const rootConfig = JSON.parse(
      await fs.promises.readFile(rootConfigPath, 'utf8')
    )
    const rootConfigBaseUrl =
      rootConfig.jsc.baseUrl ?? path.relative(process.cwd(), '.')

    rootConfig.jsc ||= {}
    rootConfig.jsc.baseUrl = rootConfigBaseUrl

    const nestedFiles = await glob('**/.swcrc.mini.json', {
      filesOnly: true,
      dot: true,
      absolute: true,
      cwd: '.',
    })

    for (const file of nestedFiles) {
      const nestedConfigPath = path.join(file)
      const outConfigPath = path.join(file.replace('.mini.json', ''))
      const nested = JSON.parse(
        await fs.promises.readFile(nestedConfigPath, 'utf8')
      )

      const mergedConfig = defu(
        nested,
        {
          jsc: {
            baseUrl: path.relative(
              nestedConfigPath,
              path.relative(rootConfigBaseUrl, path.dirname(rootConfigBaseUrl))
            ),
          },
        },
        rootConfig
      )

      delete mergedConfig.extends

      await fs.promises.writeFile(
        outConfigPath,
        JSON.stringify(mergedConfig, null, 2),
        'utf8'
      )
    }
  })

prog.parse(process.argv)
