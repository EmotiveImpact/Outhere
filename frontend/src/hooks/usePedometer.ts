import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import { Pedometer } from 'expo-sensors';
import { useUserStore } from '../store/userStore';
import { stepsAPI } from '../services/api';

const STEP_LENGTH_METERS = 0.762; // Average step length
const SYNC_INTERVAL = 30000; // Sync every 30 seconds

export const usePedometer = () => {
  const [isPedometerAvailable, setIsPedometerAvailable] = useState<boolean | null>(null);
  const [currentSteps, setCurrentSteps] = useState(0);
  const [sessionSteps, setSessionSteps] = useState(0);
  const [distance, setDistance] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'pending'>('pending');
  
  const subscriptionRef = useRef<any>(null);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const baseStepsRef = useRef(0);
  
  const { deviceId, updateTodayStats } = useUserStore();

  // Check permission and availability
  const checkPermission = useCallback(async () => {
    if (Platform.OS === 'web') {
      setIsPedometerAvailable(false);
      setPermissionStatus('denied');
      return false;
    }

    try {
      const isAvailable = await Pedometer.isAvailableAsync();
      setIsPedometerAvailable(isAvailable);
      
      if (isAvailable) {
        const { status } = await Pedometer.requestPermissionsAsync();
        setPermissionStatus(status === 'granted' ? 'granted' : 'denied');
        return status === 'granted';
      }
      return false;
    } catch (error) {
      console.log('Pedometer not available:', error);
      setIsPedometerAvailable(false);
      setPermissionStatus('denied');
      return false;
    }
  }, []);

  // Get steps from today
  const getTodaySteps = useCallback(async () => {
    if (!isPedometerAvailable || Platform.OS === 'web') return 0;
    
    try {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      
      const result = await Pedometer.getStepCountAsync(start, end);
      return result.steps;
    } catch (error) {
      console.log('Error getting today steps:', error);
      return 0;
    }
  }, [isPedometerAvailable]);

  // Sync steps with backend
  const syncSteps = useCallback(async () => {
    if (!deviceId) return;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const totalSteps = currentSteps;
      const totalDistance = totalSteps * STEP_LENGTH_METERS / 1000; // Convert to km
      
      await stepsAPI.record({
        device_id: deviceId,
        steps: totalSteps,
        distance: totalDistance,
        active_minutes: Math.floor(totalSteps / 100), // Rough estimate
        date: today,
      });
      
      updateTodayStats({
        steps: totalSteps,
        distance: totalDistance,
        date: today,
      });
    } catch (error) {
      console.log('Error syncing steps:', error);
    }
  }, [deviceId, currentSteps, updateTodayStats]);

  // Start tracking
  const startTracking = useCallback(async () => {
    const hasPermission = await checkPermission();
    
    if (!hasPermission || Platform.OS === 'web') {
      // Use simulation mode for web or when permission denied
      setIsTracking(true);
      return;
    }

    try {
      // Get baseline steps for today
      const todaySteps = await getTodaySteps();
      baseStepsRef.current = todaySteps;
      setCurrentSteps(todaySteps);
      setDistance(todaySteps * STEP_LENGTH_METERS / 1000);

      // Subscribe to step updates
      subscriptionRef.current = Pedometer.watchStepCount((result) => {
        const newSteps = baseStepsRef.current + result.steps;
        setSessionSteps(result.steps);
        setCurrentSteps(newSteps);
        setDistance(newSteps * STEP_LENGTH_METERS / 1000);
      });

      // Setup sync interval
      syncIntervalRef.current = setInterval(syncSteps, SYNC_INTERVAL);
      
      setIsTracking(true);
    } catch (error) {
      console.log('Error starting pedometer:', error);
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
  const simulateSteps = useCallback((steps: number) => {
    setCurrentSteps((prev) => {
      const newSteps = prev + steps;
      setDistance(newSteps * STEP_LENGTH_METERS / 1000);
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
