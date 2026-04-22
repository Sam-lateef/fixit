import type { CustomerInfo, PurchasesPackage } from "react-native-purchases";
import Purchases, { PURCHASES_ERROR_CODE } from "react-native-purchases";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Platform } from "react-native";

import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth-storage";
import {
  configureRevenueCat,
  SHOP_ENTITLEMENT_ID,
  syncRevenueCatUser,
  type RevenueCatUser,
} from "@/lib/revenuecat";

type SubscriptionContextValue = {
  isReady: boolean;
  isLoading: boolean;
  isSubscribed: boolean;
  currentPlan: string | null;
  customerInfo: CustomerInfo | null;
  purchasePackage: (pkg: PurchasesPackage) => Promise<void>;
  restorePurchases: () => Promise<void>;
  refresh: () => Promise<void>;
};

const SubscriptionContext = createContext<SubscriptionContextValue | null>(
  null,
);

function readSubscriptionState(
  info: CustomerInfo | null,
): { isSubscribed: boolean; currentPlan: string | null } {
  if (!info) {
    return { isSubscribed: false, currentPlan: null };
  }
  const ent = info.entitlements.active[SHOP_ENTITLEMENT_ID];
  if (!ent || !ent.isActive) {
    return { isSubscribed: false, currentPlan: null };
  }
  const plan = ent.productIdentifier;
  return { isSubscribed: true, currentPlan: plan };
}

export function SubscriptionProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);

  const applyInfo = useCallback((info: CustomerInfo) => {
    setCustomerInfo(info);
  }, []);

  const refresh = useCallback(async () => {
    if (Platform.OS === "web") {
      setCustomerInfo(null);
      return;
    }
    try {
      const info = await Purchases.getCustomerInfo();
      applyInfo(info);
    } catch (e) {
      console.warn("[RevenueCat] getCustomerInfo failed", e);
    }
  }, [applyInfo]);

  useEffect(() => {
    const listener = (info: CustomerInfo) => {
      applyInfo(info);
    };
    void (async () => {
      await configureRevenueCat();
      if (Platform.OS === "web") {
        setIsReady(true);
        setIsLoading(false);
        return;
      }
      Purchases.addCustomerInfoUpdateListener(listener);
      try {
        const token = await getToken();
        if (token) {
          const { user } = await apiFetch<{ user: RevenueCatUser }>(
            "/api/v1/users/me",
          );
          await syncRevenueCatUser(user);
        } else {
          await syncRevenueCatUser(null);
        }
        const info = await Purchases.getCustomerInfo();
        applyInfo(info);
      } catch (e) {
        console.warn("[RevenueCat] bootstrap failed", e);
      } finally {
        setIsReady(true);
        setIsLoading(false);
      }
    })();
    return () => {
      if (Platform.OS !== "web") {
        Purchases.removeCustomerInfoUpdateListener(listener);
      }
    };
  }, [applyInfo]);

  const purchasePackage = useCallback(
    async (pkg: PurchasesPackage) => {
      if (Platform.OS === "web") {
        throw new Error("Purchases are not available on web.");
      }
      try {
        const { customerInfo: next } = await Purchases.purchasePackage(pkg);
        applyInfo(next);
      } catch (e: unknown) {
        const err = e as { code?: string; userCancelled?: boolean };
        if (
          err.userCancelled === true ||
          err.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR
        ) {
          return;
        }
        throw e;
      }
    },
    [applyInfo],
  );

  const restorePurchases = useCallback(async () => {
    if (Platform.OS === "web") {
      return;
    }
    const info = await Purchases.restorePurchases();
    applyInfo(info);
  }, [applyInfo]);

  const { isSubscribed, currentPlan } = useMemo(
    () => readSubscriptionState(customerInfo),
    [customerInfo],
  );

  const value = useMemo(
    (): SubscriptionContextValue => ({
      isReady,
      isLoading,
      isSubscribed,
      currentPlan,
      customerInfo,
      purchasePackage,
      restorePurchases,
      refresh,
    }),
    [
      isReady,
      isLoading,
      isSubscribed,
      currentPlan,
      customerInfo,
      purchasePackage,
      restorePurchases,
      refresh,
    ],
  );

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription(): SubscriptionContextValue {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) {
    throw new Error("useSubscription must be used within SubscriptionProvider");
  }
  return ctx;
}
