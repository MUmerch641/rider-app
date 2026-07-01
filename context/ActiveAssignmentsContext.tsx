import { ordersApi, type OrderAssignment } from "@/api";
import {
  AcceptOrderSummaryDialog,
  type AcceptSummaryPayload,
} from "@/components/ui/AcceptOrderSummaryDialog";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import {
  assignmentToSummaryPayload,
  enrichAssignmentsWithOrderItems,
  summaryNeedsDetailFetch,
} from "@/utils/assignmentSummary";
import { ACTIVE_STATUSES } from "@/utils/orderLifecycle";
import { type LangKey } from "@/utils/localize";
import { useTranslation } from "react-i18next";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";

type ActiveAssignmentsContextValue = {
  activeAssignments: OrderAssignment[];
  primaryAssignment: OrderAssignment | null;
  refresh: () => Promise<OrderAssignment[]>;
  showOrderSummary: (payload: AcceptSummaryPayload) => void;
  showAssignmentSummary: (assignment: OrderAssignment) => Promise<void>;
};

const ActiveAssignmentsContext =
  createContext<ActiveAssignmentsContextValue | null>(null);

const POLL_MS = 30_000;

export function ActiveAssignmentsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, driver } = useAuth();
  const { isConnected, newOrder, cancelledOrder, orderUpdate, clearCancelledOrder, clearOrderUpdate } =
    useSocket();
  const { i18n } = useTranslation();
  const langKey = (i18n.language?.split("-")[0] || "en") as LangKey;
  const [assignments, setAssignments] = useState<OrderAssignment[]>([]);
  const [summary, setSummary] = useState<AcceptSummaryPayload | null>(null);
  const [summaryVisible, setSummaryVisible] = useState(false);
  const fetchingRef = useRef(false);

  const refresh = useCallback(async (): Promise<OrderAssignment[]> => {
    if (!isAuthenticated) {
      setAssignments([]);
      return [];
    }
    if (fetchingRef.current) return [];
    fetchingRef.current = true;
    try {
      const list = await ordersApi.list();
      const enriched = await enrichAssignmentsWithOrderItems(list, ordersApi.getById);
      setAssignments(enriched);
      return enriched;
    } catch {
      return [];
    } finally {
      fetchingRef.current = false;
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!isAuthenticated) {
      setAssignments([]);
      return;
    }
    const id = setInterval(() => {
      void refresh();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [isAuthenticated, refresh]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  useEffect(() => {
    if (!isAuthenticated || !isConnected) return;
    void refresh();
  }, [isAuthenticated, isConnected, refresh]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (newOrder) void refresh();
  }, [newOrder, isAuthenticated, refresh]);

  useEffect(() => {
    if (!cancelledOrder) return;
    void refresh();
    clearCancelledOrder();
  }, [cancelledOrder, clearCancelledOrder, refresh]);

  useEffect(() => {
    if (!orderUpdate) return;
    void refresh();
    clearOrderUpdate();
  }, [orderUpdate, clearOrderUpdate, refresh]);

  const activeAssignments = useMemo(
    () => assignments.filter((a) => ACTIVE_STATUSES.has(a.status)),
    [assignments],
  );

  const primaryAssignment = activeAssignments[0] ?? null;

  const showOrderSummary = useCallback((payload: AcceptSummaryPayload) => {
    setSummary(payload);
    setSummaryVisible(true);
  }, []);

  const showAssignmentSummary = useCallback(
    async (assignment: OrderAssignment) => {
      let payload = assignmentToSummaryPayload(assignment, langKey);
      if (summaryNeedsDetailFetch(payload)) {
        try {
          const full = await ordersApi.getById(assignment.orderId);
          payload = assignmentToSummaryPayload(full, langKey);
        } catch {
          // Keep the list-row payload — dialog still shows meta + total.
        }
      }
      showOrderSummary(payload);
    },
    [showOrderSummary, langKey],
  );

  const value = useMemo(
    (): ActiveAssignmentsContextValue => ({
      activeAssignments,
      primaryAssignment,
      refresh,
      showOrderSummary,
      showAssignmentSummary,
    }),
    [
      activeAssignments,
      primaryAssignment,
      refresh,
      showOrderSummary,
      showAssignmentSummary,
    ],
  );

  return (
    <ActiveAssignmentsContext.Provider value={value}>
      {children}
      {isAuthenticated && driver ? (
        <AcceptOrderSummaryDialog
          visible={summaryVisible}
          data={summary}
          onClose={() => setSummaryVisible(false)}
        />
      ) : null}
    </ActiveAssignmentsContext.Provider>
  );
}

export function useActiveAssignments(): ActiveAssignmentsContextValue {
  const ctx = useContext(ActiveAssignmentsContext);
  if (!ctx) {
    throw new Error(
      "useActiveAssignments must be used within ActiveAssignmentsProvider",
    );
  }
  return ctx;
}
