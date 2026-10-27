import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { forkJoin, map, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  COUNTRY_LABELS,
  Country,
  CountrySalaryStats,
  DepartmentAverage,
  JobTitleAverage,
  JobTitleComparison,
} from './models';

@Injectable({ providedIn: 'root' })
export class InsightsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/insights/countries`;

  countryStats(): Observable<CountrySalaryStats[]> {
    return this.http.get<CountrySalaryStats[]>(this.baseUrl);
  }

  jobTitleAverages(country: Country): Observable<JobTitleAverage[]> {
    return this.http.get<JobTitleAverage[]>(`${this.baseUrl}/${country}/job-titles`);
  }

  departmentAverages(country: Country): Observable<DepartmentAverage[]> {
    return this.http.get<DepartmentAverage[]>(`${this.baseUrl}/${country}/departments`);
  }

  // Built from the per-country job title averages: one small request per country, and the database still does
  // the grouping. Amounts stay in each country's own currency; nothing here converts or ranks them.
  compareJobTitle(jobTitle: string): Observable<JobTitleComparison[]> {
    const countries = Object.keys(COUNTRY_LABELS) as Country[];
    return forkJoin(
      countries.map((country) =>
        this.jobTitleAverages(country).pipe(
          map((rows) => ({ country, average: rows.find((row) => row.jobTitle === jobTitle) ?? null })),
        ),
      ),
    );
  }
}
