#!/usr/bin/env python3
"""
OUT 'ERE Backend API Testing Suite
Tests all backend endpoints with realistic data
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

print(f"Testing backend at: {API_BASE}")

class OutEreAPITester:
    def __init__(self):
        self.test_device_id = f"test_device_{uuid.uuid4().hex[:8]}"
        self.test_user_id = None
        self.test_challenge_id = None
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
    
    def test_health_check(self):
        """Test basic health endpoints"""
        try:
            # Test root endpoint
            response = requests.get(f"{API_BASE}/")
            if response.status_code == 200:
                data = response.json()
                if "OUT 'ERE API" in data.get("message", ""):
                    self.log_result("Health Check - Root", True)
                else:
                    self.log_result("Health Check - Root", False, f"Unexpected message: {data}")
            else:
                self.log_result("Health Check - Root", False, f"Status: {response.status_code}")
            
            # Test health endpoint
            response = requests.get(f"{API_BASE}/health")
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "healthy":
                    self.log_result("Health Check - Health", True)
                else:
                    self.log_result("Health Check - Health", False, f"Status not healthy: {data}")
            else:
                self.log_result("Health Check - Health", False, f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_result("Health Check", False, f"Connection error: {str(e)}")
    
    def test_user_management(self):
        """Test user CRUD operations"""
        try:
            # Test user creation
            user_data = {
                "device_id": self.test_device_id,
                "username": "Marcus Johnson",
                "city": "London",
                "borough": "Hackney"
            }
            
            response = requests.post(f"{API_BASE}/users", json=user_data)
            if response.status_code == 200:
                user = response.json()
                self.test_user_id = user.get("id")
                if user.get("username") == "Marcus Johnson" and user.get("city") == "London":
                    self.log_result("User Creation", True)
                else:
                    self.log_result("User Creation", False, f"Invalid user data: {user}")
            else:
                self.log_result("User Creation", False, f"Status: {response.status_code}, Response: {response.text}")
            
            # Test get user
            response = requests.get(f"{API_BASE}/users/{self.test_device_id}")
            if response.status_code == 200:
                user = response.json()
                if user.get("username") == "Marcus Johnson":
                    self.log_result("Get User", True)
                else:
                    self.log_result("Get User", False, f"Username mismatch: {user.get('username')}")
            else:
                self.log_result("Get User", False, f"Status: {response.status_code}")
            
            # Test user update
            update_data = {
                "username": "Marcus 'Street Walker' Johnson",
                "daily_goal": 12000,
                "avatar_color": "#FF8C42"
            }
            
            response = requests.put(f"{API_BASE}/users/{self.test_device_id}", json=update_data)
            if response.status_code == 200:
                user = response.json()
                if user.get("username") == "Marcus 'Street Walker' Johnson" and user.get("daily_goal") == 12000:
                    self.log_result("User Update", True)
                else:
                    self.log_result("User Update", False, f"Update failed: {user}")
            else:
                self.log_result("User Update", False, f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_result("User Management", False, f"Error: {str(e)}")
    
    def test_step_tracking(self):
        """Test step recording and retrieval"""
        try:
            today = datetime.utcnow().strftime("%Y-%m-%d")
            yesterday = (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d")
            
            # Record today's steps
            step_data = {
                "device_id": self.test_device_id,
                "steps": 8500,
                "distance": 6.8,
                "active_minutes": 45,
                "date": today
            }
            
            response = requests.post(f"{API_BASE}/steps", json=step_data)
            if response.status_code == 200:
                record = response.json()
                if record.get("steps") == 8500 and record.get("distance") == 6.8:
                    self.log_result("Record Steps - Today", True)
                else:
                    self.log_result("Record Steps - Today", False, f"Data mismatch: {record}")
            else:
                self.log_result("Record Steps - Today", False, f"Status: {response.status_code}, Response: {response.text}")
            
            # Record yesterday's steps
            step_data_yesterday = {
                "device_id": self.test_device_id,
                "steps": 12300,
                "distance": 9.2,
                "active_minutes": 65,
                "date": yesterday
            }
            
            response = requests.post(f"{API_BASE}/steps", json=step_data_yesterday)
            if response.status_code == 200:
                self.log_result("Record Steps - Yesterday", True)
            else:
                self.log_result("Record Steps - Yesterday", False, f"Status: {response.status_code}")
            
            # Get today's steps
            response = requests.get(f"{API_BASE}/steps/{self.test_device_id}/today")
            if response.status_code == 200:
                data = response.json()
                if data.get("steps") == 8500:
                    self.log_result("Get Today's Steps", True)
                else:
                    self.log_result("Get Today's Steps", False, f"Steps mismatch: {data.get('steps')}")
            else:
                self.log_result("Get Today's Steps", False, f"Status: {response.status_code}")
            
            # Get step history
            response = requests.get(f"{API_BASE}/steps/{self.test_device_id}/history?days=7")
            if response.status_code == 200:
                history = response.json()
                if isinstance(history, list) and len(history) >= 2:
                    self.log_result("Get Step History", True)
                else:
                    self.log_result("Get Step History", False, f"Invalid history: {len(history) if isinstance(history, list) else 'not list'}")
            else:
                self.log_result("Get Step History", False, f"Status: {response.status_code}")
            
            # Get weekly summary
            response = requests.get(f"{API_BASE}/steps/{self.test_device_id}/weekly-summary")
            if response.status_code == 200:
                summary = response.json()
                if summary.get("total_steps", 0) > 0:
                    self.log_result("Get Weekly Summary", True)
                else:
                    self.log_result("Get Weekly Summary", False, f"No steps in summary: {summary}")
            else:
                self.log_result("Get Weekly Summary", False, f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_result("Step Tracking", False, f"Error: {str(e)}")
    
    def test_leaderboard(self):
        """Test leaderboard endpoints"""
        try:
            # Test daily leaderboard
            response = requests.get(f"{API_BASE}/leaderboard?period=daily")
            if response.status_code == 200:
                leaderboard = response.json()
                if isinstance(leaderboard, list):
                    self.log_result("Leaderboard - Daily", True)
                else:
                    self.log_result("Leaderboard - Daily", False, f"Not a list: {type(leaderboard)}")
            else:
                self.log_result("Leaderboard - Daily", False, f"Status: {response.status_code}")
            
            # Test weekly leaderboard
            response = requests.get(f"{API_BASE}/leaderboard?period=weekly")
            if response.status_code == 200:
                leaderboard = response.json()
                if isinstance(leaderboard, list):
                    self.log_result("Leaderboard - Weekly", True)
                else:
                    self.log_result("Leaderboard - Weekly", False, f"Not a list: {type(leaderboard)}")
            else:
                self.log_result("Leaderboard - Weekly", False, f"Status: {response.status_code}")
            
            # Test all-time leaderboard
            response = requests.get(f"{API_BASE}/leaderboard?period=alltime")
            if response.status_code == 200:
                leaderboard = response.json()
                if isinstance(leaderboard, list):
                    self.log_result("Leaderboard - All-time", True)
                else:
                    self.log_result("Leaderboard - All-time", False, f"Not a list: {type(leaderboard)}")
            else:
                self.log_result("Leaderboard - All-time", False, f"Status: {response.status_code}")
            
            # Test city-filtered leaderboard
            response = requests.get(f"{API_BASE}/leaderboard?period=daily&city=London")
            if response.status_code == 200:
                leaderboard = response.json()
                if isinstance(leaderboard, list):
                    self.log_result("Leaderboard - City Filtered", True)
                else:
                    self.log_result("Leaderboard - City Filtered", False, f"Not a list: {type(leaderboard)}")
            else:
                self.log_result("Leaderboard - City Filtered", False, f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_result("Leaderboard", False, f"Error: {str(e)}")
    
    def test_community(self):
        """Test community endpoints"""
        try:
            # Test global outside count
            response = requests.get(f"{API_BASE}/community/outside-now")
            if response.status_code == 200:
                data = response.json()
                if "count" in data and isinstance(data["count"], int):
                    self.log_result("Community - Outside Now Global", True)
                else:
                    self.log_result("Community - Outside Now Global", False, f"Invalid response: {data}")
            else:
                self.log_result("Community - Outside Now Global", False, f"Status: {response.status_code}")
            
            # Test city-filtered outside count
            response = requests.get(f"{API_BASE}/community/outside-now?city=London")
            if response.status_code == 200:
                data = response.json()
                if "count" in data and data.get("city") == "London":
                    self.log_result("Community - Outside Now City", True)
                else:
                    self.log_result("Community - Outside Now City", False, f"Invalid response: {data}")
            else:
                self.log_result("Community - Outside Now City", False, f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_result("Community", False, f"Error: {str(e)}")
    
    def test_challenges(self):
        """Test challenge endpoints"""
        try:
            # Get challenges
            response = requests.get(f"{API_BASE}/challenges")
            if response.status_code == 200:
                challenges = response.json()
                if isinstance(challenges, list) and len(challenges) > 0:
                    self.test_challenge_id = challenges[0].get("id")
                    self.log_result("Get Challenges", True)
                else:
                    self.log_result("Get Challenges", False, f"No challenges returned: {challenges}")
            else:
                self.log_result("Get Challenges", False, f"Status: {response.status_code}")
            
            # Join a challenge
            if self.test_challenge_id:
                response = requests.post(f"{API_BASE}/challenges/{self.test_challenge_id}/join?device_id={self.test_device_id}")
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success"):
                        self.log_result("Join Challenge", True)
                    else:
                        self.log_result("Join Challenge", False, f"Success not true: {data}")
                else:
                    self.log_result("Join Challenge", False, f"Status: {response.status_code}")
            else:
                self.log_result("Join Challenge", False, "No challenge ID available")
                
        except Exception as e:
            self.log_result("Challenges", False, f"Error: {str(e)}")
    
    def test_stats(self):
        """Test user stats endpoint"""
        try:
            response = requests.get(f"{API_BASE}/stats/{self.test_device_id}")
            if response.status_code == 200:
                stats = response.json()
                required_fields = ["user", "weekly", "streak", "total_steps"]
                if all(field in stats for field in required_fields):
                    self.log_result("Get User Stats", True)
                else:
                    missing = [f for f in required_fields if f not in stats]
                    self.log_result("Get User Stats", False, f"Missing fields: {missing}")
            else:
                self.log_result("Get User Stats", False, f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_result("User Stats", False, f"Error: {str(e)}")
    
    def test_edge_cases(self):
        """Test edge cases and error handling"""
        try:
            # Test non-existent user
            fake_device_id = "non_existent_device"
            response = requests.get(f"{API_BASE}/users/{fake_device_id}")
            if response.status_code == 404:
                self.log_result("Error Handling - Non-existent User", True)
            else:
                self.log_result("Error Handling - Non-existent User", False, f"Expected 404, got {response.status_code}")
            
            # Test invalid challenge join
            fake_challenge_id = "non_existent_challenge"
            response = requests.post(f"{API_BASE}/challenges/{fake_challenge_id}/join?device_id={self.test_device_id}")
            if response.status_code == 404:
                self.log_result("Error Handling - Non-existent Challenge", True)
            else:
                self.log_result("Error Handling - Non-existent Challenge", False, f"Expected 404, got {response.status_code}")
                
        except Exception as e:
            self.log_result("Edge Cases", False, f"Error: {str(e)}")
    
    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting OUT 'ERE Backend API Tests")
        print("=" * 50)
        
        self.test_health_check()
        print()
        
        self.test_user_management()
        print()
        
        # Wait a moment for user creation to propagate
        time.sleep(1)
        
        self.test_step_tracking()
        print()
        
        self.test_leaderboard()
        print()
        
        self.test_community()
        print()
        
        self.test_challenges()
        print()
        
        self.test_stats()
        print()
        
        self.test_edge_cases()
        print()
        
        # Print summary
        print("=" * 50)
        print(f"🏁 Test Results Summary")
        print(f"✅ Passed: {self.results['passed']}")
        print(f"❌ Failed: {self.results['failed']}")
        print(f"📊 Success Rate: {(self.results['passed'] / (self.results['passed'] + self.results['failed']) * 100):.1f}%")
        
        if self.results['errors']:
            print("\n🔍 Failed Tests:")
            for error in self.results['errors']:
                print(f"  • {error}")
        
        return self.results['failed'] == 0

if __name__ == "__main__":
    tester = OutEreAPITester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 All tests passed! Backend is working correctly.")
    else:
        print(f"\n⚠️  {tester.results['failed']} test(s) failed. Check the errors above.")