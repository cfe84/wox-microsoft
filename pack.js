const AdmZip = require("adm-zip")
const fs = require("fs")
const path = require("path")
const exec = require('child_process').exec;

const packageJson = require("./package.json")

const target = packageJson.woxPack.target
const includes = packageJson.woxPack.include
const pullNodeModules = packageJson.woxPack.pullNodeModules

const isDirectory = (path) => {
  const stat = fs.lstatSync(path)
  return stat.isDirectory()
}

const tmpFolder = "tmp"

function pullNodeModulesAsync() {
  return new Promise((resolve, reject) => {
    console.log(`Installing production dependencies`)
    fs.mkdirSync(tmpFolder, { recursive: true })
    fs.copyFileSync("package.json", path.join(tmpFolder, "package.json"))
    fs.copyFileSync("package-lock.json", path.join(tmpFolder, "package-lock.json"))
    exec(`cd ${tmpFolder} && npm install --production`, (err) => {
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    })
  })
}

function pack(zip) {
  includes.forEach(include => {
    if (isDirectory(include)) {
      zip.addLocalFolder(include, include)
    } else {
      zip.addLocalFile(include)
    }
  })
}

function write(zip) {
  zip.writeZip(target, (err) => {
    if (err) {
      console.error(err)
    }
  })
}

async function run() {
  const zip = new AdmZip()
  if (pullNodeModules) {
    await pullNodeModulesAsync()
    console.log(`Packing dependencies`)
    zip.addLocalFolder(path.join(tmpFolder, "node_modules"), "node_modules")
  }
  console.log(`Packing other files`)
  pack(zip)
  console.log(`Zipping`)
  write(zip)
  console.log(`Done`)
}

run().then()
// const cleanFolder = (folder) => {
//   const files = fs.readdirSync(folder)
//   files.forEach(file => {
//     const fullPath = path.join(folder, file)
//     if (isDirectory(fullPath)) {
//       cleanFolder(fullPath)
//     } else {
//       fs.unlinkSync(fullPath)
//     }
//   })
//   fs.rmdirSync(folder)
// }

// const copyFile = (sourceFile, sourceFolder = "", subFolder = "") => {
//   const relativePath = path.join(subFolder, sourceFile)
//   const source = path.join(sourceFolder, relativePath)
//   const destination = path.join(tmpPath, relativePath)
//   if (isDirectory(source)) {
//     fs.mkdirSync(destination)
//     const files = fs.readdirSync(source)
//     files.forEach(file => copyFile(file, sourceFolder, relativePath))
//   } else {
//     fs.copyFileSync(source, destination)
//   }
// }

// fs.mkdirSync(tmpPath, { recursive: true })

// copyFile("plugin.json")
// copyFile("images")
// zipdir(tmpPath, { saveTo: target }, (err, b) => {
//   console.log("done");
//   cleanFolder(tmpPath)
// })