import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import * as ImagePicker from "expo-image-picker";
import { uploadApi, type ApiError } from "@/api";
import { useAuth } from "@/context";
import { useDialog } from "@/components/ui/AppDialog";

/**
 * Shared "change profile photo" flow for the profile screens:
 * permission → image picker (square crop) → POST /upload (MinIO) →
 * PATCH /auth/profile { avatar } (persists driver in AuthContext).
 *
 * `uploading` drives the progress UI; failures surface via AppDialog.
 */
export function useAvatarUpload() {
  const { t } = useTranslation();
  const dialog = useDialog();
  const { updateProfile } = useAuth();
  const [uploading, setUploading] = useState(false);

  // The host screen (profile / personal-info) can be popped mid-upload — guard
  // the post-await setState + dialog so they don't land on an unmounted screen.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const pickAndUploadAvatar = useCallback(async () => {
    if (uploading) return;
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        dialog.show({
          title: t("personalInfo.photoPermTitle", {
            defaultValue: "Permission needed",
          }),
          message: t("personalInfo.photoPermBody", {
            defaultValue:
              "Please allow photo library access to change your profile picture.",
          }),
          tone: "warning",
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;

      setUploading(true);
      const upload = await uploadApi.uploadFile(result.assets[0].uri, "avatars");
      // The updated driver (avatar included) is persisted by AuthContext, so
      // every screen rendering driver.avatar refreshes immediately.
      await updateProfile({ avatar: upload.url });
    } catch (err) {
      if (!mountedRef.current) return;
      const apiErr = err as ApiError;
      dialog.show({
        title: t("personalInfo.uploadFailedTitle", {
          defaultValue: "Upload failed",
        }),
        message:
          apiErr?.message ||
          t("personalInfo.uploadFailedBody", {
            defaultValue: "Couldn't upload the image. Please try again.",
          }),
        tone: "error",
      });
    } finally {
      if (mountedRef.current) setUploading(false);
    }
  }, [uploading, dialog, t, updateProfile]);

  return { pickAndUploadAvatar, uploading };
}
