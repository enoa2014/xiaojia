#!/usr/bin/env node

/**
 * 对比度检查工具
 * 检查设计令牌中颜色组合的对比度是否符合 WCAG 标准
 */

// 颜色组合检查
const colorPairs = [
  // 正文颜色
  { text: '#111827', bg: '#FFFFFF', desc: '主文本 vs 白色背景' },
  { text: '#374151', bg: '#FFFFFF', desc: '次要文本 vs 白色背景' },
  { text: '#FFFFFF', bg: '#16A34A', desc: '白色文本 vs 主色背景' },
  
  // 按钮颜色（更新后）
  { text: '#FFFFFF', bg: '#16A34A', desc: '主按钮文本' },
  { text: '#FFFFFF', bg: '#15803D', desc: '主按钮按下状态' },
  { text: '#FFFFFF', bg: '#15803D', desc: '成功按钮' },
  { text: '#FFFFFF', bg: '#DC2626', desc: '危险按钮' },
  { text: '#FFFFFF', bg: '#D97706', desc: '警告按钮' },
  { text: '#FFFFFF', bg: '#2563EB', desc: '信息按钮' },
  
  // 角色徽章（更新后）
  { text: '#FFFFFF', bg: '#7C3AED', desc: '管理员徽章' },
  { text: '#FFFFFF', bg: '#2563EB', desc: '社工徽章' },
  { text: '#FFFFFF', bg: '#D97706', desc: '志愿者徽章' },
  { text: '#FFFFFF', bg: '#DC2626', desc: '家长徽章' },
  
  // 禁用状态 (使用透明度)
  { text: '#111827', bg: '#F9FAFB', desc: '灰色文本 vs 浅灰背景', opacity: 0.5 },
  
  // 链接和交互元素（更新后）
  { text: '#16A34A', bg: '#FFFFFF', desc: '链接颜色 vs 白色背景' },
  { text: '#DC2626', bg: '#FFFFFF', desc: '错误文本 vs 白色背景' },
  { text: '#15803D', bg: '#FFFFFF', desc: '成功文本 vs 白色背景' },
  { text: '#D97706', bg: '#FFFFFF', desc: '警告文本 vs 白色背景' },
  { text: '#2563EB', bg: '#FFFFFF', desc: '信息文本 vs 白色背景' },
]

/**
 * 将 hex 颜色转换为 RGB
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null
}

/**
 * 计算相对亮度
 */
function getRelativeLuminance(r, g, b) {
  // 将 RGB 值转换为 sRGB
  const rsRGB = r / 255
  const gsRGB = g / 255
  const bsRGB = b / 255
  
  // 应用伽马校正
  const rLinear = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4)
  const gLinear = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4)
  const bLinear = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4)
  
  // 计算相对亮度
  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear
}

/**
 * 计算对比度
 */
function getContrast(color1, color2, opacity1 = 1, opacity2 = 1) {
  const rgb1 = hexToRgb(color1)
  const rgb2 = hexToRgb(color2)
  
  if (!rgb1 || !rgb2) return 0
  
  // 应用透明度（简化计算，假设背景是白色）
  if (opacity1 < 1) {
    rgb1.r = Math.round(rgb1.r * opacity1 + 255 * (1 - opacity1))
    rgb1.g = Math.round(rgb1.g * opacity1 + 255 * (1 - opacity1))
    rgb1.b = Math.round(rgb1.b * opacity1 + 255 * (1 - opacity1))
  }
  
  const lum1 = getRelativeLuminance(rgb1.r, rgb1.g, rgb1.b)
  const lum2 = getRelativeLuminance(rgb2.r, rgb2.g, rgb2.b)
  
  const lighter = Math.max(lum1, lum2)
  const darker = Math.min(lum1, lum2)
  
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * 评估对比度等级
 */
function getContrastLevel(ratio) {
  if (ratio >= 7) return { level: 'AAA', pass: true }
  if (ratio >= 4.5) return { level: 'AA', pass: true }
  if (ratio >= 3) return { level: 'AA Large', pass: 'large-text' }
  return { level: 'Fail', pass: false }
}

/**
 * 主函数
 */
function main() {
  console.log('🔍 开始检查颜色对比度...\n')
  
  const results = []
  let failCount = 0
  
  colorPairs.forEach(pair => {
    const contrast = getContrast(pair.text, pair.bg, pair.opacity)
    const assessment = getContrastLevel(contrast)
    
    const result = {
      ...pair,
      contrast: Math.round(contrast * 100) / 100,
      ...assessment
    }
    
    results.push(result)
    
    const status = result.pass === true ? '✅' : result.pass === 'large-text' ? '⚠️' : '❌'
    const ratio = result.contrast.toFixed(2)
    
    console.log(`${status} ${result.desc}`)
    console.log(`   对比度: ${ratio}:1 (${result.level})`)
    console.log(`   颜色: ${pair.text} on ${pair.bg}${pair.opacity ? ` (opacity: ${pair.opacity})` : ''}`)
    
    if (result.pass === false) {
      failCount++
      console.log(`   🚨 不符合 WCAG AA 标准 (需要 ≥4.5:1)`)
    } else if (result.pass === 'large-text') {
      console.log(`   📝 仅适用于大文本 (≥18pt 或 14pt 粗体)`)
    }
    
    console.log('')
  })
  
  // 总结
  console.log('📊 检查结果汇总:')
  console.log(`   总计: ${results.length} 个颜色组合`)
  console.log(`   通过: ${results.filter(r => r.pass === true).length} 个`)
  console.log(`   仅大文本: ${results.filter(r => r.pass === 'large-text').length} 个`)
  console.log(`   失败: ${failCount} 个`)
  
  if (failCount > 0) {
    console.log('\n🔧 建议修正:')
    results.filter(r => r.pass === false).forEach(r => {
      const needed = 4.5
      const current = r.contrast
      const improvement = Math.ceil((needed / current) * 100) - 100
      console.log(`   ${r.desc}: 需要提升 ${improvement}% 对比度`)
    })
    
    console.log('\n💡 修正方案:')
    console.log('   - 使文本颜色更深或背景颜色更浅')
    console.log('   - 考虑增加边框或阴影来提升视觉层次')
    console.log('   - 对于装饰性元素，可考虑降低重要性')
  } else {
    console.log('\n🎉 所有颜色组合都符合可访问性标准！')
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main()
}

module.exports = { getContrast, getContrastLevel }