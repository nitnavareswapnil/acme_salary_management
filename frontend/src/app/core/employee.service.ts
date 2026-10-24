import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Employee, EmployeeQuery, PageResponse } from './models';

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
    return this.http.get<PageResponse<Employee>>(this.baseUrl, { params });
  }

  departments(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/departments`);
  }
}
