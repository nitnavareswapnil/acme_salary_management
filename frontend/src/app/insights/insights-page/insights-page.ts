import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal, WritableSignal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { catchError, filter, Observable, of, Subject, switchMap, tap } from 'rxjs';
import { InsightsService } from '../../core/insights.service';
import { COUNTRY_LABELS, Country, CountrySalaryStats, DepartmentAverage, JobTitleAverage } from '../../core/models';
import { ChartCanvas } from '../../shared/chart/chart-canvas';
import { barConfig, COUNTRY_COLORS, donutConfig } from '../../shared/chart/chart-config';

// How many roles the chart plots; the table below it lists all of them.
const TOP_ROLES = 5;
const BAR_ROW_HEIGHT = 44;

const formatSalary = (value: number) => value.toLocaleString('en-US', { maximumFractionDigits: 0 });

@Component({
  selector: 'app-insights-page',
  imports: [
    ChartCanvas,
    DecimalPipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatExpansionModule,
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
  protected readonly departmentColumns = ['department', 'avgSalary', 'employeeCount'];
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

  protected readonly departments = signal<DepartmentAverage[]>([]);
  protected readonly departmentsLoading = signal(false);
  protected readonly departmentsFailed = signal(false);

  protected readonly totalEmployees = computed(() => this.stats().reduce((sum, row) => sum + row.employeeCount, 0));
  protected readonly legend = computed(() =>
    this.stats().map((row) => ({
      label: COUNTRY_LABELS[row.country],
      color: COUNTRY_COLORS[row.country],
      count: row.employeeCount,
      share: Math.round((row.employeeCount / this.totalEmployees()) * 100),
    })),
  );
  protected readonly donut = computed(() =>
    donutConfig(this.legend().map((item) => ({ label: item.label, value: item.count, color: item.color }))),
  );
  protected readonly topRoles = computed(() =>
    this.barChart(this.titles().slice(0, TOP_ROLES).map((row) => ({ label: row.jobTitle, value: row.avgSalary }))),
  );
  protected readonly departmentChart = computed(() =>
    this.barChart(this.departments().map((row) => ({ label: row.department, value: row.avgSalary }))),
  );

  // Averages are shown in the country's own currency; it comes from the statistics rather than a second copy of the mapping.
  protected readonly currency = computed(
    () => this.stats().find((row) => row.country === this.selectedCountry())?.currency ?? '',
  );

  // Both a new selection and Retry push a country here; switchMap drops an older request still in flight.
  private readonly titleRequests = new Subject<Country>();
  private readonly departmentRequests = new Subject<Country>();

  constructor() {
    this.loadStats();

    this.country.valueChanges
      .pipe(filter((country): country is Country => country !== null), takeUntilDestroyed())
      .subscribe((country) => {
        this.titleRequests.next(country);
        this.departmentRequests.next(country);
      });

    // The two cards load, fail and retry independently, so one failing never hides the other.
    this.load(this.titleRequests, (country) => this.insightsService.jobTitleAverages(country), {
      data: this.titles,
      loading: this.titlesLoading,
      failed: this.titlesFailed,
    });
    this.load(this.departmentRequests, (country) => this.insightsService.departmentAverages(country), {
      data: this.departments,
      loading: this.departmentsLoading,
      failed: this.departmentsFailed,
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

  protected retryDepartments(): void {
    const country = this.selectedCountry();
    if (country !== null) {
      this.departmentRequests.next(country);
    }
  }

  protected countryLabel(country: Country): string {
    return COUNTRY_LABELS[country];
  }

  private load<T>(
    requests: Subject<Country>,
    fetch: (country: Country) => Observable<T[]>,
    state: { data: WritableSignal<T[]>; loading: WritableSignal<boolean>; failed: WritableSignal<boolean> },
  ): void {
    requests
      .pipe(
        tap(() => {
          state.loading.set(true);
          state.failed.set(false);
        }),
        switchMap((country) =>
          fetch(country).pipe(
            catchError(() => {
              state.failed.set(true);
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((rows) => {
        state.loading.set(false);
        if (rows) {
          state.data.set(rows);
        }
      });
  }

  private barChart(bars: { label: string; value: number }[]) {
    return { config: barConfig(bars, formatSalary), height: bars.length * BAR_ROW_HEIGHT + 24 };
  }
}
