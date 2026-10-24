import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Country, CountrySalaryStats, JobTitleAverage } from './models';

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
}
