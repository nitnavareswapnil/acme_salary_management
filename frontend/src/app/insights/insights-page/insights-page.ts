import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { catchError, filter, of, Subject, switchMap, tap } from 'rxjs';
import { InsightsService } from '../../core/insights.service';
import { COUNTRY_LABELS, Country, CountrySalaryStats, JobTitleAverage } from '../../core/models';

@Component({
  selector: 'app-insights-page',
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatProgressBarModule,
    MatSelectModule,
    MatTableModule,
  ],
  templateUrl: './insights-page.html',
  styleUrl: './insights-page.scss',
})
export class InsightsPage {
  private readonly insightsService = inject(InsightsService);

  protected readonly statsColumns = ['country', 'currency', 'employeeCount', 'minSalary', 'avgSalary', 'maxSalary'];
  protected readonly titleColumns = ['jobTitle', 'avgSalary', 'employeeCount'];
  protected readonly countries = Object.keys(COUNTRY_LABELS) as Country[];
  protected readonly countryLabels = COUNTRY_LABELS;

  readonly country = new FormControl<Country | null>(null);
  // A form control's value is not a signal, so computed() and the template need this mirror to notice changes.
  protected readonly selectedCountry = toSignal(this.country.valueChanges, { initialValue: null });

  protected readonly stats = signal<CountrySalaryStats[]>([]);
  protected readonly statsLoading = signal(false);
  protected readonly statsFailed = signal(false);

  protected readonly titles = signal<JobTitleAverage[]>([]);
  protected readonly titlesLoading = signal(false);
  protected readonly titlesFailed = signal(false);

  // Averages are shown in the country's own currency; it comes from the statistics rather than a second copy of the mapping.
  protected readonly currency = computed(
    () => this.stats().find((row) => row.country === this.selectedCountry())?.currency ?? '',
  );

  // Both a new selection and Retry push a country here; switchMap drops an older request still in flight.
  private readonly titleRequests = new Subject<Country>();

  constructor() {
    this.loadStats();

    this.country.valueChanges
      .pipe(filter((country): country is Country => country !== null), takeUntilDestroyed())
      .subscribe((country) => this.titleRequests.next(country));

    this.titleRequests
      .pipe(
        tap(() => {
          this.titlesLoading.set(true);
          this.titlesFailed.set(false);
        }),
        switchMap((country) =>
          this.insightsService.jobTitleAverages(country).pipe(
            catchError(() => {
              this.titlesFailed.set(true);
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((titles) => {
        this.titlesLoading.set(false);
        if (titles) {
          this.titles.set(titles);
        }
      });
  }

  protected loadStats(): void {
    this.statsLoading.set(true);
    this.statsFailed.set(false);
    this.insightsService.countryStats().subscribe({
      next: (stats) => {
        this.stats.set(stats);
        this.statsLoading.set(false);
      },
      error: () => {
        this.statsFailed.set(true);
        this.statsLoading.set(false);
      },
    });
  }

  protected retryTitles(): void {
    const country = this.selectedCountry();
    if (country !== null) {
      this.titleRequests.next(country);
    }
  }

  protected countryLabel(country: Country): string {
    return COUNTRY_LABELS[country];
  }
}
