// stats.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

const API_URL = 'http://localhost:5000/api';

export interface Stats {
  users: StatItem;
  specialties: StatItem;
  departments: StatItem;
}

export interface StatItem {
  total: number;
  growth: number;
  chart: number;
}

export interface UserDistribution {
  label: string;
  value: number;
  percentage: number;
}

export interface DeptSpecialty {
  name: string;
  value: number;
  percentage: number;
}

export interface Activity {
  type: 'user' | 'level' | 'specialty' | 'department';
  text: string;
  time: string;
}

@Injectable({
  providedIn: 'root'
})
export class StatsService {
  constructor(private http: HttpClient) { }

  // Récupérer les statistiques globales
  getStats(): Observable<Stats> {
    return this.http.get<Stats>(`${API_URL}/stats`);
  }

  // Récupérer la distribution des utilisateurs
  getUserDistribution(): Observable<UserDistribution[]> {
    return this.http.get<UserDistribution[]>(`${API_URL}/stats/user-distribution`);
  }

  // Récupérer les spécialités par département
  getDeptSpecialties(): Observable<DeptSpecialty[]> {
    return this.http.get<DeptSpecialty[]>(`${API_URL}/stats/dept-specialties`);
  }

  // Récupérer les activités récentes
  getRecentActivities(): Observable<Activity[]> {
    return this.http.get<Activity[]>(`${API_URL}/activities`);
  }
}