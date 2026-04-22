import { LinearGradient } from "expo-linear-gradient";
import { type ReactElement, type ReactNode } from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";

import { theme } from "@/lib/theme";

type BrandHeaderGradientProps = {
  style?: StyleProp<ViewStyle>;
  /** `fill` = under navigation header (absolute). `hero` = in-screen hero block with `children`. */
  variant: "fill" | "hero";
  children?: ReactNode;
};

/**
 * Brand green gradient — lighter at top for status-bar / notch contrast, deep green below.
 */
export function BrandHeaderGradient({
  style,
  variant,
  children,
}: BrandHeaderGradientProps): ReactElement {
  const layoutStyle =
    variant === "fill" ? StyleSheet.absoluteFillObject : undefined;
  return (
    <LinearGradient
      colors={[...theme.brandHeaderGradientColors]}
      locations={[...theme.brandHeaderGradientLocations]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={[layoutStyle, style]}
    >
      {children ?? null}
    </LinearGradient>
  );
}

/** Native header `headerBackground` slot — must fill behind transparent header. */
export function OwnerTabHeaderBackground(): ReactElement {
  return <BrandHeaderGradient variant="fill" />;
}
