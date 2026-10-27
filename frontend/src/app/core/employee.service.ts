import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Employee, EmployeeQuery, EmployeeRequest, PageResponse } from './models';

@Injectable({ providedIn: 'root' })
export class EmployeeService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/employees`;

  list(query: EmployeeQuery): Observable<PageResponse<Employee>> {
    let params = new HttpParams().set('page', query.page).set('size', query.size);
    // Blank filters are left out so the backend treats them as "no filter".
    for (const key of ['search', 'country', 'department'] as const) {
      const value = query[key];
      if (value) {
        params = params.set(key, value);
      }
    }
    for (const key of ['minSalary', 'maxSalary'] as const) {
      const value = query[key];
      // 0 is a valid bound, so only null and undefined are left out.
      if (value != null) {
        params = params.set(key, value);
      }
    }
    return this.http.get<PageResponse<Employee>>(this.baseUrl, { params });
  }

  get(id: number): Observable<Employee> {
    return this.http.get<Employee>(`${this.baseUrl}/${id}`);
  }

  create(request: EmployeeRequest): Observable<Employee> {
    return this.http.post<Employee>(this.baseUrl, request);
  }

  update(id: number, request: EmployeeRequest): Observable<Employee> {
    return this.http.put<Employee>(`${this.baseUrl}/${id}`, request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  // Ids go in the body (the backend's contract): a page of ids in the URL could exceed proxy length limits.
  deleteMany(ids: number[]): Observable<void> {
    return this.http.delete<void>(this.baseUrl, { body: { ids } });
  }

  departments(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/departments`);
  }

  jobTitles(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/job-titles`);
  }
}
