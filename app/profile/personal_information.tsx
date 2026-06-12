import type { ApiError } from "@/api";
import { authApi } from "@/api/auth";
import { useAuth } from "@/context";
import { useAppFont } from "@/hooks/useAppFont";
import { useAvatarUpload } from "@/hooks/useAvatarUpload";
import { Ionicons } from "@expo/vector-icons";
import { useNavGuard } from "@/hooks/useNavGuard";
import { useDialog } from "@/components/ui/AppDialog";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  I18nManager,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function PersonalInformationScreen() {
  const router = useNavGuard();
  const dialog = useDialog();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const font = useAppFont();

  const { driver, updateProfile, logout } = useAuth();
  const { pickAndUploadAvatar, uploading: avatarUploading } = useAvatarUpload();

  // Vehicle is admin-managed (no driver-side edit endpoint) — show it read-only.
  // vehicleType is one of bike|motor|scooter|car; map to a localized label.
  const vehicleTypeLabel = driver?.vehicleType
    ? t(`personalInfo.vehicleType.${driver.vehicleType}`, {
        defaultValue: driver.vehicleType,
      })
    : t("personalInfo.notSet", { defaultValue: "Not set" });

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nickname, setNickname] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Unmount guard: handleDeleteAccount logs out (RouteGuard then unmounts this
  // screen) and the avatar/save flows setState after an await — none must land
  // on an unmounted component.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleDeleteAccount = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await authApi.deleteAccount();
      // Close the confirm Modal BEFORE logout: logout() flips isAuthenticated
      // and RouteGuard navigates to the login screen. Navigating away while a
      // native <Modal> is still presented deadlocks UIKit on iOS (same class as
      // the cancel-request freeze). Dismiss it first.
      if (mountedRef.current) setShowDeleteModal(false);
      // Apple 5.1.1(v): user's data is gone server-side; clear local session too.
      await logout();
    } catch (err) {
      if (!mountedRef.current) return;
      const apiErr = err as ApiError;
      setShowDeleteModal(false);
      dialog.show({
        title: t("personalInfo.deleteFailed", { defaultValue: "Delete failed" }),
        message: apiErr?.message ?? "",
        tone: "error",
      });
    } finally {
      if (mountedRef.current) setDeleting(false);
    }
  };

  // Hydrate fields from the cached driver profile.
  useEffect(() => {
    if (!driver) return;
    setFirstName(driver.firstName ?? "");
    setLastName(driver.lastName ?? "");
    setNickname(driver.nickname ?? "");
    setDateOfBirth(driver.dateOfBirth ?? "");
  }, [driver]);

  const handleSave = async () => {
    if (saving) return;
    // Trim before sending. Empty strings → null to clear the column.
    const norm = (s: string) => {
      const v = s.trim();
      return v.length === 0 ? null : v;
    };
    // Validate dateOfBirth shape if provided.
    const dobTrim = dateOfBirth.trim();
    if (dobTrim && !/^\d{4}-\d{2}-\d{2}$/.test(dobTrim)) {
      dialog.show({
        title: t("personalInfo.invalidDate", { defaultValue: "Invalid date" }),
        message: t("personalInfo.invalidDateHint", {
          defaultValue: "Please use YYYY-MM-DD format.",
        }),
        tone: "warning",
      });
      return;
    }

    setSaving(true);
    try {
      await updateProfile({
        firstName: norm(firstName) ?? undefined,
        lastName: norm(lastName) ?? undefined,
        nickname: norm(nickname) ?? undefined,
        dateOfBirth: dobTrim ? dobTrim : undefined,
      });
      if (!mountedRef.current) return;
      dialog.show({
        title: t("personalInfo.savedTitle", { defaultValue: "Saved" }),
        message: t("personalInfo.savedMessage", {
          defaultValue: "Your profile has been updated.",
        }),
        tone: "success",
      });
    } catch (err) {
      if (!mountedRef.current) return;
      const apiErr = err as ApiError;
      dialog.show({
        title: t("personalInfo.saveFailed", { defaultValue: "Save failed" }),
        message: apiErr?.message ?? "",
        tone: "error",
      });
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  };

  const getInputBorder = (field: string, value: string) => {
    if (focusedField === field) return "#5E28C6";
    if ((field === "firstName" || field === "lastName") && value.trim())
      return "#5E28C6";
    return "#EBEBEB";
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons
            name={I18nManager.isRTL ? "arrow-forward" : "arrow-back"}
            size={24}
            color="#0D0B12"
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontFamily: font.regular }]}>
          {t("personalInfo.title")}
        </Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Avatar (tap to pick + upload a new photo) ── */}
        <View style={styles.avatarBlock}>
          <TouchableOpacity
            style={styles.avatarCircle}
            onPress={() => void pickAndUploadAvatar()}
            disabled={avatarUploading}
            activeOpacity={0.8}
            accessibilityLabel={t("personalInfo.changePhoto")}
          >
            {driver?.avatar ? (
              <Image
                source={{ uri: driver.avatar }}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            ) : (
              <Ionicons name="person" size={36} color="#A8A5B8" />
            )}
            {avatarUploading && (
              <View style={styles.avatarLoading}>
                <ActivityIndicator color="#FFFFFF" />
              </View>
            )}
            <View style={styles.avatarBadge}>
              <Ionicons name="camera" size={14} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          <Text style={[styles.avatarHint, { fontFamily: font.regular }]}>
            {t("personalInfo.changePhoto")}
          </Text>
        </View>

        {/* ── Editable Fields ── */}
        <View style={styles.fieldsGroup}>
          {/* First Name */}
          <View style={styles.fieldWrap}>
            <Text
              style={[
                styles.fieldLabel,
                { fontFamily: font.regular },
              ]}
            >
              {t("personalInfo.firstName")}
            </Text>
            <View
              style={[
                styles.fieldInput,
                { borderColor: getInputBorder("firstName", firstName) },
              ]}
            >
              <TextInput
                style={[
                  styles.fieldText,
                  { fontFamily: font.regular },
                ]}
                value={firstName}
                onChangeText={setFirstName}
                placeholder={t("personalInfo.firstName")}
                placeholderTextColor="#A8A5B8"
                onFocus={() => setFocusedField("firstName")}
                onBlur={() => setFocusedField(null)}
              />
            </View>
          </View>

          {/* Last Name */}
          <View style={styles.fieldWrap}>
            <Text
              style={[
                styles.fieldLabel,
                { fontFamily: font.regular },
              ]}
            >
              {t("personalInfo.lastName")}
            </Text>
            <View
              style={[
                styles.fieldInput,
                { borderColor: getInputBorder("lastName", lastName) },
              ]}
            >
              <TextInput
                style={[
                  styles.fieldText,
                  { fontFamily: font.regular },
                ]}
                value={lastName}
                onChangeText={setLastName}
                placeholder={t("personalInfo.lastName")}
                placeholderTextColor="#A8A5B8"
                onFocus={() => setFocusedField("lastName")}
                onBlur={() => setFocusedField(null)}
              />
            </View>
          </View>

          {/* Nickname */}
          <View style={styles.fieldWrap}>
            <Text
              style={[
                styles.fieldLabel,
                { fontFamily: font.regular },
              ]}
            >
              {t("personalInfo.nickname")}
            </Text>
            <View
              style={[
                styles.fieldInput,
                { borderColor: getInputBorder("nickname", nickname) },
              ]}
            >
              <TextInput
                style={[
                  styles.fieldText,
                  { fontFamily: font.regular },
                ]}
                value={nickname}
                onChangeText={setNickname}
                placeholder={t("personalInfo.nickname")}
                placeholderTextColor="#A8A5B8"
                onFocus={() => setFocusedField("nickname")}
                onBlur={() => setFocusedField(null)}
              />
            </View>
          </View>

          {/* Date Of Birth */}
          <View style={styles.fieldWrap}>
            <Text
              style={[
                styles.fieldLabel,
                { fontFamily: font.regular },
              ]}
            >
              {t("personalInfo.dateOfBirth")}
            </Text>
            <View
              style={[
                styles.fieldInput,
                { borderColor: getInputBorder("dob", dateOfBirth) },
              ]}
            >
              <TextInput
                style={[
                  styles.fieldText,
                  { fontFamily: font.regular },
                ]}
                value={dateOfBirth}
                onChangeText={setDateOfBirth}
                placeholder={t("personalInfo.dateOfBirth")}
                placeholderTextColor="#A8A5B8"
                onFocus={() => setFocusedField("dob")}
                onBlur={() => setFocusedField(null)}
              />
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            activeOpacity={0.8}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={[styles.saveBtnText, { fontFamily: font.semibold }]}>
                {t("personalInfo.save")}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Contact Info Card ── */}
        <View style={styles.contactCard}>
          {/* Email */}
          <View style={styles.contactRow}>
            <View style={styles.contactInfo}>
              <Text style={[styles.contactLabel, { fontFamily: font.regular }]}>
                {t("personalInfo.emailAddress")}
              </Text>
              <Text style={[styles.contactValue, { fontFamily: font.medium }]}>
                {driver?.email ?? t("personalInfo.notSet")}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() =>
                dialog.show({
                  title: t("personalInfo.editEmail"),
                  message: t("personalInfo.editEmailSoon"),
                  tone: "info",
                })
              }
            >
              <Text style={[styles.editBtnText, { fontFamily: font.medium }]}>
                {t("personalInfo.edit")}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.contactDivider} />

          {/* Phone */}
          <View style={styles.contactRow}>
            <View style={styles.contactInfo}>
              <Text style={[styles.contactLabel, { fontFamily: font.regular }]}>
                {t("personalInfo.phoneNumber")}
              </Text>
              <Text style={[styles.contactValue, { fontFamily: font.medium }]}>
                {driver?.phone ?? t("personalInfo.notSet")}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() =>
                dialog.show({
                  title: t("personalInfo.editPhone"),
                  message: t("personalInfo.editPhoneSoon"),
                  tone: "info",
                })
              }
            >
              <Text style={[styles.editBtnText, { fontFamily: font.medium }]}>
                {t("personalInfo.edit")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Vehicle Card (read-only — vehicle is admin-managed) ── */}
        <View style={styles.contactCard}>
          {/* Vehicle Type */}
          <View style={styles.contactRow}>
            <View style={styles.contactInfo}>
              <Text style={[styles.contactLabel, { fontFamily: font.regular }]}>
                {t("personalInfo.vehicleTypeLabel", {
                  defaultValue: "Vehicle Type",
                })}
              </Text>
              <Text style={[styles.contactValue, { fontFamily: font.medium }]}>
                {vehicleTypeLabel}
              </Text>
            </View>
          </View>

          <View style={styles.contactDivider} />

          {/* Plate Number */}
          <View style={styles.contactRow}>
            <View style={styles.contactInfo}>
              <Text style={[styles.contactLabel, { fontFamily: font.regular }]}>
                {t("personalInfo.plateNumber", {
                  defaultValue: "Plate Number",
                })}
              </Text>
              <Text style={[styles.contactValue, { fontFamily: font.medium }]}>
                {driver?.vehiclePlate ??
                  t("personalInfo.notSet", { defaultValue: "Not set" })}
              </Text>
            </View>
          </View>
        </View>

        {/* Delete Account trigger — required by Apple guideline 5.1.1(v) */}
        <TouchableOpacity
          style={styles.deleteAccountBtn}
          activeOpacity={0.8}
          onPress={() => setShowDeleteModal(true)}
        >
          <Ionicons name="trash-outline" size={20} color="#DC2626" />
          <Text
            style={[
              styles.deleteAccountBtnText,
              { fontFamily: font.medium },
            ]}
          >
            {t("personalInfo.deleteAccount")}
          </Text>
        </TouchableOpacity>

        <View style={{ height: insets.bottom + 40 }} />
      </ScrollView>

      {/* Delete Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.deleteModalRoot}>
          <Pressable style={styles.deleteModalBackdrop} />
          <View style={styles.deleteModalCenter} pointerEvents="box-none">
            <View style={styles.deleteModalCard}>
              <View style={styles.deleteModalTopRow}>
                <View style={styles.deleteFeaturedIconOuter}>
                  <View style={styles.deleteFeaturedIconInner}>
                    <Ionicons name="trash-outline" size={22} color="#DC2626" />
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.deleteModalCloseBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  onPress={() => setShowDeleteModal(false)}
                  disabled={deleting}
                >
                  <Ionicons name="close" size={24} color="#7C7890" />
                </TouchableOpacity>
              </View>

              <View style={styles.deleteModalTextBlock}>
                <Text
                  style={[styles.deleteModalTitle, { fontFamily: font.medium }]}
                >
                  {t("personalInfo.deleteAccount")}
                </Text>
                <Text
                  style={[styles.deleteModalBody, { fontFamily: font.regular }]}
                >
                  {t("personalInfo.deleteConfirm")}
                </Text>
              </View>

              <View style={styles.deleteModalActions}>
                <TouchableOpacity
                  style={[
                    styles.deleteModalPrimaryBtn,
                    deleting && { opacity: 0.7 },
                  ]}
                  activeOpacity={0.85}
                  onPress={handleDeleteAccount}
                  disabled={deleting}
                >
                  {deleting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text
                      style={[
                        styles.deleteModalPrimaryText,
                        { fontFamily: font.medium },
                      ]}
                    >
                      {t("personalInfo.delete")}
                    </Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteModalSecondaryBtn}
                  activeOpacity={0.85}
                  onPress={() => setShowDeleteModal(false)}
                  disabled={deleting}
                >
                  <Text
                    style={[
                      styles.deleteModalSecondaryText,
                      { fontFamily: font.regular },
                    ]}
                  >
                    {t("personalInfo.cancel")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 15,
    paddingTop: 12,
    paddingBottom: 8,
    minHeight: 50,
  },
  backBtn: {
    width: 50,
    height: 50,
    borderRadius: 999,
    backgroundColor: "#F5F4F8",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 20, color: "#2A2640" },
  scrollContent: { paddingHorizontal: 15, paddingTop: 32, paddingBottom: 8 },
  avatarBlock: { alignItems: "center", gap: 10, marginBottom: 32 },
  avatarCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#F5F4F8",
    borderWidth: 1,
    borderColor: "#EBEBEB",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: { width: "100%", height: "100%" },
  avatarLoading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#5E28C6",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarHint: { fontSize: 14, color: "#7C7890" },
  fieldsGroup: { gap: 24, marginBottom: 32 },
  fieldWrap: { gap: 8 },
  fieldLabel: { fontSize: 16, color: "#7C7890" },
  fieldInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 22,
    height: 60,
  },
  fieldText: { flex: 1, fontSize: 16, color: "#0D0B12" },
  saveBtn: {
    backgroundColor: "#09C454",
    borderRadius: 16,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  saveBtnText: { fontSize: 20, color: "#FFFFFF" },
  contactCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EBEBEB",
    borderRadius: 20,
    paddingVertical: 26,
    paddingHorizontal: 20,
    gap: 24,
    marginBottom: 32,
  },
  contactRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  contactInfo: {
    gap: 8,
    flex: 1,
    marginRight: 12,
    alignItems: "flex-start",
  },
  contactLabel: { fontSize: 14, color: "#7C7890" },
  contactValue: { fontSize: 14, color: "#0D0B12" },
  editBtn: {
    borderWidth: 1,
    borderColor: "#09C454",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  editBtnText: { fontSize: 14, color: "#09C454" },
  contactDivider: { height: 1, backgroundColor: "#EBEBEB" },
  dangerTitle: {
    fontSize: 18,
    color: "#A81C1C",
    marginTop: 32,
    marginBottom: 12,
  },
  dangerCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EBEBEB",
    borderRadius: 20,
    paddingVertical: 26,
    paddingHorizontal: 20,
    overflow: "hidden",
  },
  deleteRow: { alignItems: "center", gap: 16 },
  deleteText: { fontSize: 16, color: "#A81C1C" },
  deleteModalRoot: { flex: 1 },
  deleteModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  deleteModalCenter: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  deleteModalCard: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
  deleteModalTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 16,
  },
  deleteFeaturedIconOuter: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFF5F5",
    borderWidth: 1,
    borderColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteFeaturedIconInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteModalCloseBtn: { padding: 10, borderRadius: 8 },
  deleteModalTextBlock: {
    gap: 4,
    marginBottom: 16,
    width: "100%",
    alignItems: "flex-start",
  },
  deleteModalTitle: { fontSize: 16, color: "#0D0B12" },
  deleteModalBody: { fontSize: 13, color: "#7C7890", lineHeight: 20 },
  deleteModalActions: { gap: 12, width: "100%" },
  deleteModalPrimaryBtn: {
    backgroundColor: "#DC2626",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  deleteModalPrimaryText: { fontSize: 16, color: "#FFFFFF" },
  deleteModalSecondaryBtn: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EBEBEB",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  deleteModalSecondaryText: { fontSize: 16, color: "#A8A5B8" },
  deleteAccountBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FEE2E2",
    backgroundColor: "#FEF2F2",
  },
  deleteAccountBtnText: { fontSize: 15, color: "#DC2626" },
});
