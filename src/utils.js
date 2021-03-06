'use strict'

const mkdirp = require('mkdirp')
const debug = require('debug')('have-it')
const fs = require('fs')
const path = require('path')
const {concat, difference} = require('ramda')
const la = require('lazy-ass')
const is = require('check-more-types')
const R = require('ramda')

function mkdir (name) {
  return new Promise((resolve, reject) => {
    mkdirp(name, {}, (err) => {
      if (err) {
        console.error(err)
        return reject(err)
      }
      resolve()
    })
  })
}

function saveJSON (filename, json) {
  return new Promise((resolve, reject) => {
    const text = JSON.stringify(json, null, 2) + '\n\n'
    fs.writeFile(filename, text, 'utf8', (err) => {
      if (err) {
        return reject(err)
      }
      resolve()
    })
  })
}

function loadJSON (filename) {
  return new Promise((resolve, reject) => {
    fs.readFile(filename, 'utf8', (err, text) => {
      if (err) {
        return reject(err)
      }
      const json = JSON.parse(text)
      resolve(json)
    })
  })
}

function isProduction () {
  return process.env.NODE_ENV === 'production'
}

const packageFilename = path.join(process.cwd(), 'package.json')

function withVersion (deps) {
  la(is.object(deps), 'expected dependencies object', deps)
  const at = ([name, version]) => `${name}@${version}`
  return R.toPairs(deps).map(at)
}

function toInstall () {
  return loadJSON(packageFilename).then(pkg => {
    const deps = withVersion(pkg.dependencies || {})
    const devDeps = withVersion(pkg.devDependencies || {})
    const selectedDeps = isProduction() ? deps : concat(deps, devDeps)
    debug('found deps to install in package.json')
    debug(selectedDeps)
    return selectedDeps
  })
}

// returns just the list of missing objects
function findMissing (names, found) {
  la(is.array(names), 'wrong names', names)
  la(is.strings(found), 'wrong installed', found)

  // each object in "names" is parsed object
  // {name, version}

  const missingNames = difference(R.pluck('name', names), found)
  return missingNames.map(name => R.find(R.propEq('name', name), names))
}

function saveVersions (list, dev) {
  la(is.array(list), 'missing list to save')

  const key = dev ? 'devDependencies' : 'dependencies'
  return loadJSON(packageFilename).then(pkg => {
    const deps = pkg[key] || {}
    list.forEach(info => {
      deps[info.name] = info.version
    })
    pkg[key] = deps
    return saveJSON(packageFilename, pkg)
  })
}

module.exports = {
  mkdir,
  saveJSON,
  loadJSON,
  isProduction,
  toInstall,
  findMissing,
  saveVersions
}
