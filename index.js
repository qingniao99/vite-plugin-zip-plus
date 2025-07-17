import fs from 'fs/promises'
import path from 'path'
import pm from 'picomatch'
import JSZip from 'jszip'

const PLUGIN_NAME = 'vite-plugin-zip-plus'

// 匹配函数：支持 Glob / 正则 / 函数
function matches(pattern, value) {
  if (!value) return false
  if (typeof pattern === 'function') return pattern(value)
  if (typeof pattern === 'string') return pm(pattern)(value)
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
            if (!finalOptions.include || matches(finalOptions.include, relativePath)) {
              if (stat.isDirectory()) {
                const subFolder = zipFolder.folder(file)
                await addFilesToZip(fullPath, subFolder)
              } else {
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

      if (Object.keys(zip.files).length === 0) {
        if (finalOptions.verbose) {
          console.log('❌ 没有匹配到任何文件')
        }
        return
      }

      const zipPath = path.join(finalOptions.outputDir, finalOptions.zipFileName)
      const content = await zip.generateAsync({ type: 'nodebuffer' })
      await fs.writeFile(zipPath, content)

      const duration = Date.now() - startTime
      console.log(`✅ 压缩完成: ${zipPath} （耗时 ${duration}ms）`)
    }
  }
}

export default createZipPlugin