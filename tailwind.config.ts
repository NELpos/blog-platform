import type { Config } from "tailwindcss";
import { stitchTokens } from "./src/lib/design/tokens.ts";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: stitchTokens.colors.primary,
        neutral: stitchTokens.colors.neutral,
        success: stitchTokens.colors.success,
        warning: stitchTokens.colors.warning,
        error: stitchTokens.colors.error,
        info: stitchTokens.colors.info,
      },
      fontFamily: {
        sans: stitchTokens.typography.fontFamily.sans,
        mono: stitchTokens.typography.fontFamily.mono,
      },
      fontSize: stitchTokens.typography.fontSize,
      fontWeight: stitchTokens.typography.fontWeight,
      lineHeight: stitchTokens.typography.lineHeight,
      spacing: stitchTokens.spacing,
      borderRadius: stitchTokens.borderRadius,
      boxShadow: stitchTokens.shadows,
      transitionDuration: {
        fast: '150ms',
        base: '200ms',
        slow: '300ms',
      },
    },
  },
  plugins: [],
} satisfies Config;
