# vite-plugin-zip-plus

一个 Vite 插件，用于将指定的构建输出文件打包为 ZIP 格式。支持 Glob 模式、正则表达式和自定义函数匹配规则，适用于源码过滤、产物筛选等场景。

## 🔧 功能特点

- ✅ 支持将构建产物打包为 ZIP 文件
- ✅ 支持多种匹配方式：**Glob 模式** / **正则表达式** / **自定义函数**
- ✅ 支持构建后文件名匹配和排除（`include` 和 `exclude`）
- ✅ 可配置压缩算法（如 `DEFLATE`)
- ✅ 支持保留原始路径结构
- ✅ 支持清理并重新创建输出目录

## 📦 安装

```bash
npm install vite-plugin-zip-plus --save-dev
```

## 🛠️ 使用方法

```js
// vite.config.js
import { defineConfig } from 'vite'
import zipPlus from 'vite-plugin-zip-plus'

export default defineConfig({
  plugins: [
    zipPlus({
      outputDir: 'dist',          // 输出 ZIP 的存放目录
      zipFileName: 'output.zip',  // ZIP 文件名
      include: '**/*',            // 构建后匹配规则（默认包含所有文件）
      exclude: null,              // 构建后排除规则（默认不排除任何文件）
      compression: 'DEFLATE',     // 压缩算法（可选：STORE/DEFLATE）
      preservePaths: false        // 是否在 ZIP 中保留原始路径
    }),
  ],
})
```

## 📋 配置项说明

| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `outputDir` | string | `'dist'` | ZIP 文件输出目录 |
| `zipFileName` | string | `'output.zip'` | ZIP 文件名 |
| `include` | string \| RegExp \| Function | `'**/*'` | 构建后匹配规则） |
| `exclude` | string \| RegExp \| Function | `null` | 构建后排除规则 |
| `compression` | string | `'DEFLATE'` | 压缩算法（`DEFLATE` 或 `STORE`） |
| `preservePaths` | boolean | `false` | 是否在 ZIP 中保留原始路径 |

> 💡 `include` 和 `exclude` 支持以下格式：
> - `string`: Glob 模式，如 `'src/**/*.ts'`
> - `RegExp`: 正则表达式，如 `/\.js+$/
> - `Function`: 自定义判断函数，如 `(id) => id.includes('main')`

## 🧪 示例用法

### 示例 1：只打包 assets 下的 .js 和 .css 文件
```js
zipPlus({
  include: 'assets/*.{js,css}',
})
```

### 示例 2：排除所有 .map 文件
```js
zipPlus({
  exclude: /\.map$/i,
})
```

### 示例 3：自定义判断函数
```js
zipPlus({
  exclude: (filename) => filename === 'index.html',
})
```

### 示例 4：只打包 src 和 assets 目录下的文件
```js
zipPlus({
  include: '{src,assets}/**/*',
})
```

## ⚠️ 注意事项

- 确保运行环境支持 `fs/promises`（Node.js v14+）
- ZIP 文件生成是异步操作，确保构建流程完成后再检查输出

---


