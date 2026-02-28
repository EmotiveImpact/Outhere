import { useState, useEffect, useRef, useCallback } from "react";
import { Platform } from "react-native";
import { Pedometer } from "expo-sensors";
import { useUserStore } from "../store/userStore";
import { stepsAPI } from "../services/api";

const STEP_LENGTH_METERS = 0.762; // Average step length
const SYNC_INTERVAL = 30000; // Sync every 30 seconds

/**
 * usePedometer — real device step counting with backend sync.
 *
 * Ported from original OUTHERE. Handles:
 * - Permission checking
 * - Live step subscription via expo-sensors Pedometer
 * - Distance calculation from steps
 * - Periodic sync to backend every 30s
 * - Web/simulator fallback with simulation mode
 */
export const usePedometer = () => {
  const [isPedometerAvailable, setIsPedometerAvailable] = useState(null);
  const [currentSteps, setCurrentSteps] = useState(0);
  const [sessionSteps, setSessionSteps] = useState(0);
  const [distance, setDistance] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState("pending");

  const subscriptionRef = useRef(null);
  const syncIntervalRef = useRef(null);
  const baseStepsRef = useRef(0);

  const { deviceId, updateTodayStats, setSyncStatus } = useUserStore();

  // Check permission and availability
  const checkPermission = useCallback(async () => {
    if (Platform.OS === "web") {
      setIsPedometerAvailable(false);
      setPermissionStatus("denied");
      return false;
    }

    try {
      const isAvailable = await Pedometer.isAvailableAsync();
      setIsPedometerAvailable(isAvailable);

      if (isAvailable) {
        const { status } = await Pedometer.requestPermissionsAsync();
        setPermissionStatus(status === "granted" ? "granted" : "denied");
        return status === "granted";
      }
      return false;
    } catch (error) {
      console.log("Pedometer not available:", error);
      setIsPedometerAvailable(false);
      setPermissionStatus("denied");
      return false;
    }
  }, []);

  // Get steps from today
  const getTodaySteps = useCallback(async () => {
    if (!isPedometerAvailable || Platform.OS === "web") return 0;

    try {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();

      const result = await Pedometer.getStepCountAsync(start, end);
      return result.steps;
    } catch (error) {
      console.log("Error getting today steps:", error);
      return 0;
    }
  }, [isPedometerAvailable]);

  // Sync steps with backend
  const syncSteps = useCallback(async () => {
    if (!deviceId) return;

    try {
      setSyncStatus("syncing");
      const today = new Date().toISOString().split("T")[0];
      const totalSteps = currentSteps;
      const totalDistance = (totalSteps * STEP_LENGTH_METERS) / 1000; // km

      await stepsAPI.record({
        device_id: deviceId,
        steps: totalSteps,
        distance: totalDistance,
        active_minutes: Math.floor(totalSteps / 100),
        date: today,
      });

      updateTodayStats({
        steps: totalSteps,
        distance: totalDistance,
        date: today,
      });

      const now = new Date().toISOString();
      setSyncStatus("synced", now);
    } catch (error) {
      console.log("Error syncing steps:", error);
      setSyncStatus("error");
    }
  }, [deviceId, currentSteps, updateTodayStats, setSyncStatus]);

  // Start tracking
  const startTracking = useCallback(async () => {
    const hasPermission = await checkPermission();

    if (!hasPermission || Platform.OS === "web") {
      // Simulation mode for web or when permission denied
      setIsTracking(true);
      return;
    }

    try {
      // Get baseline steps for today
      const todaySteps = await getTodaySteps();
      baseStepsRef.current = todaySteps;
      setCurrentSteps(todaySteps);
      setDistance((todaySteps * STEP_LENGTH_METERS) / 1000);

      // Subscribe to step updates
      subscriptionRef.current = Pedometer.watchStepCount((result) => {
        const newSteps = baseStepsRef.current + result.steps;
        const newDistance = (newSteps * STEP_LENGTH_METERS) / 1000;
        setSessionSteps(result.steps);
        setCurrentSteps(newSteps);
        setDistance(newDistance);

        // Update userStore.todayStats live so other screens can read it
        // without needing their own pedometer subscription
        updateTodayStats({
          steps: newSteps,
          distance: newDistance,
          date: new Date().toISOString().split("T")[0],
        });
      });

      // Setup sync interval
      syncIntervalRef.current = setInterval(syncSteps, SYNC_INTERVAL);

      setIsTracking(true);
    } catch (error) {
      console.log("Error starting pedometer:", error);
    }
  }, [checkPermission, getTodaySteps, syncSteps]);

  // Stop tracking
  const stopTracking = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.remove();
      subscriptionRef.current = null;
    }

    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }

    // Final sync before stopping
    syncSteps();
    setIsTracking(false);
  }, [syncSteps]);

  // Simulate steps (for web or demo)
  const simulateSteps = useCallback((steps) => {
    setCurrentSteps((prev) => {
      const newSteps = prev + steps;
      setDistance((newSteps * STEP_LENGTH_METERS) / 1000);
      return newSteps;
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
      }
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, []);

  // Initialize on mount
  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  return {
    isPedometerAvailable,
    permissionStatus,
    currentSteps,
    sessionSteps,
    distance,
    isTracking,
    startTracking,
    stopTracking,
    syncSteps,
    simulateSteps,
    checkPermission,
  };
};
