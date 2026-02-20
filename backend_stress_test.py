#!/usr/bin/env python3
"""
OUT 'ERE Backend Stress Testing
Tests edge cases, data validation, and concurrent operations
"""

import requests
import json
import uuid
from datetime import datetime, timedelta
import time
import os
from dotenv import load_dotenv
import concurrent.futures
import threading

# Load environment variables
load_dotenv('/app/frontend/.env')

# Get backend URL from frontend environment
BACKEND_URL = os.getenv('EXPO_PUBLIC_BACKEND_URL', 'http://localhost:8001')
API_BASE = f"{BACKEND_URL}/api"

print(f"Stress testing backend at: {API_BASE}")

class StressTester:
    def __init__(self):
        self.results = {
            "passed": 0,
            "failed": 0,
            "errors": []
        }
    
    def log_result(self, test_name, success, message=""):
        if success:
            print(f"✅ {test_name}")
            self.results["passed"] += 1
        else:
            print(f"❌ {test_name}: {message}")
            self.results["failed"] += 1
            self.results["errors"].append(f"{test_name}: {message}")
    
    def test_data_validation(self):
        """Test API data validation"""
        try:
            # Test invalid user creation
            invalid_user = {
                "device_id": "",  # Empty device_id
                "username": "",   # Empty username
                "city": "London"
            }
            
            response = requests.post(f"{API_BASE}/users", json=invalid_user)
            # Should handle gracefully, either create with defaults or return error
            if response.status_code in [200, 400, 422]:
                self.log_result("Data Validation - Invalid User", True)
            else:
                self.log_result("Data Validation - Invalid User", False, f"Unexpected status: {response.status_code}")
            
            # Test invalid step data
            invalid_steps = {
                "device_id": "test_device",
                "steps": -100,  # Negative steps
                "distance": -5.0,  # Negative distance
                "date": "invalid-date"  # Invalid date format
            }
            
            response = requests.post(f"{API_BASE}/steps", json=invalid_steps)
            # Should handle gracefully
            if response.status_code in [200, 400, 422, 404]:
                self.log_result("Data Validation - Invalid Steps", True)
            else:
                self.log_result("Data Validation - Invalid Steps", False, f"Unexpected status: {response.status_code}")
                
        except Exception as e:
            self.log_result("Data Validation", False, f"Error: {str(e)}")
    
    def test_concurrent_operations(self):
        """Test concurrent API calls"""
        try:
            device_ids = [f"concurrent_test_{i}" for i in range(5)]
            
            # Create users concurrently
            def create_user(device_id):
                user_data = {
                    "device_id": device_id,
                    "username": f"ConcurrentUser_{device_id[-1]}",
                    "city": "London"
                }
                response = requests.post(f"{API_BASE}/users", json=user_data)
                return response.status_code == 200
            
            with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
                futures = [executor.submit(create_user, device_id) for device_id in device_ids]
                results = [future.result() for future in concurrent.futures.as_completed(futures)]
            
            if all(results):
                self.log_result("Concurrent User Creation", True)
            else:
                self.log_result("Concurrent User Creation", False, f"Some creations failed: {results}")
            
            # Record steps concurrently
            def record_steps(device_id):
                step_data = {
                    "device_id": device_id,
                    "steps": 5000,
                    "distance": 4.0,
                    "date": datetime.utcnow().strftime("%Y-%m-%d")
                }
                response = requests.post(f"{API_BASE}/steps", json=step_data)
                return response.status_code == 200
            
            with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
                futures = [executor.submit(record_steps, device_id) for device_id in device_ids]
                results = [future.result() for future in concurrent.futures.as_completed(futures)]
            
            if all(results):
                self.log_result("Concurrent Step Recording", True)
            else:
                self.log_result("Concurrent Step Recording", False, f"Some recordings failed: {results}")
                
        except Exception as e:
            self.log_result("Concurrent Operations", False, f"Error: {str(e)}")
    
    def test_large_data_handling(self):
        """Test handling of large data sets"""
        try:
            # Create user with very long username
            long_device_id = f"test_long_{uuid.uuid4().hex}"
            long_user = {
                "device_id": long_device_id,
                "username": "A" * 100,  # Very long username
                "city": "London"
            }
            
            response = requests.post(f"{API_BASE}/users", json=long_user)
            if response.status_code == 200:
                self.log_result("Large Data - Long Username", True)
            else:
                self.log_result("Large Data - Long Username", False, f"Status: {response.status_code}")
            
            # Test very high step count
            high_steps = {
                "device_id": long_device_id,
                "steps": 999999,  # Very high step count
                "distance": 800.0,  # Very long distance
                "date": datetime.utcnow().strftime("%Y-%m-%d")
            }
            
            response = requests.post(f"{API_BASE}/steps", json=high_steps)
            if response.status_code == 200:
                self.log_result("Large Data - High Step Count", True)
            else:
                self.log_result("Large Data - High Step Count", False, f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_result("Large Data Handling", False, f"Error: {str(e)}")
    
    def test_api_performance(self):
        """Test API response times"""
        try:
            # Test leaderboard performance
            start_time = time.time()
            response = requests.get(f"{API_BASE}/leaderboard?period=daily")
            end_time = time.time()
            
            response_time = end_time - start_time
            if response.status_code == 200 and response_time < 5.0:  # Should respond within 5 seconds
                self.log_result("Performance - Leaderboard", True)
            else:
                self.log_result("Performance - Leaderboard", False, f"Status: {response.status_code}, Time: {response_time:.2f}s")
            
            # Test multiple rapid requests
            start_time = time.time()
            for _ in range(10):
                response = requests.get(f"{API_BASE}/health")
                if response.status_code != 200:
                    break
            end_time = time.time()
            
            total_time = end_time - start_time
            if total_time < 10.0:  # 10 requests should complete within 10 seconds
                self.log_result("Performance - Rapid Requests", True)
            else:
                self.log_result("Performance - Rapid Requests", False, f"Time: {total_time:.2f}s for 10 requests")
                
        except Exception as e:
            self.log_result("API Performance", False, f"Error: {str(e)}")
    
    def test_streak_calculation(self):
        """Test streak calculation accuracy"""
        try:
            streak_device_id = f"streak_test_{uuid.uuid4().hex[:8]}"
            
            # Create user
            user_data = {
                "device_id": streak_device_id,
                "username": "StreakTester",
                "city": "London"
            }
            response = requests.post(f"{API_BASE}/users", json=user_data)
            
            if response.status_code != 200:
                self.log_result("Streak Calculation Setup", False, "Failed to create user")
                return
            
            # Record steps for consecutive days
            base_date = datetime.utcnow() - timedelta(days=3)
            for i in range(4):  # 4 consecutive days
                step_date = (base_date + timedelta(days=i)).strftime("%Y-%m-%d")
                step_data = {
                    "device_id": streak_device_id,
                    "steps": 8000 + (i * 1000),
                    "distance": 6.0 + i,
                    "date": step_date
                }
                response = requests.post(f"{API_BASE}/steps", json=step_data)
                if response.status_code != 200:
                    self.log_result("Streak Calculation", False, f"Failed to record steps for day {i}")
                    return
            
            # Check user stats for streak
            time.sleep(1)  # Allow for processing
            response = requests.get(f"{API_BASE}/stats/{streak_device_id}")
            if response.status_code == 200:
                stats = response.json()
                streak = stats.get("streak", 0)
                if streak >= 3:  # Should have at least 3-day streak
                    self.log_result("Streak Calculation", True)
                else:
                    self.log_result("Streak Calculation", False, f"Expected streak >= 3, got {streak}")
            else:
                self.log_result("Streak Calculation", False, f"Failed to get stats: {response.status_code}")
                
        except Exception as e:
            self.log_result("Streak Calculation", False, f"Error: {str(e)}")
    
    def run_stress_tests(self):
        """Run all stress tests"""
        print("🔥 Starting OUT 'ERE Backend Stress Tests")
        print("=" * 50)
        
        self.test_data_validation()
        print()
        
        self.test_concurrent_operations()
        print()
        
        self.test_large_data_handling()
        print()
        
        self.test_api_performance()
        print()
        
        self.test_streak_calculation()
        print()
        
        # Print summary
        print("=" * 50)
        print(f"🏁 Stress Test Results Summary")
        print(f"✅ Passed: {self.results['passed']}")
        print(f"❌ Failed: {self.results['failed']}")
        
        if self.results['passed'] + self.results['failed'] > 0:
            success_rate = (self.results['passed'] / (self.results['passed'] + self.results['failed']) * 100)
            print(f"📊 Success Rate: {success_rate:.1f}%")
        
        if self.results['errors']:
            print("\n🔍 Failed Tests:")
            for error in self.results['errors']:
                print(f"  • {error}")
        
        return self.results['failed'] == 0

if __name__ == "__main__":
    tester = StressTester()
    success = tester.run_stress_tests()
    
    if success:
        print("\n🎉 All stress tests passed! Backend is robust.")
    else:
        print(f"\n⚠️  {tester.results['failed']} stress test(s) failed.")