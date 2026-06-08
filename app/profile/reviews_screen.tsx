import { reviewsApi, type ApiError, type Review } from "@/api";
import { ScreenHeader, StarRating } from "@/components/ui";
import { isRTL } from "@/constants/i18n";
import { Colors, Radius } from "@/constants/theme";
import { useAppFont } from "@/hooks/useAppFont";
import { fontSize, scale, spacing, verticalScale } from "@/utils/responsive";
import { useNavGuard } from "@/hooks/useNavGuard";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ReviewsScreen() {
  const router = useNavGuard();
  const { t, i18n } = useTranslation();
  const font = useAppFont();
  const rtl = isRTL(i18n.language);

  const [reviewsList, setReviewsList] = useState<Review[]>([]);
  const [totalReviews, setTotalReviews] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [summary, list] = await Promise.all([
          reviewsApi.summary(),
          reviewsApi.list({ page: 1, limit: 50 }),
        ]);
        if (cancelled) return;
        setTotalReviews(summary?.totalReviews ?? 0);
        setReviewsList(list);
      } catch (err) {
        console.warn("Reviews fetch failed:", (err as ApiError)?.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ScreenHeader
        title={t("reviews.title")}
        onBack={() => router.back()}
        showLanguage={false}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <Text
          style={[
            styles.reviewsCount,
            {
              fontFamily: font.semibold,
              textAlign: rtl ? "right" : "left",
            },
          ]}
        >
          {t("reviews.reviewsCount", {
            count: totalReviews,
          })}
        </Text>

        {/* Review Cards */}
        <View style={styles.reviewsList}>
          {reviewsList.map((review) => (
            <View
              key={review.id}
              style={[
                styles.reviewCard,
                { flexDirection: rtl ? "row-reverse" : "row" },
              ]}
            >
              <Text
                style={[
                  styles.reviewText,
                  {
                    fontFamily: font.regular,
                    textAlign: rtl ? "right" : "left",
                  },
                ]}
              >
                {review.comment ?? ""}
              </Text>
              <View
                style={[
                  styles.reviewRating,
                  { flexDirection: rtl ? "row-reverse" : "row" },
                ]}
              >
                <StarRating rating={1} maxStars={1} size={scale(18)} />
                <Text
                  style={[styles.reviewRatingText, { fontFamily: font.bold }]}
                >
                  {Number(review.rating).toFixed(1)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: spacing.md, paddingBottom: spacing.xxl },
  tabs: { marginBottom: spacing.lg },

  reviewCountText: {
    fontSize: fontSize.sm,
    color: Colors.textSecondary,
    alignSelf: "flex-start",
    marginTop: verticalScale(4),
  },
  rowDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: spacing.md,
  },

  // user top
  reviewsCount: {
    fontSize: fontSize.md,
    color: Colors.textSecondary,
    marginBottom: spacing.md,
  },
  reviewsList: { gap: spacing.md },
  reviewCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: spacing.md,
    paddingVertical: spacing.md + scale(5),
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: Colors.inputBg,
  },
  reviewText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: Colors.textSecondary,
    lineHeight: verticalScale(20),
  },
  reviewRating: { alignItems: "center", gap: scale(4), flexShrink: 0 },
  reviewRatingText: { fontSize: fontSize.md, color: Colors.textPrimary },
});
