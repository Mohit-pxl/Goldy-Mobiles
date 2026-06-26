import colors from "@/config/colors";
import { useTheme } from "@/context/ThemeContext";

/**
 * Returns the design tokens for the current color scheme.
 *
 * The returned object contains all color tokens for the active palette
 * plus scheme-independent values like `radius`.
 */
export function useColors() {
  const { theme } = useTheme();
  const palette = theme === "dark" && "dark" in colors
    ? (colors as unknown as Record<string, typeof colors.light>).dark
    : colors.light;

  return { ...palette, radius: colors.radius };
}
