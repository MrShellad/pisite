/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // 【新增】定义自定义动画
      animation: {
        // 名称为 gradient-flow，时长 15 秒，平滑过渡，无限循环
        'gradient-flow': 'gradient-flow 15s ease infinite',
      },
      // 【新增】定义动画关键帧
      keyframes: {
        'gradient-flow': {
          '0%, 100%': { backgroundPosition: '0% 50%' }, // 初始和结束位置
          '50%': { backgroundPosition: '100% 50%' },   // 中间位置（移动到最右侧）
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography'),],
}