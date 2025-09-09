#!/usr/bin/env node

/**
 * 构建期令牌注入脚本
 * 将 docs/uiux/design-system/tokens.md 的配置注入到 miniprogram/styles/tokens.wxss
 */

const fs = require('fs')
const path = require('path')

// 配置路径
const TOKENS_MD_PATH = path.join(__dirname, '../docs/uiux/design-system/tokens.md')
const TOKENS_WXSS_PATH = path.join(__dirname, '../miniprogram/styles/tokens.wxss')
const TOKENS_WXSS_BACKUP_PATH = path.join(__dirname, '../miniprogram/styles/tokens.wxss.backup')

/**
 * 从 tokens.md 解析设计令牌
 * @param {string} content - tokens.md 文件内容
 * @returns {Object} 解析后的令牌对象
 */
function parseTokensFromMarkdown(content) {
  const tokens = {}
  
  // 解析颜色令牌
  const colorMatches = content.match(/`--[\w-]+:\s*#[0-9A-Fa-f]{6}`/g)
  if (colorMatches) {
    colorMatches.forEach(match => {
      const [, name, value] = match.match(/`(--[\w-]+):\s*(#[0-9A-Fa-f]{6})`/)
      tokens[name] = value
    })
  }

  // 解析 rgba 颜色令牌
  const rgbaMatches = content.match(/`--[\w-]+:\s*rgba\([^)]+\)`/g)
  if (rgbaMatches) {
    rgbaMatches.forEach(match => {
      const [, name, value] = match.match(/`(--[\w-]+):\s*(rgba\([^)]+\))`/)
      tokens[name] = value
    })
  }

  // 解析尺寸令牌 (rpx)
  const sizeMatches = content.match(/`--[\w-]+:\s*\d+rpx`/g)
  if (sizeMatches) {
    sizeMatches.forEach(match => {
      const [, name, value] = match.match(/`(--[\w-]+):\s*(\d+rpx)`/)
      tokens[name] = value
    })
  }

  // 解析数值令牌 (无单位)
  const numberMatches = content.match(/`--[\w-]+:\s*\d*\.?\d+`(?!rpx|px|%)/g)
  if (numberMatches) {
    numberMatches.forEach(match => {
      const [, name, value] = match.match(/`(--[\w-]+):\s*(\d*\.?\d+)`/)
      tokens[name] = value
    })
  }

  // 解析阴影令牌
  const shadowMatches = content.match(/`--shadow-[\w-]+:\s*[^`]+`/g)
  if (shadowMatches) {
    shadowMatches.forEach(match => {
      const [, name, value] = match.match(/`(--shadow-[\w-]+):\s*([^`]+)`/)
      tokens[name] = value
    })
  }

  // 解析时长令牌
  const durationMatches = content.match(/`--duration-[\w-]+:\s*\d+ms`/g)
  if (durationMatches) {
    durationMatches.forEach(match => {
      const [, name, value] = match.match(/`(--duration-[\w-]+):\s*(\d+ms)`/)
      tokens[name] = value
    })
  }

  // 解析缓动函数令牌
  const easeMatches = content.match(/`--ease-[\w-]+:\s*cubic-bezier\([^)]+\)`/g)
  if (easeMatches) {
    easeMatches.forEach(match => {
      const [, name, value] = match.match(/`(--ease-[\w-]+):\s*(cubic-bezier\([^)]+\))`/)
      tokens[name] = value
    })
  }

  // 解析透明度令牌
  const opacityMatches = content.match(/`--opacity-[\w-]+:\s*0\.\d+`/g)
  if (opacityMatches) {
    opacityMatches.forEach(match => {
      const [, name, value] = match.match(/`(--opacity-[\w-]+):\s*(0\.\d+)`/)
      tokens[name] = value
    })
  }

  return tokens
}

/**
 * 生成 WXSS 文件内容
 * @param {Object} tokens - 令牌对象
 * @returns {string} WXSS 文件内容
 */
function generateWXSS(tokens) {
  const header = `/* Design tokens to satisfy imports and keep UI consistent */
page {
  /* Layout */
  --nav-height: 88rpx;
  --tabbar-height: 120rpx;
  --spacing-md: 24rpx;
  --size-lg: 48rpx;
  --radius-xl: 20rpx;

`

  const tokenLines = []
  
  // 按类别组织令牌
  const categories = {
    'Brand Colors (Primary)': [],
    'Semantic Colors': [],
    'Gray Scale (50-900)': [],
    'Role Colors': [],
    'Background & Text': [],
    'Typography': [],
    'Spacing': [],
    'Radius': [],
    'Shadows': [],
    'Motion': [],
    'Z-Index': [],
    'Opacity': [],
    'Backgrounds': []
  }

  // 将令牌分类
  Object.entries(tokens).forEach(([name, value]) => {
    if (name.includes('primary')) {
      categories['Brand Colors (Primary)'].push(`  ${name}: ${value};`)
    } else if (name.includes('success') || name.includes('warning') || name.includes('danger') || name.includes('info')) {
      categories['Semantic Colors'].push(`  ${name}: ${value};`)
    } else if (name.includes('gray')) {
      categories['Gray Scale (50-900)'].push(`  ${name}: ${value};`)
    } else if (name.includes('role')) {
      categories['Role Colors'].push(`  ${name}: ${value};`)
    } else if (name.includes('bg-') || name.includes('text-')) {
      categories['Background & Text'].push(`  ${name}: ${value};`)
    } else if (name.includes('font') || name.includes('lh-') || name.includes('weight')) {
      categories['Typography'].push(`  ${name}: ${value};`)
    } else if (name.includes('space')) {
      categories['Spacing'].push(`  ${name}: ${value};`)
    } else if (name.includes('radius')) {
      categories['Radius'].push(`  ${name}: ${value};`)
    } else if (name.includes('shadow')) {
      categories['Shadows'].push(`  ${name}: ${value};`)
    } else if (name.includes('duration') || name.includes('ease')) {
      categories['Motion'].push(`  ${name}: ${value};`)
    } else if (name.includes('-z') || name === '--z-nav' || name === '--z-drawer' || name === '--z-toast') {
      categories['Z-Index'].push(`  ${name}: ${value};`)
    } else if (name.includes('opacity')) {
      categories['Opacity'].push(`  ${name}: ${value};`)
    } else {
      categories['Backgrounds'].push(`  ${name}: ${value};`)
    }
  })

  // 生成分类的令牌
  Object.entries(categories).forEach(([category, tokens]) => {
    if (tokens.length > 0) {
      tokenLines.push(`  /* ${category} */`)
      tokenLines.push(...tokens)
      tokenLines.push('')
    }
  })

  // 添加遗留令牌以保持向后兼容性
  const legacyTokens = `  /* Legacy gray tokens for backward compatibility */
  --color-gray-100: #F3F4F6;
  --color-gray-700: #374151;
  --color-gray-900: #111827;

  /* Legacy typography tokens for backward compatibility */
  --font-xl: 28rpx;
  --font-2xl: 32rpx;
  --font-bold: 700;

  /* Legacy transition for backward compatibility */
  --transition-base: all 200ms ease-out;

  /* Backgrounds */
  --gradient-primary: linear-gradient(135deg, #22C55E 0%, #16A34A 100%);
  --gradient-page: #F6F8FA;`

  return header + tokenLines.join('\n') + legacyTokens + '\n}\n\n'
}

/**
 * 主函数
 */
function main() {
  try {
    console.log('🚀 开始构建令牌注入...')

    // 检查输入文件是否存在
    if (!fs.existsSync(TOKENS_MD_PATH)) {
      throw new Error(`令牌定义文件不存在: ${TOKENS_MD_PATH}`)
    }

    // 备份原文件
    if (fs.existsSync(TOKENS_WXSS_PATH)) {
      fs.copyFileSync(TOKENS_WXSS_PATH, TOKENS_WXSS_BACKUP_PATH)
      console.log(`✅ 已备份原文件到: ${TOKENS_WXSS_BACKUP_PATH}`)
    }

    // 读取并解析 tokens.md
    const tokensContent = fs.readFileSync(TOKENS_MD_PATH, 'utf-8')
    const tokens = parseTokensFromMarkdown(tokensContent)
    
    console.log(`📊 解析到 ${Object.keys(tokens).length} 个令牌`)

    // 验证解析结果
    if (Object.keys(tokens).length < 10) {
      throw new Error(`解析到的令牌数量过少 (${Object.keys(tokens).length})，可能 tokens.md 格式有问题`)
    }

    // 检查关键令牌是否存在
    const requiredTokens = ['--color-primary-600', '--text-primary', '--bg-primary', '--space-1']
    const missingTokens = requiredTokens.filter(token => !tokens[token])
    if (missingTokens.length > 0) {
      throw new Error(`缺少关键令牌: ${missingTokens.join(', ')}`)
    }

    // 生成 WXSS 内容
    const wxssContent = generateWXSS(tokens)

    // 写入文件
    fs.writeFileSync(TOKENS_WXSS_PATH, wxssContent)
    
    console.log(`✅ 成功生成: ${TOKENS_WXSS_PATH}`)
    console.log('🎉 令牌注入完成！')

  } catch (error) {
    console.error('❌ 构建失败:', error.message)
    
    // 恢复备份文件
    if (fs.existsSync(TOKENS_WXSS_BACKUP_PATH)) {
      fs.copyFileSync(TOKENS_WXSS_BACKUP_PATH, TOKENS_WXSS_PATH)
      console.log('🔄 已恢复备份文件')
    }
    
    process.exit(1)
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main()
}

module.exports = { parseTokensFromMarkdown, generateWXSS }