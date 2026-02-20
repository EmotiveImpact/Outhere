#!/usr/bin/env python3
"""
OUT 'ERE Specific Scenario Testing
Tests the exact scenarios mentioned in the review request
"""

import requests
import json
import uuid
from datetime import datetime, timedelta
import time
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/frontend/.env')

# Get backend URL from frontend environment
BACKEND_URL = os.getenv('EXPO_PUBLIC_BACKEND_URL', 'http://localhost:8001')
API_BASE = f"{BACKEND_URL}/api"

print(f"Testing specific scenarios at: {API_BASE}")

class ScenarioTester:
    def __init__(self):
        self.device_id = f"scenario_test_{uuid.uuid4().hex[:8]}"
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
    
    def test_scenario_1_create_user_with_unique_device_id(self):
        """Test Scenario 1: Create a new user with unique device_id"""
        try:
            user_data = {
                "device_id": self.device_id,
                "username": "Jamal Thompson",
                "city": "London",
                "borough": "Hackney"
            }
            
            response = requests.post(f"{API_BASE}/users", json=user_data)
            if response.status_code == 200:
                user = response.json()
                if (user.get("device_id") == self.device_id and 
                    user.get("username") == "Jamal Thompson" and
                    user.get("city") == "London" and
                    user.get("borough") == "Hackney"):
                    self.log_result("Scenario 1: Create User with Unique Device ID", True)
                    return True
                else:
                    self.log_result("Scenario 1: Create User with Unique Device ID", False, f"User data mismatch: {user}")
            else:
                self.log_result("Scenario 1: Create User with Unique Device ID", False, f"Status: {response.status_code}")
            return False
                
        except Exception as e:
            self.log_result("Scenario 1: Create User with Unique Device ID", False, f"Error: {str(e)}")
            return False
    
    def test_scenario_2_record_multiple_step_entries(self):
        """Test Scenario 2: Record multiple step entries"""
        try:
            # Record steps for today
            today = datetime.utcnow().strftime("%Y-%m-%d")
            step_data_today = {
                "device_id": self.device_id,
                "steps": 12500,
                "distance": 9.8,
                "active_minutes": 75,
                "date": today
            }
            
            response = requests.post(f"{API_BASE}/steps", json=step_data_today)
            if response.status_code != 200:
                self.log_result("Scenario 2: Record Multiple Steps - Today", False, f"Status: {response.status_code}")
                return False
            
            # Record steps for yesterday
            yesterday = (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d")
            step_data_yesterday = {
                "device_id": self.device_id,
                "steps": 8750,
                "distance": 6.2,
                "active_minutes": 52,
                "date": yesterday
            }
            
            response = requests.post(f"{API_BASE}/steps", json=step_data_yesterday)
            if response.status_code != 200:
                self.log_result("Scenario 2: Record Multiple Steps - Yesterday", False, f"Status: {response.status_code}")
                return False
            
            # Record steps for day before yesterday
            day_before = (datetime.utcnow() - timedelta(days=2)).strftime("%Y-%m-%d")
            step_data_day_before = {
                "device_id": self.device_id,
                "steps": 15200,
                "distance": 11.4,
                "active_minutes": 95,
                "date": day_before
            }
            
            response = requests.post(f"{API_BASE}/steps", json=step_data_day_before)
            if response.status_code == 200:
                self.log_result("Scenario 2: Record Multiple Step Entries", True)
                return True
            else:
                self.log_result("Scenario 2: Record Multiple Step Entries", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Scenario 2: Record Multiple Step Entries", False, f"Error: {str(e)}")
            return False
    
    def test_scenario_3_verify_leaderboard_updates(self):
        """Test Scenario 3: Verify leaderboard updates correctly"""
        try:
            # Wait a moment for data to propagate
            time.sleep(1)
            
            # Check daily leaderboard
            response = requests.get(f"{API_BASE}/leaderboard?period=daily")
            if response.status_code != 200:
                self.log_result("Scenario 3: Verify Leaderboard Updates - Daily", False, f"Status: {response.status_code}")
                return False
            
            daily_leaderboard = response.json()
            user_found_daily = any(entry.get("username") == "Jamal Thompson" for entry in daily_leaderboard)
            
            # Check weekly leaderboard
            response = requests.get(f"{API_BASE}/leaderboard?period=weekly")
            if response.status_code != 200:
                self.log_result("Scenario 3: Verify Leaderboard Updates - Weekly", False, f"Status: {response.status_code}")
                return False
            
            weekly_leaderboard = response.json()
            user_found_weekly = any(entry.get("username") == "Jamal Thompson" for entry in weekly_leaderboard)
            
            # Check all-time leaderboard
            response = requests.get(f"{API_BASE}/leaderboard?period=alltime")
            if response.status_code != 200:
                self.log_result("Scenario 3: Verify Leaderboard Updates - All-time", False, f"Status: {response.status_code}")
                return False
            
            alltime_leaderboard = response.json()
            user_found_alltime = any(entry.get("username") == "Jamal Thompson" for entry in alltime_leaderboard)
            
            if user_found_daily or user_found_weekly or user_found_alltime:
                self.log_result("Scenario 3: Verify Leaderboard Updates Correctly", True)
                return True
            else:
                self.log_result("Scenario 3: Verify Leaderboard Updates Correctly", False, "User not found in any leaderboard")
                return False
                
        except Exception as e:
            self.log_result("Scenario 3: Verify Leaderboard Updates Correctly", False, f"Error: {str(e)}")
            return False
    
    def test_scenario_4_check_streak_calculation(self):
        """Test Scenario 4: Check streak calculation after multiple days of steps"""
        try:
            # Wait for processing
            time.sleep(1)
            
            # Get user stats to check streak
            response = requests.get(f"{API_BASE}/stats/{self.device_id}")
            if response.status_code == 200:
                stats = response.json()
                current_streak = stats.get("streak", 0)
                
                # Should have at least 2-day streak (yesterday and day before)
                if current_streak >= 2:
                    self.log_result("Scenario 4: Check Streak Calculation", True, f"Streak: {current_streak} days")
                    return True
                else:
                    self.log_result("Scenario 4: Check Streak Calculation", False, f"Expected streak >= 2, got {current_streak}")
                    return False
            else:
                self.log_result("Scenario 4: Check Streak Calculation", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Scenario 4: Check Streak Calculation", False, f"Error: {str(e)}")
            return False
    
    def test_scenario_5_verify_outside_score_calculation(self):
        """Test Scenario 5: Verify Outside Score calculation"""
        try:
            # Get user stats to check outside score
            response = requests.get(f"{API_BASE}/stats/{self.device_id}")
            if response.status_code == 200:
                stats = response.json()
                outside_score = stats.get("outside_score", 0)
                total_steps = stats.get("total_steps", 0)
                
                # Outside score should be calculated based on steps, streak, and activity
                # Formula: base_score = steps // 100, streak_bonus = streak * 50, activity_bonus = active_minutes * 2
                expected_min_score = total_steps // 100  # Minimum based on steps alone
                
                if outside_score >= expected_min_score:
                    self.log_result("Scenario 5: Verify Outside Score Calculation", True, f"Score: {outside_score}, Steps: {total_steps}")
                    return True
                else:
                    self.log_result("Scenario 5: Verify Outside Score Calculation", False, f"Score {outside_score} < expected min {expected_min_score}")
                    return False
            else:
                self.log_result("Scenario 5: Verify Outside Score Calculation", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Scenario 5: Verify Outside Score Calculation", False, f"Error: {str(e)}")
            return False
    
    def test_scenario_6_city_filtered_leaderboard(self):
        """Test Scenario 6: Test city-filtered leaderboard functionality"""
        try:
            # Test London leaderboard
            response = requests.get(f"{API_BASE}/leaderboard?period=daily&city=London")
            if response.status_code == 200:
                london_leaderboard = response.json()
                
                # All users should be from London
                all_london = all(entry.get("city") == "London" for entry in london_leaderboard if entry.get("city"))
                
                if all_london:
                    self.log_result("Scenario 6: City-Filtered Leaderboard (London)", True)
                else:
                    self.log_result("Scenario 6: City-Filtered Leaderboard (London)", False, "Non-London users found")
            else:
                self.log_result("Scenario 6: City-Filtered Leaderboard (London)", False, f"Status: {response.status_code}")
            
            # Test Birmingham leaderboard (should be empty or have Birmingham users only)
            response = requests.get(f"{API_BASE}/leaderboard?period=daily&city=Birmingham")
            if response.status_code == 200:
                birmingham_leaderboard = response.json()
                
                # All users should be from Birmingham (if any)
                all_birmingham = all(entry.get("city") == "Birmingham" for entry in birmingham_leaderboard if entry.get("city"))
                
                if all_birmingham:
                    self.log_result("Scenario 6: City-Filtered Leaderboard (Birmingham)", True)
                    return True
                else:
                    self.log_result("Scenario 6: City-Filtered Leaderboard (Birmingham)", False, "Non-Birmingham users found")
                    return False
            else:
                self.log_result("Scenario 6: City-Filtered Leaderboard (Birmingham)", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Scenario 6: City-Filtered Leaderboard", False, f"Error: {str(e)}")
            return False
    
    def run_scenario_tests(self):
        """Run all scenario tests"""
        print("🎯 Starting OUT 'ERE Specific Scenario Tests")
        print("=" * 60)
        
        # Run scenarios in order
        scenario_1_success = self.test_scenario_1_create_user_with_unique_device_id()
        print()
        
        if scenario_1_success:
            scenario_2_success = self.test_scenario_2_record_multiple_step_entries()
            print()
            
            if scenario_2_success:
                self.test_scenario_3_verify_leaderboard_updates()
                print()
                
                self.test_scenario_4_check_streak_calculation()
                print()
                
                self.test_scenario_5_verify_outside_score_calculation()
                print()
        
        self.test_scenario_6_city_filtered_leaderboard()
        print()
        
        # Print summary
        print("=" * 60)
        print(f"🏁 Scenario Test Results Summary")
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
    tester = ScenarioTester()
    success = tester.run_scenario_tests()
    
    if success:
        print("\n🎉 All scenario tests passed! All requested scenarios work correctly.")
    else:
        print(f"\n⚠️  {tester.results['failed']} scenario test(s) failed.")