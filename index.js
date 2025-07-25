import fs from 'fs/promises'
import path from 'path'
import pm from 'picomatch'
import JSZip from 'jszip'
import crypto from 'crypto'

const PLUGIN_NAME = 'vite-plugin-zip-plus'

// 匹配函数：支持 Glob / 正则 / 函数
function matches(pattern, value) {
  if (!value) return false
  if (typeof pattern === 'function') return pattern(value)
  if (typeof pattern === 'string' || Array.isArray(pattern)) return pm(pattern, { posix: true })(value)
  if (pattern instanceof RegExp) return pattern.test(value)
  return false
}

function createZipPlugin(options = {}) {
  const finalOptions = {
    outputDir: 'dist', // ZIP 文件输出目录
    zipFileName: 'output.zip', // ZIP 文件名
    include: '**/*', // 默认包含所有文件
    exclude: null, // 默认没有排除规则
    verbose: false, // 是否输出详细日志
    generateOffsetJson: false, // 是否生成 offset.json
    offsetJsonContent: null,   // 自定义 offset.json 内容
    ...options
  }

  return {
    name: PLUGIN_NAME,
    enforce: 'post',
    async closeBundle() {
      await new Promise(resolve => setTimeout(resolve, 1000))
      const startTime = Date.now()
      const rootDir = path.resolve(finalOptions.outputDir)
      const zip = new JSZip()

      if (finalOptions.verbose) {
        console.log(`📦 开始打包 ZIP（基于输出目录：${rootDir}）`)
      }

      // 递归遍历目录并添加到 ZIP
      const addFilesToZip = async (dirPath, zipFolder) => {
        try {
          const files = await fs.readdir(dirPath)
          for (const file of files) {
            const fullPath = path.join(dirPath, file)
            const stat = await fs.stat(fullPath)
            const relativePath = path.relative(rootDir, fullPath)

            // 排除匹配
            if (finalOptions.exclude && matches(finalOptions.exclude, relativePath)) {
              if (finalOptions.verbose) {
                console.log(`❌ 已排除: ${relativePath}`)
              }
              continue
            }

            // 包含匹配
            if (stat.isDirectory()) {
              const subFolder = zipFolder.folder(file)
              await addFilesToZip(fullPath, subFolder)
            } else {
              if (!finalOptions.include || matches(finalOptions.include, relativePath)) {
                const content = await fs.readFile(fullPath)
                zipFolder.file(file, content)
                if (finalOptions.verbose) {
                  console.log(`✅ 已添加: ${relativePath}`)
                }
              }
            }
          }
        } catch (e) {
          if (finalOptions.verbose) {
            console.error(`❌ 遍历目录失败: ${dirPath}`, e)
          }
        }
      }

      await addFilesToZip(rootDir, zip)

      if (finalOptions.generateOffsetJson) {
        const offsetContent = finalOptions.offsetJsonContent || await generateDefaultOffsetJson(rootDir, finalOptions.urlPrefix, finalOptions.zipFileName)
        zip.file('offset.json', JSON.stringify(offsetContent, null, 2))
        
        if (finalOptions.verbose) {
          console.log(`✅ 已添加: offset.json`)
        }
      }

      if (Object.keys(zip.files).length === 0) {
        if (finalOptions.verbose) {
          console.log('❌ 没有匹配到任何文件')
        }
        return
      }

      const zipPath = path.join(finalOptions.outputDir, finalOptions.zipFileName + '.zip')
      const content = await zip.generateAsync({ type: 'nodebuffer' })
      await fs.writeFile(zipPath, content)

      const duration = Date.now() - startTime
      console.log(`✅ 压缩完成: ${zipPath} （耗时 ${duration}ms）`)
    }
  }
}

async function generateDefaultOffsetJson(rootDir, urlPrefix = '', folderName = '') {
  const items = []
  
  const scanFiles = async (dirPath) => {
    try {
      const files = await fs.readdir(dirPath)
      for (const file of files) {
        const fullPath = path.join(dirPath, file)
        const stat = await fs.stat(fullPath)
        const relativePath = path.relative(rootDir, fullPath)
        
        if (stat.isDirectory()) {
          await scanFiles(fullPath)
        } else {
          const ext = path.extname(file).toLowerCase()
          let mimeType = 'application/octet-stream'
          if (ext === '.css') mimeType = 'text/css'
          else if (ext === '.js') mimeType = 'application/javascript'
          else if (ext === '.html') mimeType = 'text/html'
          
          items.push({
            version: 1,
            url: `${urlPrefix}${relativePath}`,
            path: relativePath,
            tag: generateFileHash(fullPath),
            mimeType
          })
        }
      }
    } catch (e) {
      // 忽略错误
    }
  }
  
  await scanFiles(rootDir)
  
  return {
    id: "",
    name: "",
    version: 1,
    folderName,
    items
  }
}

function generateFileHash(filePath) {
  return crypto.createHash('md5').update(filePath + Date.now()).digest('hex')
}

export default createZipPlugin
