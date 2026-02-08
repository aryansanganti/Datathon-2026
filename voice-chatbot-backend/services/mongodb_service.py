"""
MongoDB Service - Business Data Queries
Connects to MongoDB and retrieves business insights data
"""

from pymongo import MongoClient
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import os

class MongoDBService:
    def __init__(self):
        self.mongo_uri = os.getenv('MONGODB_URI')
        if not self.mongo_uri:
            raise ValueError("MONGODB_URI not found in environment variables")
        
        # Connect with SSL certificate verification disabled for development
        self.client = MongoClient(
            self.mongo_uri,
            tlsAllowInvalidCertificates=True
        )
        self.db = self.client['mern-app']
        
        # Collections
        self.jira_data = self.db['jira_all_data_Datathon']
        self.github_data = self.db['github_all_data_Datathon']
        self.tasks = self.db['tasks']
        self.users = self.db['users']
        self.projects = self.db['projects']
    
    def get_user_status(self, user_name: str) -> Optional[Dict[str, Any]]:
        """Get status for a specific user"""
        try:
            # Get Jira data
            jira_user = self.jira_data.find_one(
                {'name': {'$regex': user_name, '$options': 'i'}}
            )
            
            # Get GitHub data
            github_user = self.github_data.find_one(
                {'name': {'$regex': user_name, '$options': 'i'}}
            )
            
            # Get tasks
            user_tasks = list(self.tasks.find(
                {'assignee_name': {'$regex': user_name, '$options': 'i'}}
            ))
            
            return {
                'name': user_name,
                'jira': jira_user,
                'github': github_user,
                'tasks': user_tasks
            }
        except Exception as e:
            print(f"Error getting user status: {e}")
            return None
    
    def get_team_performance(self, days: int = 7) -> Dict[str, Any]:
        """Get team performance metrics"""
        try:
            # Get all GitHub contributors
            contributors = list(self.github_data.find())
            
            # Get all Jira users
            jira_users = list(self.jira_data.find())
            
            # Get all tasks
            all_tasks = list(self.tasks.find())
            
            # Calculate metrics
            total_commits = sum(c.get('total_commits', 0) for c in contributors)
            total_lines_added = sum(c.get('total_lines_added', 0) for c in contributors)
            total_lines_deleted = sum(c.get('total_lines_deleted', 0) for c in contributors)
            
            # Task statistics
            completed_tasks = [t for t in all_tasks if t.get('status') == 'completed']
            in_progress_tasks = [t for t in all_tasks if t.get('status') == 'in_progress']
            pending_tasks = [t for t in all_tasks if t.get('status') == 'pending']
            
            # Top contributors
            top_contributors = sorted(
                contributors,
                key=lambda x: x.get('total_commits', 0),
                reverse=True
            )[:5]
            
            return {
                'total_commits': total_commits,
                'total_lines_added': total_lines_added,
                'total_lines_deleted': total_lines_deleted,
                'total_lines_changed': total_lines_added + total_lines_deleted,
                'top_contributors': top_contributors,
                'tasks': {
                    'completed': len(completed_tasks),
                    'in_progress': len(in_progress_tasks),
                    'pending': len(pending_tasks),
                    'total': len(all_tasks)
                },
                'completion_rate': len(completed_tasks) / len(all_tasks) * 100 if all_tasks else 0
            }
        except Exception as e:
            print(f"Error getting team performance: {e}")
            return {}
    
    def get_project_health(self) -> Dict[str, Any]:
        """Get project health metrics"""
        try:
            all_tasks = list(self.tasks.find())
            
            if not all_tasks:
                return {'status': 'no_data'}
            
            completed = len([t for t in all_tasks if t.get('status') == 'completed'])
            in_progress = len([t for t in all_tasks if t.get('status') == 'in_progress'])
            pending = len([t for t in all_tasks if t.get('status') == 'pending'])
            total = len(all_tasks)
            
            # Calculate completion percentage
            completion_percentage = (completed / total * 100) if total > 0 else 0
            
            # Check for overdue tasks
            overdue_tasks = []
            for task in all_tasks:
                if task.get('deadline'):
                    deadline = task['deadline']
                    if isinstance(deadline, str):
                        try:
                            deadline = datetime.fromisoformat(deadline.replace('Z', '+00:00'))
                        except:
                            continue
                    if deadline < datetime.now() and task.get('status') != 'completed':
                        overdue_tasks.append(task)
            
            return {
                'total_tasks': total,
                'completed': completed,
                'in_progress': in_progress,
                'pending': pending,
                'completion_percentage': completion_percentage,
                'overdue_count': len(overdue_tasks),
                'overdue_tasks': overdue_tasks[:5],  # Top 5 overdue
                'status': 'on_track' if completion_percentage > 60 else 'at_risk'
            }
        except Exception as e:
            print(f"Error getting project health: {e}")
            return {'status': 'error'}
    
    def get_blockers(self) -> List[Dict[str, Any]]:
        """Identify potential blockers"""
        try:
            blockers = []
            
            # High priority pending tasks
            high_priority_pending = list(self.tasks.find({
                'priority': {'$in': ['high', 'critical']},
                'status': {'$in': ['pending', 'blocked']}
            }))
            
            for task in high_priority_pending:
                blockers.append({
                    'type': 'high_priority_pending',
                    'task': task,
                    'severity': 'high'
                })
            
            # Overdue tasks
            all_tasks = list(self.tasks.find())
            for task in all_tasks:
                if task.get('deadline'):
                    deadline = task['deadline']
                    if isinstance(deadline, str):
                        try:
                            deadline = datetime.fromisoformat(deadline.replace('Z', '+00:00'))
                        except:
                            continue
                    if deadline < datetime.now() and task.get('status') != 'completed':
                        blockers.append({
                            'type': 'overdue',
                            'task': task,
                            'severity': 'medium'
                        })
            
            return blockers[:10]  # Top 10 blockers
        except Exception as e:
            print(f"Error getting blockers: {e}")
            return []
    
    def get_individual_contribution(self, user_name: str) -> Dict[str, Any]:
        """Get detailed contribution for a user"""
        try:
            github_user = self.github_data.find_one(
                {'name': {'$regex': user_name, '$options': 'i'}}
            )
            
            jira_user = self.jira_data.find_one(
                {'name': {'$regex': user_name, '$options': 'i'}}
            )
            
            if not github_user and not jira_user:
                return {'status': 'user_not_found'}
            
            result = {
                'name': user_name,
                'github': {},
                'jira': {}
            }
            
            if github_user:
                result['github'] = {
                    'total_commits': github_user.get('total_commits', 0),
                    'lines_added': github_user.get('total_lines_added', 0),
                    'lines_deleted': github_user.get('total_lines_deleted', 0),
                    'total_lines_changed': github_user.get('total_lines_changed', 0),
                    'recent_commits': github_user.get('commits', [])[:5]
                }
            
            if jira_user:
                tickets = jira_user.get('tickets', [])
                completed = [t for t in tickets if t.get('status') == 'Done']
                in_progress = [t for t in tickets if t.get('status') == 'In Progress']
                
                result['jira'] = {
                    'total_tickets': len(tickets),
                    'completed': len(completed),
                    'in_progress': len(in_progress),
                    'recent_tickets': tickets[:5]
                }
            
            return result
        except Exception as e:
            print(f"Error getting individual contribution: {e}")
            return {'status': 'error'}
    
    def close(self):
        """Close MongoDB connection"""
        self.client.close()


# Test function
if __name__ == '__main__':
    from dotenv import load_dotenv
    load_dotenv()
    
    service = MongoDBService()
    
    print("Testing MongoDB Service...")
    
    # Test team performance
    print("\n1. Team Performance:")
    perf = service.get_team_performance()
    print(f"   Total Commits: {perf.get('total_commits', 0)}")
    print(f"   Completion Rate: {perf.get('completion_rate', 0):.1f}%")
    
    # Test project health
    print("\n2. Project Health:")
    health = service.get_project_health()
    print(f"   Status: {health.get('status', 'unknown')}")
    print(f"   Completion: {health.get('completion_percentage', 0):.1f}%")
    
    service.close()
    print("\n✅ MongoDB Service Test Complete")
