import { Colors } from "@/constants/theme";
import { useAppFont } from "@/hooks/useAppFont";
import { fontSize, moderateScale, scale, spacing } from "@/utils/responsive";
import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";

interface StepIndicatorProps {
  totalSteps: number;
  currentStep: number;
  style?: ViewStyle;
}

export function StepIndicator({
  totalSteps,
  currentStep,
  style,
}: StepIndicatorProps) {
  const font = useAppFont();

  return (
    <View style={[styles.container, style, { flexDirection: font.rtl ? "row-reverse" : "row" }]}>
      {Array.from({ length: totalSteps }, (_, i) => {
        const stepNum = i + 1;
        const isCompleted = stepNum < currentStep;
        const isActive = stepNum === currentStep;
        const isLast = stepNum === totalSteps;

        return (
          <React.Fragment key={stepNum}>
            <View
              style={[
                styles.circle,
                isCompleted && styles.circleCompleted,
                isActive && styles.circleActive,
              ]}
            >
              {isActive ? (
                <View style={styles.circleInner}>
                  <Text
                    style={[
                      styles.stepNumActive,
                      { fontFamily: font.semibold },
                    ]}
                  >
                    {stepNum}
                  </Text>
                </View>
              ) : isCompleted ? (
                <Text style={[styles.checkmark, { fontFamily: font.bold }]}>
                  ✓
                </Text>
              ) : (
                <Text style={[styles.stepNum, { fontFamily: font.semibold }]}>
                  {stepNum}
                </Text>
              )}
            </View>
            {!isLast && (
              <View
                style={[styles.line, isCompleted && styles.lineCompleted]}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
  },
  circle: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.card,
    marginHorizontal: scale(4),
  },
  circleActive: {
    borderColor: Colors.primary,
    borderWidth: 1,
    shadowColor: Colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: moderateScale(6),
    elevation: 4,
  },
  circleInner: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  circleCompleted: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  stepNum: {
    color: Colors.textSecondary,
    fontSize: fontSize.md,
  },
  checkmark: {
    color: "#fff",
    fontSize: fontSize.lg,
  },
  stepNumActive: {
    color: "#fff",
    fontSize: fontSize.md,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.primary,
  },
  lineCompleted: {
    backgroundColor: Colors.primary,
  },
});
