import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useHeaderHeight } from "@react-navigation/elements";
import { router, type Href } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { PostRemoteImage } from "@/components/PostRemoteImage";
import { MultiSelectPickerModal } from "@/components/MultiSelectPickerModal";
import { SearchablePickerModal } from "@/components/SearchablePickerModal";
import { apiFetch } from "@/lib/api";
import { fetchDistrictsForCity } from "@/lib/districts-fetch";
import { useI18n } from "@/lib/i18n";
import type { StringKey } from "@/lib/strings";
import {
  IRAQ_OWNER_CITIES,
  PARTS_CATEGORY_SLUGS,
  REPAIR_CATEGORY_SLUGS,
  ownerCityLabel,
  partsCategoryLabel,
  repairCategoryLabel,
} from "@/lib/taxonomy-labels";
import { theme } from "@/lib/theme";
import { uploadPhotoUri } from "@/lib/upload-photo";

type ServiceType = "REPAIR" | "PARTS" | "TOWING";

type District = { id: string; name: string; nameAr: string; city: string };
type UserProfile = {
  city: string | null;
  districtId: string | null;
  district: { id: string; name: string; nameAr: string; city: string } | null;
};
type CatalogMake = { id: string; name: string; nameAr: string | null };
type CatalogModel = { id: string; name: string; nameAr: string | null };

function catalogLabel(
  name: string,
  _nameAr: string | null | undefined,
  _loc: string,
): string {
  // Car makes & models are always shown in English regardless of locale.
  return name;
}

const BAGHDAD_FALLBACK = { lat: 33.3152, lng: 44.4219 };

const REPAIR_OPTIONS = REPAIR_CATEGORY_SLUGS.filter((s) => s !== "Other");
const PARTS_OPTIONS = PARTS_CATEGORY_SLUGS.filter((s) => s !== "Other");

const DESC_LIMIT = 300;

export type OwnerPostEditorProps = {
  editPostId?: string;
  /** Pass true when rendered inside a tab with a transparent overlay header
   *  (create tab). Leave false (default) for stack screens with a normal header. */
  transparentHeader?: boolean;
  /** When true, renders the form read-only: inputs/buttons are non-interactive
   *  and the save button is hidden. Used to view requests that already have offers. */
  readOnly?: boolean;
};

type PostForEdit = {
  userId: string;
  status: string;
  serviceType: ServiceType;
  category: string;
  title: string | null;
  description: string;
  districtId: string | null;
  repairCategory: string | null;
  partsCategory: string | null;
  conditionNew: boolean;
  conditionUsed: boolean;
  deliveryNeeded: boolean;
  carMake: string | null;
  carModel: string | null;
  carYear: number | null;
  towingFromLat: number | null;
  towingFromLng: number | null;
  towingFromAddress: string | null;
  towingToAddress: string | null;
  urgency: string | null;
  photoUrls: string[];
};

function repairStateFromStored(
  raw: string | null,
): { cat: string | null; other: string } {
  if (!raw) return { cat: null, other: "" };
  if ((REPAIR_OPTIONS as readonly string[]).includes(raw)) {
    return { cat: raw, other: "" };
  }
  if (raw === "Other") return { cat: "other", other: "" };
  return { cat: "other", other: raw };
}

function partsStateFromStored(
  raw: string | null,
): { cat: string | null; other: string } {
  if (!raw) return { cat: null, other: "" };
  if ((PARTS_OPTIONS as readonly string[]).includes(raw)) {
    return { cat: raw, other: "" };
  }
  if (raw === "Other") return { cat: "other", other: "" };
  return { cat: "other", other: raw };
}

type PickedPhoto = { uri: string; mimeType?: string | null };

async function resolvePickedPhotos(photos: PickedPhoto[]): Promise<string[]> {
  const out: string[] = [];
  for (const item of photos) {
    if (item.uri.startsWith("http://") || item.uri.startsWith("https://")) {
      out.push(item.uri);
    } else {
      out.push(await uploadPhotoUri(item.uri, { mimeType: item.mimeType }));
    }
  }
  return out;
}

export function OwnerPostEditor({
  editPostId,
  transparentHeader = false,
  readOnly = false,
}: OwnerPostEditorProps): React.ReactElement {
  const headerHeight = useHeaderHeight();
  const { t, locale } = useI18n();
  // First release: CARS only. Category field kept in DB but not exposed in UI.
  const category = "CARS" as const;
  const [title, setTitle] = useState("");
  const [serviceType, setServiceType] = useState<ServiceType>("REPAIR");
  const [districts, setDistricts] = useState<District[]>([]);
  const [city, setCity] = useState("Baghdad");
  const [cityPickerOpen, setCityPickerOpen] = useState(false);
  const [districtId, setDistrictId] = useState<string>("");
  const [districtLoadError, setDistrictLoadError] = useState("");
  /** Avoid stale async completion overwriting user’s area pick (see loadDistricts). */
  const areaPrefillDoneRef = useRef(false);
  const [description, setDescription] = useState("");

  // Repair
  const [repairCat, setRepairCat] = useState<string | null>(null);
  const [repairOther, setRepairOther] = useState("");

  // Parts
  const [partsCat, setPartsCat] = useState<string | null>(null);
  const [partsOther, setPartsOther] = useState("");
  const [conditionNew, setConditionNew] = useState(false);
  const [conditionUsed, setConditionUsed] = useState(false);
  const [deliveryNeeded, setDeliveryNeeded] = useState<boolean | null>(null);

  // Car (catalog from API, market IQ — popular makes first, then A–Z)
  const [carMakeId, setCarMakeId] = useState("");
  const [carModelId, setCarModelId] = useState("");
  const [carMake, setCarMake] = useState("");
  const [carModel, setCarModel] = useState("");
  const [carYear, setCarYear] = useState("");
  const [vehicleMakes, setVehicleMakes] = useState<CatalogMake[]>([]);
  const [vehicleModels, setVehicleModels] = useState<CatalogModel[]>([]);
  const [vehicleYears, setVehicleYears] = useState<number[]>([]);
  const [makesBusy, setMakesBusy] = useState(false);
  const [modelsBusy, setModelsBusy] = useState(false);
  const [yearsBusy, setYearsBusy] = useState(false);
  const [pickerMode, setPickerMode] = useState<"make" | "model" | "year" | null>(null);
  const [districtModalOpen, setDistrictModalOpen] = useState(false);

  // Towing
  const [towingFrom, setTowingFrom] = useState("");
  const [towingLat, setTowingLat] = useState(BAGHDAD_FALLBACK.lat);
  const [towingLng, setTowingLng] = useState(BAGHDAD_FALLBACK.lng);
  const [towingTo, setTowingTo] = useState("");
  const [towingNotes, setTowingNotes] = useState("");
  const [locating, setLocating] = useState(false);

  const [pickedPhotos, setPickedPhotos] = useState<PickedPhoto[]>([]);
  const [busy, setBusy] = useState(false);
  const [loadEditBusy, setLoadEditBusy] = useState(() => Boolean(editPostId));

  const loadDistricts = useCallback(async () => {
    setDistrictLoadError("");
    try {
      const { user } = await apiFetch<{ user: UserProfile }>("/api/v1/users/me");
      const resolvedCity = user.city?.trim() || "Baghdad";
      setCity(resolvedCity);
      let list = await fetchDistrictsForCity(resolvedCity);
      if (user.district && !list.some((d) => d.id === user.district!.id)) {
        list = [user.district, ...list];
      }

      setDistricts(list);
      if (list.length === 0) {
        setDistrictId("");
        setDistrictLoadError("No areas found. Please update your profile location.");
        return;
      }
      setDistrictId((prev) => {
        if (prev && list.some((d) => d.id === prev)) {
          return prev;
        }
        if (
          !areaPrefillDoneRef.current &&
          user.districtId &&
          list.some((d) => d.id === user.districtId)
        ) {
          areaPrefillDoneRef.current = true;
          return user.districtId;
        }
        areaPrefillDoneRef.current = true;
        return list[0].id;
      });
    } catch (error) {
      setDistricts([]);
      setDistrictId("");
      setDistrictLoadError(error instanceof Error ? error.message : "Failed to load areas.");
    }
  }, []);

  const loadVehicleMakes = useCallback(async () => {
    setMakesBusy(true);
    try {
      const data = await apiFetch<{ makes: CatalogMake[] }>(
        "/api/v1/catalog/makes?market=IQ",
        { skipAuth: true },
      );
      setVehicleMakes(data.makes);
    } catch {
      setVehicleMakes([]);
    } finally {
      setMakesBusy(false);
    }
  }, []);

  const loadVehicleModels = useCallback(async (makeId: string) => {
    setModelsBusy(true);
    try {
      const data = await apiFetch<{ models: CatalogModel[] }>(
        `/api/v1/catalog/models?makeId=${encodeURIComponent(makeId)}&market=IQ`,
        { skipAuth: true },
      );
      setVehicleModels(data.models);
    } catch {
      setVehicleModels([]);
    } finally {
      setModelsBusy(false);
    }
  }, []);

  const loadVehicleYears = useCallback(async (modelId: string) => {
    setYearsBusy(true);
    try {
      const data = await apiFetch<{ years: number[] }>(
        `/api/v1/catalog/years?modelId=${encodeURIComponent(modelId)}`,
        { skipAuth: true },
      );
      setVehicleYears(data.years);
    } catch {
      setVehicleYears([]);
    } finally {
      setYearsBusy(false);
    }
  }, []);

  const loadExistingPost = useCallback(async () => {
    if (!editPostId) return;
    setLoadEditBusy(true);
    setDistrictLoadError("");
    try {
      const [{ user: me }, { post }] = await Promise.all([
        apiFetch<{ user: { id: string; city: string | null } }>("/api/v1/users/me"),
        apiFetch<{ post: PostForEdit }>(`/api/v1/posts/${editPostId}`),
      ]);
      if (post.userId !== me.id) {
        Alert.alert(t("errorTitle"), t("cannotEditPost"), [
          { text: "OK", onPress: () => router.back() },
        ]);
        return;
      }
      if (post.status !== "ACTIVE" && !readOnly) {
        Alert.alert(t("errorTitle"), t("cannotEditPost"), [
          { text: "OK", onPress: () => router.back() },
        ]);
        return;
      }

      areaPrefillDoneRef.current = true;
      setTitle(post.title ?? "");
      setServiceType(post.serviceType);

      const { districts: allDistricts } = await apiFetch<{ districts: District[] }>(
        "/api/v1/districts",
        { skipAuth: true },
      );
      const postDist = post.districtId
        ? allDistricts.find((d) => d.id === post.districtId)
        : undefined;
      const resolvedCity =
        postDist?.city?.trim() || me.city?.trim() || "Baghdad";
      setCity(resolvedCity);
      let list = await fetchDistrictsForCity(resolvedCity);
      if (postDist && !list.some((d) => d.id === postDist.id)) {
        list = [postDist, ...list];
      }
      setDistricts(list);
      if (post.districtId && list.some((d) => d.id === post.districtId)) {
        setDistrictId(post.districtId);
      } else if (list.length > 0) {
        setDistrictId(list[0].id);
      }

      if (post.serviceType === "REPAIR") {
        const r = repairStateFromStored(post.repairCategory);
        setRepairCat(r.cat);
        setRepairOther(r.other);
        setDeliveryNeeded(post.deliveryNeeded);
        setDescription(post.description);
      } else if (post.serviceType === "PARTS") {
        const p = partsStateFromStored(post.partsCategory);
        setPartsCat(p.cat);
        setPartsOther(p.other);
        setConditionNew(post.conditionNew);
        setConditionUsed(post.conditionUsed);
        setDeliveryNeeded(post.deliveryNeeded);
        setDescription(post.description);
      } else {
        setTowingLat(post.towingFromLat ?? BAGHDAD_FALLBACK.lat);
        setTowingLng(post.towingFromLng ?? BAGHDAD_FALLBACK.lng);
        setTowingFrom(post.towingFromAddress ?? "");
        setTowingTo(post.towingToAddress ?? "");
        setTowingNotes(post.description);
      }

      setPickedPhotos(post.photoUrls.map((uri) => ({ uri })));

      if (post.serviceType !== "TOWING") {
        setMakesBusy(true);
        try {
          const data = await apiFetch<{ makes: CatalogMake[] }>(
            "/api/v1/catalog/makes?market=IQ",
            { skipAuth: true },
          );
          setVehicleMakes(data.makes);
          const makeName = post.carMake?.trim();
          let matchedMakeId = "";
          if (makeName) {
            const mk = data.makes.find(
              (x) => x.name.toLowerCase() === makeName.toLowerCase(),
            );
            if (mk) {
              matchedMakeId = mk.id;
              setCarMakeId(mk.id);
              setCarMake(mk.name);
            } else {
              setCarMake(makeName);
            }
          }
          if (matchedMakeId && post.carModel?.trim()) {
            setModelsBusy(true);
            try {
              const modelsData = await apiFetch<{ models: CatalogModel[] }>(
                `/api/v1/catalog/models?makeId=${encodeURIComponent(matchedMakeId)}&market=IQ`,
                { skipAuth: true },
              );
              setVehicleModels(modelsData.models);
              const modelName = post.carModel.trim();
              const md = modelsData.models.find(
                (x) => x.name.toLowerCase() === modelName.toLowerCase(),
              );
              if (md) {
                setCarModelId(md.id);
                setCarModel(md.name);
                setYearsBusy(true);
                try {
                  const yearsData = await apiFetch<{ years: number[] }>(
                    `/api/v1/catalog/years?modelId=${encodeURIComponent(md.id)}`,
                    { skipAuth: true },
                  );
                  setVehicleYears(yearsData.years);
                } finally {
                  setYearsBusy(false);
                }
              } else {
                setCarModel(modelName);
              }
            } finally {
              setModelsBusy(false);
            }
          } else if (post.carModel?.trim()) {
            setCarModel(post.carModel.trim());
          }
        } finally {
          setMakesBusy(false);
        }

        if (post.carYear != null) {
          setCarYear(String(post.carYear));
        }
      }
    } catch (e) {
      Alert.alert(
        t("errorTitle"),
        e instanceof Error ? e.message : t("cannotEditPost"),
        [{ text: "OK", onPress: () => router.back() }],
      );
    } finally {
      setLoadEditBusy(false);
    }
  }, [editPostId, t, readOnly]);

  useEffect(() => {
    if (editPostId) return;
    void loadDistricts();
  }, [editPostId, loadDistricts]);

  useEffect(() => {
    if (!editPostId) return;
    void loadExistingPost();
  }, [editPostId, loadExistingPost]);

  useEffect(() => {
    if (editPostId) return;
    void loadVehicleMakes().catch(() => {
      /* surfaced when opening make picker if empty */
    });
  }, [editPostId, loadVehicleMakes]);

  useEffect(() => {
    if (!carMakeId) {
      setVehicleModels([]);
      return;
    }
    void loadVehicleModels(carMakeId).catch(() => undefined);
  }, [carMakeId, loadVehicleModels]);

  useEffect(() => {
    if (!carModelId) {
      setVehicleYears([]);
      return;
    }
    void loadVehicleYears(carModelId).catch(() => undefined);
  }, [carModelId, loadVehicleYears]);

  const handleCityChange = (newCity: string): void => {
    setCity(newCity);
    setDistrictId("");
    setDistricts([]);
    void (async () => {
      try {
        const list = await fetchDistrictsForCity(newCity);
        setDistricts(list);
        if (list.length > 0) setDistrictId(list[0].id);
      } catch {
        setDistricts([]);
      }
    })();
  };

  const pickPhoto = async (): Promise<void> => {
    if (pickedPhotos.length >= 3) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Photos", "Permission needed to pick images.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
    });
    if (!res.canceled && res.assets[0]?.uri) {
      const asset = res.assets[0];
      setPickedPhotos((prev) => [
        ...prev,
        { uri: asset.uri, mimeType: asset.mimeType },
      ]);
    }
  };

  const removePhoto = (uri: string): void => {
    setPickedPhotos((prev) => prev.filter((p) => p.uri !== uri));
  };

  const detectLocation = async (): Promise<void> => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Location", "Location permission is needed to auto-detect your position.");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude: lat, longitude: lng } = pos.coords;
      setTowingLat(lat);
      setTowingLng(lng);
      try {
        const { address } = await apiFetch<{ address: string }>(
          `/api/v1/geocode/reverse?lat=${lat}&lng=${lng}`,
        );
        setTowingFrom(address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      } catch {
        setTowingFrom(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      }
    } catch {
      Alert.alert("Location", "Could not detect your location. Please enter it manually.");
    } finally {
      setLocating(false);
    }
  };

  const resolvedRepairCat = (): string => {
    if (repairCat === "other") return repairOther.trim() || "general";
    return repairCat ?? "general";
  };

  const resolvedPartsCat = (): string => {
    if (partsCat === "other") return partsOther.trim() || "general";
    return partsCat ?? "general";
  };

  const submit = (): void => {
    const desc = description.trim();
    const towingDesc = towingNotes.trim();

    // Validation
    if (serviceType !== "TOWING" && desc.length < 1) {
      Alert.alert(t("createPost"), t("description"));
      return;
    }
    if (serviceType === "TOWING" && !towingFrom.trim() && !towingDesc) {
      Alert.alert(t("createPost"), t("towingLocation"));
      return;
    }
    if (!districtId) {
      Alert.alert(t("createPost"), t("pickDistrict"));
      return;
    }
    setBusy(true);
    void (async () => {
      try {
        const photoUrls = await resolvePickedPhotos(pickedPhotos);

        if (editPostId) {
          const patch: Record<string, unknown> = { photoUrls };
          if (title.trim()) patch.title = title.trim();
          if (serviceType === "REPAIR") {
            patch.description = desc;
            patch.districtId = districtId;
            patch.repairCategory = resolvedRepairCat();
            if (carMake.trim()) patch.carMake = carMake.trim();
            if (carModel.trim()) patch.carModel = carModel.trim();
            if (carYear.trim()) {
              const y = Number(carYear.trim());
              if (!Number.isNaN(y)) patch.carYear = y;
            }
          } else if (serviceType === "PARTS") {
            patch.description = desc;
            patch.districtId = districtId;
            patch.partsCategory = resolvedPartsCat();
            patch.conditionNew = conditionNew;
            patch.conditionUsed = conditionUsed;
            if (deliveryNeeded !== null) patch.deliveryNeeded = deliveryNeeded;
            if (carMake.trim()) patch.carMake = carMake.trim();
            if (carModel.trim()) patch.carModel = carModel.trim();
            if (carYear.trim()) {
              const y = Number(carYear.trim());
              if (!Number.isNaN(y)) patch.carYear = y;
            }
          } else {
            patch.towingFromLat = towingLat;
            patch.towingFromLng = towingLng;
            patch.towingFromAddress = towingFrom.trim() || "Baghdad";
            if (towingTo.trim()) patch.towingToAddress = towingTo.trim();
            patch.description = towingDesc || towingFrom.trim() || "Towing request";
            if (districtId) patch.districtId = districtId;
          }
          await apiFetch(`/api/v1/posts/${editPostId}`, {
            method: "PATCH",
            body: JSON.stringify(patch),
          });
          Alert.alert(t("postUpdated"), "", [
            { text: "OK", onPress: () => router.back() },
          ]);
        } else {
          const body: Record<string, unknown> = {
            serviceType,
            category: "CARS",
            description: desc,
            photoUrls,
          };
          if (title.trim()) body.title = title.trim();
          if (serviceType === "REPAIR") {
            body.districtId = districtId;
            body.repairCategory = resolvedRepairCat();
            if (carMake.trim()) body.carMake = carMake.trim();
            if (carModel.trim()) body.carModel = carModel.trim();
            if (carYear.trim()) {
              const y = Number(carYear.trim());
              if (!Number.isNaN(y)) body.carYear = y;
            }
          } else if (serviceType === "PARTS") {
            body.districtId = districtId;
            body.partsCategory = resolvedPartsCat();
            body.conditionNew = conditionNew;
            body.conditionUsed = conditionUsed;
            if (deliveryNeeded !== null) body.deliveryNeeded = deliveryNeeded;
            if (carMake.trim()) body.carMake = carMake.trim();
            if (carModel.trim()) body.carModel = carModel.trim();
            if (carYear.trim()) {
              const y = Number(carYear.trim());
              if (!Number.isNaN(y)) body.carYear = y;
            }
          } else {
            body.towingFromLat = towingLat;
            body.towingFromLng = towingLng;
            body.towingFromAddress = towingFrom.trim() || "Baghdad";
            if (towingTo.trim()) body.towingToAddress = towingTo.trim();
            body.description = towingDesc || towingFrom.trim() || "Towing request";
            if (districtId) body.districtId = districtId;
          }

          await apiFetch("/api/v1/posts", {
            method: "POST",
            body: JSON.stringify(body),
          });
          // Clear the form so the create tab doesn't pre-fill the next request
          // with the previous one's data (the tab stays mounted in expo-router).
          setTitle("");
          setServiceType("REPAIR");
          setDescription("");
          setRepairCat(null);
          setRepairOther("");
          setPartsCat(null);
          setPartsOther("");
          setConditionNew(false);
          setConditionUsed(false);
          setDeliveryNeeded(null);
          setCarMakeId("");
          setCarModelId("");
          setCarMake("");
          setCarModel("");
          setCarYear("");
          setTowingFrom("");
          setTowingLat(BAGHDAD_FALLBACK.lat);
          setTowingLng(BAGHDAD_FALLBACK.lng);
          setTowingTo("");
          setTowingNotes("");
          setPickedPhotos([]);
          Alert.alert(t("postCreated"), "", [
            {
              text: "OK",
              onPress: () => router.replace("/owner" as Href),
            },
          ]);
        }
      } catch (e) {
        Alert.alert(
          t("errorTitle"),
          e instanceof Error ? e.message : t("updateFailed"),
        );
      } finally {
        setBusy(false);
      }
    })();
  };

  if (editPostId && loadEditBusy) {
    return (
      <View style={[styles.flex, styles.centerLoad]}>
        <ActivityIndicator size="large" color={theme.primaryMid} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          transparentHeader ? { paddingTop: 24 + headerHeight } : null,
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {readOnly ? (
          <View style={styles.readOnlyBanner}>
            <Text style={styles.readOnlyBannerText}>{t("viewOnlyBanner")}</Text>
          </View>
        ) : null}
        <View pointerEvents={readOnly ? "none" : "auto"}>
        {/* First release: CARS only — category picker hidden */}

        {/* Service type */}
        <Text style={styles.label}>{t("services")}</Text>
        <View style={styles.row}>
          {(["REPAIR", "PARTS", ...(category === "CARS" ? ["TOWING" as const] : [])] as const).map((s) => (
            <Pressable
              key={s}
              style={[
                styles.chip,
                serviceType === s && styles.chipOn,
              ]}
              onPress={() => {
                setServiceType(s as ServiceType);
              }}
            >
              <Text style={[styles.chipText, serviceType === s && styles.chipTextOn]}>
                {s === "REPAIR"
                  ? (category === "CARS" ? t("repair") : t("serviceJob"))
                  : s === "PARTS"
                    ? (category === "CARS" ? t("parts") : t("serviceSupplies"))
                    : t("towing")}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* ── NON-CARS simplified form ── */}
        {/* Area picker */}
        <Text style={styles.subtleText}>{ownerCityLabel(city, locale)}</Text>
        <Text style={styles.label}>{t("district")}</Text>
        {districtLoadError ? <Text style={styles.errorText}>{districtLoadError}</Text> : null}
        {districts.length > 0 ? (
          <Pressable
            style={styles.selectInput}
            onPress={() => setDistrictModalOpen(true)}
          >
            <Text style={districtId ? styles.selectValue : styles.selectPlaceholder}>
              {districtId
                ? (() => {
                    const d = districts.find((x) => x.id === districtId);
                    return d
                      ? locale === "ar-iq" && d.nameAr ? d.nameAr : d.name
                      : t("district");
                  })()
                : t("pickDistrict")}
            </Text>
          </Pressable>
        ) : null}

        {/* District modal */}
        <SearchablePickerModal
          visible={districtModalOpen}
          title={t("district")}
          items={districts.map((d) => ({
            id: d.id,
            label: locale === "ar-iq" && d.nameAr ? d.nameAr : d.name,
          }))}
          onSelect={(id) => {
            setDistrictId(id);
            setDistrictModalOpen(false);
          }}
          onRequestClose={() => setDistrictModalOpen(false)}
          cancelLabel={t("cancel")}
          searchPlaceholder={t("search")}
        />

        {/* Detail fields */}
        <>

        {/* Repair category chips */}
        {serviceType === "REPAIR" ? (
          <>
            <Text style={styles.label}>{t("repairCategories")}</Text>
            <View style={styles.row}>
              {REPAIR_OPTIONS.map((cat) => (
                <Pressable
                  key={cat}
                  style={[styles.chip, repairCat === cat && styles.chipOn]}
                  onPress={() => setRepairCat(repairCat === cat ? null : cat)}
                >
                  <Text style={[styles.chipText, repairCat === cat && styles.chipTextOn]}>
                    {repairCategoryLabel(cat, locale)}
                  </Text>
                </Pressable>
              ))}
              <Pressable
                style={[styles.chip, repairCat === "other" && styles.chipOn]}
                onPress={() => setRepairCat(repairCat === "other" ? null : "other")}
              >
                <Text style={[styles.chipText, repairCat === "other" && styles.chipTextOn]}>
                  {t("other")}
                </Text>
              </Pressable>
            </View>
            {repairCat === "other" ? (
              <TextInput
                style={[
                  styles.input,
                  locale === "ar-iq"
                    ? { textAlign: "right", writingDirection: "rtl" }
                    : { textAlign: "left", writingDirection: "ltr" },
                ]}
                placeholder={t("other")}
                placeholderTextColor={theme.mutedLight}
                value={repairOther}
                onChangeText={setRepairOther}
              />
            ) : null}
          </>
        ) : null}

        {/* Parts category chips */}
        {serviceType === "PARTS" ? (
          <>
            <Text style={styles.label}>{t("partsCategories")}</Text>
            <View style={styles.row}>
              {PARTS_OPTIONS.map((cat) => (
                <Pressable
                  key={cat}
                  style={[styles.chip, partsCat === cat && styles.chipOn]}
                  onPress={() => setPartsCat(partsCat === cat ? null : cat)}
                >
                  <Text style={[styles.chipText, partsCat === cat && styles.chipTextOn]}>
                    {partsCategoryLabel(cat, locale)}
                  </Text>
                </Pressable>
              ))}
              <Pressable
                style={[styles.chip, partsCat === "other" && styles.chipOn]}
                onPress={() => setPartsCat(partsCat === "other" ? null : "other")}
              >
                <Text style={[styles.chipText, partsCat === "other" && styles.chipTextOn]}>
                  {t("other")}
                </Text>
              </Pressable>
            </View>
            {partsCat === "other" ? (
              <TextInput
                style={[
                  styles.input,
                  locale === "ar-iq"
                    ? { textAlign: "right", writingDirection: "rtl" }
                    : { textAlign: "left", writingDirection: "ltr" },
                ]}
                placeholder={t("other")}
                placeholderTextColor={theme.mutedLight}
                value={partsOther}
                onChangeText={setPartsOther}
              />
            ) : null}

            {/* Condition */}
            <Text style={styles.label}>{t("conditionNew")} / {t("conditionUsed")}</Text>
            <View style={styles.row}>
              <Pressable
                style={[styles.chip, conditionNew && styles.chipOn]}
                onPress={() => setConditionNew((v) => !v)}
              >
                <Text style={[styles.chipText, conditionNew && styles.chipTextOn]}>
                  {t("conditionNew")}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.chip, conditionUsed && styles.chipOn]}
                onPress={() => setConditionUsed((v) => !v)}
              >
                <Text style={[styles.chipText, conditionUsed && styles.chipTextOn]}>
                  {t("conditionUsed")}
                </Text>
              </Pressable>
            </View>

            {/* Delivery needed */}
            <Text style={styles.label}>{t("deliveryNeeded")}</Text>
            <View style={styles.row}>
              <Pressable
                style={[styles.chip, deliveryNeeded === true && styles.chipOn]}
                onPress={() => setDeliveryNeeded(deliveryNeeded === true ? null : true)}
              >
                <Text style={[styles.chipText, deliveryNeeded === true && styles.chipTextOn]}>
                  {t("yes")}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.chip, deliveryNeeded === false && styles.chipOn]}
                onPress={() => setDeliveryNeeded(deliveryNeeded === false ? null : false)}
              >
                <Text style={[styles.chipText, deliveryNeeded === false && styles.chipTextOn]}>
                  {t("no")}
                </Text>
              </Pressable>
            </View>
          </>
        ) : null}

        {/* Car make + model + year (CARS category only, Repair & Parts) */}
        {serviceType !== "TOWING" && category === "CARS" ? (
          <>
            <Pressable style={styles.selectInput} onPress={() => {
              setPickerMode("make");
            }}>
              <Text
                style={carMakeId || carMake.trim() ? styles.selectValue : styles.selectPlaceholder}
              >
                {carMakeId
                  ? catalogLabel(
                      carMake,
                      vehicleMakes.find((m) => m.id === carMakeId)?.nameAr ?? null,
                      locale,
                    )
                  : carMake.trim() || t("carMake")}
              </Text>
            </Pressable>
            <Pressable style={styles.selectInput} onPress={() => {
              if (!carMakeId && !carMake.trim()) {
                Alert.alert(t("createPost"), t("carMake"));
                return;
              }
              if (!carMakeId) {
                Alert.alert(t("createPost"), t("carMake"));
                return;
              }
              setPickerMode("model");
            }}>
              <Text
                style={carModelId || carModel.trim() ? styles.selectValue : styles.selectPlaceholder}
              >
                {carModelId
                  ? catalogLabel(
                      carModel,
                      vehicleModels.find((m) => m.id === carModelId)?.nameAr ?? null,
                      locale,
                    )
                  : carModel.trim() || t("carModel")}
              </Text>
            </Pressable>
            <Pressable style={styles.selectInput} onPress={() => {
              if (!carModelId) {
                Alert.alert(t("createPost"), t("carModel"));
                return;
              }
              setPickerMode("year");
            }}>
              <Text style={carYear ? styles.selectValue : styles.selectPlaceholder}>
                {carYear || t("yearOptional")}
              </Text>
            </Pressable>
          </>
        ) : null}

        {/* Towing fields */}
        {serviceType === "TOWING" ? (
          <>
            <Text style={styles.label}>{t("towingLocation")}</Text>
            <Pressable
              style={styles.gpsBtn}
              onPress={() => void detectLocation()}
              disabled={locating}
            >
              {locating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.gpsBtnText}>📍 {t("detectLocation")}</Text>
              )}
            </Pressable>
            <TextInput
              style={[
                styles.input,
                locale === "ar-iq"
                  ? { textAlign: "right", writingDirection: "rtl" }
                  : { textAlign: "left", writingDirection: "ltr" },
              ]}
              value={towingFrom}
              onChangeText={setTowingFrom}
              placeholder="Baghdad"
              placeholderTextColor={theme.mutedLight}
            />
            <Text style={styles.label}>{t("towTo")}</Text>
            <TextInput
              style={[
                styles.input,
                locale === "ar-iq"
                  ? { textAlign: "right", writingDirection: "rtl" }
                  : { textAlign: "left", writingDirection: "ltr" },
              ]}
              value={towingTo}
              onChangeText={setTowingTo}
              placeholderTextColor={theme.mutedLight}
            />
            <Text style={styles.label}>{t("towingNotes")}</Text>
            <TextInput
              style={[
                styles.input,
                styles.area,
                locale === "ar-iq"
                  ? { textAlign: "right", writingDirection: "rtl" }
                  : { textAlign: "left", writingDirection: "ltr" },
              ]}
              value={towingNotes}
              onChangeText={setTowingNotes}
              multiline
              placeholderTextColor={theme.mutedLight}
            />
          </>
        ) : null}



        {/* Description */}
        {serviceType !== "TOWING" ? (
          <>
            <Text style={styles.label}>{t("description")}</Text>
            <TextInput
              style={[
                styles.input,
                styles.area,
                locale === "ar-iq"
                  ? { textAlign: "right", writingDirection: "rtl" }
                  : { textAlign: "left", writingDirection: "ltr" },
              ]}
              value={description}
              onChangeText={(v) => setDescription(v.slice(0, DESC_LIMIT))}
              multiline
              placeholderTextColor={theme.mutedLight}
              maxLength={DESC_LIMIT}
            />
            <Text style={styles.charCount}>{description.length}/{DESC_LIMIT}</Text>
          </>
        ) : null}

        {/* Photos */}
        <Text style={styles.label}>{t("addPhotos")}</Text>
        <View style={styles.photoRow}>
          {pickedPhotos.map((p) => (
            <View key={p.uri} style={styles.thumbWrap}>
              <PostRemoteImage uri={p.uri} style={styles.thumb} />
              <Pressable style={styles.thumbRemove} onPress={() => removePhoto(p.uri)}>
                <Text style={styles.thumbRemoveText}>×</Text>
              </Pressable>
            </View>
          ))}
          {pickedPhotos.length < 3 ? (
            <Pressable style={styles.addPhoto} onPress={() => void pickPhoto()}>
              <Text style={styles.addPhotoText}>+</Text>
            </Pressable>
          ) : null}
        </View>

        {readOnly ? null : (
          <Pressable
            style={[styles.btn, busy && styles.btnDisabled]}
            disabled={busy}
            onPress={submit}
          >
            <Text style={styles.btnText}>{editPostId ? t("save") : t("post")}</Text>
          </Pressable>
        )}

        </>
        </View>
      </ScrollView>
      <MultiSelectPickerModal
        visible={pickerMode === "make"}
        mode="single"
        title={t("carMake")}
        items={vehicleMakes.map((m) => ({
          id: m.id,
          label: catalogLabel(m.name, m.nameAr, locale),
        }))}
        initialSelected={carMakeId ? [carMakeId] : []}
        onSave={(ids) => {
          const id = ids[0];
          const m = vehicleMakes.find((x) => x.id === id);
          if (!m) {
            setPickerMode(null);
            return;
          }
          setCarMakeId(m.id);
          setCarMake(m.name);
          setCarModelId("");
          setCarModel("");
          setCarYear("");
          setPickerMode(null);
        }}
        onRequestClose={() => setPickerMode(null)}
        saveLabel={t("save")}
        cancelLabel={t("cancel")}
        searchPlaceholder={t("search")}
        busy={makesBusy}
      />
      <MultiSelectPickerModal
        visible={pickerMode === "model"}
        mode="single"
        title={t("carModel")}
        items={vehicleModels.map((m) => ({
          id: m.id,
          label: catalogLabel(m.name, m.nameAr, locale),
        }))}
        initialSelected={carModelId ? [carModelId] : []}
        onSave={(ids) => {
          const id = ids[0];
          const m = vehicleModels.find((x) => x.id === id);
          if (!m) {
            setPickerMode(null);
            return;
          }
          setCarModelId(m.id);
          setCarModel(m.name);
          setCarYear("");
          setPickerMode(null);
        }}
        onRequestClose={() => setPickerMode(null)}
        saveLabel={t("save")}
        cancelLabel={t("cancel")}
        searchPlaceholder={t("search")}
        busy={modelsBusy}
      />
      <MultiSelectPickerModal
        visible={pickerMode === "year"}
        mode="single"
        showSearch={false}
        title={t("yearOptional")}
        items={vehicleYears.map((y) => ({ id: String(y), label: String(y) }))}
        initialSelected={carYear ? [carYear] : []}
        onSave={(ids) => {
          const id = ids[0];
          if (id) setCarYear(id);
          setPickerMode(null);
        }}
        onRequestClose={() => setPickerMode(null)}
        saveLabel={t("save")}
        cancelLabel={t("cancel")}
        searchPlaceholder={t("search")}
        busy={yearsBusy}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.bg },
  centerLoad: {
    justifyContent: "center",
    alignItems: "center",
  },
  scroll: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40 },
  readOnlyBanner: {
    backgroundColor: theme.primaryLight,
    borderRadius: theme.radiusMd,
    padding: 12,
    marginTop: 12,
    marginBottom: 4,
  },
  readOnlyBannerText: {
    color: theme.primary,
    fontWeight: "600",
    fontSize: 13,
    textAlign: "left",
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.text,
    marginBottom: 8,
    marginTop: 8,
    textAlign: "left",
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: theme.radiusMd,
    backgroundColor: theme.chip,
    borderWidth: 1,
    borderColor: theme.border,
  },
  chipOn: { backgroundColor: theme.primaryMid, borderColor: theme.primaryMid },

  chipText: { color: theme.text, fontWeight: "600" },
  chipTextOn: { color: "#fff" },
  input: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radiusMd,
    padding: 12,
    fontSize: 16,
    color: theme.text,
    marginBottom: 8,
    backgroundColor: theme.surface,
    textAlign: "left",
  },
  subtleText: {
    fontSize: 13,
    color: theme.mutedLight,
    marginBottom: 6,
    textAlign: "left",
  },
  errorText: {
    color: theme.danger,
    fontSize: 13,
    marginBottom: 8,
  },
  selectInput: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radiusMd,
    padding: 12,
    marginBottom: 8,
    backgroundColor: theme.surface,
  },
  selectValue: {
    fontSize: 16,
    color: theme.text,
    textAlign: "left",
  },
  selectPlaceholder: {
    fontSize: 16,
    color: theme.mutedLight,
    textAlign: "left",
  },
  area: { minHeight: 90, textAlignVertical: "top" },
  charCount: { fontSize: 12, color: theme.mutedLight, textAlign: "right", marginBottom: 4 },
  photoRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  thumbWrap: { position: "relative" },
  thumb: { width: 72, height: 72, borderRadius: 8 },
  thumbRemove: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: theme.danger,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  thumbRemoveText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  addPhoto: {
    width: 72,
    height: 72,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: theme.border,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  addPhotoText: { fontSize: 28, color: theme.muted },
  gpsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.primary,
    borderRadius: theme.radiusMd,
    paddingVertical: 12,
    marginBottom: 8,
    gap: 6,
  },
  gpsBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  btn: {
    backgroundColor: theme.primaryMid,
    paddingVertical: 14,
    borderRadius: theme.radiusMd,
    alignItems: "center",
    marginTop: 12,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
